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

  const loadPageData = async () => {
    const response = await fetch(getApiUrl(), {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Не удалось загрузить JSON страницы: ${response.status}`);
    }

    pageData = await response.json();
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

    setStatus(`Сохранено в тестовый сайт: ${payload.path}. Проверьте страницу и затем сделайте коммит.`, 'success');
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
    const section = pageData.sections[Number(input.dataset.sectionIndex)];
    const card = section.cards[Number(input.dataset.cardIndex)];
    const value = input.value;

    if (input.dataset.field === 'title') {
      card.title = value;
    } else if (input.dataset.field === 'images') {
      card.img = value
        .split('\n')
        .map((item) => item.trim())
        .filter(Boolean);
    } else if (input.dataset.field === 'footer') {
      card.footer = value;
    } else if (input.dataset.field === 'price_title') {
      card.price_title = value;
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

  const renderCard = (section, sectionIndex, card, cardIndex) => {
    return `
      <article class="manual-card panel">
        <div class="manual-card__heading">
          <h3>${escapeHtml(section.title)} · карточка ${cardIndex + 1}</h3>
        </div>

        <div class="manual-card-grid">
          <label class="field">
            <span>Заголовок</span>
            <textarea rows="2" data-field="title" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.title || '')}</textarea>
          </label>

          <label class="field">
            <span>Картинки, по одной на строку</span>
            <textarea rows="2" data-field="images" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml((card.img || []).join('\n'))}</textarea>
          </label>

          <label class="field">
            <span>Подпись перед таблицей</span>
            <textarea rows="2" data-field="price_title" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.price_title || '')}</textarea>
          </label>

          <label class="field">
            <span>Примечание под таблицей</span>
            <textarea rows="4" data-field="footer" data-section-index="${sectionIndex}" data-card-index="${cardIndex}">${escapeHtml(card.footer || '')}</textarea>
          </label>
        </div>

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
                        const isAvailable = Object.prototype.hasOwnProperty.call(row, header);

                        if (!isAvailable) {
                          return '<td class="manual-unified-table__unavailable" aria-label="Этот тираж недоступен">—</td>';
                        }

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
  };

  cardsRoot.addEventListener('input', (event) => {
    if (event.target.matches('input[data-field], textarea[data-field]')) {
      syncInputValue(event.target);
    }
  });

  cardsRoot.addEventListener('change', (event) => {
    if (event.target.matches('[data-action="rename-header"]')) {
      renameHeader(
        Number(event.target.dataset.sectionIndex),
        Number(event.target.dataset.cardIndex),
        event.target.dataset.header,
        event.target.value
      );
    }
  });

  cardsRoot.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');

    if (!button) {
      return;
    }

    const sectionIndex = Number(button.dataset.sectionIndex);
    const cardIndex = Number(button.dataset.cardIndex);

    if (button.dataset.action === 'add-row') {
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

  loadPageData()
    .then(() => {
      render();
      saveButton.disabled = true;
      setStatus('Данные загружены.', 'success');
    })
    .catch((error) => {
      setStatus(error.message, 'danger');
    });
})();
