(function () {
  const root = document.getElementById('manual-cards-editor');

  if (!root) {
    return;
  }

  const pageId = new URLSearchParams(window.location.search).get('page') || '';
  const cardsRoot = document.getElementById('manualCards');
  const status = document.getElementById('manualStatus');
  const saveButton = document.getElementById('manualSave');
  const reloadButton = document.getElementById('manualReload');
  const digitalImagePreview = document.getElementById('digitalLeafletImagePreview');
  const digitalImagePreviewImg = document.getElementById('digitalLeafletImagePreviewImg');
  const digitalImageInput = document.getElementById('digitalLeafletImageInput');
  const uploadDigitalImageButton = document.getElementById('uploadDigitalLeafletImage');
  const isProduction = String(root.dataset.publicSiteBase || '').replace(/\/$/, '') === 'https://n1foto.com';
  const supportsImageUpload = root.dataset.imageUpload === '1';
  const isHomePage = pageId === 'home';

  let pageData = null;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const setStatus = (message, type = 'muted') => {
    status.className = `notice notice-${type}`;
    status.textContent = message;
  };

  const getApiUrl = () => root.dataset.manualApi || `/api/page-json.php?page=${encodeURIComponent(pageId)}`;

  const getPublicImageUrl = (path, cacheBust = false) => {
    const publicBase = String(root.dataset.publicSiteBase || '').replace(/\/$/, '');
    const normalizedPath = String(path || '').replace(/^\//, '');

    return normalizedPath ? `${publicBase}/${normalizedPath}${cacheBust ? `?v=${Date.now()}` : ''}` : '';
  };

  const getAdminImageUrl = (path, cacheBust = false) => {
    const normalizedPath = String(path || '').replace(/^\//, '');

    return normalizedPath
      ? `/api/site-image.php?path=${encodeURIComponent(normalizedPath)}${cacheBust ? `&v=${Date.now()}` : ''}`
      : '';
  };

  const getDigitalLeafletSection = () => (pageData && Array.isArray(pageData.sections)
    ? pageData.sections.find((section) => section.id === 'listovki-cifra')
    : null);

  const renderDigitalLeafletImage = (cacheBust = false) => {
    if (!digitalImagePreview || !digitalImagePreviewImg) {
      return;
    }

    const section = getDigitalLeafletSection();
    const imagePath = section
      ? section.cards.flatMap((card) => card.img || []).find(Boolean) || 'img/listovki/fly_a5.jpg'
      : '';

    if (!imagePath) {
      digitalImagePreview.classList.add('is-empty');
      digitalImagePreviewImg.removeAttribute('src');
      return;
    }

    const publicBase = String(root.dataset.publicSiteBase || '').replace(/\/$/, '');
    digitalImagePreviewImg.src = `${publicBase}/${String(imagePath).replace(/^\//, '')}${cacheBust ? `?v=${Date.now()}` : ''}`;
    digitalImagePreview.classList.remove('is-empty');
  };

  const loadPageData = async () => {
    const response = await fetch(getApiUrl(), {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Не удалось загрузить JSON страницы: ${response.status}`);
    }

    pageData = await response.json();

    (pageData.sections || []).forEach((section) => {
      (section.cards || []).forEach((card) => {
        if (card.calculatorType === 'plotter-stickers' && !Array.isArray(card.extras)) {
          card.extras = [{
            id: 'complex-selection',
            label: 'Сложная выборка',
            percent: 50
          }];
        }
      });
    });
  };

  const savePageData = async () => {
    const response = await fetch(getApiUrl(), {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pageData)
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `Не удалось сохранить JSON: ${response.status}`);
    }

    const message = isProduction
      ? `Опубликовано на n1foto.com: ${payload.path}.`
      : `Сохранено только на тестовый сайт: ${payload.path}.`;
    setStatus(message, 'success');
  };

  const getHeaders = (rows) => Object.keys(rows[0] || {});

  const getPriceHeaders = (cards) => {
    const headers = new Set();

    cards.forEach((card) => {
      (card.table || []).forEach((row) => {
        Object.keys(row).slice(1).forEach((header) => headers.add(header));
      });
    });

    return Array.from(headers).sort((left, right) => {
      const leftNumber = Number.parseInt(left.replace(/\D/g, ''), 10);
      const rightNumber = Number.parseInt(right.replace(/\D/g, ''), 10);

      return leftNumber - rightNumber;
    });
  };

  const getPrintSideLabel = (card) => {
    const color = String(card.color || '').toLowerCase();

    return color.includes('двух') ? '2 стороны' : '1 сторона';
  };

  const syncInputValue = (input) => {
    if (isHomePage) {
      const section = pageData.main[Number(input.dataset.sectionIndex)];
      const card = section.content[Number(input.dataset.cardIndex)];

      if (input.dataset.field === 'home-title') {
        card.title = input.value;
      }

      saveButton.disabled = false;
      return;
    }

    const section = pageData.sections[Number(input.dataset.sectionIndex)];
    const card = section.cards[Number(input.dataset.cardIndex)];
    const value = input.value;

    if (input.dataset.field === 'title') {
      card.title = value;
    } else if (input.dataset.field === 'subtitle') {
      card.subtitle = value;
    } else if (input.dataset.field === 'images') {
      card.img = value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (input.dataset.field === 'footer') {
      card.footer = value;
    } else if (input.dataset.field === 'price_title') {
      card.price_title = value;
    } else if (input.dataset.field === 'description') {
      card.description = value;
    } else if (input.dataset.field === 'notice') {
      card.notice = value;
    } else if (input.dataset.field === 'cut-label') {
      card.cutLabel = value;
    } else if (input.dataset.field === 'area-threshold') {
      card.areaThreshold = value;
    } else if (input.dataset.field === 'cut-price') {
      card.cutPrice = value;
    } else if (input.dataset.field === 'material-label') {
      card.materials[Number(input.dataset.materialIndex)].label = value;
    } else if (input.dataset.field === 'material-price-small') {
      card.materials[Number(input.dataset.materialIndex)].priceUpToThreshold = value;
    } else if (input.dataset.field === 'material-price-large') {
      card.materials[Number(input.dataset.materialIndex)].priceAboveThreshold = value;
    } else if (input.dataset.field === 'minimum-order') {
      card.minimumOrder = value;
    } else if (input.dataset.field === 'extra-label') {
      card.extras[Number(input.dataset.extraIndex)].label = value;
    } else if (input.dataset.field === 'extra-percent') {
      card.extras[Number(input.dataset.extraIndex)].percent = value;
    } else if (input.dataset.field === 'cell') {
      const row = card.table[Number(input.dataset.rowIndex)];
      const header = input.dataset.header;
      row[header] = value;
    }

    saveButton.disabled = false;
  };

  const renameHeader = (sectionIndex, cardIndex, oldHeader, newHeader) => {
    const card = pageData.sections[sectionIndex].cards[cardIndex];
    const normalizedNewHeader = newHeader.trim();

    if (!normalizedNewHeader || normalizedNewHeader === oldHeader) {
      render();
      return;
    }

    card.table = (card.table || []).map((row) => {
      const nextRow = {};

      Object.keys(row).forEach((header) => {
        nextRow[header === oldHeader ? normalizedNewHeader : header] = row[header];
      });

      return nextRow;
    });

    saveButton.disabled = false;
    render();
  };

  const addRow = (sectionIndex, cardIndex) => {
    const card = pageData.sections[sectionIndex].cards[cardIndex];
    const headers = getHeaders(card.table || []);
    const row = {};

    headers.forEach((header) => {
      row[header] = '';
    });

    card.table.push(row);
    saveButton.disabled = false;
    render();
  };

  const removeRow = (sectionIndex, cardIndex, rowIndex) => {
    const card = pageData.sections[sectionIndex].cards[cardIndex];
    card.table.splice(rowIndex, 1);
    saveButton.disabled = false;
    render();
  };

  const addColumn = (sectionIndex, cardIndex) => {
    const card = pageData.sections[sectionIndex].cards[cardIndex];
    const header = `Новая колонка ${getHeaders(card.table || []).length + 1}`;

    card.table.forEach((row) => {
      row[header] = '';
    });

    saveButton.disabled = false;
    render();
  };

  const removeColumn = (sectionIndex, cardIndex, header) => {
    const card = pageData.sections[sectionIndex].cards[cardIndex];

    card.table.forEach((row) => {
      delete row[header];
    });

    saveButton.disabled = false;
    render();
  };

  const addExtra = (sectionIndex, cardIndex) => {
    const card = pageData.sections[sectionIndex].cards[cardIndex];
    card.extras = Array.isArray(card.extras) ? card.extras : [];
    card.extras.push({
      id: `extra-${Date.now()}-${card.extras.length + 1}`,
      label: 'Новая доплата',
      percent: 0
    });
    saveButton.disabled = false;
    render();
  };

  const removeExtra = (sectionIndex, cardIndex, extraIndex) => {
    const card = pageData.sections[sectionIndex].cards[cardIndex];
    card.extras.splice(extraIndex, 1);
    saveButton.disabled = false;
    render();
  };

  const renderTableEditor = (section, sectionIndex, card, cardIndex) => {
    const rows = card.table || [];
    const headers = getHeaders(rows);

    if (!rows.length || !headers.length) {
      return '<div class="notice notice-muted">Таблица пустая.</div>';
    }

    return `
      <div class="manual-table-tools">
        <button class="button button-soft" type="button" data-action="add-row" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">Добавить строку</button>
        <button class="button button-soft" type="button" data-action="add-column" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">Добавить колонку</button>
      </div>
      <div class="table-wrap">
        <table class="manual-edit-table">
          <thead>
            <tr>
              ${headers.map((header) => `
                <th>
                  <input class="manual-header-input" value="${escapeHtml(header)}" data-action="rename-header" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-header="${escapeHtml(header)}">
                  <button class="icon-text-button" type="button" data-action="remove-column" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-header="${escapeHtml(header)}">Удалить</button>
                </th>
              `).join('')}
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, rowIndex) => `
              <tr>
                ${headers.map((header) => `
                  <td>
                    <input value="${escapeHtml(row[header] || '')}" data-field="cell" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-row-index="${rowIndex}" data-header="${escapeHtml(header)}">
                  </td>
                `).join('')}
                <td>
                  <button class="icon-text-button" type="button" data-action="remove-row" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-row-index="${rowIndex}">Удалить</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderCardImageEditor = (sectionIndex, card, cardIndex) => {
    if (!supportsImageUpload) {
      return '';
    }

    const imagePath = (card.img || []).find(Boolean) || '';
    const imageUrl = getPublicImageUrl(imagePath);

    return `
      <div class="manual-card-image-editor">
        <div class="manual-card-image-preview${imageUrl ? '' : ' is-empty'}">
          ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(card.title || 'Изображение карточки')}">` : '<span>Нет изображения</span>'}
        </div>
        <div class="manual-card-image-controls">
          <strong>Изображение карточки</strong>
          <p>${imagePath ? escapeHtml(imagePath) : 'Загрузите квадратное изображение JPG или PNG.'}</p>
          <label class="field">
            <span>Файл JPG или PNG</span>
            <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" data-action="page-image-input" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">
          </label>
          <button class="button button-primary" type="button" data-action="upload-page-image" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" disabled>Загрузить изображение</button>
        </div>
      </div>
    `;
  };

  const renderExtrasEditor = (sectionIndex, card, cardIndex) => {
    const hasExtras = Array.isArray(card.extras);
    const hasMinimumOrder = Object.prototype.hasOwnProperty.call(card, 'minimumOrder');

    if (!hasExtras && !hasMinimumOrder) {
      return '';
    }

    return `
      <section class="manual-extras-editor">
        <div class="manual-extras-editor__heading">
          <div>
            <strong>Доплаты калькулятора</strong>
            <p>Проценты складываются и применяются к базовой цене.</p>
          </div>
          ${hasExtras ? `<button class="button button-soft" type="button" data-action="add-extra" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">Добавить доплату</button>` : ''}
        </div>
        ${hasExtras ? `
          <div class="manual-extras-list">
            ${card.extras.map((extra, extraIndex) => `
              <div class="manual-extra-row">
                <label class="field">
                  <span>Название</span>
                  <input value="${escapeHtml(extra.label || '')}" data-field="extra-label" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-extra-index="${extraIndex}">
                </label>
                <label class="field manual-extra-percent">
                  <span>Процент</span>
                  <input type="number" min="0" step="1" value="${escapeHtml(extra.percent ?? 0)}" data-field="extra-percent" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-extra-index="${extraIndex}">
                </label>
                <button class="icon-text-button" type="button" data-action="remove-extra" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-extra-index="${extraIndex}">Удалить</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
        ${hasMinimumOrder ? `
          <label class="field manual-minimum-order">
            <span>Минимальная стоимость заказа, ₽</span>
            <input type="number" min="0" step="10" value="${escapeHtml(card.minimumOrder ?? 0)}" data-field="minimum-order" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">
          </label>
        ` : ''}
      </section>
    `;
  };

  const renderHomeCard = (sectionIndex, card, cardIndex) => {
    const imagePath = card.img || '';
    const imageUrl = getAdminImageUrl(imagePath);

    return `
      <article class="home-card-editor panel">
        <div class="home-card-image-preview${imageUrl ? '' : ' is-empty'}">
          ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(card.alt || card.title || 'Изображение карточки')}">` : '<span>Нет изображения</span>'}
        </div>
        <div class="home-card-editor__content">
          <div>
            <strong>${escapeHtml(card.name || card.title || `Карточка ${cardIndex + 1}`)}</strong>
            <p class="home-card-editor__link">${escapeHtml(card.link || '')}</p>
          </div>
          <label class="field">
            <span>Подпись под изображением</span>
            <input value="${escapeHtml(card.title || '')}" data-field="home-title" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">
          </label>
          <div class="home-card-editor__upload">
            <label class="field">
              <span>Изображение JPG или PNG</span>
              <input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" data-action="page-image-input" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">
            </label>
            <button class="button button-primary" type="button" data-action="upload-page-image" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" disabled>Загрузить</button>
          </div>
          <p class="home-card-editor__hint">Рекомендуемый размер: 600 × 450 px, соотношение 4:3.</p>
          ${imagePath ? `<p class="home-card-editor__path">${escapeHtml(imagePath)}</p>` : ''}
        </div>
      </article>
    `;
  };

  const renderHomePage = () => {
    const sections = pageData && Array.isArray(pageData.main) ? pageData.main : [];

    cardsRoot.innerHTML = sections.map((section, sectionIndex) => `
      <section class="manual-section home-editor-section">
        <div class="section-heading">
          <div>
            <h2>${escapeHtml(section.title || `Раздел ${sectionIndex + 1}`)}</h2>
            <p>${section.content?.length || 0} карточек</p>
          </div>
        </div>
        <div class="home-cards-editor-grid">
          ${(section.content || []).map((card, cardIndex) => renderHomeCard(sectionIndex, card, cardIndex)).join('')}
        </div>
      </section>
    `).join('');
  };

  const renderPlasticSignSettings = (sectionIndex, card, cardIndex) => {
    const materials = Array.isArray(card.materials) ? card.materials : [];
    const threshold = card.areaThreshold ?? 6;

    return `
      <section class="manual-calculator-settings">
        <div class="manual-calculator-settings__heading">
          <div>
            <strong>Параметры расчета</strong>
            <p>Цены применяются к общей площади всего тиража.</p>
          </div>
        </div>

        <div class="manual-calculator-base-grid">
          <label class="field">
            <span>Порог площади, м²</span>
            <input type="number" min="0.01" step="0.01" value="${escapeHtml(threshold)}" data-field="area-threshold" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">
          </label>
          <label class="field">
            <span>Резка, ₽/пог. м</span>
            <input type="number" min="0" step="1" value="${escapeHtml(card.cutPrice ?? 0)}" data-field="cut-price" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">
          </label>
          <label class="field">
            <span>Минимальный заказ, ₽</span>
            <input type="number" min="0" step="10" value="${escapeHtml(card.minimumOrder ?? 0)}" data-field="minimum-order" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">
          </label>
        </div>

        <div class="manual-materials-list">
          ${materials.map((item, materialIndex) => `
            <article class="manual-material-row">
              <label class="field manual-material-name">
                <span>Материал</span>
                <input value="${escapeHtml(item.label || '')}" data-field="material-label" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-material-index="${materialIndex}">
              </label>
              <label class="field">
                <span>До ${escapeHtml(threshold)} м², ₽/м²</span>
                <input type="number" min="0" step="1" value="${escapeHtml(item.priceUpToThreshold ?? 0)}" data-field="material-price-small" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-material-index="${materialIndex}">
              </label>
              <label class="field">
                <span>Свыше ${escapeHtml(threshold)} м², ₽/м²</span>
                <input type="number" min="0" step="1" value="${escapeHtml(item.priceAboveThreshold ?? 0)}" data-field="material-price-large" data-section-index="${sectionIndex}" data-card-index="${cardIndex}" data-material-index="${materialIndex}">
              </label>
            </article>
          `).join('')}
        </div>
      </section>
    `;
  };

  const renderPlasticSignCard = (section, sectionIndex, card, cardIndex) => {
    return `
      <article class="manual-card panel">
        <div class="manual-card__heading">
          <h3>${escapeHtml(card.title || 'Калькулятор печати на пластике')}</h3>
        </div>

        ${renderCardImageEditor(sectionIndex, card, cardIndex)}

        <div class="manual-card-grid">
          <label class="field">
            <span>Заголовок карточки</span>
            <textarea rows="2" data-field="title" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.title || '')}</textarea>
          </label>
          <label class="field">
            <span>Текст под заголовком</span>
            <textarea rows="2" data-field="description" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.description || '')}</textarea>
          </label>
          <label class="field">
            <span>Название опции резки</span>
            <textarea rows="2" data-field="cut-label" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.cutLabel || '')}</textarea>
          </label>
          <label class="field">
            <span>Пояснение к резке</span>
            <textarea rows="2" data-field="notice" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.notice || '')}</textarea>
          </label>
          <label class="field manual-card-grid__wide">
            <span>Примечание под калькулятором</span>
            <textarea rows="3" data-field="footer" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.footer || '')}</textarea>
          </label>
        </div>

        ${renderPlasticSignSettings(sectionIndex, card, cardIndex)}
      </article>
    `;
  };

  const renderCard = (section, sectionIndex, card, cardIndex) => {
    if (card.calculatorType === 'plastic-sign') {
      return renderPlasticSignCard(section, sectionIndex, card, cardIndex);
    }

    return `
      <article class="manual-card panel">
        <div class="manual-card__heading">
          <h3>${escapeHtml(card.title || `${section.title} · карточка ${cardIndex + 1}`)}</h3>
        </div>

        ${renderCardImageEditor(sectionIndex, card, cardIndex)}

        <div class="manual-card-grid">
          <label class="field">
            <span>Заголовок</span>
            <textarea rows="2" data-field="title" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.title || '')}</textarea>
          </label>

          ${supportsImageUpload ? '' : `
            <label class="field">
              <span>Картинки, по одной на строку</span>
              <textarea rows="2" data-field="images" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml((card.img || []).join('\n'))}</textarea>
            </label>
          `}

          ${'description' in card ? `
            <label class="field">
              <span>${pageId === 'nakleyki' ? 'Краткое описание материала' : 'Описание метода'}</span>
              <textarea rows="4" data-field="description" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.description || '')}</textarea>
            </label>
          ` : ''}

          ${'subtitle' in card ? `
            <label class="field">
              <span>Способ печати или обработки</span>
              <textarea rows="2" data-field="subtitle" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.subtitle || '')}</textarea>
            </label>
          ` : ''}

          ${'notice' in card ? `
            <label class="field">
              <span>Короткая подсказка</span>
              <textarea rows="3" data-field="notice" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.notice || '')}</textarea>
            </label>
          ` : ''}

          <label class="field">
            <span>Подпись перед таблицей</span>
            <textarea rows="2" data-field="price_title" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.price_title || '')}</textarea>
          </label>

          <label class="field">
            <span>Примечание под таблицей</span>
            <textarea rows="4" data-field="footer" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.footer || '')}</textarea>
          </label>
        </div>

        ${renderExtrasEditor(sectionIndex, card, cardIndex)}

        ${renderTableEditor(section, sectionIndex, card, cardIndex)}
      </article>
    `;
  };

  const renderDigitalLeafletTable = (section, sectionIndex) => {
    const cards = section.cards || [];
    const priceHeaders = getPriceHeaders(cards);

    if (!cards.length || !priceHeaders.length) {
      return '<div class="notice notice-muted">Таблица цифровых листовок пустая.</div>';
    }

    return `
      <section class="manual-unified panel">
        <div class="section-heading manual-unified__heading">
          <div>
            <h2>Цены цифровой печати</h2>
            <p>Каждая строка — сочетание формата, печати и бумаги. Цены можно менять прямо в таблице.</p>
          </div>
        </div>
        <div class="table-wrap manual-unified__table-wrap">
          <table class="manual-edit-table manual-unified-table">
            <thead>
              <tr>
                <th>Формат</th>
                <th>Печать</th>
                <th>Бумага</th>
                ${priceHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${cards.map((card, cardIndex) => {
                const rows = card.table || [];

                return rows.map((row, rowIndex) => {
                  const paperHeader = Object.keys(row)[0] || '';

                  return `
                    <tr>
                      ${rowIndex === 0 ? `<th class="manual-unified-table__format" rowspan="${rows.length}">${escapeHtml(card.formatLabel || card.format || '')}</th>` : ''}
                      ${rowIndex === 0 ? `<th class="manual-unified-table__print" rowspan="${rows.length}">${escapeHtml(getPrintSideLabel(card))}</th>` : ''}
                      <th class="manual-unified-table__paper">${escapeHtml(row[paperHeader] || '')}</th>
                      ${priceHeaders.map((header) => {
                        return `
                          <td>
                            <input
                              class="manual-price-input"
                              value="${escapeHtml(row[header] || '')}"
                              aria-label="${escapeHtml(`${card.formatLabel || card.format}, ${getPrintSideLabel(card)}, ${row[paperHeader] || ''}, ${header}`)}"
                              data-field="cell"
                              data-section-index="${sectionIndex}"
                              data-card-index="${cardIndex}"
                              data-row-index="${rowIndex}"
                              data-header="${escapeHtml(header)}"
                            >
                          </td>
                        `;
                      }).join('')}
                    </tr>
                  `;
                }).join('');
              }).join('')}
            </tbody>
          </table>
        </div>
      </section>
    `;
  };

  const render = () => {
    if (isHomePage) {
      renderHomePage();
      return;
    }

    const sections = pageData && Array.isArray(pageData.sections) ? pageData.sections : [];

    cardsRoot.innerHTML = sections.map((section, sectionIndex) => {
      if (section.id === 'listovki-cifra') {
        return renderDigitalLeafletTable(section, sectionIndex);
      }

      return `
        <section class="manual-section">
          <div class="section-heading">
            <div>
              <h2>${escapeHtml(section.title || section.id)}</h2>
              <p>${escapeHtml(section.id)}</p>
            </div>
          </div>
          ${(section.cards || []).map((card, cardIndex) => renderCard(section, sectionIndex, card, cardIndex)).join('')}
        </section>
      `;
    }).join('');

    renderDigitalLeafletImage();
  };

  const uploadPageImage = async (sectionIndex, cardIndex, button) => {
    const section = isHomePage ? pageData.main[sectionIndex] : pageData.sections[sectionIndex];
    const card = isHomePage ? section.content[cardIndex] : section.cards[cardIndex];
    const input = cardsRoot.querySelector(`input[data-action="page-image-input"][data-section-index="${sectionIndex}"][data-card-index="${cardIndex}"]`);

    if (!input || !input.files.length) {
      return;
    }

    const formData = new FormData();
    formData.append('page', pageId);
    formData.append('sectionId', isHomePage ? 'main' : section.id);
    formData.append('cardId', isHomePage ? `card-${sectionIndex}-${cardIndex}` : (card.id || ''));
    formData.append('image', input.files[0]);

    try {
      button.disabled = true;
      setStatus(`Загружаю изображение для карточки «${card.title || card.id}»...`);

      const response = await fetch('/api/page-image.php', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || `Не удалось загрузить изображение: ${response.status}`);
      }

      card.img = isHomePage ? payload.path : [payload.path];
      render();
      setStatus('Изображение загружено и опубликовано на сайте.', 'success');
    } catch (error) {
      setStatus(error.message, 'danger');
      button.disabled = false;
    }
  };

  cardsRoot.addEventListener('input', (event) => {
    if (event.target.matches('input[data-field], textarea[data-field]')) {
      syncInputValue(event.target);
    }
  });

  cardsRoot.addEventListener('change', (event) => {
    if (event.target.matches('input[data-action="page-image-input"]')) {
      const sectionIndex = event.target.dataset.sectionIndex;
      const cardIndex = event.target.dataset.cardIndex;
      const uploadButton = cardsRoot.querySelector(`button[data-action="upload-page-image"][data-section-index="${sectionIndex}"][data-card-index="${cardIndex}"]`);

      if (uploadButton) {
        uploadButton.disabled = !event.target.files.length;
      }

      return;
    }

    if (event.target.matches('[data-action="rename-header"]')) {
      renameHeader(
        Number(event.target.dataset.sectionIndex),
        Number(event.target.dataset.cardIndex),
        event.target.dataset.header,
        event.target.value
      );
    }
  });

  cardsRoot.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');

    if (!button) {
      return;
    }

    const sectionIndex = Number(button.dataset.sectionIndex);
    const cardIndex = Number(button.dataset.cardIndex);

    if (button.dataset.action === 'upload-page-image') {
      await uploadPageImage(sectionIndex, cardIndex, button);
    } else if (button.dataset.action === 'add-extra') {
      addExtra(sectionIndex, cardIndex);
    } else if (button.dataset.action === 'remove-extra') {
      removeExtra(sectionIndex, cardIndex, Number(button.dataset.extraIndex));
    } else if (button.dataset.action === 'add-row') {
      addRow(sectionIndex, cardIndex);
    } else if (button.dataset.action === 'remove-row') {
      removeRow(sectionIndex, cardIndex, Number(button.dataset.rowIndex));
    } else if (button.dataset.action === 'add-column') {
      addColumn(sectionIndex, cardIndex);
    } else if (button.dataset.action === 'remove-column') {
      removeColumn(sectionIndex, cardIndex, button.dataset.header);
    }
  });

  reloadButton.addEventListener('click', async () => {
    try {
      saveButton.disabled = true;
      setStatus('Загружаю текущие карточки...');
      await loadPageData();
      render();
      setStatus('Данные загружены.', 'success');
    } catch (error) {
      setStatus(error.message, 'danger');
    }
  });

  saveButton.addEventListener('click', async () => {
    try {
      saveButton.disabled = true;
      setStatus('Сохраняю данные...');
      await savePageData();
    } catch (error) {
      setStatus(error.message, 'danger');
      saveButton.disabled = false;
    }
  });

  if (digitalImageInput && uploadDigitalImageButton) {
    digitalImageInput.addEventListener('change', () => {
      uploadDigitalImageButton.disabled = !digitalImageInput.files.length;
    });

    uploadDigitalImageButton.addEventListener('click', async () => {
      if (!digitalImageInput.files.length) {
        return;
      }

      const formData = new FormData();
      formData.append('section', 'listovki-cifra');
      formData.append('productId', 'leaflet_digital');
      formData.append('image', digitalImageInput.files[0]);

      try {
        uploadDigitalImageButton.disabled = true;
        setStatus('Загружаю изображение цифровой печати...');

        const response = await fetch('/api/poligrafy-image.php', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || `Не удалось загрузить изображение: ${response.status}`);
        }

        const section = getDigitalLeafletSection();

        if (section) {
          section.cards.forEach((card) => {
            card.img = [payload.path];
          });
        }

        renderDigitalLeafletImage(true);
        digitalImageInput.value = '';
        setStatus('Изображение цифровой печати загружено.', 'success');
      } catch (error) {
        setStatus(error.message, 'danger');
      } finally {
        uploadDigitalImageButton.disabled = !digitalImageInput.files.length;
      }
    });
  }

  const initialize = async () => {
    try {
      await loadPageData();
      render();
      saveButton.disabled = true;
      setStatus('Данные загружены.', 'success');
    } catch (error) {
      setStatus(error.message, 'danger');
    }
  };

  if (document.readyState === 'complete') {
    initialize();
  } else {
    window.addEventListener('load', initialize, { once: true });
  }
})();
