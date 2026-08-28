(function () {
  const root = document.getElementById('stickerCalculators');

  if (!root) {
    return;
  }

  const formatMoney = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
  const formatArea = (value) => `${value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} м²`;
  const toNumber = (value) => {
    const normalized = String(value ?? '').replace(',', '.').replace(/[^0-9.-]/g, '');
    return Number.parseFloat(normalized) || 0;
  };
  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const cardHeader = (card) => {
    const image = Array.isArray(card.img) ? card.img.find(Boolean) : '';

    return `
      <header class="sticker-card__header">
        ${image ? `
          <div class="sticker-card__image">
            <img src="${escapeHtml(image)}" alt="${escapeHtml(card.title)}">
          </div>
        ` : ''}
        <div class="sticker-card__heading">
          <h2>${escapeHtml(card.title)}</h2>
          ${card.subtitle ? `<p class="sticker-card__subtitle">${escapeHtml(card.subtitle)}</p>` : ''}
        </div>
      </header>
      ${card.description ? `<p class="sticker-card__description">${escapeHtml(card.description)}</p>` : ''}
    `;
  };

  const cardFooter = (card) => card.footer
    ? `<p class="sticker-card__footer">${escapeHtml(card.footer)}</p>`
    : '';

  const getTierPrice = (row, quantity) => {
    const columns = Object.entries(row)
      .filter(([label]) => label !== 'Вариант')
      .map(([label, price]) => ({
        threshold: Number.parseInt(label.replace(/\D/g, ''), 10) || 1,
        price: toNumber(price)
      }))
      .sort((left, right) => left.threshold - right.threshold);
    let selected = columns[0] || { threshold: 1, price: 0 };

    columns.forEach((column) => {
      if (quantity >= column.threshold) {
        selected = column;
      }
    });

    return selected.price;
  };

  const renderSheetCalculator = (card) => {
    const rows = Array.isArray(card.table) ? card.table : [];
    const element = document.createElement('article');
    element.className = 'sticker-card sticker-card--sheet';
    element.innerHTML = `
      ${cardHeader(card)}
      ${card.price_title ? `<p class="sticker-card__hint">${escapeHtml(card.price_title)}</p>` : ''}
      <div class="sticker-card__controls sticker-card__controls--sheet">
        <label class="sticker-field">
          <span>Вариант</span>
          <select data-role="variant">
            ${rows.map((row, index) => `<option value="${index}">${escapeHtml(row['Вариант'] || '')}</option>`).join('')}
          </select>
        </label>
        <label class="sticker-field sticker-field--quantity">
          <span>Листов</span>
          <input data-role="quantity" type="number" min="1" step="1" value="1" inputmode="numeric">
        </label>
      </div>
      <div class="sticker-card__result">
        <div><span>Цена листа</span><strong data-role="unit-price">—</strong></div>
        <div class="sticker-card__total"><span>Стоимость</span><strong data-role="total-price">—</strong></div>
      </div>
      ${cardFooter(card)}
    `;

    const update = () => {
      const row = rows[Number(element.querySelector('[data-role="variant"]').value)] || rows[0];
      const quantity = Math.max(1, Math.floor(toNumber(element.querySelector('[data-role="quantity"]').value)));
      const unitPrice = row ? getTierPrice(row, quantity) : 0;
      element.querySelector('[data-role="unit-price"]').textContent = unitPrice ? formatMoney(unitPrice) : '—';
      element.querySelector('[data-role="total-price"]').textContent = unitPrice ? formatMoney(unitPrice * quantity) : '—';
    };

    element.addEventListener('input', update);
    element.addEventListener('change', update);
    update();
    return element;
  };

  const servicePrice = (card, name) => {
    const row = (card.table || []).find((item) => String(item['Услуга'] || '').toLowerCase().includes(name));
    return row ? toNumber(row['Цена, ₽/м²']) : 0;
  };

  const renderAreaCalculator = (card) => {
    const element = document.createElement('article');
    element.className = 'sticker-card sticker-card--area';
    element.innerHTML = `
      ${cardHeader(card)}
      ${card.price_title ? `<p class="sticker-card__hint">${escapeHtml(card.price_title)}</p>` : ''}
      <div class="sticker-card__controls sticker-card__controls--area">
        <label class="sticker-field">
          <span>Плёнка</span>
          <select data-role="finish">
            <option>Глянцевая</option>
            <option>Матовая</option>
          </select>
        </label>
        <label class="sticker-field">
          <span>Ширина, см</span>
          <input data-role="width" type="number" min="1" step="0.1" value="50" inputmode="decimal">
        </label>
        <label class="sticker-field">
          <span>Высота, см</span>
          <input data-role="height" type="number" min="1" step="0.1" value="50" inputmode="decimal">
        </label>
        <label class="sticker-field">
          <span>Количество</span>
          <input data-role="quantity" type="number" min="1" step="1" value="1" inputmode="numeric">
        </label>
      </div>
      <div class="sticker-options">
        <label><input data-role="cut" type="checkbox"> <span>Контурная резка</span></label>
        <label><input data-role="lamination" type="checkbox"> <span>Ламинация</span></label>
      </div>
      <div class="sticker-card__result">
        <div><span>Общая площадь</span><strong data-role="area">—</strong></div>
        <div class="sticker-card__total"><span>Стоимость</span><strong data-role="total-price">—</strong></div>
      </div>
      ${cardFooter(card)}
    `;

    const update = () => {
      const width = Math.max(0, toNumber(element.querySelector('[data-role="width"]').value));
      const height = Math.max(0, toNumber(element.querySelector('[data-role="height"]').value));
      const quantity = Math.max(1, Math.floor(toNumber(element.querySelector('[data-role="quantity"]').value)));
      const area = width * height * quantity / 10000;
      let rate = servicePrice(card, 'печать');

      if (element.querySelector('[data-role="cut"]').checked) {
        rate += servicePrice(card, 'резк');
      }
      if (element.querySelector('[data-role="lamination"]').checked) {
        rate += servicePrice(card, 'ламинац');
      }

      const calculated = area * rate;
      const total = area > 0 ? Math.max(calculated, toNumber(card.minimumOrder)) : 0;
      element.querySelector('[data-role="area"]').textContent = area > 0 ? formatArea(area) : '—';
      element.querySelector('[data-role="total-price"]').textContent = total > 0 ? formatMoney(total) : '—';
    };

    element.addEventListener('input', update);
    element.addEventListener('change', update);
    update();
    return element;
  };

  const renderPlotterCalculator = (card) => {
    const rows = Array.isArray(card.table) ? card.table : [];
    const element = document.createElement('article');
    element.className = 'sticker-card sticker-card--plotter';
    element.innerHTML = `
      ${cardHeader(card)}
      ${card.price_title ? `<p class="sticker-card__hint">${escapeHtml(card.price_title)}</p>` : ''}
      <div class="sticker-card__controls sticker-card__controls--area">
        <label class="sticker-field sticker-field--color">
          <span>Цвет плёнки</span>
          <select data-role="color">
            ${rows.map((row, index) => `<option value="${index}">${escapeHtml(row['Цвет'] || '')}</option>`).join('')}
          </select>
        </label>
        <label class="sticker-field">
          <span>Ширина, см</span>
          <input data-role="width" type="number" min="1" max="100" step="0.1" value="50" inputmode="decimal">
        </label>
        <label class="sticker-field">
          <span>Высота, см</span>
          <input data-role="height" type="number" min="1" step="0.1" value="50" inputmode="decimal">
        </label>
        <label class="sticker-field">
          <span>Количество</span>
          <input data-role="quantity" type="number" min="1" step="1" value="1" inputmode="numeric">
        </label>
      </div>
      <p class="sticker-card__validation" data-role="validation" hidden></p>
      <div class="sticker-card__result">
        <div><span>Общая площадь</span><strong data-role="area">—</strong></div>
        <div class="sticker-card__total"><span>Стоимость</span><strong data-role="total-price">—</strong></div>
      </div>
      ${cardFooter(card)}
    `;

    const update = () => {
      const row = rows[Number(element.querySelector('[data-role="color"]').value)] || rows[0];
      const width = Math.max(0, toNumber(element.querySelector('[data-role="width"]').value));
      const height = Math.max(0, toNumber(element.querySelector('[data-role="height"]').value));
      const quantity = Math.max(1, Math.floor(toNumber(element.querySelector('[data-role="quantity"]').value)));
      const area = width * height * quantity / 10000;
      const validation = element.querySelector('[data-role="validation"]');
      let totalText = '—';

      validation.hidden = true;
      if (width > 100) {
        validation.textContent = 'Максимальная ширина изделия — 100 см.';
        validation.hidden = false;
      } else if (area > 10) {
        totalText = 'Индивидуальный расчёт';
      } else if (row && area > 0) {
        const rate = area <= 1
          ? toNumber(row['До 1 м²'])
          : area <= 5
            ? toNumber(row['От 1 до 5 м²'])
            : toNumber(row['От 5 до 10 м²']);
        totalText = formatMoney(Math.max(area * rate, toNumber(row['Минимум, ₽'])));
      }

      element.querySelector('[data-role="area"]').textContent = area > 0 ? formatArea(area) : '—';
      element.querySelector('[data-role="total-price"]').textContent = width > 100 ? '—' : totalText;
    };

    element.addEventListener('input', update);
    element.addEventListener('change', update);
    update();
    return element;
  };

  const renderCard = (card) => {
    if (card.calculatorType === 'sheet-stickers') {
      return renderSheetCalculator(card);
    }
    if (card.calculatorType === 'area-stickers') {
      return renderAreaCalculator(card);
    }
    if (card.calculatorType === 'plotter-stickers') {
      return renderPlotterCalculator(card);
    }
    return null;
  };

  fetch('/db/pages/nakleyki.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Не удалось загрузить данные: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const cards = (data.sections || []).flatMap((section) => section.cards || []);
      const fragment = document.createDocumentFragment();

      cards.forEach((card) => {
        const element = renderCard(card);
        if (element) {
          fragment.append(element);
        }
      });

      root.replaceChildren(fragment);
    })
    .catch((error) => {
      root.innerHTML = `<p class="sticker-calculators__error">${escapeHtml(error.message)}</p>`;
    });
}());
