<?php
declare(strict_types=1);

require dirname(__DIR__) . '/includes/auth.php';
require dirname(__DIR__) . '/includes/site-storage.php';
adminRequireLogin();

$script = adminSiteFilePath('js/clothing-print-builder.js');
if (!is_file($script) || !is_readable($script)) {
    http_response_code(404);
    exit;
}

header('Content-Type: text/javascript; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');
readfile($script);
