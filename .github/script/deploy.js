/**
 * Zero-Dependency Node.js Sync Client
 * Usage: node deploy.js <local_dir> <server_url> <token>
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

// Args
const [, , localDir, serverUrl, token] = process.argv;

if (!localDir || !serverUrl || !token) {
    console.error("Usage: node deploy.js <local_dir> <server_url> <token>");
    process.exit(1);
}

// Configuration
const TMP_ZIP = path.join(require('os').tmpdir(), 'deploy_update.zip');

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
            // Get relative path (e.g., "assets/img.jpg")
            const relativePath = path.relative(rootDir, fullPath).split(path.sep).join('/');
            // Calculate SHA1
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
            headers: { 'X-AUTH-TOKEN': token }
        });

        if (!serverRes.ok) throw new Error(`Server returned ${serverRes.status}`);
        const serverFiles = await serverRes.json();

        // 3. Calculate Diff
        const toUpload = [];
        const toDelete = [];

        // Find uploads (New or Changed)
        for (const [filePath, hash] of Object.entries(localFiles)) {
            if (!serverFiles[filePath] || serverFiles[filePath] !== hash) {
                toUpload.push(filePath);
            }
        }

        // Find deletions (On server but not local)
        for (const filePath of Object.keys(serverFiles)) {
            if (!localFiles[filePath]) {
                toDelete.push(filePath);
            }
        }

        console.log(`📊 Status: ${toUpload.length} to upload, ${toDelete.length} to delete.`);

        if (toUpload.length === 0 && toDelete.length === 0) {
            console.log("✅ Site is already in sync.");
            return;
        }

        // 4. Create Payload
        const boundary = "----NodeJSDeployBoundary" + Math.random().toString(16);
        const parts = [];

        // Part A: Deletions JSON
        parts.push(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="deletions"\r\n\r\n` +
            JSON.stringify(toDelete) + `\r\n`
        );

        // Part B: Zip File (if needed)
        if (toUpload.length > 0) {
            console.log(`📦 Zipping ${toUpload.length} files...`);

            // Delete old temp zip if exists
            if (fs.existsSync(TMP_ZIP)) fs.unlinkSync(TMP_ZIP);

            // Use system 'zip' command for maximum speed
            // -q: quiet, -r: recursive (though we pass specific files)
            // We pass the file list via stdin to avoid "Argument list too long" errors
            const fileListStr = toUpload.join('\n');
            execSync(`zip -q -@ "${TMP_ZIP}"`, {
                input: fileListStr,
                cwd: localDir
            });

            const zipStats = fs.statSync(TMP_ZIP);
            console.log(`   Zip size: ${(zipStats.size / 1024).toFixed(2)} KB`);

            const zipBuffer = fs.readFileSync(TMP_ZIP);

            parts.push(
                `--${boundary}\r\n` +
                `Content-Disposition: form-data; name="updates"; filename="update.zip"\r\n` +
                `Content-Type: application/zip\r\n\r\n`
            );
            parts.push(zipBuffer);
            parts.push(Buffer.from("\r\n"));
        }

        // Closing Boundary
        parts.push(Buffer.from(`--${boundary}--\r\n`));

        // 5. Upload
        console.log(`🚀 Sending changes to server...`);

        // Construct full body buffer
        const finalBody = parts.map(p => typeof p === 'string' ? Buffer.from(p) : p);
        const bodyBuffer = Buffer.concat(finalBody);

        const uploadRes = await fetch(serverUrl, {
            method: 'POST',
            headers: {
                'X-AUTH-TOKEN': token,
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': bodyBuffer.length
            },
            body: bodyBuffer
        });

        const responseText = await uploadRes.text();
        console.log(`✅ Server response: ${responseText}`);

    } catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
})();