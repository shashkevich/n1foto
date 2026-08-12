<?php
declare(strict_types=1);

require dirname(__DIR__) . '/includes/auth.php';
require dirname(__DIR__) . '/includes/site-storage.php';
adminRequireLogin();

header('Content-Type: application/json; charset=utf-8');

$jsonPath = adminSiteFilePath('db/poligrafy.json');

function adminJsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!is_file($jsonPath)) {
        adminJsonResponse(['ok' => false, 'error' => 'Файл db/poligrafy.json не найден.'], 404);
    }

    $content = file_get_contents($jsonPath);

    if ($content === false) {
        adminJsonResponse(['ok' => false, 'error' => 'Не удалось прочитать db/poligrafy.json.'], 500);
    }

    echo $content;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    adminJsonResponse(['ok' => false, 'error' => 'Метод не поддерживается.'], 405);
}

$rawBody = file_get_contents('php://input');
$data = json_decode((string) $rawBody, true);

if (!is_array($data)) {
    adminJsonResponse(['ok' => false, 'error' => 'Передан некорректный JSON.'], 400);
}

$encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

if ($encoded === false) {
    adminJsonResponse(['ok' => false, 'error' => 'Не удалось подготовить JSON к сохранению.'], 500);
}

$encoded .= PHP_EOL;
$tmpPath = $jsonPath . '.tmp';

if (file_put_contents($tmpPath, $encoded, LOCK_EX) === false) {
    adminJsonResponse(['ok' => false, 'error' => 'Не удалось записать временный файл.'], 500);
}

if (!rename($tmpPath, $jsonPath)) {
    @unlink($tmpPath);
    adminJsonResponse(['ok' => false, 'error' => 'Не удалось заменить db/poligrafy.json.'], 500);
}

adminJsonResponse([
    'ok' => true,
    'savedAt' => date('Y-m-d H:i:s'),
    'path' => 'db/poligrafy.json',
]);
