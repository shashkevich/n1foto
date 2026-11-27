(() => {
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const previewLength = 500;
  const colors = ['#dac9f6', '#bce6df', '#f9dea5', '#bed7fa', '#facadf', '#dbe8ad'];
  const displayNumber = (value) => value.toLocaleString('ru-RU', { maximumFractionDigits: 3 });
  const money = new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2
  });

  const renderCostDetails = (list, totalQty, details) => {
    const {
      length, materialRate, rawMaterialCost, materialCost, applicationRate, applicationCost,
      delivery, markup, markedUpCost, unroundedUnitPrice, unitPrice, printTotal, calculatedTotal, minimum, total
    } = details;
    const rub = (value) => money.format(value);
    const qty = displayNumber(totalQty);
    const filmLength = length.toLocaleString('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 6 });
    const multiplier = markup.toLocaleString('ru-RU', { maximumFractionDigits: 6 });
    const filmRounded = materialCost !== rawMaterialCost;
    const unitRounded = unitPrice !== unroundedUnitPrice;
    const rows = [
      ['Нанесение', `${qty} шт. × ${rub(applicationRate)} = `, rub(applicationCost)],
      ['Печать (плёнка)', `${filmLength} м × ${rub(materialRate)}/м = ${filmRounded ? `${rub(rawMaterialCost)} → ` : ''}`,
        rub(materialCost), filmRounded ? 'после округления' : ''],
      ['Печать с наценкой', `${rub(materialCost)} × ${multiplier} = `, rub(markedUpCost)],
      ['Цена за принт', `(${rub(markedUpCost)} + ${rub(applicationCost)}) ÷ ${qty} ${unitRounded ? `≈ ${rub(unroundedUnitPrice)} → ` : '= '}`,
        rub(unitPrice), unitRounded ? 'с округлением вверх до десятков' : ''],
      ['Печать и нанесение', `${qty} шт. × ${rub(unitPrice)} = `, rub(printTotal)],
      ['Доставка', '', rub(delivery), 'за заказ'],
      ['Себестоимость', `${rub(materialCost)} + ${rub(delivery)} = `, rub(materialCost + delivery), '', 'manual-dtf-pricing__row--cost'],
      ['Сумма с доставкой', `${rub(printTotal)} + ${rub(delivery)} = `, rub(calculatedTotal)]
    ];
    if (total > calculatedTotal) rows.push(['Минимальный заказ', `${rub(calculatedTotal)} → `, rub(minimum)]);

    list.replaceChildren(...rows.map(([label, calculation, result, note, modifier]) => {
      const row = document.createElement('div');
      row.className = 'manual-dtf-pricing__row';
      if (modifier) row.classList.add(modifier);
      const term = document.createElement('dt');
      const value = document.createElement('dd');
      const amount = document.createElement('strong');
      term.textContent = label;
      amount.textContent = result;
      value.append(calculation, amount, note ? ` ${note}` : '');
      row.append(term, value);
      return row;
    }));
  };

  const svgElement = (tag, attributes) => {
    const element = document.createElementNS(svgNamespace, tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    return element;
  };

  const drawLayout = ({ items, lengthCm, maxPrintWidth, placements }, shownLength) => {
    const svg = svgElement('svg', {
      width: maxPrintWidth,
      height: shownLength,
      viewBox: `0 0 ${maxPrintWidth} ${shownLength}`,
      role: 'img',
      'aria-label': `Раскладка принтов на плёнке шириной ${displayNumber(maxPrintWidth)} см. Расход ${displayNumber(lengthCm / 100)} м.`
    });

    for (const { x, y, width, height, itemIndex } of placements) {
      const piece = svgElement('rect', {
        x, y, width, height,
        fill: colors[itemIndex % colors.length],
        stroke: '#594a68',
        'stroke-width': 0.7,
        'vector-effect': 'non-scaling-stroke'
      });
      const title = svgElement('title', {});
      title.textContent = `${items[itemIndex].name} · на плёнке ${displayNumber(width)} × ${displayNumber(height)} см`;
      piece.append(title);
      svg.append(piece);

      if (width >= 5 && height >= 5) {
        const label = svgElement('text', {
          x: x + width / 2,
          y: y + height / 2,
          'text-anchor': 'middle',
          'dominant-baseline': 'central',
          'font-size': Math.min(3, width / 3, height / 2),
          'pointer-events': 'none',
          fill: '#2f2340'
        });
        label.textContent = String(itemIndex + 1);
        svg.append(label);
      }
    }
    return svg;
  };

  window.createAdminDtfPreview = (card, validateCard) => {
    const content = document.createElement('div');
    content.innerHTML = `
      <p class="manual-dtf-preview-status notice notice-muted" data-preview-status role="status" hidden></p>
      <details class="manual-dtf-pricing" data-pricing open hidden>
        <summary>Подробный расчёт</summary>
        <dl></dl>
        <div class="manual-dtf-pricing__total"><span>Итого</span><strong data-pricing-total></strong></div>
      </details>
      <figure class="manual-dtf-layout" data-layout hidden>
        <figcaption>
          <strong>Раскладка на плёнке</strong>
          <p data-layout-metrics></p>
          <p data-layout-saving hidden></p>
        </figcaption>
        <div class="manual-dtf-roll" data-layout-roll tabindex="0" aria-label="Схема раскладки на плёнке"></div>
        <ul class="manual-dtf-legend" data-layout-legend aria-label="Форматы на схеме"></ul>
        <p class="manual-dtf-layout-limit" data-layout-limit hidden></p>
      </figure>
    `;
    const status = content.querySelector('[data-preview-status]');
    const pricing = content.querySelector('[data-pricing]');
    const priceList = pricing.querySelector('dl');
    const priceTotal = pricing.querySelector('[data-pricing-total]');
    const layout = content.querySelector('[data-layout]');
    const metrics = content.querySelector('[data-layout-metrics]');
    const saving = content.querySelector('[data-layout-saving]');
    const roll = content.querySelector('[data-layout-roll]');
    const legend = content.querySelector('[data-layout-legend]');
    const limit = content.querySelector('[data-layout-limit]');
    const preview = { card, content };

    const showStatus = (message, isError = false) => {
      layout.hidden = true;
      pricing.hidden = true;
      status.hidden = false;
      status.classList.toggle('notice-danger', isError);
      status.classList.toggle('notice-muted', !isError);
      status.textContent = message;
    };

    preview.calculator = window.createClothingDtfCalculator(() => preview.card, {
      autoCalculate: true,
      includeDelivery: true,
      previewLength,
      validateCard,
      onClear: () => showStatus('Укажите размеры и количество для каждого формата.'),
      onError: (message) => showStatus(message, true),
      onCalculate: (result) => {
        const { items, lengthCm, maxPrintWidth, placements, savedLengthCm = 0, totalQty, costDetails } = result;
        pricing.hidden = costDetails?.printTotal === undefined;
        if (!pricing.hidden) {
          renderCostDetails(priceList, totalQty, costDetails);
          priceTotal.textContent = costDetails.displayTotal;
        }
        const shownLength = Math.min(lengthCm, previewLength);
        const usedMeters = displayNumber(lengthCm / 100);
        metrics.textContent = `Ширина ${displayNumber(maxPrintWidth)} см · Расход ${usedMeters} м · ${displayNumber(totalQty)} шт.`;
        saving.hidden = savedLengthCm < 0.001;
        saving.textContent = saving.hidden ? '' : `Экономия плёнки относительно укладки рядами — ${displayNumber(savedLengthCm)} см.`;
        const plotWidth = Math.min(330, Math.max(180, 380 * maxPrintWidth / shownLength));
        roll.style.width = `min(100%, ${plotWidth}px)`;
        roll.replaceChildren(drawLayout(result, shownLength));
        roll.scrollTop = 0;
        legend.replaceChildren(...items.map((item, index) => {
          const entry = document.createElement('li');
          const swatch = document.createElement('span');
          swatch.className = 'manual-dtf-legend__swatch';
          swatch.style.backgroundColor = colors[index % colors.length];
          swatch.textContent = String(index + 1);
          entry.append(swatch, `${item.name} · ${displayNumber(item.qty)} шт.`);
          return entry;
        }));
        limit.hidden = shownLength === lengthCm && placements.length === totalQty;
        limit.textContent = `На схеме — до ${displayNumber(shownLength / 100)} м, показано ${displayNumber(placements.length)} из ${displayNumber(totalQty)} принтов. Цена рассчитана для всего тиража.`;
        status.hidden = true;
        layout.hidden = false;
      }
    });
    const calculator = preview.calculator.element;
    calculator.querySelector('.btn-outline-primary').classList.add('button', 'button-soft');
    content.prepend(calculator);
    return preview;
  };
})();
