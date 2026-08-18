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

  const makeSelectRow = (labelText, select) => {
    const row = document.createElement('div');
    row.className = 'clothing-calculator__row';
    const label = document.createElement('label');
    label.textContent = labelText;
    label.htmlFor = select.id;
    row.append(label, select);
    return row;
  };

  const makeMatrixCalculator = (card, cardIndex) => {
    const rows = Array.isArray(card.table) ? card.table : [];
    const headers = Object.keys(rows[0] || {});
    const tierHeader = headers[0] || 'Тираж';
    const calculator = document.createElement('div');
    calculator.className = 'clothing-calculator';

    if (!rows.length || headers.length < 2) {
      calculator.textContent = 'Стоимость по запросу';
      return calculator;
    }

    const tierSelect = document.createElement('select');
    tierSelect.className = 'form-select';
    tierSelect.id = `clothing-tier-${cardIndex}`;
    rows.forEach((row, index) => {
      const option = document.createElement('option');
      option.value = String(index);
      option.textContent = row[tierHeader] || `Вариант ${index + 1}`;
      tierSelect.append(option);
    });

    const formatSelect = document.createElement('select');
    formatSelect.className = 'form-select';
    formatSelect.id = `clothing-format-${cardIndex}`;

    const priceRow = document.createElement('div');
    priceRow.className = 'clothing-calculator__row clothing-calculator__price-row';
    const priceLabel = document.createElement('div');
    priceLabel.className = 'clothing-calculator__label';
    priceLabel.textContent = 'Цена';
    const price = document.createElement('div');
    price.className = 'clothing-calculator__price';
    priceRow.append(priceLabel, price);

    const updateFormats = () => {
      const row = rows[Number(tierSelect.value)] || rows[0];
      const previous = formatSelect.value;
      formatSelect.replaceChildren();

      headers.slice(1).forEach((header) => {
        if (isUnavailable(row[header])) {
          return;
        }

        const option = document.createElement('option');
        option.value = header;
        option.textContent = header;
        formatSelect.append(option);
      });

      if ([...formatSelect.options].some((option) => option.value === previous)) {
        formatSelect.value = previous;
      }

      const selectedRow = rows[Number(tierSelect.value)] || rows[0];
      price.textContent = formatSelect.value ? selectedRow[formatSelect.value] : 'по запросу';
    };

    tierSelect.addEventListener('change', updateFormats);
    formatSelect.addEventListener('change', () => {
      const row = rows[Number(tierSelect.value)] || rows[0];
      price.textContent = row[formatSelect.value] || 'по запросу';
    });

    calculator.append(
      makeSelectRow(tierHeader, tierSelect),
      makeSelectRow('Размер', formatSelect),
      priceRow
    );
    updateFormats();
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
    const remove = document.createElement('button');
    remove.className = 'dtf-remove-button';
    remove.type = 'button';
    remove.title = 'Удалить формат';
    remove.setAttribute('aria-label', 'Удалить формат');
    remove.textContent = '×';

    select.addEventListener('change', () => {
      const [width, height] = select.value.split(',');
      widthField.querySelector('input').value = width;
      heightField.querySelector('input').value = height;
    });
    remove.addEventListener('click', () => {
      if (list.children.length > 1) {
        row.remove();
      }
    });

    row.append(formatLabel, widthField, heightField, qtyField, remove);
    return row;
  };

  const makeDtfCalculator = (card) => {
    const rates = getDtfRates(card);
    const calculator = document.createElement('form');
    calculator.className = 'clothing-calculator';
    const list = document.createElement('div');
    list.className = 'dtf-format-list';
    let rowId = 0;
    list.append(makeDtfFormatRow(list, rowId));

    const actions = document.createElement('div');
    actions.className = 'dtf-actions';
    const add = document.createElement('button');
    add.className = 'btn btn-outline-primary';
    add.type = 'button';
    add.textContent = 'Добавить формат';
    const calculate = document.createElement('button');
    calculate.className = 'btn btn-primary';
    calculate.type = 'submit';
    calculate.textContent = 'Рассчитать';
    actions.append(add, calculate);

    const result = document.createElement('div');
    result.className = 'dtf-result';
    result.hidden = true;
    result.innerHTML = `
      <div><span>Всего принтов</span><strong data-result="count"></strong></div>
      <div><span>Цена за один</span><strong data-result="unit"></strong></div>
      <div><span>Общая цена</span><strong data-result="total"></strong></div>
      <p class="dtf-minimum" data-result="minimum" hidden>Действует минимальная стоимость заказа.</p>
    `;

    add.addEventListener('click', () => {
      rowId += 1;
      list.append(makeDtfFormatRow(list, rowId));
    });

    calculator.addEventListener('submit', (event) => {
      event.preventDefault();
      const items = [...list.querySelectorAll('.dtf-format-row')].map((row) => ({
        width: parseNumber(row.querySelector('[name="width"]').value),
        height: parseNumber(row.querySelector('[name="height"]').value),
        qty: Math.max(1, Math.round(parseNumber(row.querySelector('[name="qty"]').value, 1)))
      })).filter((item) => item.width > 0 && item.height > 0);
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
      const total = unitPrice * totalQty;

      result.querySelector('[data-result="count"]').textContent = `${totalQty} шт`;
      result.querySelector('[data-result="unit"]').textContent = `${unitPrice} ₽`;
      result.querySelector('[data-result="total"]').textContent = `${total.toLocaleString('ru-RU')} ₽`;
      result.querySelector('[data-result="minimum"]').hidden = total >= rates.minimum;
      result.hidden = false;
    });

    calculator.append(list, actions, result);
    return calculator;
  };

  const renderCard = (card, index) => {
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
      : makeMatrixCalculator(card, index));

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
