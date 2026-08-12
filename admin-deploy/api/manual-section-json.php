<?php
declare(strict_types=1);

require dirname(__DIR__) . '/includes/auth.php';
require dirname(__DIR__) . '/includes/pages.php';
require dirname(__DIR__) . '/includes/site-storage.php';
adminRequireLogin();

header('Content-Type: application/json; charset=utf-8');

function adminManualJsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$pageId = preg_replace('/[^a-z0-9_-]/', '', (string) ($_GET['page'] ?? ''));
$sitePage = $pageId !== '' ? adminSitePageById($pageId) : null;
$editor = $sitePage['manualEditor'] ?? null;

if (!$sitePage || !$editor || empty($editor['sections'])) {
    adminManualJsonResponse(['ok' => false, 'error' => 'Для этой страницы не настроен ручной редактор.'], 404);
}

$source = (string) ($editor['source'] ?? '');
$parts = explode('#', $source, 2);
$relativePath = $parts[0] ?? '';
$sectionIds = $editor['sections'];
$jsonPath = adminSiteFilePath($relativePath);

if (!is_file($jsonPath)) {
    adminManualJsonResponse(['ok' => false, 'error' => 'Файл данных не найден.'], 404);
}

$loadSource = static function () use ($jsonPath): array {
    $data = json_decode((string) file_get_contents($jsonPath), true);

    return is_array($data) ? $data : [];
};

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $data = $loadSource();
    $sections = [];

    foreach ($sectionIds as $sectionId) {
        $sections[] = [
            'id' => $sectionId,
            'title' => $sectionId === 'listovki-cifra' ? 'Цифровая печать' : $sectionId,
            'cards' => array_values($data[$sectionId] ?? []),
        ];
    }

    adminManualJsonResponse([
        'meta' => [
            'page' => $pageId,
            'source' => $source,
        ],
        'sections' => $sections,
    ]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    adminManualJsonResponse(['ok' => false, 'error' => 'Метод не поддерживается.'], 405);
}

$payload = json_decode((string) file_get_contents('php://input'), true);

if (!is_array($payload) || !isset($payload['sections']) || !is_array($payload['sections'])) {
    adminManualJsonResponse(['ok' => false, 'error' => 'Передан некорректный JSON.'], 400);
}

$data = $loadSource();

foreach ($payload['sections'] as $section) {
    $sectionId = (string) ($section['id'] ?? '');

    if (!in_array($sectionId, $sectionIds, true)) {
        continue;
    }

    $data[$sectionId] = array_values($section['cards'] ?? []);
}

if (isset($data['meta']) && is_array($data['meta'])) {
    $data['meta']['generatedAt'] = date('Y-m-d H:i:s');
}

$encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

if ($encoded === false) {
    adminManualJsonResponse(['ok' => false, 'error' => 'Не удалось подготовить JSON к сохранению.'], 500);
}

$tmpPath = $jsonPath . '.tmp';

if (file_put_contents($tmpPath, $encoded . PHP_EOL, LOCK_EX) === false) {
    adminManualJsonResponse(['ok' => false, 'error' => 'Не удалось записать временный файл.'], 500);
}

if (!rename($tmpPath, $jsonPath)) {
    @unlink($tmpPath);
    adminManualJsonResponse(['ok' => false, 'error' => 'Не удалось заменить файл данных.'], 500);
}

adminManualJsonResponse([
    'ok' => true,
    'savedAt' => date('Y-m-d H:i:s'),
    'path' => $relativePath,
]);
