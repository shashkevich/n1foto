<?php
declare(strict_types=1);

require dirname(__DIR__) . '/includes/auth.php';
require dirname(__DIR__) . '/includes/pages.php';
require dirname(__DIR__) . '/includes/site-storage.php';
adminRequireLogin();

header('Content-Type: application/json; charset=utf-8');

function adminPageImageResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    adminPageImageResponse(['ok' => false, 'error' => 'Метод не поддерживается.'], 405);
}

$pageId = preg_replace('/[^a-z0-9_-]/', '', (string) ($_POST['page'] ?? ''));
$sectionId = preg_replace('/[^a-z0-9_-]/', '', (string) ($_POST['sectionId'] ?? ''));
$cardId = preg_replace('/[^a-z0-9_-]/', '', (string) ($_POST['cardId'] ?? ''));
$sitePage = $pageId !== '' ? adminSitePageById($pageId) : null;
$uploadConfig = $sitePage['imageUpload'] ?? null;

if (!$sitePage || empty($sitePage['pageJson']) || !is_array($uploadConfig)) {
    adminPageImageResponse(['ok' => false, 'error' => 'Загрузка изображений для этой страницы не настроена.'], 404);
}

$allowedSections = $uploadConfig['sections'] ?? [];

if ($sectionId === '' || $cardId === '' || !in_array($sectionId, $allowedSections, true)) {
    adminPageImageResponse(['ok' => false, 'error' => 'Неизвестная карточка или раздел.'], 400);
}

if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
    adminPageImageResponse(['ok' => false, 'error' => 'Выберите изображение JPG или PNG.'], 400);
}

$image = $_FILES['image'];

if (($image['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    adminPageImageResponse(['ok' => false, 'error' => 'Не удалось загрузить изображение.'], 400);
}

if ((int) ($image['size'] ?? 0) > 8 * 1024 * 1024) {
    adminPageImageResponse(['ok' => false, 'error' => 'Размер изображения не должен превышать 8 МБ.'], 400);
}

$imageInfo = @getimagesize((string) $image['tmp_name']);
$mime = is_array($imageInfo) ? (string) ($imageInfo['mime'] ?? '') : '';
$extensions = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
];

if (!isset($extensions[$mime])) {
    adminPageImageResponse(['ok' => false, 'error' => 'Разрешены только изображения JPG и PNG.'], 400);
}

$relativeDirectory = trim((string) ($uploadConfig['directory'] ?? ''), '/');
$targetDirectory = adminSiteFilePath($relativeDirectory);

if ($relativeDirectory === '' || (!is_dir($targetDirectory) && !mkdir($targetDirectory, 0755, true) && !is_dir($targetDirectory))) {
    adminPageImageResponse(['ok' => false, 'error' => 'Не удалось создать папку для изображений.'], 500);
}

$relativeJsonPath = ltrim((string) $sitePage['pageJson'], '/');
$jsonPath = adminSiteFilePath($relativeJsonPath);
$data = json_decode((string) @file_get_contents($jsonPath), true);
$hasStandardSections = is_array($data) && isset($data['sections']) && is_array($data['sections']);
$hasHomeSections = $pageId === 'home' && is_array($data) && isset($data['main']) && is_array($data['main']);

if (!$hasStandardSections && !$hasHomeSections) {
    adminPageImageResponse(['ok' => false, 'error' => 'Не удалось прочитать JSON страницы.'], 500);
}

$cardFound = false;
$homeSectionIndex = null;
$homeCardIndex = null;

if ($pageId === 'home' && $sectionId === 'main' && preg_match('/^card-(\d+)-(\d+)$/', $cardId, $matches)) {
    $homeSectionIndex = (int) $matches[1];
    $homeCardIndex = (int) $matches[2];
    $cardFound = isset($data['main'][$homeSectionIndex]['content'][$homeCardIndex]);
}

if (!$cardFound && isset($data['sections']) && is_array($data['sections'])) {
    foreach ($data['sections'] as &$section) {
        if (($section['id'] ?? '') !== $sectionId || !isset($section['cards']) || !is_array($section['cards'])) {
            continue;
        }

        foreach ($section['cards'] as &$card) {
            if (($card['id'] ?? '') === $cardId) {
                $cardFound = true;
                break 2;
            }
        }
    }
    unset($card, $section);
}

if (!$cardFound) {
    adminPageImageResponse(['ok' => false, 'error' => 'Карточка не найдена в JSON страницы.'], 404);
}

$fileName = $cardId . '-' . date('YmdHis') . '.' . $extensions[$mime];
$relativeImagePath = $relativeDirectory . '/' . $fileName;
$targetPath = $targetDirectory . '/' . $fileName;

if (!move_uploaded_file((string) $image['tmp_name'], $targetPath)) {
    adminPageImageResponse(['ok' => false, 'error' => 'Не удалось сохранить изображение на сервере.'], 500);
}

if ($pageId === 'home' && $homeSectionIndex !== null && $homeCardIndex !== null) {
    $data['main'][$homeSectionIndex]['content'][$homeCardIndex]['img'] = $relativeImagePath;
} else {
    foreach ($data['sections'] as &$section) {
        if (($section['id'] ?? '') !== $sectionId) {
            continue;
        }

        foreach ($section['cards'] as &$card) {
            if (($card['id'] ?? '') === $cardId) {
                $card['img'] = [$relativeImagePath];
                break 2;
            }
        }
    }
    unset($card, $section);
}

$data['meta']['updatedAt'] = date('Y-m-d H:i:s');
$encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
$tmpPath = $jsonPath . '.tmp';

if ($encoded === false || file_put_contents($tmpPath, $encoded . PHP_EOL, LOCK_EX) === false || !rename($tmpPath, $jsonPath)) {
    @unlink($tmpPath);
    @unlink($targetPath);
    adminPageImageResponse(['ok' => false, 'error' => 'Изображение загружено, но обновить JSON страницы не удалось.'], 500);
}

adminPageImageResponse([
    'ok' => true,
    'path' => $relativeImagePath,
]);
