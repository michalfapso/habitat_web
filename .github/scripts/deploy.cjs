/**
 * Zero-Dependency Node.js Sync Client (JSON + Base64 version)
 * Designed to bypass aggressive WAF rules.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Args
const [, , localDir, serverUrl, token] = process.argv;

if (!localDir || !serverUrl || !token) {
    console.error("Usage: node deploy.cjs <local_dir> <server_url> <token>");
    process.exit(1);
}

// Configuration
const TMP_ZIP = path.join(require('os').tmpdir(), 'deploy_update.zip');
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * 1. Scan and Hash Local Files
 */
function scanDirectory(dir, rootDir = dir) {
    let results = {};
    const list = fs.readdirSync(dir);

    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat && stat.isDirectory()) {
            Object.assign(results, scanDirectory(fullPath, rootDir));
        } else {
            const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');
            const fileBuffer = fs.readFileSync(fullPath);
            const hashSum = crypto.createHash('sha1');
            hashSum.update(fileBuffer);
            results[relativePath] = hashSum.digest('hex');
        }
    });
    return results;
}

/**
 * The hosting's reverse proxy (openresty) intermittently answers 429 Too Many
 * Requests before the request ever reaches PHP. That is a "retry later", so
 * back off and retry rather than treating it as a finished deploy.
 */
const RETRY_STATUSES = [429, 500, 502, 503, 504];
const RETRY_DELAYS_MS = [5000, 15000, 30000, 60000];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchWithRetry(label, url, init) {
    let lastInfo = '';

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
        if (attempt > 0) {
            const delay = RETRY_DELAYS_MS[attempt - 1];
            console.log(`   ⏳ ${label}: ${lastInfo} - retrying in ${delay / 1000}s (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1})...`);
            await sleep(delay);
        }

        let res;
        try {
            res = await fetch(url, init);
        } catch (e) {
            lastInfo = `network error: ${e.message}`;
            continue;
        }

        if (!RETRY_STATUSES.includes(res.status)) return res;

        // Respect Retry-After when the server supplies one.
        const retryAfter = parseInt(res.headers.get('retry-after') || '', 10);
        if (Number.isFinite(retryAfter) && retryAfter > 0 && attempt < RETRY_DELAYS_MS.length) {
            RETRY_DELAYS_MS[attempt] = Math.max(RETRY_DELAYS_MS[attempt], retryAfter * 1000);
        }
        lastInfo = `HTTP ${res.status}`;
    }

    throw new Error(`${label} failed after ${RETRY_DELAYS_MS.length + 1} attempts (${lastInfo})`);
}

/**
 * Fetch the server's path -> sha1 manifest. Throws on anything unusable so a
 * broken deploy fails loudly instead of silently syncing nothing.
 */
async function fetchManifest(serverUrl, token) {
    const res = await fetchWithRetry('Manifest fetch', serverUrl, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'User-Agent': USER_AGENT
        }
    });

    if (!res.ok) throw new Error(`Server returned ${res.status} fetching manifest`);

    const text = await res.text();
    let manifest;
    try {
        manifest = JSON.parse(text);
    } catch (e) {
        throw new Error(`Manifest is not valid JSON (${text.slice(0, 200)})`);
    }
    if (manifest === null || typeof manifest !== 'object' || Array.isArray(manifest)) {
        throw new Error(`Manifest is not an object: ${JSON.stringify(manifest).slice(0, 200)}`);
    }
    console.log(`   Server reports ${Object.keys(manifest).length} files.`);
    return manifest;
}

(async () => {
    try {
        console.log(`🔍 Scanning local directory: ${localDir}...`);
        const localFiles = scanDirectory(localDir);
        console.log(`   Found ${Object.keys(localFiles).length} files.`);

        // 2. Fetch Server State
        console.log(`📡 Fetching server state...`);
        const serverFiles = await fetchManifest(serverUrl, token);

        // 3. Calculate Diff
        const toUpload = [];
        const toDelete = [];

        for (const [filePath, hash] of Object.entries(localFiles)) {
            if (!serverFiles[filePath] || serverFiles[filePath] !== hash) {
                toUpload.push(filePath);
            }
        }

        for (const filePath of Object.keys(serverFiles)) {
            if (!localFiles[filePath]) {
                toDelete.push(filePath);
            }
        }

        console.log(`📊 Status: ${toUpload.length} to upload, ${toDelete.length} to delete.`);
        console.log(`   toUpload: ${toUpload.join(', ')}`);
        console.log(`   toDelete: ${toDelete.join(', ')}`);

        if (toUpload.length === 0 && toDelete.length === 0) {
            console.log("✅ Site is already in sync.");
            return;
        }

        // 4. Create Payload (JSON + Base64 Zip)
        const payload = {
            d: toDelete, // deletions
            u: ""        // updates (base64 zip)
        };

        if (toUpload.length > 0) {
            console.log(`📦 Zipping ${toUpload.length} files...`);

            if (fs.existsSync(TMP_ZIP)) fs.unlinkSync(TMP_ZIP);

            const fileListStr = toUpload.join('\n');
            execSync(`zip -q -@ "${TMP_ZIP}"`, {
                input: fileListStr,
                cwd: localDir
            });

            const zipBuffer = fs.readFileSync(TMP_ZIP);
            payload.u = zipBuffer.toString('base64');
            console.log(`   Zip size (original): ${(zipBuffer.length / 1024).toFixed(2)} KB`);
        }

        // 5. Upload via JSON POST
        console.log(`🚀 Sending changes to server (JSON mode)...`);

        const uploadRes = await fetchWithRetry('Upload', serverUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': USER_AGENT,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await uploadRes.text();
        console.log(`   Server response: ${responseText}`);

        // Cleanup
        if (fs.existsSync(TMP_ZIP)) fs.unlinkSync(TMP_ZIP);

        if (uploadRes.status !== 200) {
            throw new Error(`Server rejected the update (${uploadRes.status}): ${responseText}`);
        }

        let result;
        try {
            result = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Server response is not valid JSON: ${responseText.slice(0, 200)}`);
        }
        if (result.status !== 'success') {
            throw new Error(`Server reported failure: ${responseText}`);
        }

        // 6. Verify: re-read the server manifest and confirm every file we meant
        // to upload now has the hash we sent. Without this the deploy can report
        // success while the server quietly wrote nothing.
        console.log(`🔎 Verifying ${toUpload.length} uploaded file(s) against the server...`);
        const afterFiles = await fetchManifest(serverUrl, token);

        const notLanded = toUpload.filter(f => afterFiles[f] !== localFiles[f]);
        const notDeleted = toDelete.filter(f => Object.prototype.hasOwnProperty.call(afterFiles, f));

        if (notDeleted.length > 0) {
            console.error(`❌ ${notDeleted.length} file(s) were not deleted, e.g.: ${notDeleted.slice(0, 10).join(', ')}`);
        }
        if (notLanded.length > 0) {
            console.error(`❌ ${notLanded.length} of ${toUpload.length} file(s) did NOT land on the server:`);
            for (const f of notLanded.slice(0, 10)) {
                console.error(`     ${f}: expected ${localFiles[f]}, server has ${afterFiles[f] || '(missing)'}`);
            }
            throw new Error(`Deploy verification failed: ${notLanded.length} file(s) not updated on the server.`);
        }
        if (notDeleted.length > 0) {
            throw new Error(`Deploy verification failed: ${notDeleted.length} file(s) not deleted on the server.`);
        }

        console.log(`✅ Verified: all ${toUpload.length} file(s) updated and ${toDelete.length} deleted.`);

    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
})();