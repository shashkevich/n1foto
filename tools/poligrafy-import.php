<?php

declare(strict_types=1);

$remoteAddress = $_SERVER['REMOTE_ADDR'] ?? '';
$isLocal = in_array($remoteAddress, ['127.0.0.1', '::1'], true);

if (!$isLocal) {
    http_response_code(403);
    echo 'This importer is available only from localhost.';
    exit;
}

$root = dirname(__DIR__);
$configPath = $root . '/prices/poligrafy.config.json';
$overridesPath = $root . '/prices/poligrafy-overrides.json';
$outputPath = $root . '/db/poligrafy.json';
$section = (string) ($_POST['section'] ?? $_GET['section'] ?? '');
$message = '';
$error = '';
$preview = null;

function readJsonFile(string $path, array $fallback = []): array
{
    if (!is_file($path)) {
        return $fallback;
    }

    $content = file_get_contents($path);

    if ($content === false || trim($content) === '') {
        return $fallback;
    }

    return json_decode($content, true, 512, JSON_THROW_ON_ERROR);
}

function writeJsonFile(string $path, array $data): void
{
    $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    if ($json === false) {
        throw new RuntimeException('Не удалось сформировать JSON.');
    }

    file_put_contents($path, $json);
}

function convertCsvToUtf8(string $content): string
{
    if (function_exists('mb_check_encoding') && mb_check_encoding($content, 'UTF-8')) {
        return $content;
    }

    if (function_exists('mb_convert_encoding')) {
        return mb_convert_encoding($content, 'UTF-8', 'Windows-1251');
    }

    $converted = iconv('Windows-1251', 'UTF-8//IGNORE', $content);
    return $converted === false ? $content : $converted;
}

function parseCsv(string $content): array
{
    $content = str_replace(["\r\n", "\r"], "\n", trim($content));
    $lines = array_values(array_filter(explode("\n", $content), static fn($line) => trim($line) !== ''));

    if (!$lines) {
        throw new RuntimeException('CSV-файл пустой.');
    }

    $headers = str_getcsv(array_shift($lines), ';', '"', '\\');
    if (count($headers) < 7) {
        throw new RuntimeException('В CSV должно быть минимум 7 колонок.');
    }

    $rows = [];

    foreach ($lines as $line) {
        $values = str_getcsv($line, ';', '"', '\\');

        if (count($values) !== count($headers)) {
            continue;
        }

        $row = array_combine($headers, $values);

        if (
            trim((string) ($row[$headers[0]] ?? '')) === ''
            || trim((string) ($row[$headers[2]] ?? '')) === ''
            || trim((string) ($row[$headers[3]] ?? '')) === ''
            || trim((string) ($row[$headers[6]] ?? '')) === ''
        ) {
            continue;
        }

        $rows[] = $row;
    }

    if (!$rows) {
        throw new RuntimeException('В CSV не найдено строк с ценами.');
    }

    return [$headers, $rows];
}

function roundRetailPrice(float $price, int $roundTo, string $roundMode): int
{
    if ($roundTo > 0) {
        $steps = $price / $roundTo;

        if ($roundMode === 'ceil') {
            $price = ceil($steps) * $roundTo;
        } elseif ($roundMode === 'floor') {
            $price = floor($steps) * $roundTo;
        } else {
            $price = round($steps) * $roundTo;
        }
    }

    return (int) $price;
}

function formatRub(float|int $price): string
{
    return number_format((int) $price, 0, '', ' ') . ' ₽';
}

function normalizeDecimalValue(mixed $value): float
{
    return (float) str_replace(',', '.', (string) $value);
}

function getAutoMultiplier(float $cost, array $rules): float
{
    foreach ($rules as $rule) {
        $from = isset($rule['from']) ? (float) $rule['from'] : null;
        $to = isset($rule['to']) ? (float) $rule['to'] : null;

        if (($from === null || $cost >= $from) && ($to === null || $cost <= $to)) {
            return (float) $rule['multiplier'];
        }
    }

    return 1.5;
}

function getAutoCoefficientLevels(array $rules): array
{
    $limits = array_merge(range(1000, 15000, 1000), range(20000, 50000, 5000));
    $levels = [];

    foreach ($limits as $limit) {
        $levels[] = [
            'label' => 'до ' . number_format($limit, 0, '', ' ') . ' ₽',
            'to' => $limit,
            'multiplier' => getAutoMultiplier((float) $limit, $rules),
        ];
    }

    $levels[] = [
        'label' => 'свыше 50 000 ₽',
        'to' => '',
        'multiplier' => getAutoMultiplier(50000.01, $rules),
    ];

    return $levels;
}

