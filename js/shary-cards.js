window.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('shary');
  if (!root) return;

  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };

  // The shared editor stores formatted text. Use only its readable text here.
  const plainText = (value) => {
    const template = document.createElement('template');
    template.innerHTML = String(value ?? '').replace(/<br\s*\/?\s*>/gi, '\n');
    return template.content.textContent.trim();
  };

  const renderCard = (data) => {
    const card = element('article', 'shary-card');
    const titleText = plainText(data.title);
    const sources = Array.isArray(data.img) ? data.img.filter(Boolean) : [];

    if (sources.length) {
      const media = element('div', 'shary-card__media');
      // One product photo keeps the card compact; the editor replaces this image.
      const photo = element('img', 'shary-card__image');
      photo.src = sources[0];
      photo.alt = titleText;
      photo.width = 960;
      photo.height = 720;
      photo.decoding = 'async';
      photo.addEventListener('error', () => {
        media.replaceChildren(element('p', 'shary-message', 'Фото временно недоступно'));
      }, { once: true });
      media.append(photo);
      card.append(media);
    }

    const body = element('div', 'shary-card__body');
    body.append(element('h2', 'shary-card__title', titleText));
    if (data.description) body.append(element('p', 'shary-card__description', plainText(data.description)));

    const rows = Array.isArray(data.table) ? data.table : [];
    const headers = Object.keys(rows[0] || {});
    const [quantityKey, priceKey] = headers;
    if (rows.length && headers.length === 2) {
      const primary = element('div', 'shary-card__primary');
      const price = element('div', 'shary-card__price');
      if (data.price_title) price.append(element('span', 'shary-card__price-label', plainText(data.price_title)));
      price.append(element('strong', 'shary-card__amount', plainText(rows[0][priceKey])));
      primary.append(price, element('span', 'shary-card__quantity', plainText(rows[0][quantityKey])));
      body.append(primary);

      if (rows.length > 1) {
        const tiers = element('table', 'shary-card__tiers');
        const caption = element('caption', 'shary-card__tiers-caption', 'Цены по количеству');
        const head = element('thead', 'visually-hidden');
        const headerRow = document.createElement('tr');
        headers.forEach((label) => {
          const th = document.createElement('th');
          th.scope = 'col';
          th.textContent = label;
          headerRow.append(th);
        });
        head.append(headerRow);
        const tbody = document.createElement('tbody');
        rows.slice(1).forEach((row) => {
          const tr = document.createElement('tr');
          const quantity = element('th', 'shary-card__tier-quantity', plainText(row[quantityKey]));
          quantity.scope = 'row';
          const amount = element('td', 'shary-card__tier-price', plainText(row[priceKey]));
          tr.append(quantity, amount);
          tbody.append(tr);
        });
        tiers.append(caption, head, tbody);
        body.append(tiers);
      }
    } else {
      body.append(element('p', 'shary-card__description', 'Стоимость уточняйте у менеджера.'));
    }

    if (data.footer) body.append(element('p', 'shary-card__note', plainText(data.footer)));
    card.append(body);
    return card;
  };

  const load = async () => {
    root.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/db/pages/shary.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Не удалось загрузить карточки шаров: ${response.status}`);
      const data = await response.json();
      const section = Array.isArray(data.sections) && data.sections.find((item) => item.id === 'shary');
      if (!section || !Array.isArray(section.cards) || !section.cards.length) {
        throw new Error('В разделе шаров отсутствуют карточки.');
      }
      root.replaceChildren(...section.cards.map(renderCard));
    } catch (error) {
      console.error(error);
      const message = element('div', 'shary-message');
      message.append(element('p', '', 'Не удалось загрузить цены. Попробуйте ещё раз.'));
      const retry = element('button', 'shary-retry', 'Повторить загрузку');
      retry.type = 'button';
      retry.addEventListener('click', () => { retry.disabled = true; load(); });
      message.append(retry);
      root.replaceChildren(message);
    } finally {
      root.setAttribute('aria-busy', 'false');
    }
  };

  load();
});
