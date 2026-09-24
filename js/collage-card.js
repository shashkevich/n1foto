window.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('.collage-catalog');
  if (!root) return;
  const isDocumentPhoto = root.dataset.cardSource === 'srochnoe-foto';

  const element = (tag, className = '', text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = String(text ?? '');
    return node;
  };

  const renderComparison = (data) => {
    const frame = element('div', 'collage-card-image restoration-comparison');
    const after = element('img');
    after.src = data.img[1];
    after.alt = 'Фото после реставрации';
    const before = element('img', 'restoration-comparison__before');
    before.src = data.img[0];
    before.alt = 'Фото до реставрации';
    for (const image of [after, before]) {
      image.width = 800;
      image.height = 600;
      image.decoding = 'async';
      image.addEventListener('error', () => frame.replaceChildren(element('span', 'collage-message', 'Пример реставрации временно недоступен')), { once: true });
    }
    const handle = element('span', 'restoration-comparison__handle');
    handle.setAttribute('aria-hidden', 'true');
    handle.append(element('span', '', '↔'));
    const slider = element('input', 'restoration-comparison__slider');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '50';
    slider.setAttribute('aria-label', 'Сравнение фото до и после реставрации');
    const update = () => {
      const value = Math.max(0, Math.min(100, Number(slider.value)));
      frame.style.setProperty('--comparison-position', `${value}%`);
      slider.setAttribute('aria-valuetext', `До реставрации: ${value}%, после: ${100 - value}%`);
    };
    slider.addEventListener('input', update);
    update();
    frame.append(after, before, element('span', 'restoration-comparison__label restoration-comparison__label--before', 'Было'), element('span', 'restoration-comparison__label restoration-comparison__label--after', 'Стало'), handle, slider);
    return frame;
  };

  const renderCard = (data) => {
    const card = element('article', 'collage-card');
    const source = Array.isArray(data.img) ? data.img.find(Boolean) : '';
    if (data.cardType === 'restoration' && data.img?.[0] && data.img?.[1]) {
      card.append(renderComparison(data));
    } else if (source) {
      const frame = element('div', 'collage-card-image');
      const image = element('img');
      image.src = source;
      image.alt = data.alt || data.title || 'Пример коллажа';
      image.width = 800;
      image.height = 600;
      image.decoding = 'async';
      image.addEventListener('error', () => {
        frame.replaceChildren(element('span', 'collage-message', 'Фото временно недоступно'));
      }, { once: true });
      frame.append(image);
      card.append(frame);
    }
    const body = element('div', 'collage-card-body');
    body.append(element('h2', 'collage-card-title', data.title));
    if (data.description) body.append(element('p', 'collage-card-note', data.description));
    if (data.price_title) body.append(element('p', 'collage-card-price-title', data.price_title));
    const rows = Array.isArray(data.table) ? data.table : [];
    if (rows.length) {
      const scroll = element('div', 'collage-price-scroll');
      scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', `Цены: ${data.title || 'Составление коллажей'}`);
      const table = element('table', 'collage-price-table');
      const head = element('thead');
      const headers = Object.keys(rows[0]);
      const headRow = element('tr');
      headers.forEach((header) => {
        const cell = element('th', '', header);
        cell.scope = 'col';
        headRow.append(cell);
      });
      head.append(headRow);
      const tbody = element('tbody');
      rows.forEach((row) => {
        const tr = element('tr');
        headers.forEach((header, index) => {
          const value = String(row[header] ?? '');
          const cell = element(index === 0 ? 'th' : 'td', index === 0 ? '' : 'price-cell', value);
          if (index === 0) cell.scope = 'row';
          else if (value.trim().toLowerCase() === 'бесплатно') cell.classList.add('free-cell');
          tr.append(cell);
        });
        tbody.append(tr);
      });
      table.append(head, tbody);
      scroll.append(table);
      body.append(scroll);
    }
    if (data.footer) body.append(element('p', 'collage-card-footer', data.footer));
    card.append(body);
    return card;
  };

  const load = async () => {
    root.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch(isDocumentPhoto ? '/db/tovary.json' : '/db/pages/sostavlenie-kollagey.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Collage prices: ${response.status}`);
      const data = await response.json();
      let cards;
      if (isDocumentPhoto) {
        if (!Array.isArray(data['srochnoe-foto'])) throw new Error('Document photo cards are missing');
        cards = data['srochnoe-foto'].map((card) => ({
          ...card,
          img: Array.isArray(card.img) ? card.img : [card.img],
          footer: String(card.descr || '').replace(/<br\s*\/?\s*>/gi, '\n').replace(/<[^>]*>/g, ''),
        }));
      } else {
        const sections = data.sections?.filter((item) => ['kollagi', 'restoration'].includes(item.id));
        if (!sections?.length || sections.some((section) => !Array.isArray(section.cards))) throw new Error('Collage sections are missing');
        cards = sections.flatMap((section) => section.cards);
      }
      root.replaceChildren(...cards.filter((card) => card.archived !== true).map(renderCard));
    } catch (error) {
      console.error(error);
      const message = element('div', 'collage-message');
      const retry = element('button', 'collage-retry', 'Повторить загрузку');
      retry.type = 'button';
      retry.addEventListener('click', () => { retry.disabled = true; load(); });
      message.append(element('p', '', 'Не удалось загрузить карточку и цены.'), retry);
      root.replaceChildren(message);
    } finally {
      root.setAttribute('aria-busy', 'false');
    }
  };
  load();
});
