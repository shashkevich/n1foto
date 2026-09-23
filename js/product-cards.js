window.addEventListener('DOMContentLoaded', () => {
  const roots = [...document.querySelectorAll('[data-product-page]')];
  const requests = new Map();

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  const text = (value) => {
    const template = document.createElement('template');
    template.innerHTML = String(value ?? '')
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(?:p|li|div)>/gi, '\n');
    return template.content.textContent.trim();
  };

  const getData = (page, refresh) => {
    if (refresh || !requests.has(page)) {
      requests.set(page, fetch(`/db/pages/${encodeURIComponent(page)}.json`, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error(`Не удалось загрузить карточки: ${response.status}`);
          return response.json();
        }));
    }
    return requests.get(page);
  };

  const renderImage = (card, section) => {
    const source = Array.isArray(card.img) ? card.img.find(Boolean) : '';
    if (!source) return null;
    // Keep original artwork/lettering intact. White studio backdrops blend into
    // the neutral media area; lifestyle images retain their original colours.
    const photo = card.imageTreatment === 'photo'
      || ['canvas-styles', 'polaroid', 'shary'].includes(section)
      || /(?:\/studio\/|vinyl_magnit)/i.test(source);
    const frame = element('div', `catalog-card__media${photo ? ' catalog-card__media--photo' : ''}`);
    if (section === 'canvas-styles') frame.classList.add('catalog-card__media--artwork');
    if (/\/studio\//i.test(source)) frame.classList.add('catalog-card__media--studio');
    const image = element('img', 'catalog-card__image');
    image.src = source;
    image.alt = text(card.alt || card.title);
    image.width = 800;
    image.height = 600;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      frame.replaceChildren(element('span', 'catalog-card__missing', 'Фото временно недоступно'));
    }, { once: true });
    frame.append(image);
    return frame;
  };

  const renderPrices = (card) => {
    const rows = Array.isArray(card.table) ? card.table : [];
    const [conditionKey, priceKey] = Object.keys(rows[0] || {});
    const list = element('dl', 'catalog-card__prices');
    rows.forEach((row, index) => {
      const condition = [index === 0 ? text(card.price_title) : '', text(row[conditionKey])].filter(Boolean).join(' · ');
      const amount = text(row[priceKey]);
      if (!condition && !amount) return;
      const priceRow = element('div', `catalog-card__price-row${index === 0 ? ' catalog-card__price-row--primary' : ''}`);
      const label = element('dt', 'catalog-card__price-label', condition);
      const price = element('dd', 'catalog-card__price-value');
      price.append(element('span', 'catalog-card__price-chip', amount || 'Уточняйте'));
      priceRow.append(label, price);
      list.append(priceRow);
    });
    if (!list.children.length) list.append(element('div', 'catalog-card__description', 'Стоимость уточняйте у менеджера.'));
    return list;
  };

  const renderProduct = (data, root) => {
    const column = element('div', 'col');
    const layout = root.dataset.productLayout === 'split' ? 'split' : 'stacked';
    const card = element('article', `catalog-card catalog-card--${layout}`);
    const image = renderImage(data, root.dataset.productSection);
    if (image) card.append(image);
    else card.classList.add('catalog-card--no-image');
    const body = element('div', 'catalog-card__body');
    body.append(element(root.dataset.productHeading === '3' ? 'h3' : 'h2', 'catalog-card__title', text(data.title)));
    if (data.description) body.append(element('p', 'catalog-card__description', text(data.description)));
    if (data.footer) body.append(element('p', 'catalog-card__note', text(data.footer)));
    body.append(renderPrices(data));
    card.append(body);
    column.append(card);
    return column;
  };

  const renderTable = (card, root) => {
    const legacy = root.dataset.productTableStyle === 'legacy';
    const block = element('article', legacy ? 'card product-card card-white rounded-4 mb-4' : 'catalog-table');
    block.append(element('h2', legacy ? 'h4 text-center mt-3' : 'catalog-table__title', text(card.title)));
    if (card.description) block.append(element('p', '', text(card.description)));
    if (card.price_title) block.append(element('p', '', text(card.price_title)));
    const wrap = element('div', legacy ? 'table-wrap' : 'catalog-table__scroll');
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', text(card.title));
    const table = element('table', legacy ? 'table table-striped table-hover table-borderless' : 'catalog-table__prices');
    const caption = element('caption', 'visually-hidden', text(card.title));
    const head = document.createElement('thead');
    const body = document.createElement('tbody');
    const headRow = document.createElement('tr');
    const headers = Object.keys(card.table?.[0] || {});
    const rows = card.table || [];
    const horizontal = root.dataset.productTableLayout === 'horizontal';
    const headLabels = horizontal ? [headers[0], ...rows.map((row) => row[headers[0]])] : headers;
    const bodyRows = horizontal
      ? headers.slice(1).map((header) => [header, ...rows.map((row) => row[header])])
      : rows.map((row) => headers.map((header) => row[header]));
    headLabels.forEach((header) => {
      const cell = element('th', '', header);
      cell.scope = 'col';
      headRow.append(cell);
    });
    head.append(headRow);
    bodyRows.forEach((row) => {
      const tableRow = document.createElement('tr');
      row.forEach((value, index) => {
        const cell = element(index === 0 ? 'th' : 'td', '', text(value));
        if (index === 0) cell.scope = 'row';
        tableRow.append(cell);
      });
      body.append(tableRow);
    });
    table.append(caption, head, body);
    wrap.append(table);
    block.append(wrap);
    if (card.footer && legacy) {
      const [title, ...items] = text(card.footer).split('\n').map((line) => line.trim()).filter(Boolean);
      const benefits = element('div', 'row justify-content-center centered py-2');
      benefits.append(element('h3', 'h5', title));
      items.forEach((item) => {
        const column = element('div', 'col-lg-2');
        const icon = element('div', 'h4');
        icon.setAttribute('aria-hidden', 'true');
        icon.append(element('i', 'bi bi-check-circle'));
        column.append(icon, element('p', '', item));
        benefits.append(column);
      });
      block.append(benefits);
    } else if (card.footer) block.append(element('p', 'catalog-table__note', text(card.footer)));
    return block;
  };

  const load = async (root, refresh = false) => {
    root.setAttribute('aria-busy', 'true');
    try {
      const data = await getData(root.dataset.productPage, refresh);
      const section = data.sections?.find((item) => item.id === root.dataset.productSection);
      if (!Array.isArray(section?.cards)) throw new Error('Карточки раздела отсутствуют.');
      root.replaceChildren(...section.cards.map((card) => root.dataset.productLayout === 'table'
        ? renderTable(card, root) : renderProduct(card, root)));
    } catch (error) {
      console.error(error);
      const message = element('div', 'catalog-message');
      message.append(element('p', '', 'Не удалось загрузить карточки и цены.'));
      const retry = element('button', 'catalog-retry', 'Повторить загрузку');
      retry.type = 'button';
      retry.addEventListener('click', () => { retry.disabled = true; load(root, true); });
      message.append(retry);
      root.replaceChildren(message);
    } finally {
      root.setAttribute('aria-busy', 'false');
    }
  };

  roots.forEach((root) => {
    root.setAttribute('aria-live', 'polite');
    load(root);
  });
});
