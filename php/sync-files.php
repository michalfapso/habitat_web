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

    // 1. Handle Deletions
    if (isset($input['d']) && is_array($input['d'])) {
        foreach ($input['d'] as $file) {
            $path = "$base_dir/$file";
            if (file_exists($path) && strpos($file, '..') === false) {
                unlink($path);
                $response['deleted']++;
            }
        }
    }

    // 2. Handle Updates (Unzip from Base64)
    if (!empty($input['u'])) {
        $zip_data = base64_decode($input['u']);
        $tmp_file = tempnam(sys_get_temp_dir(), 'update');
        file_put_contents($tmp_file, $zip_data);
        
        $zip = new ZipArchive;
        if ($zip->open($tmp_file) === TRUE) {
            $zip->extractTo($base_dir);
            $response['updated'] = $zip->numFiles;
            $zip->close();
        }
        unlink($tmp_file);
    }

    echo json_encode(['status' => 'success', 'stats' => $response]);
    exit;
}