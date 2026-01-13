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

(async () => {
    try {
        console.log(`🔍 Scanning local directory: ${localDir}...`);
        const localFiles = scanDirectory(localDir);
        console.log(`   Found ${Object.keys(localFiles).length} files.`);

        // 2. Fetch Server State
        console.log(`📡 Fetching server state...`);
        const serverRes = await fetch(serverUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': USER_AGENT
            }
        });

        if (!serverRes.ok) throw new Error(`Server returned ${serverRes.status}`);
        const serverFiles = await serverRes.json();

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

        const uploadRes = await fetch(serverUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': USER_AGENT,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const responseText = await uploadRes.text();
        if (uploadRes.status === 200) {
            console.log(`✅ Server response: ${responseText}`);
        } else {
            console.error(`❌ Server Error (${uploadRes.status}): ${responseText}`);
        }

        // Cleanup
        if (fs.existsSync(TMP_ZIP)) fs.unlinkSync(TMP_ZIP);

    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
})();