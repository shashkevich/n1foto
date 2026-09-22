<?php
require_once dirname(__DIR__) . '/service-links.php';
$serviceRoot = dirname(__DIR__, 2);
$serviceData = json_decode((string) @file_get_contents($serviceRoot . '/db/main-page-cards.json'), true);
$serviceGroups = is_array($serviceData) ? serviceLinkGroups($serviceData, $serviceRoot) : [];
$serviceEscape = static fn(string $text): string => htmlspecialchars($text, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
?>
<?php if ($serviceGroups): ?>
<nav class="service-links container" aria-label="Услуги">
    <ul class="service-links__list">
        <?php foreach ($serviceGroups as $serviceGroup): ?>
            <?php foreach ($serviceGroup['links'] as $serviceLink): ?>
            <li><a class="service-links__link" href="<?= $serviceEscape($serviceLink['href']) ?>"<?= $serviceLink['href'] === ($_SERVER['SCRIPT_NAME'] ?? '') ? ' aria-current="page"' : '' ?>><?= $serviceEscape($serviceLink['name']) ?></a></li>
            <?php endforeach; ?>
        <?php endforeach; ?>
    </ul>
</nav>
<?php endif; ?>
