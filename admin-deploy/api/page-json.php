<?php
declare(strict_types=1);

require dirname(__DIR__) . '/includes/auth.php';
require dirname(__DIR__) . '/includes/pages.php';
adminRequireLogin();

header('Content-Type: application/json; charset=utf-8');

function adminPageJsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$pageId = preg_replace('/[^a-z0-9_-]/', '', (string) ($_GET['page'] ?? ''));
$sitePage = $pageId !== '' ? adminSitePageById($pageId) : null;

if (!$sitePage || empty($sitePage['pageJson'])) {
    adminPageJsonResponse(['ok' => false, 'error' => 'Для этой страницы не настроен отдельный JSON.'], 404);
}

$relativePath = ltrim((string) $sitePage['pageJson'], '/');
$jsonPath = dirname(__DIR__, 2) . '/' . $relativePath;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (!is_file($jsonPath)) {
        adminPageJsonResponse(['ok' => false, 'error' => 'Файл страницы не найден.'], 404);
    }

    $content = file_get_contents($jsonPath);

    if ($content === false) {
        adminPageJsonResponse(['ok' => false, 'error' => 'Не удалось прочитать файл страницы.'], 500);
    }

    echo $content;
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    adminPageJsonResponse(['ok' => false, 'error' => 'Метод не поддерживается.'], 405);
}

$data = json_decode((string) file_get_contents('php://input'), true);

if (!is_array($data)) {
    adminPageJsonResponse(['ok' => false, 'error' => 'Передан некорректный JSON.'], 400);
}

$encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

if ($encoded === false) {
    adminPageJsonResponse(['ok' => false, 'error' => 'Не удалось подготовить JSON к сохранению.'], 500);
}

$tmpPath = $jsonPath . '.tmp';

if (file_put_contents($tmpPath, $encoded . PHP_EOL, LOCK_EX) === false) {
    adminPageJsonResponse(['ok' => false, 'error' => 'Не удалось записать временный файл.'], 500);
}

if (!rename($tmpPath, $jsonPath)) {
    @unlink($tmpPath);
    adminPageJsonResponse(['ok' => false, 'error' => 'Не удалось заменить файл страницы.'], 500);
}

adminPageJsonResponse([
    'ok' => true,
    'savedAt' => date('Y-m-d H:i:s'),
    'path' => $relativePath,
]);
