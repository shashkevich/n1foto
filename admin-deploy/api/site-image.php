<?php
declare(strict_types=1);

require dirname(__DIR__) . '/includes/auth.php';
require dirname(__DIR__) . '/includes/site-storage.php';
adminRequireLogin();

$relativePath = ltrim(str_replace('\\', '/', (string) ($_GET['path'] ?? '')), '/');

if ($relativePath === '' || strpos($relativePath, '..') !== false || !preg_match('#^img/[a-zA-Z0-9_./-]+$#', $relativePath)) {
    http_response_code(400);
    exit('Некорректный путь изображения.');
}

$siteRoot = realpath(adminSiteRootPath());
$imagePath = realpath(adminSiteFilePath($relativePath));
$allowedRoot = $siteRoot !== false ? rtrim($siteRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR : '';

if ($siteRoot === false || $imagePath === false || strpos($imagePath, $allowedRoot) !== 0 || !is_file($imagePath)) {
    http_response_code(404);
    exit('Изображение не найдено.');
}

$imageInfo = @getimagesize($imagePath);
$mime = is_array($imageInfo) ? (string) ($imageInfo['mime'] ?? '') : '';

if (!in_array($mime, ['image/jpeg', 'image/png'], true)) {
    http_response_code(415);
    exit('Формат изображения не поддерживается.');
}

header('Content-Type: ' . $mime);
header('Content-Length: ' . (string) filesize($imagePath));
header('Cache-Control: private, max-age=300');
readfile($imagePath);
