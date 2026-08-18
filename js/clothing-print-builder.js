window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('print-method');

  if (!root) {
    return;
  }

  const formatOptions = [
    { name: 'A7 (7×10 см)', width: 7, height: 10 },
    { name: 'A6 (10×15 см)', width: 10, height: 15 },
    { name: 'A5 (15×20 см)', width: 15, height: 20 },
    { name: 'A4 (20×30 см)', width: 20, height: 30 },
    { name: 'A3 (30×40 см)', width: 30, height: 40 },
    { name: 'A2 (40×58 см)', width: 40, height: 58 },
    { name: 'Надпись 30×8 см', width: 30, height: 8 },
    { name: 'Свой формат', width: '', height: '' }
  ];

  const isUnavailable = (value) => {
    const normalized = String(value ?? '').trim().toLowerCase();
    return !normalized || normalized === '-' || normalized === 'null';
  };

  const makeImage = (card, title) => {
    const path = (card.img || []).find(Boolean);

    if (!path) {
      return null;
    }

    const wrap = document.createElement('div');
    wrap.className = 'clothing-method-card__image';
    const image = document.createElement('img');
    image.src = path;
    image.alt = title;
    image.loading = 'lazy';
    wrap.append(image);
    return wrap;
  };

  const formatMoney = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;

  const makeOrderSummary = () => {
    const summary = document.createElement('div');
    summary.className = 'print-order-summary';
    summary.hidden = true;
    summary.innerHTML = `
      <div class="print-order-summary__table-wrap">
        <table class="print-order-summary__table">
          <thead>
            <tr>
              <th>Формат</th>
              <th>Кол-во</th>
              <th>Стоимость</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
      <div class="print-order-summary__total">
        <span>Итого</span>
        <strong></strong>
      </div>
      <p class="print-order-summary__note" hidden></p>
    `;
    return summary;
  };

  const renderOrderSummary = (summary, items, total, note = '') => {
    const body = summary.querySelector('tbody');
    body.replaceChildren(...items.map((item) => {
      const row = document.createElement('tr');
      const format = document.createElement('td');
      const quantity = document.createElement('td');
      const cost = document.createElement('td');
      format.textContent = item.name;
      if (item.details && item.details.length) {
        const details = document.createElement('small');
        details.textContent = item.details.join(', ');
        format.append(details);
      }
      quantity.textContent = `${item.qty} шт`;
      cost.textContent = item.total === null ? 'по запросу' : formatMoney(item.total);
      row.append(format, quantity, cost);
      return row;
    }));

    summary.querySelector('.print-order-summary__total strong').textContent = total === null
      ? 'по запросу'
      : formatMoney(total);
    const noteElement = summary.querySelector('.print-order-summary__note');
    noteElement.textContent = note;
    noteElement.hidden = !note;
    summary.hidden = false;
  };

  const makeRemoveButton = (list, row) => {
    const remove = document.createElement('button');
    remove.className = 'print-format-remove';
    remove.type = 'button';
    remove.title = 'Удалить формат';
    remove.setAttribute('aria-label', 'Удалить формат');
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      if (list.children.length > 1) {
        row.remove();
      }
    });
    return remove;
  };

  const makeExtras = (extras) => {
    if (!Array.isArray(extras) || !extras.length) {
      return null;
    }

    const fieldset = document.createElement('fieldset');
    fieldset.className = 'print-format-extras';
    const legend = document.createElement('legend');
    legend.textContent = 'Дополнительно';
    fieldset.append(legend);

    extras.forEach((extra) => {
      const label = document.createElement('label');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = extra.id || extra.label;
      checkbox.dataset.label = extra.label || 'Доплата';
      checkbox.dataset.percent = String(extra.percent || 0);
      const text = document.createElement('span');
      text.textContent = `${extra.label} +${extra.percent}%`;
      label.append(checkbox, text);
      fieldset.append(label);
    });

    return fieldset;
  };

  const makeMatrixFormatRow = (list, formats, extras) => {
    const row = document.createElement('div');
    row.className = 'matrix-format-row';
    const formatLabel = document.createElement('label');
    formatLabel.textContent = 'Формат';
    const formatSelect = document.createElement('select');
    formatSelect.className = 'form-select';

    formats.forEach((format) => {
      const option = document.createElement('option');
      option.value = format;
      option.textContent = format;
      formatSelect.append(option);
    });
    formatLabel.append(formatSelect);

    const quantityLabel = document.createElement('label');
    quantityLabel.textContent = 'Количество';
    const quantityInput = document.createElement('input');
    quantityInput.className = 'form-control';
    quantityInput.type = 'number';
    quantityInput.name = 'qty';
    quantityInput.min = '1';
    quantityInput.value = '1';
    quantityInput.required = true;
    quantityLabel.append(quantityInput);
    row.append(formatLabel, quantityLabel, makeRemoveButton(list, row));
    const extraControls = makeExtras(extras);
    if (extraControls) row.append(extraControls);
    return row;
  };

  const tierMatchesQuantity = (label, quantity) => {
    const normalized = String(label || '').replace(/[–—]/g, '-').replace(/\s/g, '');
    const range = normalized.match(/^(\d+)-(\d+)$/);
    const plus = normalized.match(/^(\d+)\+$/);
    const exact = normalized.match(/^\d+$/);

    if (range) return quantity >= Number(range[1]) && quantity <= Number(range[2]);
    if (plus) return quantity >= Number(plus[1]);
    if (exact) return quantity === Number(normalized);
    return false;
  };

  const makeMatrixCalculator = (card) => {
    const rows = Array.isArray(card.table) ? card.table : [];
    const headers = Object.keys(rows[0] || {});
    const tierHeader = headers[0] || 'Тираж';
    const formats = headers.slice(1);
    const calculator = document.createElement('form');
    calculator.className = 'clothing-calculator clothing-calculator--multi';

    if (!rows.length || !formats.length) {
      calculator.textContent = 'Стоимость по запросу';
      return calculator;
    }

    const list = document.createElement('div');
    list.className = 'print-format-list';
    list.append(makeMatrixFormatRow(list, formats, card.extras));

    const actions = document.createElement('div');
    actions.className = 'print-calculator-actions';
    const add = document.createElement('button');
    add.className = 'btn btn-outline-primary';
    add.type = 'button';
    add.textContent = 'Добавить формат';
    const calculate = document.createElement('button');
    calculate.className = 'btn btn-primary';
    calculate.type = 'submit';
    calculate.textContent = 'Рассчитать';
    actions.append(add, calculate);

    const summary = makeOrderSummary();

    add.addEventListener('click', () => {
      list.append(makeMatrixFormatRow(list, formats, card.extras));
    });

    calculator.addEventListener('submit', (event) => {
      event.preventDefault();
      const selections = [...list.querySelectorAll('.matrix-format-row')].map((row) => {
        const selectedExtras = [...row.querySelectorAll('.print-format-extras input:checked')].map((input) => ({
          label: input.dataset.label,
          percent: parseNumber(input.dataset.percent)
        }));

        return {
          name: row.querySelector('select').value,
          qty: Math.max(1, Math.round(Number(row.querySelector('[name="qty"]').value) || 1)),
          extras: selectedExtras
        };
      });
      const totalQty = selections.reduce((sum, item) => sum + item.qty, 0);
      const tier = rows.find((priceRow) => tierMatchesQuantity(priceRow[tierHeader], totalQty));
      const items = selections.map(({ name, qty, extras }) => {
        const rawPrice = tier ? tier[name] : '';
        const baseUnitPrice = isUnavailable(rawPrice) || String(rawPrice).toLowerCase().includes('запрос')
          ? null
          : parseNumber(rawPrice, NaN);
        const extraPercent = extras.reduce((sum, extra) => sum + extra.percent, 0);
        const unitPrice = Number.isFinite(baseUnitPrice) && extraPercent > 0
          ? Math.ceil((baseUnitPrice * (1 + extraPercent / 100)) / 10) * 10
          : baseUnitPrice;

        return {
          name,
          qty,
          details: extras.map((extra) => `${extra.label} +${extra.percent}%`),
          total: Number.isFinite(unitPrice) ? unitPrice * qty : null
        };
      });
      const hasRequestPrice = items.some((item) => item.total === null);
      const calculatedTotal = hasRequestPrice ? null : items.reduce((sum, item) => sum + item.total, 0);
      const minimumOrder = parseNumber(card.minimumOrder);
      const minimumApplied = calculatedTotal !== null && minimumOrder > 0 && calculatedTotal < minimumOrder;
      const total = minimumApplied ? minimumOrder : calculatedTotal;
      const notes = [hasRequestPrice
        ? `Общее количество нанесений — ${totalQty} шт. Для этого количества стоимость уточняется индивидуально.`
        : `Цена рассчитана по общему количеству нанесений: ${totalQty} шт.`];
      if (minimumApplied) notes.push(`Применена минимальная стоимость заказа — ${formatMoney(minimumOrder)}.`);
      const note = notes.join(' ');
      renderOrderSummary(summary, items, total, note);
    });

    calculator.append(list, actions, summary);
    const minimumOrder = parseNumber(card.minimumOrder);
    if (minimumOrder > 0) {
      const minimumNotice = document.createElement('p');
      minimumNotice.className = 'print-calculator-minimum';
      minimumNotice.textContent = `Минимальный заказ — ${formatMoney(minimumOrder)}`;
      calculator.append(minimumNotice);
    }
    return calculator;
  };

  const parseNumber = (value, fallback = 0) => {
    const number = Number.parseFloat(String(value ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isFinite(number) ? number : fallback;
  };

  const getDtfRates = (card) => {
    const rows = Array.isArray(card.table) ? card.table : [];
    const getTiers = (name) => rows
      .filter((row) => String(row['Параметр'] || '').toLowerCase() === name.toLowerCase())
      .map((row) => ({
        max: String(row['До'] || '').trim() === '' ? Infinity : parseNumber(row['До'], Infinity),
        value: parseNumber(row['Значение'])
      }))
      .sort((left, right) => left.max - right.max);
    const getValue = (name, fallback) => {
      const row = rows.find((item) => String(item['Параметр'] || '').toLowerCase() === name.toLowerCase());
      return row ? parseNumber(row['Значение'], fallback) : fallback;
    };

    return {
      material: getTiers('Материал'),
      application: getTiers('Нанесение'),
      delivery: getValue('Доставка', 350),
      markup: getValue('Наценка', 1.4),
      minimum: getValue('Минимальный заказ', 1800)
    };
  };

  const getTierValue = (tiers, value, fallback) => {
    const tier = tiers.find((item) => value <= item.max);
    return tier ? tier.value : fallback;
  };

  const calculateMaterialLength = (items) => {
    const rollWidth = 58;
    const spacing = 0.3;
    const pieces = [];

    items.forEach((item) => {
      for (let index = 0; index < item.qty; index += 1) {
        const canRotate = item.height <= rollWidth;
        const normal = { width: item.width + spacing, height: item.height + spacing };
        const rotated = { width: item.height + spacing, height: item.width + spacing };
        pieces.push(canRotate && rotated.height < normal.height ? rotated : normal);
      }
    });

    pieces.sort((left, right) => right.height - left.height);
    const rows = [];

    pieces.forEach((piece) => {
      const target = rows.find((row) => row.width + piece.width <= rollWidth);

      if (target) {
        target.width += piece.width;
        target.height = Math.max(target.height, piece.height);
      } else {
        rows.push({ width: piece.width, height: piece.height });
      }
    });

    return rows.reduce((sum, row) => sum + row.height, 0) / 100;
  };

  const makeDtfFormatRow = (list, rowId) => {
    const row = document.createElement('div');
    row.className = 'dtf-format-row';
    row.dataset.rowId = String(rowId);

    const formatLabel = document.createElement('label');
    formatLabel.textContent = 'Формат';
    const select = document.createElement('select');
    select.className = 'form-select';
    formatOptions.forEach((format) => {
      const option = document.createElement('option');
      option.value = `${format.width},${format.height}`;
      option.textContent = format.name;
      select.append(option);
    });
    formatLabel.append(select);

    const makeNumberField = (labelText, name, value, min) => {
      const label = document.createElement('label');
      label.textContent = labelText;
      const input = document.createElement('input');
      input.className = 'form-control';
      input.type = 'number';
      input.name = name;
      input.value = String(value);
      input.min = String(min);
      input.required = true;
      label.append(input);
      return label;
    };

    const widthField = makeNumberField('Ширина, см', 'width', 7, 1);
    const heightField = makeNumberField('Высота, см', 'height', 10, 1);
    const qtyField = makeNumberField('Количество', 'qty', 1, 1);
    select.addEventListener('change', () => {
      const [width, height] = select.value.split(',');
      widthField.querySelector('input').value = width;
      heightField.querySelector('input').value = height;
    });

    row.append(formatLabel, widthField, heightField, qtyField, makeRemoveButton(list, row));
    return row;
  };

  const makeDtfCalculator = (card) => {
    const rates = getDtfRates(card);
    const calculator = document.createElement('form');
    calculator.className = 'clothing-calculator clothing-calculator--multi';
    const list = document.createElement('div');
    list.className = 'print-format-list dtf-format-list';
    let rowId = 0;
    list.append(makeDtfFormatRow(list, rowId));

    const actions = document.createElement('div');
    actions.className = 'print-calculator-actions';
    const add = document.createElement('button');
    add.className = 'btn btn-outline-primary';
    add.type = 'button';
    add.textContent = 'Добавить формат';
    const calculate = document.createElement('button');
    calculate.className = 'btn btn-primary';
    calculate.type = 'submit';
    calculate.textContent = 'Рассчитать';
    actions.append(add, calculate);

    const summary = makeOrderSummary();

    add.addEventListener('click', () => {
      rowId += 1;
      list.append(makeDtfFormatRow(list, rowId));
    });

    calculator.addEventListener('submit', (event) => {
      event.preventDefault();
      const items = [...list.querySelectorAll('.dtf-format-row')].map((row) => {
        const width = parseNumber(row.querySelector('[name="width"]').value);
        const height = parseNumber(row.querySelector('[name="height"]').value);
        const qty = Math.max(1, Math.round(parseNumber(row.querySelector('[name="qty"]').value, 1)));
        const selectedName = row.querySelector('select').selectedOptions[0]?.textContent || '';

        return {
          width,
          height,
          qty,
          name: selectedName === 'Свой формат' ? `${width}×${height} см` : selectedName
        };
      }).filter((item) => item.width > 0 && item.height > 0);
      const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

      if (!totalQty) {
        return;
      }

      const length = calculateMaterialLength(items);
      const materialRate = getTierValue(rates.material, length, 850);
      const applicationRate = getTierValue(rates.application, totalQty, 40);
      const materialCost = Math.ceil(length * materialRate);
      const costPerUnit = (materialCost + rates.delivery) / totalQty;
      const unitPrice = Math.ceil((costPerUnit * rates.markup + applicationRate) / 10) * 10;
      const calculatedTotal = unitPrice * totalQty;
      const total = Math.max(calculatedTotal, rates.minimum);

      const summaryItems = items.map((item) => ({
        name: item.name,
        qty: item.qty,
        total: unitPrice * item.qty
      }));
      const note = calculatedTotal < rates.minimum ? `Применена минимальная стоимость заказа — ${formatMoney(rates.minimum)}.` : '';
      renderOrderSummary(summary, summaryItems, total, note);
    });

    calculator.append(list, actions, summary);
    return calculator;
  };

  const renderCard = (card) => {
    const article = document.createElement('article');
    article.className = 'clothing-method-card';

    if (card.calculatorType === 'dtf') {
      article.classList.add('clothing-method-card--dtf');
    }

    const title = document.createElement('h2');
    title.className = 'clothing-method-card__title';
    title.textContent = card.title || 'Метод печати';
    article.append(title);

    const image = makeImage(card, title.textContent);
    if (image) article.append(image);

    if (card.notice) {
      const notice = document.createElement('p');
      notice.className = 'clothing-method-card__notice';
      notice.textContent = card.notice;
      article.append(notice);
    }

    if (card.description) {
      const details = document.createElement('details');
      details.className = 'clothing-method-card__details';
      const summary = document.createElement('summary');
      summary.textContent = 'Подробнее о методе';
      const description = document.createElement('p');
      description.textContent = card.description;
      details.append(summary, description);
      article.append(details);
    }

    article.append(card.calculatorType === 'dtf'
      ? makeDtfCalculator(card)
      : makeMatrixCalculator(card));

    if (card.footer) {
      const footer = document.createElement('div');
      footer.className = 'clothing-method-card__footer';
      footer.innerHTML = card.footer;
      article.append(footer);
    }

    return article;
  };

  fetch('/db/pages/pechat-na-odezhde.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not fetch clothing prices, status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      const section = (data.sections || []).find((item) => item.id === 'print-methods');
      const cards = section && Array.isArray(section.cards) ? section.cards : [];
      root.classList.add('clothing-methods-grid');
      root.replaceChildren(...cards.map(renderCard));
    })
    .catch((error) => {
      console.error(error);
      root.textContent = 'Не удалось загрузить цены. Обновите страницу позже.';
    });
});
