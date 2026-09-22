<?php
declare(strict_types=1);
require __DIR__ . '/../../php/service-links.php';
$root = dirname(__DIR__, 2);
function expectService(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}
$cards = [
    ['name' => 'Кружки', 'link' => 'pechat-na-kruzhkah.html'],
    ['name' => 'Повтор', 'link' => '/pechat-na-kruzhkah.html?ref=footer'],
    ['name' => 'Продовый URL', 'link' => 'https://n1foto.com/pechat-na-kruzhkah.html'],
    ['name' => 'Печать фотографий', 'link' => 'https://print.n1foto.com/'],
    ['name' => 'Удалённая услуга', 'link' => 'phone-cases.html'],
    ['name' => 'Недопустимая схема', 'link' => 'javascript:alert(1)'],
    ['name' => 'Обход пути', 'link' => '../index.html'],
    ['name' => 'Служебный файл', 'link' => 'admin-deploy/index.php'],
    ['name' => 'Неявный домен', 'link' => '//example.com/test.html'],
    ['name' => 'Пустой адрес', 'link' => ''],
];
$data = ['main' => [['nav_title' => 'Сувениры', 'content' => $cards], ['content' => [$cards[0]]]], 'meta' => ['link' => 'indexTest.html']];
$groups = serviceLinkGroups($data, $root);
expectService(count($groups) === 1 && count($groups[0]['links']) === 2, 'Must exclude missing/unsafe links, duplicates and empty groups.');
expectService($groups[0]['links'][0]['href'] === '/pechat-na-kruzhkah.html', 'Internal links must be root relative.');
expectService($groups[0]['links'][1]['href'] === 'https://print.n1foto.com/', 'External printing service must remain available.');
expectService(serviceLinkGroups(['main' => null], $root) === [], 'Malformed catalogue must not render.');
$many = [];
for ($index = 0; $index < 20; $index++) {
    $many[] = ['name' => 'Услуга ' . $index, 'link' => 'https://print.n1foto.com/service-' . $index];
}
$all = serviceLinkGroups(['main' => [['content' => $many]]], $root);
expectService(count($all[0]['links']) === count($many), 'Do not limit the number of services.');
$_SERVER['SCRIPT_NAME'] = '/pechat-na-kruzhkah.html';
ob_start();
require $root . '/php/blocks/service-links.php';
$html = ob_get_clean();
expectService(str_contains($html, 'aria-label="Услуги"') && str_contains($html, 'aria-current="page"'), 'The server render must label navigation and mark the current page.');
expectService(!str_contains($html, 'phone-cases.html'), 'Removed services must not appear in rendered HTML.');
echo "Service link tests passed.\n";