function makeLegacyPositionKey(string $format, string $material, int $tirage): string
{
    return sha1($format . '|' . $material . '|' . $tirage);
}

function makePositionKey(string $format, string $material, int $tirage, string $color = '', string $printType = ''): string
{
    return sha1($format . '|' . $material . '|' . $tirage . '|' . $color . '|' . $printType);
}

function getPreview(array $headers, array $rows, array $overrides, string $productId, array $costRules, int $roundTo, string $roundMode): array
{
    $tirages = array_values(array_unique(array_map(static fn($row) => (int) $row[$headers[3]], $rows)));
    sort($tirages, SORT_NUMERIC);

    $formats = array_values(array_unique(array_map(static fn($row) => $row[$headers[2]], $rows)));
    $materials = array_values(array_unique(array_map(static fn($row) => $row[$headers[0]], $rows)));
    $positions = [];
    $productOverrides = $overrides[$productId] ?? [];

    foreach ($rows as $rowIndex => $row) {
        $format = $row[$headers[2]];
        $material = $row[$headers[0]];
        $color = $row[$headers[1]];
        $printType = $row[$headers[5]];
        $tirage = (int) $row[$headers[3]];
        $cost = (float) str_replace(',', '.', $row[$headers[6]]);
        $positionKey = makePositionKey($format, $material, $tirage, $color, $printType);
        $legacyPositionKey = makeLegacyPositionKey($format, $material, $tirage);
        $saved = $productOverrides[$positionKey] ?? $productOverrides[$legacyPositionKey] ?? [];
        $autoMultiplier = getAutoMultiplier($cost, $costRules);
        $multiplier = isset($saved['multiplier']) ? (float) $saved['multiplier'] : $autoMultiplier;
        $retail = isset($saved['retail']) ? (int) $saved['retail'] : roundRetailPrice($cost * $multiplier, $roundTo, $roundMode);
        $actualMultiplier = $cost > 0 ? round($retail / $cost, 3) : 0;

        $positions[] = [
            'rowIndex' => $rowIndex,
            'key' => $positionKey,
            'format' => $format,
            'material' => $material,
            'tirage' => $tirage,
            'cost' => $cost,
            'autoMultiplier' => $autoMultiplier,
            'multiplier' => $multiplier,
            'retail' => $retail,
            'margin' => $retail - $cost,
            'actualMultiplier' => $actualMultiplier,
            'warnings' => [],
        ];
    }

    $lastByFormatMaterial = [];

    foreach ($positions as $index => $position) {
        $sourceRow = $rows[$position['rowIndex']];
        $key = $position['format'] . '|' . $position['material'] . '|' . $sourceRow[$headers[1]] . '|' . $sourceRow[$headers[5]];
        $lastByFormatMaterial[$key][] = $index;
    }

    foreach ($lastByFormatMaterial as $indexes) {
        usort($indexes, static fn($a, $b) => $positions[$a]['tirage'] <=> $positions[$b]['tirage']);
        $previousIndex = null;

        foreach ($indexes as $index) {
            if ($previousIndex !== null && $positions[$index]['retail'] < $positions[$previousIndex]['retail']) {
                $positions[$index]['warnings'][] = 'Цена ниже предыдущего тиража';
            }

            $previousIndex = $index;
        }
    }

    return [
        'tirages' => $tirages,
        'formats' => $formats,
        'materials' => $materials,
        'rows' => $rows,
        'positions' => $positions,
    ];
}

function extractFormatLabel(string $format): string
{
    if (preg_match('/\(([^)]+)\)/u', $format, $matches)) {
        return $matches[1];
    }

    return $format;
}

function getColorShortLabel(string $color): string
{
    $lowerColor = function_exists('mb_strtolower') ? mb_strtolower($color, 'UTF-8') : strtolower($color);

    if (str_contains($lowerColor, 'двух сторон')) {
        return '2 стороны';
    }

    if (str_contains($lowerColor, 'одной стороны')) {
        return '1 сторона';
    }

    return $color;
}

