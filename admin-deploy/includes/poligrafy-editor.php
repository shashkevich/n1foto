<?php
declare(strict_types=1);

function adminRenderPoligrafyEditor(?array $sitePage = null): void
{
    ?>
    <section class="layout-grid poligrafy-editor" data-poligrafy-editor="<?= adminEscape((string) ($sitePage['id'] ?? '')) ?>">
      <aside class="panel control-panel">
        <h2>Импорт</h2>

        <label class="field">
          <span>Тип изделия</span>
          <select id="productSelect"></select>
        </label>

        <label class="field">
          <span>CSV прайс партнера</span>
          <input id="csvInput" type="file" accept=".csv,text/csv">
        </label>

        <div class="action-row">
          <button class="button button-primary" id="buildPreview" type="button">Построить</button>
          <button class="button button-ghost" id="resetWork" type="button">Очистить</button>
        </div>

        <div id="importStatus" class="notice notice-muted">Загрузите CSV и нажмите «Построить».</div>
      </aside>

      <section class="panel coefficients-panel">
        <div class="section-heading">
          <h2>Авто-коэффициенты</h2>
          <button class="button button-soft" id="applyCoefficients" type="button" disabled>Применить</button>
        </div>
        <div id="coefficientsGrid" class="coefficients-grid"></div>
      </section>
    </section>

    <section class="panel result-panel is-empty" id="resultPanel">
      <div class="section-heading">
        <div>
          <h2>Расчет цен</h2>
          <p id="resultMeta">Загружаю текущие цены...</p>
        </div>
        <div class="action-row">
          <button class="button button-soft" id="saveInline" type="button" disabled>Сохранить правки</button>
          <button class="button button-primary" id="saveJson" type="button" disabled>Сохранить в тестовый сайт</button>
        </div>
      </div>

      <div class="table-tools">
        <label class="field field-inline">
          <span>Формат</span>
          <select id="formatFilter" disabled></select>
        </label>
        <label class="field field-inline">
          <span>Печать</span>
          <select id="colorFilter" disabled></select>
        </label>
        <label class="field field-inline">
          <span>Поиск</span>
          <input id="tableSearch" type="search" placeholder="бумага, формат, тираж" disabled>
        </label>
      </div>

      <div class="table-wrap">
        <table class="price-table">
          <thead>
            <tr>
              <th>Формат</th>
              <th>Печать</th>
              <th>Бумага</th>
              <th>Тираж</th>
              <th>Себестоимость</th>
              <th>Коэф.</th>
              <th>Цена</th>
              <th>Маржа</th>
              <th>Проверка</th>
            </tr>
          </thead>
          <tbody id="positionsBody">
            <tr>
              <td colspan="9" class="empty-cell">Здесь появятся текущие цены или данные после импорта CSV.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel preview-panel is-empty" id="previewPanel">
      <div class="section-heading">
        <div>
          <h2>Предпросмотр карточки</h2>
          <p id="cardsMeta">Карточки пока не сформированы</p>
        </div>
      </div>
      <div id="cardPreview" class="card-preview"></div>
    </section>
    <?php
}
