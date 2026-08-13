<?php
declare(strict_types=1);

function adminRenderManualCardsEditor(array $sitePage): void
{
    $sections = $sitePage['manualSections'] ?? [];
    $api = $sitePage['manualEditor']['api'] ?? ('/api/page-json.php?page=' . rawurlencode((string) $sitePage['id']));
    $isDigitalLeaflets = $sitePage['id'] === 'listovki';
    ?>
    <section class="manual-editor" id="manual-cards-editor" data-manual-api="<?= adminEscape($api) ?>" data-manual-sections="<?= adminEscape(implode(',', $sections)) ?>">
      <div class="manual-editor__toolbar panel">
        <div>
          <h2><?= $isDigitalLeaflets ? 'Цифровая печать' : 'Карточки и ручные цены' ?></h2>
          <p><?= $isDigitalLeaflets ? 'Все цены цифровых листовок в одной таблице.' : 'Ручное редактирование карточек и таблиц для страницы ' . adminEscape($sitePage['title']) . '.' ?></p>
        </div>
        <div class="action-row">
          <button class="button button-soft" id="manualReload" type="button">Обновить</button>
          <button class="button button-primary" id="manualSave" type="button" disabled>Сохранить в тестовый сайт</button>
        </div>
      </div>

      <div id="manualStatus" class="notice notice-muted">Загружаю текущие карточки...</div>
      <div id="manualCards" class="manual-cards"></div>
    </section>
    <script src="/assets/manual-cards-admin.js?v=20260813-2"></script>
    <?php
}