function buildProductCards(
    array $headers,
    array $rows,
    array $productConfig,
    string $productId,
    array $positionOverrides,
    int $roundTo,
    string $roundMode
): array {
    $groups = [];

    foreach ($rows as $row) {
        $key = implode('|', [$row[$headers[2]], $row[$headers[1]], $row[$headers[5]]]);
        $groups[$key][] = $row;
    }

    $cards = [];

    foreach ($groups as $groupRows) {
        $first = $groupRows[0];
        $tirages = array_values(array_unique(array_map(static fn($row) => (int) $row[$headers[3]], $groupRows)));
        sort($tirages, SORT_NUMERIC);

        $materials = [];

        foreach ($groupRows as $row) {
            $materials[$row[$headers[0]]][] = $row;
        }

        $table = [];
        $materialTirageHeader = $headers[0] . '\\' . $headers[3];

        foreach ($materials as $materialName => $materialRows) {
            $tableRow = [$materialTirageHeader => $materialName];

            foreach ($tirages as $tirage) {
                $priceRow = null;

                foreach ($materialRows as $row) {
                    if ((int) $row[$headers[3]] === $tirage) {
                        $priceRow = $row;
                        break;
                    }
                }

                $columnName = $tirage . ' шт';

                if ($priceRow === null) {
                    $tableRow[$columnName] = '-';
                    continue;
                }

                $rawPrice = (float) str_replace(',', '.', $priceRow[$headers[6]]);
                $positionKey = makePositionKey($first[$headers[2]], $materialName, $tirage, $first[$headers[1]], $first[$headers[5]]);
                $legacyPositionKey = makeLegacyPositionKey($first[$headers[2]], $materialName, $tirage);
                $override = $positionOverrides[$positionKey] ?? $positionOverrides[$legacyPositionKey] ?? [];

                if (isset($override['retail'])) {
                    $retail = (int) $override['retail'];
                } else {
                    $multiplier = isset($override['multiplier']) ? (float) $override['multiplier'] : 1.5;
                    $retail = roundRetailPrice($rawPrice * $multiplier, $roundTo, $roundMode);
                }

                $tableRow[$columnName] = formatRub($retail);
            }

            $table[] = $tableRow;
        }

        $format = $first[$headers[2]];
        $formatLabel = extractFormatLabel($format);
        $color = $first[$headers[1]];
        $colorShort = getColorShortLabel($color);
        $titleTemplate = (string) ($productConfig['titleTemplate'] ?? '{format}');
        $title = str_replace(
            ['{format}', '{formatLabel}', '{color}', '{colorShort}'],
            [$format, $formatLabel, $color, $colorShort],
            $titleTemplate
        );

        $cards[] = [
            'productId' => $productId,
            'title' => $title,
            'description' => (string) $productConfig['description'],
            'format' => $format,
            'formatLabel' => $formatLabel,
            'color' => $color,
            'printType' => $first[$headers[5]],
            'img' => [(string) $productConfig['image']],
            'table' => $table,
        ];
    }

    usort($cards, static fn($a, $b) => strcmp($a['format'], $b['format']));

    return $cards;
}

function updatePublicJson(string $path, string $section, string $productId, array $newCards, array $productOrder): void
{
    $public = readJsonFile($path, ['meta' => [], $section => []]);
    $existingCards = $public[$section] ?? [];
    $cards = [];

    foreach ($existingCards as $card) {
        if (($card['productId'] ?? null) !== $productId) {
            if (($card['productId'] ?? null) === null && $productId === 'eurobooklet_2fold' && str_contains((string) ($card['title'] ?? ''), 'Евробуклет')) {
                continue;
            }

            $cards[] = $card;
        }
    }

    $cards = array_merge($cards, $newCards);

    usort($cards, static function ($a, $b) use ($productOrder) {
        $aProduct = $a['productId'] ?? '';
        $bProduct = $b['productId'] ?? '';
        $aOrder = $productOrder[$aProduct] ?? 999;
        $bOrder = $productOrder[$bProduct] ?? 999;

        if ($aOrder === $bOrder) {
            return strcmp(($a['title'] ?? ''), ($b['title'] ?? ''));
        }

        return $aOrder <=> $bOrder;
    });

    $public['meta'] = [
        'generatedAt' => date('Y-m-d H:i:s'),
    ];
    $public[$section] = $cards;

    writeJsonFile($path, $public);
}

