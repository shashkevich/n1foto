<?php
declare(strict_types=1);

require __DIR__ . '/includes/auth.php';

if (isset($_GET['logout'])) {
    adminLogout();
    header('Location: /', true, 303);
    exit;
}

$error = adminHandleLogin();
$authorized = adminIsAuthorized();
?>
<?php if (!$authorized): ?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Вход | N1 Foto Admin</title>
  <link rel="stylesheet" href="/assets/admin.css?v=20260818-1">
</head>
<body>
  <main class="auth-shell">
    <section class="panel auth-panel">
      <div class="panel-heading">
        <div>
          <h1>Вход в админку</h1>
          <p>Закрытый раздел n1foto.com</p>
        </div>
      </div>
      <form method="post" action="/" class="form-stack">
        <label class="field">
          <span>Логин</span>
          <input name="login" autocomplete="username" required>
        </label>
        <label class="field">
          <span>Пароль</span>
          <input name="password" type="password" autocomplete="current-password" required>
        </label>
        <?php if ($error !== ''): ?>
          <div class="notice notice-danger"><?= adminEscape($error) ?></div>
        <?php endif; ?>
        <button class="button button-primary" type="submit">Войти</button>
      </form>
    </section>
  </main>
</body>
</html>
<?php else: ?>
<?php
require __DIR__ . '/includes/layout.php';
require __DIR__ . '/includes/poligrafy-editor.php';
require __DIR__ . '/includes/manual-cards-editor.php';
$sitePageId = preg_replace('/[^a-z0-9_-]/', '', (string) ($_GET['page'] ?? ''));
$sitePage = $sitePageId !== '' ? adminSitePageById($sitePageId) : adminDefaultSitePage();

if ($sitePage === null) {
    $sitePage = adminDefaultSitePage();
}

adminRenderShellStart($sitePage['title'], $sitePage['id']);
?>
      <section class="page-editor-hero">
        <div>
          <h2><?= adminEscape($sitePage['path']) ?></h2>
          <p>Слева выбирается страница сайта, справа показываются ее редактируемые блоки. Так мы можем постепенно подключать разные инструменты под реальные страницы, а не смешивать все цены, XLS и контент в одну кучу.</p>
        </div>
        <a class="button button-soft" href="<?= adminEscape(adminPublicSiteUrl($sitePage['path'])) ?>" target="_blank" rel="noopener">Открыть на сайте</a>
      </section>

      <section class="editor-grid">
        <article class="panel editor-summary">
          <div class="section-heading">
            <div>
              <h2>Источники данных</h2>
              <p>Пока это карта текущей ручной структуры сайта. Позже эти источники станут настоящими формами редактирования.</p>
            </div>
          </div>
          <dl class="source-list">
            <?php foreach ($sitePage['data'] as $label => $source): ?>
              <div>
                <dt><?= adminEscape($label) ?></dt>
                <dd><?= adminEscape($source) ?></dd>
              </div>
            <?php endforeach; ?>
          </dl>
        </article>

        <section class="modules-grid" aria-label="Модули страницы">
          <?php foreach ($sitePage['modules'] as $module): ?>
            <?php $isActive = $module['status'] === 'active'; ?>
            <article class="module-card<?= $isActive ? '' : ' is-planned' ?>">
              <div>
                <h2><?= adminEscape($module['title']) ?></h2>
                <p><?= adminEscape($module['description']) ?></p>
              </div>
              <?php if ($isActive && $module['id'] === 'poligrafy-prices'): ?>
                <a class="button button-primary" href="#poligrafy-editor">К ценам</a>
              <?php elseif ($isActive && $module['id'] === 'manual-copy-prices'): ?>
                <a class="button button-primary" href="#manual-prices-editor">К ценам</a>
              <?php elseif ($isActive && !empty($module['href'])): ?>
                <a class="button button-primary" href="<?= adminEscape($module['href']) ?>">Открыть</a>
              <?php elseif ($module['id'] === 'preview'): ?>
                <a class="button button-soft" href="<?= adminEscape(adminPublicSiteUrl($sitePage['path'])) ?>" target="_blank" rel="noopener">Смотреть</a>
              <?php else: ?>
                <span class="status-pill">план</span>
              <?php endif; ?>
            </article>
          <?php endforeach; ?>
        </section>
      </section>
      <?php if (in_array($sitePage['id'], ['listovki', 'buklety'], true)): ?>
        <section class="embedded-module" id="poligrafy-editor">
          <div class="section-heading embedded-heading">
            <div>
              <h2>Калькуляторы и цены</h2>
              <p>Инструмент работает прямо в контексте страницы <?= adminEscape($sitePage['title']) ?>.</p>
            </div>
          </div>
          <?php adminRenderPoligrafyEditor($sitePage); ?>
        </section>
        <script src="/assets/poligrafy-admin.js?v=20260814-3"></script>
      <?php endif; ?>
      <?php if (!empty($sitePage['pageJson']) || !empty($sitePage['manualEditor'])): ?>
        <section class="embedded-module" id="manual-prices-editor">
          <?php adminRenderManualCardsEditor($sitePage); ?>
        </section>
      <?php endif; ?>
<?php adminRenderShellEnd(); ?>
<?php endif; ?>
