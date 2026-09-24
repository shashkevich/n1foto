<?php
// Card content is shared with the admin page JSON editor.
$serviceCardsPath = dirname(__DIR__, 2) . '/db/pages/' . basename($servicePageId) . '.json';
$serviceData = is_file($serviceCardsPath) ? json_decode((string) file_get_contents($serviceCardsPath), true) : null;
$serviceEscape = static fn($value): string => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
foreach (($serviceData['sections'] ?? []) as $serviceSection):
    foreach (($serviceSection['cards'] ?? []) as $serviceCard):
        if (($serviceCard['archived'] ?? false) === true) continue;
        $serviceImage = $serviceCard['img'][0] ?? '';
?>
<article class="collage-card">
    <?php if ($serviceImage !== ''): ?>
    <div class="collage-card-image"><img src="<?= $serviceEscape($serviceImage) ?>" alt="<?= $serviceEscape($serviceCard['title'] ?? '') ?>" decoding="async"></div>
    <?php endif; ?>
    <div class="collage-card-body">
        <h2 class="collage-card-title"><?= $serviceEscape($serviceCard['title'] ?? '') ?></h2>
        <?php if (!empty($serviceCard['description'])): ?>
        <p class="collage-card-note"><?= $serviceEscape($serviceCard['description']) ?></p>
        <?php endif; ?>
        <?php if (!empty($serviceCard['price_title'])): ?><p class="collage-card-footer"><?= $serviceEscape($serviceCard['price_title']) ?></p><?php endif; ?>
        <?php foreach (preg_split('/\R\s*\R/u', (string) ($serviceCard['footer'] ?? '')) as $serviceParagraph): if (trim($serviceParagraph) === '') continue; ?>
        <p class="collage-card-footer"><?= $serviceEscape($serviceParagraph) ?></p>
        <?php endforeach; ?>
        <?php include __DIR__ . '/service-card-contacts.php'; ?>
    </div>
</article>
<?php endforeach; endforeach; ?>
