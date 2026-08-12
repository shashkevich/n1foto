<?php
declare(strict_types=1);

require_once __DIR__ . '/pages.php';

function adminRenderShellStart(string $pageTitle, string $activePageId = ''): void
{
    ?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title><?= adminEscape($pageTitle) ?> | N1 Foto Admin</title>
  <link rel="stylesheet" href="/assets/admin.css">
</head>
<body>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <a class="admin-brand" href="/">
        <strong>N1 Foto</strong>
        <span>Admin</span>
      </a>

      <nav class="admin-nav" aria-label="Страницы сайта">
        <?php foreach (adminSitePagesByGroup() as $groupTitle => $pages): ?>
          <section class="admin-nav-group">
            <h2><?= adminEscape($groupTitle) ?></h2>
            <?php foreach ($pages as $page): ?>
              <?php
                $isActive = $page['id'] === $activePageId;
                $classes = 'admin-nav-link' . ($isActive ? ' is-active' : '');
                $href = '/?page=' . rawurlencode($page['id']);
              ?>
              <a class="<?= adminEscape($classes) ?>" href="<?= adminEscape($href) ?>" aria-current="<?= $isActive ? 'page' : 'false' ?>">
                <span>
                  <strong><?= adminEscape($page['title']) ?></strong>
                  <em><?= adminEscape($page['path']) ?></em>
                </span>
              </a>
            <?php endforeach; ?>
          </section>
        <?php endforeach; ?>
      </nav>
    </aside>

    <main class="admin-main">
      <header class="admin-topbar">
        <div>
          <p class="admin-kicker">Редактирование страницы</p>
          <h1><?= adminEscape($pageTitle) ?></h1>
        </div>
        <a class="button button-soft" href="/?logout=1">Выйти</a>
      </header>
    <?php
}

function adminRenderShellEnd(): void
{
    ?>
    </main>
  </div>
</body>
</html>
    <?php
}
