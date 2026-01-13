<?php
// CONFIGURATION
$base_dir = __DIR__ . '/..'; // Or actual public_html

// Get the password from an environment variable.
// You should set this in your server's configuration (e.g., Apache/Nginx).
// As a fallback for shared hosting, we check for a hardcoded value in config.php.
$secret_token = getenv('PHP_SECRET_TOKEN');
if (!$secret_token) {
    $config_file = __DIR__ . '/inc/config.php';
    if (file_exists($config_file)) {
        include_once $config_file;
        if (defined('PHP_SECRET_TOKEN')) {
            $secret_token = PHP_SECRET_TOKEN;
        }
    }
}


// SECURITY
header('Content-Type: application/json');
$token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
if ($token !== $secret_token) {
    http_response_code(403); die(json_encode(['error' => 'Forbidden']));
}

// HELPER: Scan Directory
function get_server_manifest($dir) {
    $files = [];
    if (!is_dir($dir)) return [];
    $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir));
    foreach ($iterator as $file) {
        if ($file->isFile()) {
            $path = str_replace('\\', '/', substr($file->getPathname(), strlen($dir) + 1));
            // Optimization: If you trust file mtimes, use md5_file or just size+mtime
            $files[$path] = sha1_file($file->getPathname());
        }
    }
    return $files;
}

// MODE 1: REPORT STATE (GET)
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    echo json_encode(get_server_manifest($base_dir));
    exit;
}

// MODE 2: APPLY CHANGES (POST)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $response = ['deleted' => 0, 'updated' => 0];

    // 1. Handle Deletions
    if (isset($_POST['deletions'])) {
        $to_delete = json_decode($_POST['deletions'], true);
        if (is_array($to_delete)) {
            foreach ($to_delete as $file) {
                $path = "$base_dir/$file";
                // Prevent directory traversal attacks
                if (file_exists($path) && strpos($file, '..') === false) {
                    unlink($path);
                    $response['deleted']++;
                }
            }
        }
    }

    // 2. Handle Updates (Unzip)
    if (!empty($_FILES['updates']['tmp_name'])) {
        $zip = new ZipArchive;
        if ($zip->open($_FILES['updates']['tmp_name']) === TRUE) {
            // Unzip over existing files (replaces them)
            $zip->extractTo($base_dir);
            $response['updated'] = $zip->numFiles;
            $zip->close();
        }
    }

    echo json_encode(['status' => 'success', 'stats' => $response]);
    exit;
}