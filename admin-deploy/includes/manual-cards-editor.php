<?php
declare(strict_types=1);

function adminRenderManualCardsEditor(array $sitePage): void
{
    $sections = $sitePage['manualSections'] ?? [];
    $api = $sitePage['manualEditor']['api'] ?? ('/api/page-json.php?page=' . rawurlencode((string) $sitePage['id']));
    $isDigitalLeaflets = $sitePage['id'] === 'listovki';
    $isProduction = adminPublicSiteBaseUrl() === 'https://n1foto.com';
    $publishButtonLabel = $isProduction ? 'Опубликовать на n1foto.com' : 'Сохранить на тестовый сайт';
    ?>
    <section class="manual-editor" id="manual-cards-editor" data-manual-api="<?= adminEscape($api) ?>" data-manual-sections="<?= adminEscape(implode(',', $sections)) ?>" data-public-site-base="<?= adminEscape(adminPublicSiteBaseUrl()) ?>">
      <div class="manual-editor__toolbar panel">
        <div>
          <h2><?= $isDigitalLeaflets ? 'Цифровая печать' : 'Карточки и ручные цены' ?></h2>
          <p><?= $isDigitalLeaflets ? 'Все цены цифровых листовок в одной таблице.' : 'Ручное редактирование карточек и таблиц для страницы ' . adminEscape($sitePage['title']) . '.' ?></p>
        </div>
        <div class="action-row">
          <button class="button button-soft" id="manualReload" type="button">Обновить</button>
          <button class="button button-primary" id="manualSave" type="button" disabled><?= adminEscape($publishButtonLabel) ?></button>
        </div>
      </div>

      <div id="manualStatus" class="notice notice-muted">Загружаю данные...</div>

      <?php if ($isDigitalLeaflets): ?>
        <section class="panel product-image-editor manual-product-image-editor">
          <div class="section-heading">
            <div>
              <h2>Изображение цифровой печати</h2>
              <p>Одно изображение используется во всей карточке цифровых листовок.</p>
            </div>
          </div>
          <div class="product-image-editor__layout">
            <div class="product-image-preview" id="digitalLeafletImagePreview">
              <img id="digitalLeafletImagePreviewImg" alt="Цифровая печать">
            </div>
            <div class="product-image-editor__controls">
              <strong>Цифровая печать</strong>
              <label class="field">
                <span>Файл JPG или PNG</span>
                <input id="digitalLeafletImageInput" type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png">
              </label>
              <button class="button button-primary" id="uploadDigitalLeafletImage" type="button" disabled>Загрузить изображение</button>
            </div>
          </div>
        </section>
      <?php endif; ?>

      <div id="manualCards" class="manual-cards"></div>
    </section>
    <script src="/assets/manual-cards-admin.js?v=20260814-2"></script>
    <?php
}
