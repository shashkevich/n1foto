<?php
declare(strict_types=1);

require __DIR__ . '/includes/auth.php';
adminRequireLogin();
require __DIR__ . '/includes/layout.php';
require __DIR__ . '/includes/poligrafy-editor.php';

$sitePageId = preg_replace('/[^a-z0-9_-]/', '', (string) ($_GET['site_page'] ?? ''));
$sitePage = $sitePageId !== '' ? adminSitePageById($sitePageId) : null;
$pageTitle = $sitePage ? 'Цены: ' . $sitePage['title'] : 'Цены полиграфии';
?>
<?php adminRenderShellStart($pageTitle, $sitePage['id'] ?? ''); ?>
    <?php if ($sitePage): ?>
      <section class="page-context">
        <div>
          <h2><?= adminEscape($sitePage['title']) ?></h2>
          <p><?= adminEscape($sitePage['path']) ?> · модуль редактирования цен и калькуляторов</p>
        </div>
        <a class="button button-soft" href="/?page=<?= adminEscape($sitePage['id']) ?>">К странице</a>
      </section>
    <?php endif; ?>

    <?php adminRenderPoligrafyEditor($sitePage); ?>
    <script src="/assets/poligrafy-admin.js?v=20260813-3"></script>
<?php adminRenderShellEnd(); ?>
