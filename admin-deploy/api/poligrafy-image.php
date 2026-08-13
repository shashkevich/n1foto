<?php
declare(strict_types=1);

require dirname(__DIR__) . '/includes/auth.php';
require dirname(__DIR__) . '/includes/site-storage.php';
adminRequireLogin();

header('Content-Type: application/json; charset=utf-8');

function adminImageResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    adminImageResponse(['ok' => false, 'error' => 'Метод не поддерживается.'], 405);
}

$section = preg_replace('/[^a-z0-9_-]/', '', (string) ($_POST['section'] ?? ''));
$productId = preg_replace('/[^a-z0-9_-]/', '', (string) ($_POST['productId'] ?? ''));
$allowedProducts = ['booklet_1fold', 'eurobooklet_2fold'];

if ($section !== 'buklety' || !in_array($productId, $allowedProducts, true)) {
    adminImageResponse(['ok' => false, 'error' => 'Неизвестный тип буклета.'], 400);
}

if (!isset($_FILES['image']) || !is_array($_FILES['image'])) {
    adminImageResponse(['ok' => false, 'error' => 'Выберите изображение JPG или PNG.'], 400);
}

$image = $_FILES['image'];

if (($image['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
    adminImageResponse(['ok' => false, 'error' => 'Не удалось загрузить изображение.'], 400);
}

if ((int) ($image['size'] ?? 0) > 8 * 1024 * 1024) {
    adminImageResponse(['ok' => false, 'error' => 'Размер изображения не должен превышать 8 МБ.'], 400);
}

$imageInfo = @getimagesize((string) $image['tmp_name']);
$mime = is_array($imageInfo) ? (string) ($imageInfo['mime'] ?? '') : '';
$extensions = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
];

if (!isset($extensions[$mime])) {
    adminImageResponse(['ok' => false, 'error' => 'Разрешены только изображения JPG и PNG.'], 400);
}

$relativeDirectory = 'img/buklety/uploads';
$targetDirectory = adminSiteFilePath($relativeDirectory);

if (!is_dir($targetDirectory) && !mkdir($targetDirectory, 0755, true) && !is_dir($targetDirectory)) {
    adminImageResponse(['ok' => false, 'error' => 'Не удалось создать папку для изображений.'], 500);
}

$fileName = $productId . '-' . date('YmdHis') . '.' . $extensions[$mime];
$relativePath = $relativeDirectory . '/' . $fileName;
$targetPath = $targetDirectory . '/' . $fileName;

if (!move_uploaded_file((string) $image['tmp_name'], $targetPath)) {
    adminImageResponse(['ok' => false, 'error' => 'Не удалось сохранить изображение на сервере.'], 500);
}

$jsonPath = adminSiteFilePath('db/poligrafy.json');
$data = json_decode((string) file_get_contents($jsonPath), true);

if (!is_array($data) || !isset($data[$section]) || !is_array($data[$section])) {
    @unlink($targetPath);
    adminImageResponse(['ok' => false, 'error' => 'Не удалось прочитать данные буклетов.'], 500);
}

$updatedCards = 0;

foreach ($data[$section] as &$card) {
    if (($card['productId'] ?? '') === $productId) {
        $card['img'] = [$relativePath];
        $updatedCards++;
    }
}
unset($card);

if ($updatedCards === 0) {
    @unlink($targetPath);
    adminImageResponse(['ok' => false, 'error' => 'Карточки выбранного буклета не найдены.'], 404);
}

$data['meta']['generatedAt'] = date('Y-m-d H:i:s');
$encoded = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
$tmpPath = $jsonPath . '.tmp';

if ($encoded === false || file_put_contents($tmpPath, $encoded . PHP_EOL, LOCK_EX) === false || !rename($tmpPath, $jsonPath)) {
    @unlink($tmpPath);
    @unlink($targetPath);
    adminImageResponse(['ok' => false, 'error' => 'Изображение загружено, но обновить poligrafy.json не удалось.'], 500);
}

adminImageResponse([
    'ok' => true,
    'path' => $relativePath,
    'updatedCards' => $updatedCards,
]);
