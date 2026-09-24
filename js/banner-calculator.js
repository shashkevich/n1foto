(function () {
  const root = document.getElementById('bannerCalculator');
  if (!root) return;

  const escapeHtml = (value) => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
  const money = (value) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
  const number = (value) => String(value ?? '').trim() === '' ? NaN : Number(String(value).replace(',', '.'));
  const rateFor = (rows, name) => {
    const row = rows.find((item) => String(item['Наименование'] || '').startsWith(name));
    const match = String(row?.['Стоимость'] || '').match(/^\s*(\d+(?:[.,]\d+)?)/);
    const rate = match ? number(match[1]) : NaN;
    if (!Number.isFinite(rate) || rate <= 0) throw new Error(`Не найдена цена: ${name}`);
    return rate;
  };

  const render = (data) => {
    const rows = Array.isArray(data.table) ? data.table : [];
    const rates = {
      print: rateFor(rows, 'Баннерная ткань'),
      eyelets: rateFor(rows, 'Люверсы'),
      edging: rateFor(rows, 'Проклейка'),
    };
    const article = document.createElement('article');
    article.className = 'card product-card card-white plastic-calculator';
    const imagePath = (Array.isArray(data.img) ? data.img.find(Boolean) : '') || 'img/main-page/banner-main.jpg';
    article.innerHTML = `
      <div class="card-body">
        <div class="plastic-calculator__header">
          <div class="plastic-calculator__image"><img src="${escapeHtml(imagePath)}" alt="Печать на баннерной ткани"></div>
          <div class="plastic-calculator__heading">
            <h2 class="plastic-calculator__title">${escapeHtml(data.title)}</h2>
            <p class="plastic-calculator__intro">${escapeHtml(data.description)} · ${money(rates.print)}/м²</p>
          </div>
        </div>
        ${data.price_title ? `<p class="plastic-calculator__intro">${escapeHtml(data.price_title)}</p>` : ''}
        <div class="plastic-calculator__positions">
          <div class="plastic-calculator__positions-head" aria-hidden="true">
            <span>Ширина, см</span><span>Высота, см</span><span>Люверсы, шт.</span><span>Проклейка</span><span>Сумма</span><span></span>
          </div>
          <div class="plastic-calculator__rows" data-role="rows"></div>
          <div class="plastic-calculator__positions-footer">
            <button class="plastic-calculator__add" data-role="add-row" type="button">Добавить баннер</button>
            <small>Люверсы — ${money(rates.eyelets)}/шт. Проклейка краёв — ${money(rates.edging)}/пог. м.</small>
          </div>
        </div>
        <div class="plastic-calculator__summary" aria-live="polite" aria-atomic="true">
          <dl><div><dt>Общая площадь</dt><dd data-role="area">—</dd></div></dl>
          <div class="plastic-calculator__total"><span>Стоимость заказа</span><strong data-role="total-price">—</strong></div>
          <p class="plastic-calculator__footer">${escapeHtml(data.footer)}</p>
        </div>
        <p class="plastic-calculator__status is-error" data-role="validation" role="status" hidden></p>
      </div>`;
    const field = (role) => article.querySelector(`[data-role="${role}"]`);
    const entries = [];
    const update = () => {
      let totalArea = 0;
      let totalPrice = 0;
      let error = '';
      entries.forEach((entry, index) => {
        const input = (role) => entry.querySelector(`[data-role="${role}"]`);
        const width = number(input('width').value);
        const height = number(input('height').value);
        const eyelets = number(input('eyelet-count').value);
        let rowError = '';
        if (!Number.isFinite(width) || width <= 0 || !Number.isFinite(height) || height <= 0) rowError = 'Укажите ширину и высоту больше нуля.';
        else if (!Number.isSafeInteger(eyelets) || eyelets < 0) rowError = 'Укажите целое число люверсов от 0.';
        const area = width * height / 10000;
        const edgingCost = input('edging').checked ? 2 * (width + height) / 100 * rates.edging : 0;
        const cost = area * rates.print + eyelets * rates.eyelets + edgingCost;
        if (!rowError && !Number.isFinite(cost)) rowError = 'Укажите корректные размеры баннера.';
        entry.setAttribute('aria-label', `Баннер ${index + 1}`);
        input('remove-row').hidden = entries.length === 1;
        input('remove-row').setAttribute('aria-label', `Удалить баннер ${index + 1}`);
        input('row-total').textContent = rowError ? '—' : money(cost);
        if (rowError && !error) error = `Баннер ${index + 1}: ${rowError}`;
        totalArea += area;
        totalPrice += cost;
      });
      if (!error && (!Number.isFinite(totalArea) || !Number.isFinite(totalPrice))) error = 'Укажите корректные размеры баннеров.';
      field('validation').textContent = error;
      field('validation').hidden = !error;
      field('area').textContent = error ? '—' : `${totalArea.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} м²`;
      field('total-price').textContent = error ? '—' : money(totalPrice);
    };
    const addRow = () => {
      const entry = document.createElement('div');
      entry.className = 'plastic-calculator__row';
      entry.setAttribute('role', 'group');
      entry.innerHTML = `
        <label class="plastic-calculator__row-field"><span>Ширина, см</span><input class="form-control" data-role="width" aria-label="Ширина баннера, см" type="number" min="0.1" step="0.1" value="100" inputmode="decimal"></label>
        <label class="plastic-calculator__row-field"><span>Высота, см</span><input class="form-control" data-role="height" aria-label="Высота баннера, см" type="number" min="0.1" step="0.1" value="100" inputmode="decimal"></label>
        <label class="plastic-calculator__row-field"><span>Люверсы, шт.</span><input class="form-control" data-role="eyelet-count" aria-label="Количество люверсов" type="number" min="0" step="1" value="0" inputmode="numeric"></label>
        <label class="plastic-calculator__row-field plastic-calculator__row-field--cut"><span>Проклейка</span><input class="form-check-input" data-role="edging" aria-label="Проклейка краёв по периметру" type="checkbox"></label>
        <div class="plastic-calculator__row-total"><span>Сумма</span><strong data-role="row-total">—</strong></div>
        <button class="plastic-calculator__remove" data-role="remove-row" type="button" title="Удалить баннер">×</button>`;
      entry.querySelector('[data-role="remove-row"]').addEventListener('click', () => {
        if (entries.length <= 1) return;
        entries.splice(entries.indexOf(entry), 1);
        entry.remove();
        update();
        field('add-row').focus();
      });
      entries.push(entry);
      field('rows').append(entry);
      update();
      return entry;
    };
    field('add-row').addEventListener('click', () => addRow().querySelector('[data-role="width"]').focus());
    article.addEventListener('input', update);
    article.addEventListener('change', update);
    addRow();
    return article;
  };

  const load = async () => {
    root.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/db/pages/pechat-na-bannere.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Прайс недоступен: ${response.status}`);
      const data = await response.json();
      const cards = data.sections?.find(section => section.id === 'banner')?.cards;
      if (!Array.isArray(cards)) throw new Error('Не найден прайс баннеров');
      root.replaceChildren(...cards.filter((card) => card.archived !== true).map(render));
    } catch (error) {
      console.error(error);
      root.innerHTML = '<div class="plastic-calculator__status is-error"><p>Не удалось загрузить цены баннеров.</p><button class="plastic-calculator__add" type="button">Повторить загрузку</button></div>';
      root.querySelector('button').addEventListener('click', load);
    } finally {
      root.setAttribute('aria-busy', 'false');
    }
  };
  load();
}());
