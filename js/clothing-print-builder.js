(() => {
  const dtfDefaultWidth = 57.5;
  const dtfRollWidth = 58;
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

  const formatMoney = (value, maximumFractionDigits = 0) => {
    const amount = maximumFractionDigits ? value : Math.round(value);
    return `${amount.toLocaleString('ru-RU', { maximumFractionDigits })} ₽`;
  };

  const makeOrderSummary = (includeDelivery = false) => {
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
          ${includeDelivery ? '<tfoot><tr><td colspan="2">Доставка</td><td></td></tr></tfoot>' : ''}
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

  const renderOrderSummary = (summary, items, total, note = '', delivery) => {
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

    if (delivery !== undefined) {
      summary.querySelector('tfoot td:last-child').textContent = formatMoney(delivery, 2);
    }
    summary.querySelector('.print-order-summary__total strong').textContent = total === null
      ? 'по запросу'
      : formatMoney(total, delivery === undefined ? 0 : 2);
    const noteElement = summary.querySelector('.print-order-summary__note');
    noteElement.textContent = note;
    noteElement.hidden = !note;
    summary.hidden = false;
  };

  const makeRemoveButton = (list, row, onRemove) => {
    const remove = document.createElement('button');
    remove.className = 'print-format-remove';
    remove.type = 'button';
    remove.title = 'Удалить формат';
    remove.setAttribute('aria-label', 'Удалить формат');
    remove.textContent = '×';
    remove.addEventListener('click', () => {
      if (list.children.length > 1) {
        row.remove();
        onRemove?.();
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

    const configuredWidth = getValue('Максимальная ширина материала', dtfDefaultWidth);
    return {
      material: getTiers('Материал'),
      application: getTiers('Нанесение'),
      delivery: getValue('Доставка', 350),
      markup: getValue('Наценка', 1.4),
      minimum: getValue('Минимальный заказ', 1800),
      maxPrintWidth: configuredWidth >= 1 && configuredWidth <= dtfRollWidth ? configuredWidth : dtfDefaultWidth
    };
  };

  const getTierValue = (tiers, value, fallback) => {
    const tier = tiers.find((item) => value <= item.max);
    return tier ? tier.value : fallback;
  };

  const dtfSpacing = 0.3;
  const dtfTolerance = 1e-9;
  const dtfPreviewPieceLimit = 600;
  const dtfOptimizationPieceLimit = 1000;

  const packDtfShelves = (pieces, maxPrintWidth, previewLength) => {
    const rows = [];
    const placements = [];
    let lengthCm = 0;

    pieces.forEach((piece) => {
      const target = rows.find((row) => row.width + dtfSpacing + piece.width <= maxPrintWidth + dtfTolerance);
      const x = target ? target.width + dtfSpacing : 0;
      const y = target ? target.y : lengthCm;
      if (target) {
        target.width += dtfSpacing + piece.width;
      } else {
        rows.push({ width: piece.width, y });
        lengthCm += piece.height + dtfSpacing;
      }
      if (y < previewLength && placements.length < dtfPreviewPieceLimit) {
        placements.push({ ...piece, x, y });
      }
    });

    return { lengthCm, placements };
  };

  const splitDtfSpace = (space, used) => {
    if (used.x >= space.right - dtfTolerance || used.right <= space.x + dtfTolerance
      || used.y >= space.bottom - dtfTolerance || used.bottom <= space.y + dtfTolerance) return [space];

    const parts = [];
    if (used.x > space.x + dtfTolerance) parts.push({ ...space, right: used.x });
    if (used.right < space.right - dtfTolerance) parts.push({ ...space, x: used.right });
    if (used.y > space.y + dtfTolerance) parts.push({ ...space, bottom: used.y });
    if (used.bottom < space.bottom - dtfTolerance) parts.push({ ...space, y: used.bottom });
    return parts;
  };

  const containsDtfSpace = (outer, inner) => outer.x <= inner.x && outer.y <= inner.y
    && outer.right >= inner.right && outer.bottom >= inner.bottom;

  const packDtfGaps = (pieces, maxPrintWidth, maxLength) => {
    // Reserve a gap after each print. The extra virtual width lets a print finish flush with the roll edge.
    let spaces = [{ x: 0, y: 0, right: maxPrintWidth + dtfSpacing, bottom: maxLength }];
    let remainingChecks = 400000;
    const placements = [];
    let lengthCm = 0;

    for (const piece of pieces) {
      const orientations = piece.width === piece.height ? [piece] : [piece, { ...piece, width: piece.height, height: piece.width }];
      let best = null;
      for (const space of spaces) {
        for (const orientation of orientations) {
          const right = space.x + orientation.width + dtfSpacing;
          const bottom = space.y + orientation.height + dtfSpacing;
          if (right > space.right + dtfTolerance || bottom > space.bottom + dtfTolerance) continue;
          if (!best || bottom < best.bottom || (bottom === best.bottom && space.x < best.x)) {
            best = { ...orientation, x: space.x, y: space.y, right, bottom };
          }
        }
      }
      if (!best) return null;

      const { x, y, width, height, itemIndex, bottom } = best;
      placements.push({ x, y, width, height, itemIndex });
      lengthCm = Math.max(lengthCm, bottom);
      const freeParts = spaces.flatMap((space) => splitDtfSpace(space, best));
      remainingChecks -= freeParts.length ** 2;
      if (remainingChecks < 0) return null;

      // Keep maximal free rectangles, removing duplicates as well as contained areas.
      spaces = freeParts.filter((space, index) => !freeParts.some((other, otherIndex) => otherIndex !== index
        && containsDtfSpace(other, space) && (otherIndex < index || !containsDtfSpace(space, other))));
    }

    return { lengthCm, placements };
  };

  const calculateMaterialLayout = (items, maxPrintWidth, previewLength) => {
    const pieces = items.flatMap((item, itemIndex) => {
      const shortSide = Math.min(item.width, item.height);
      const longSide = Math.max(item.width, item.height);
      const fitsAcross = longSide <= maxPrintWidth;
      const piece = {
        width: fitsAcross ? longSide : shortSide,
        height: fitsAcross ? shortSide : longSide,
        itemIndex
      };
      return Array(item.qty).fill(piece);
    });
    pieces.sort((left, right) => right.height - left.height);
    const shelves = packDtfShelves(pieces, maxPrintWidth, previewLength);
    if (pieces.length < 2 || pieces.length > dtfOptimizationPieceLimit) return shelves;

    const byArea = [...pieces].sort((left, right) => right.width * right.height - left.width * left.height);
    const byLongestSide = [...pieces].sort((left, right) => Math.max(right.width, right.height) - Math.max(left.width, left.height));
    let best = shelves;
    for (const order of [byArea, byLongestSide]) {
      const candidate = packDtfGaps(order, maxPrintWidth, best.lengthCm);
      if (candidate && candidate.lengthCm < best.lengthCm - dtfTolerance) best = candidate;
    }

    if (best === shelves) return shelves;
    const placements = best.placements.filter(({ y }) => y < previewLength).slice(0, dtfPreviewPieceLimit);
    return { lengthCm: best.lengthCm, placements, savedLengthCm: shelves.lengthCm - best.lengthCm };
  };

  const makeDtfFormatRow = (list, onChange) => {
    const row = document.createElement('div');
    row.className = 'dtf-format-row';

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

    const makeNumberField = (labelText, name, value, step = '1') => {
      const label = document.createElement('label');
      label.textContent = labelText;
      const input = document.createElement('input');
      input.className = 'form-control';
      input.type = 'number';
      input.name = name;
      input.value = String(value);
      input.min = '1';
      input.step = step;
      input.required = true;
      label.append(input);
      return label;
    };

    const widthField = makeNumberField('Ширина, см', 'width', 7, 'any');
    const heightField = makeNumberField('Высота, см', 'height', 10, 'any');
    const qtyField = makeNumberField('Количество', 'qty', 1);
    const widthInput = widthField.querySelector('input');
    const heightInput = heightField.querySelector('input');
    select.addEventListener('change', () => {
      const [width, height] = select.value.split(',');
      widthInput.value = width;
      heightInput.value = height;
      onChange();
    });

    row.append(formatLabel, widthField, heightField, qtyField, makeRemoveButton(list, row, onChange));
    return row;
  };

  const createDtfCalculator = (getCard, {
    autoCalculate = false, previewLength = 0, validateCard, onClear, onError, onCalculate
  } = {}) => {
    const calculator = document.createElement('form');
    calculator.className = 'clothing-calculator clothing-calculator--multi';
    const list = document.createElement('div');
    list.className = 'print-format-list dtf-format-list';

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
    actions.append(add);
    if (!autoCalculate) actions.append(calculate);

    const summary = makeOrderSummary(true);
    let calculationTimer;

    const refresh = () => {
      const { maxPrintWidth } = getDtfRates(getCard());
      for (const row of list.children) {
        const width = row.querySelector('[name="width"]');
        const height = row.querySelector('[name="height"]');
        width.setCustomValidity(Math.min(width.valueAsNumber, height.valueAsNumber) > maxPrintWidth
          ? `Короткая сторона принта должна быть не больше ${maxPrintWidth.toLocaleString('ru-RU', { maximumFractionDigits: 20 })} см.`
          : '');
      }
      if (autoCalculate) {
        // Coalesce edits to sizes and quantities while the user is typing.
        clearTimeout(calculationTimer);
        calculationTimer = setTimeout(calculateOrder, 100);
      } else {
        summary.hidden = true;
        onClear?.();
      }
    };

    const addFormat = () => {
      list.append(makeDtfFormatRow(list, refresh));
      refresh();
    };
    list.addEventListener('input', refresh);
    add.addEventListener('click', addFormat);

    const calculateOrder = () => {
      const invalidField = list.querySelector('input:invalid');
      if (invalidField) {
        summary.hidden = true;
        if (invalidField.validity.valueMissing) onClear?.();
        else onError?.(invalidField.validationMessage);
        return;
      }
      const card = getCard();
      try {
        validateCard?.(card);
      } catch (error) {
        summary.hidden = true;
        onError?.(error.message);
        return;
      }
      const rates = getDtfRates(card);
      const items = [...list.querySelectorAll('.dtf-format-row')].map((row) => {
        const width = row.querySelector('[name="width"]').valueAsNumber;
        const height = row.querySelector('[name="height"]').valueAsNumber;
        const qty = Math.max(1, Math.round(parseNumber(row.querySelector('[name="qty"]').value, 1)));
        const format = formatOptions[row.querySelector('select').selectedIndex];

        return {
          width,
          height,
          qty,
          name: format?.width === width && format.height === height ? format.name : `${width}×${height} см`
        };
      }).filter((item) => item.width > 0 && item.height > 0);
      const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

      if (!totalQty) {
        return;
      }

      const { lengthCm, placements, savedLengthCm = 0 } = calculateMaterialLayout(items, rates.maxPrintWidth, previewLength);
      const length = lengthCm / 100;
      const materialRate = getTierValue(rates.material, length, 850);
      const applicationRate = getTierValue(rates.application, totalQty, 40);
      const rawMaterialCost = length * materialRate;
      const materialCost = Math.ceil(rawMaterialCost);
      const markedUpCost = materialCost * rates.markup;
      const unroundedUnitPrice = markedUpCost / totalQty + applicationRate;
      const unitPrice = Math.ceil(unroundedUnitPrice / 10) * 10;
      const printTotal = unitPrice * totalQty;
      const calculatedTotal = printTotal + rates.delivery;
      const total = Math.max(calculatedTotal, rates.minimum);

      const summaryItems = items.map((item) => ({
        name: item.name,
        qty: item.qty,
        total: unitPrice * item.qty
      }));
      const note = calculatedTotal < rates.minimum ? `Применена минимальная стоимость заказа — ${formatMoney(rates.minimum, 2)}.` : '';
      renderOrderSummary(summary, summaryItems, total, note, rates.delivery);
      onCalculate?.({
        items, totalQty, lengthCm, placements, savedLengthCm, maxPrintWidth: rates.maxPrintWidth,
        costDetails: {
          length, materialRate, rawMaterialCost, materialCost,
          applicationRate, applicationCost: applicationRate * totalQty,
          delivery: rates.delivery, markup: rates.markup, markedUpCost,
          unroundedUnitPrice, unitPrice, printTotal, calculatedTotal, minimum: rates.minimum, total,
          displayTotal: formatMoney(total, 2)
        }
      });
    };

    calculator.addEventListener('submit', (event) => {
      event.preventDefault();
      clearTimeout(calculationTimer);
      calculateOrder();
    });

    calculator.append(list, actions, summary);
    addFormat();
    return { element: calculator, refresh };
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
      ? createDtfCalculator(() => card).element
      : makeMatrixCalculator(card));

    if (card.footer) {
      const footer = document.createElement('div');
      footer.className = 'clothing-method-card__footer';
      footer.innerHTML = card.footer;
      article.append(footer);
    }

    return article;
  };

  window.createClothingDtfCalculator = createDtfCalculator;

  window.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('print-method');
    if (!root) return;

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
        root.replaceChildren(...cards.filter((card) => card.archived !== true).map(renderCard));
      })
      .catch((error) => {
        console.error(error);
        root.textContent = 'Не удалось загрузить цены. Обновите страницу позже.';
      });
  });
})();