try {
    $config = readJsonFile($configPath);
    if ($section === '' || !isset($config[$section])) {
        $section = (string) array_key_first($config);
    }

    $sectionConfig = $config[$section] ?? [];
    $products = $sectionConfig['products'] ?? [];
    $savedOverrides = readJsonFile($overridesPath);
    $productOrder = array_flip(array_keys($products));
    $roundTo = (int) ($sectionConfig['roundTo'] ?? 10);
    $roundMode = (string) ($sectionConfig['roundMode'] ?? 'ceil');
    $costRules = $sectionConfig['costMultiplierRules'] ?? [];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $action = $_POST['action'] ?? '';
        $productId = $_POST['product_id'] ?? '';

        if (!isset($products[$productId])) {
            throw new RuntimeException('Неизвестный тип изделия.');
        }

        $productConfig = $products[$productId];
        $sourceName = $_POST['source_name'] ?? '';

        if ($action === 'preview') {
            if (empty($_FILES['price_csv']['tmp_name']) || !is_uploaded_file($_FILES['price_csv']['tmp_name'])) {
                throw new RuntimeException('Выбери CSV-файл с прайсом.');
            }

            $csvContent = convertCsvToUtf8((string) file_get_contents($_FILES['price_csv']['tmp_name']));
            [$headers, $rows] = parseCsv($csvContent);
            $preview = getPreview($headers, $rows, $savedOverrides, $productId, $costRules, $roundTo, $roundMode);
            $preview['productId'] = $productId;
            $preview['section'] = $section;
            $preview['productName'] = $productConfig['name'];
            $preview['page'] = $sectionConfig['page'] ?? ($section . '.html');
            $preview['sourceName'] = $_FILES['price_csv']['name'];
            $preview['csvBase64'] = base64_encode($csvContent);
            $preview['headers'] = $headers;
            $preview['autoCoefficientLevels'] = getAutoCoefficientLevels($costRules);
        }

        if ($action === 'generate') {
            $csvBase64 = $_POST['csv_base64'] ?? '';
            $csvContent = base64_decode($csvBase64, true);

            if ($csvContent === false || trim($csvContent) === '') {
                throw new RuntimeException('Не удалось прочитать CSV из формы. Загрузи файл заново.');
            }

            [$headers, $rows] = parseCsv($csvContent);
            $postedPositions = $_POST['positions'] ?? [];
            $positionOverrides = [];

            foreach ($postedPositions as $positionKey => $position) {
                $multiplier = normalizeDecimalValue($position['multiplier'] ?? 1);
                $retail = (int) normalizeDecimalValue($position['retail'] ?? 0);

                if ($retail <= 0) {
                    continue;
                }

                $positionOverrides[$positionKey] = [
                    'multiplier' => $multiplier,
                    'retail' => $retail,
                ];
            }

            $savedOverrides[$productId] = $positionOverrides;
            writeJsonFile($overridesPath, $savedOverrides);

            $cards = buildProductCards($headers, $rows, $productConfig, $productId, $positionOverrides, $roundTo, $roundMode);
            updatePublicJson($outputPath, $section, $productId, $cards, $productOrder);
            $message = 'Готово: цены сохранены, db/poligrafy.json обновлен. Карточек: ' . count($cards) . '.';
        }
    }
} catch (Throwable $exception) {
    $error = $exception->getMessage();
}

?>
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Импорт прайса полиграфии</title>
    <link rel="stylesheet" href="../css/main.min.css">
