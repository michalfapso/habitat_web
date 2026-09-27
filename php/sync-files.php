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

// Use standard Authorization header. Apache/CGI often strips this, so we use fallbacks.
$auth_header = '';
if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'];
} elseif (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
    $auth_header = $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
} elseif (function_exists('apache_request_headers')) {
    $headers = apache_request_headers();
    if (isset($headers['Authorization'])) {
        $auth_header = $headers['Authorization'];
    }
}

$token = '';
if (preg_match('/Bearer\s+(.*)$/i', $auth_header, $matches)) {
    $token = $matches[1];
}

if ($token !== $secret_token) {
    // Debugging (remove after it works)
    // error_log("Auth failed. Token: '$token', Expected: '$secret_token'");
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
    
    // Read JSON payload (avoiding multipart/form-data which WAFs often block)
    $input = json_decode(file_get_contents('php://input'), true);
    if (!$input) {
        http_response_code(400); die(json_encode(['error' => 'Invalid JSON']));
    }

    $errors = array();

    // 1. Handle Deletions
    if (isset($input['d']) && is_array($input['d'])) {
        foreach ($input['d'] as $file) {
            $path = "$base_dir/$file";
            if (file_exists($path) && strpos($file, '..') === false) {
                if (unlink($path)) {
                    $response['deleted']++;
                } else {
                    $errors[] = "Could not delete $file";
                }
            }
        }
    }

    // 2. Handle Updates (Unzip from Base64)
    if (!empty($input['u'])) {
        // strict mode: reject a payload that was truncated or corrupted in transit
        // instead of unzipping garbage and reporting success.
        $zip_data = base64_decode($input['u'], true);
        if ($zip_data === false) {
            http_response_code(400);
            die(json_encode(['error' => 'Update payload is not valid base64 (truncated upload?)']));
        }

        $tmp_file = tempnam(sys_get_temp_dir(), 'update');
        $written  = file_put_contents($tmp_file, $zip_data);
        if ($written !== strlen($zip_data)) {
            unlink($tmp_file);
            http_response_code(500);
            die(json_encode(['error' => 'Could not buffer the update zip (disk full?)', 'wrote' => $written, 'expected' => strlen($zip_data)]));
        }

        $zip     = new ZipArchive;
        $open_rc = $zip->open($tmp_file);
        if ($open_rc !== TRUE) {
            unlink($tmp_file);
            http_response_code(500);
            die(json_encode(['error' => 'Could not open the update zip', 'zip_code' => $open_rc, 'zip_bytes' => strlen($zip_data)]));
        }

        // Remember what the archive claims to contain, so we can check afterwards
        // that the files really appeared on disk.
        $num_files = $zip->numFiles;
        $entries   = array();
        for ($i = 0; $i < $num_files; $i++) {
            $entries[] = $zip->getNameIndex($i);
        }

        $extracted = $zip->extractTo($base_dir);
        $zip->close();
        unlink($tmp_file);

        if (!$extracted) {
            http_response_code(500);
            die(json_encode([
                'error'      => 'Could not extract the update zip into the document root',
                'base_dir'   => $base_dir,
                'writable'   => is_writable($base_dir),
                'free_space' => @disk_free_space($base_dir),
            ]));
        }

        // Confirm the extracted files are really on disk before claiming success.
        $missing = array();
        foreach ($entries as $entry) {
            if (substr($entry, -1) === '/') continue; // directory entry
            if (!file_exists("$base_dir/$entry")) {
                $missing[] = $entry;
            }
        }

        $response['updated'] = $num_files - count($missing);
        if (!empty($missing)) {
            $errors[] = count($missing) . ' extracted file(s) missing from disk, e.g.: '
                      . implode(', ', array_slice($missing, 0, 10));
        }
    }

    if (!empty($errors)) {
        http_response_code(500);
        die(json_encode(['status' => 'error', 'errors' => $errors, 'stats' => $response]));
    }

    echo json_encode(['status' => 'success', 'stats' => $response]);
    exit;
}