</head>
<body>
    <main class="container py-5">
        <div class="card card-white rounded-4 p-4 mb-4">
            <h1 class="h3 mb-3">Импорт прайса полиграфии</h1>

            <?php if ($message): ?>
                <div class="alert alert-success"><?= htmlspecialchars($message, ENT_QUOTES, 'UTF-8') ?></div>
            <?php endif; ?>

            <?php if ($error): ?>
                <div class="alert alert-danger"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
            <?php endif; ?>

            <div class="row g-3">
                <?php foreach ($config as $formSection => $formSectionConfig): ?>
                    <div class="col-12">
                        <h2 class="h5 mb-0"><?= htmlspecialchars((string) ($formSectionConfig['name'] ?? $formSection), ENT_QUOTES, 'UTF-8') ?></h2>
                    </div>
                    <?php foreach (($formSectionConfig['products'] ?? []) as $productId => $product): ?>
                        <div class="col-12 col-lg-6">
                            <form method="post" enctype="multipart/form-data" class="border-table p-3 h-100">
                                <input type="hidden" name="action" value="preview">
                                <input type="hidden" name="section" value="<?= htmlspecialchars((string) $formSection, ENT_QUOTES, 'UTF-8') ?>">
                                <input type="hidden" name="product_id" value="<?= htmlspecialchars($productId, ENT_QUOTES, 'UTF-8') ?>">

                                <h3 class="h6"><?= htmlspecialchars($product['name'], ENT_QUOTES, 'UTF-8') ?></h3>
                                <label class="form-label" for="price_csv_<?= htmlspecialchars((string) $formSection . '_' . $productId, ENT_QUOTES, 'UTF-8') ?>">CSV-файл партнера</label>
                                <input class="form-control form-control-sm mb-3" type="file" id="price_csv_<?= htmlspecialchars((string) $formSection . '_' . $productId, ENT_QUOTES, 'UTF-8') ?>" name="price_csv" accept=".csv" required>
                                <button class="btn btn-primary btn-sm" type="submit">Загрузить и посмотреть</button>
                            </form>
                        </div>
                    <?php endforeach; ?>
                <?php endforeach; ?>
            </div>
        </div>

        <?php if ($preview): ?>
            <form method="post" class="card card-white rounded-4 p-4 mb-4">
                <input type="hidden" name="action" value="generate">
                <input type="hidden" name="section" value="<?= htmlspecialchars($preview['section'], ENT_QUOTES, 'UTF-8') ?>">
                <input type="hidden" name="product_id" value="<?= htmlspecialchars($preview['productId'], ENT_QUOTES, 'UTF-8') ?>">
                <input type="hidden" name="source_name" value="<?= htmlspecialchars($preview['sourceName'], ENT_QUOTES, 'UTF-8') ?>">
                <input type="hidden" name="csv_base64" value="<?= htmlspecialchars($preview['csvBase64'], ENT_QUOTES, 'UTF-8') ?>">

                <h2 class="h4 mb-2"><?= htmlspecialchars($preview['productName'], ENT_QUOTES, 'UTF-8') ?></h2>
                <p class="small mb-1">Файл: <?= htmlspecialchars($preview['sourceName'], ENT_QUOTES, 'UTF-8') ?>. Форматы: <?= htmlspecialchars(implode(', ', $preview['formats']), ENT_QUOTES, 'UTF-8') ?>.</p>
                <p class="small mb-3">Бумага: <?= htmlspecialchars(implode(', ', $preview['materials']), ENT_QUOTES, 'UTF-8') ?>.</p>

                <h3 class="h5">Автоматические коэффициенты по себестоимости</h3>
                <div class="border-table p-3 mb-4">
                    <div class="row g-2 align-items-end">
                        <?php foreach ($preview['autoCoefficientLevels'] as $index => $level): ?>
                            <div class="col-6 col-md-3 col-lg-2">
                                <label class="form-label small mb-1" for="auto_coef_<?= (int) $index ?>"><?= htmlspecialchars($level['label'], ENT_QUOTES, 'UTF-8') ?></label>
                                <input class="form-control form-control-sm auto-coefficient" id="auto_coef_<?= (int) $index ?>" value="<?= htmlspecialchars((string) $level['multiplier'], ENT_QUOTES, 'UTF-8') ?>" inputmode="decimal" data-to="<?= htmlspecialchars((string) $level['to'], ENT_QUOTES, 'UTF-8') ?>">
                            </div>
                        <?php endforeach; ?>
                        <div class="col-12 col-lg-2">
                            <button class="btn btn-outline-primary btn-sm w-100" type="button" id="apply-auto-coefficients">Применить</button>
                        </div>
                    </div>
                </div>

                <h3 class="h5">Расчет цен</h3>
                <div class="table-wrap mb-4">
                    <table class="table table-striped table-hover table-borderless mb-0">
                        <thead>
                            <tr>
                                <th>Формат</th>
                                <th>Бумага</th>
                                <th>Тираж</th>
                                <th>Себестоимость</th>
                                <th>Авто</th>
                                <th>Коэф.</th>
                                <th>Цена клиенту</th>
                                <th>Маржа</th>
                                <th>Проверка</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($preview['positions'] as $position): ?>
                                <tr class="<?= $position['warnings'] ? 'table-warning' : '' ?>">
                                    <td><?= htmlspecialchars($position['format'], ENT_QUOTES, 'UTF-8') ?></td>
                                    <td><?= htmlspecialchars($position['material'], ENT_QUOTES, 'UTF-8') ?></td>
                                    <td><?= (int) $position['tirage'] ?> шт</td>
                                    <td><?= formatRub($position['cost']) ?></td>
                                    <td>x<?= htmlspecialchars((string) $position['autoMultiplier'], ENT_QUOTES, 'UTF-8') ?></td>
                                    <td style="min-width: 90px;">
                                        <input class="form-control form-control-sm price-multiplier" name="positions[<?= htmlspecialchars($position['key'], ENT_QUOTES, 'UTF-8') ?>][multiplier]" value="<?= htmlspecialchars((string) $position['multiplier'], ENT_QUOTES, 'UTF-8') ?>" inputmode="decimal" data-cost="<?= htmlspecialchars((string) $position['cost'], ENT_QUOTES, 'UTF-8') ?>">
                                    </td>
                                    <td style="min-width: 120px;">
                                        <input class="form-control form-control-sm price-retail" name="positions[<?= htmlspecialchars($position['key'], ENT_QUOTES, 'UTF-8') ?>][retail]" value="<?= (int) $position['retail'] ?>" inputmode="numeric" data-cost="<?= htmlspecialchars((string) $position['cost'], ENT_QUOTES, 'UTF-8') ?>">
                                    </td>
                                    <td class="price-margin" data-cost="<?= htmlspecialchars((string) $position['cost'], ENT_QUOTES, 'UTF-8') ?>"><?= formatRub($position['margin']) ?></td>
                                    <?php if ($position['warnings']): ?>
                                        <td class="small text-danger"><?= htmlspecialchars(implode('; ', $position['warnings']), ENT_QUOTES, 'UTF-8') ?></td>
                                    <?php else: ?>
                                        <td></td>
                                    <?php endif; ?>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <h3 class="h5">Прайс партнера без наценки</h3>
                <div class="table-wrap mb-4">
                    <table class="table table-striped table-hover table-borderless mb-0">
                        <thead>
                            <tr>
                                <?php foreach ($preview['headers'] as $header): ?>
                                    <th><?= htmlspecialchars($header, ENT_QUOTES, 'UTF-8') ?></th>
                                <?php endforeach; ?>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($preview['rows'] as $row): ?>
                                <tr>
                                    <?php foreach ($preview['headers'] as $header): ?>
                                        <td><?= htmlspecialchars((string) $row[$header], ENT_QUOTES, 'UTF-8') ?></td>
                                    <?php endforeach; ?>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>

                <div>
                    <button class="btn btn-primary" type="submit">Сохранить цены и сформировать JSON</button>
                    <a class="btn btn-outline-primary ms-2" href="../<?= htmlspecialchars($preview['page'], ENT_QUOTES, 'UTF-8') ?>">Открыть страницу</a>
                </div>
            </form>
        <?php endif; ?>
    </main>
    <script>
        const parseDecimal = (value) => Number(String(value).replace(',', '.')) || 0;
        const roundTo = <?= (int) $roundTo ?>;
        const formatRub = (value) => `${Math.round(value).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} ₽`;
        const roundRetail = (value) => Math.ceil(value / roundTo) * roundTo;

        const updateRowMargin = (row) => {
            const retailInput = row.querySelector('.price-retail');
            const marginCell = row.querySelector('.price-margin');
            const cost = parseDecimal(retailInput.dataset.cost);
            const retail = parseDecimal(retailInput.value);
            marginCell.textContent = formatRub(retail - cost);
        };

        document.querySelectorAll('.price-multiplier').forEach((multiplierInput) => {
            const row = multiplierInput.closest('tr');
            const retailInput = row.querySelector('.price-retail');
            const cost = parseDecimal(multiplierInput.dataset.cost);

            multiplierInput.addEventListener('change', () => {
                const multiplier = parseDecimal(multiplierInput.value) || 1;
                retailInput.value = String(roundRetail(cost * multiplier));
                updateRowMargin(row);
            });

            retailInput.addEventListener('change', () => updateRowMargin(row));
        });

        const applyAutoButton = document.getElementById('apply-auto-coefficients');

        if (applyAutoButton) {
            applyAutoButton.addEventListener('click', () => {
                const levels = [...document.querySelectorAll('.auto-coefficient')]
                    .map((input) => ({
                        to: input.dataset.to === '' ? Infinity : parseDecimal(input.dataset.to),
                        multiplier: parseDecimal(input.value) || 1,
                    }))
                    .sort((a, b) => a.to - b.to);

                document.querySelectorAll('.price-multiplier').forEach((multiplierInput) => {
                    const row = multiplierInput.closest('tr');
                    const retailInput = row.querySelector('.price-retail');
                    const cost = parseDecimal(multiplierInput.dataset.cost);
                    const level = levels.find((item) => cost <= item.to) || levels[levels.length - 1];

                    multiplierInput.value = String(level.multiplier);
                    retailInput.value = String(roundRetail(cost * level.multiplier));
                    updateRowMargin(row);
                });
            });
        }
    </script>
</body>
</html>
