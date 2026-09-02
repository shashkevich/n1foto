window.addEventListener('DOMContentLoaded', () => {
  const roots = document.querySelectorAll('[data-print-copy-section]');

  if (!roots.length) {
    return;
  }

  const createTable = (rows) => {
    const tableWrap = document.createElement('div');
    tableWrap.className = 'table-wrap';

    if (!Array.isArray(rows) || !rows.length) {
      return tableWrap;
    }

    const headers = Object.keys(rows[0]);
    const table = document.createElement('table');
    table.className = 'table table-striped table-hover table-borderless mb-0';
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');

    headers.forEach((header) => {
      const cell = document.createElement('th');
      cell.textContent = header;
      headerRow.append(cell);
    });

    rows.forEach((row) => {
      const tableRow = document.createElement('tr');

      headers.forEach((header, index) => {
        const cell = document.createElement('td');
        cell.textContent = row[header] || '';

        if (index === 0) {
          cell.classList.add('text-bold');
        }

        tableRow.append(cell);
      });

      tbody.append(tableRow);
    });

    thead.append(headerRow);
    table.append(thead, tbody);
    tableWrap.append(table);
    return tableWrap;
  };

  const createCard = (card) => {
    const column = document.createElement('div');
    column.className = 'col';
    const cardElement = document.createElement('article');
    cardElement.className = 'card product-card card-white rounded-4 p-3 mb-5';
    const row = document.createElement('div');
    row.className = 'row';
    const title = document.createElement('h3');
    const content = document.createElement('div');
    content.className = 'col-md-12 text-center';

    title.innerHTML = card.title || '';
    row.append(title, content);

    (card.img || []).forEach((source) => {
      const image = document.createElement('img');
      image.className = 'img-fluid mb-3';
      image.style.cssText = 'max-width: 80%; width: auto; margin-top: 0;';
      image.src = source;
      image.alt = card.title ? card.title.replace(/<[^>]+>/g, ' ') : '';
      content.append(image);
    });

    if (card.description) {
      const description = document.createElement('p');
      description.innerHTML = card.description;
      content.append(description);
    }

    if (card.price_title) {
      const priceTitle = document.createElement('p');
      priceTitle.innerHTML = card.price_title;
      content.append(priceTitle);
    }

    content.append(createTable(card.table));

    if (card.footer) {
      const footer = document.createElement('div');
      footer.className = 'card-footer text-start';
      footer.innerHTML = card.footer;
      content.append(footer);
    }

    cardElement.append(row);
    column.append(cardElement);
    return column;
  };

  fetch('/db/pages/pechat-i-kopirovanie.json', { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Не удалось загрузить цены: ${response.status}`);
      }

      return response.json();
    })
    .then((data) => {
      const sections = Array.isArray(data.sections) ? data.sections : [];

      roots.forEach((root) => {
        const section = sections.find((item) => item.id === root.dataset.printCopySection);
        const fragment = document.createDocumentFragment();

        (section?.cards || []).forEach((card) => fragment.append(createCard(card)));
        root.replaceChildren(fragment);
      });
    })
    .catch((error) => {
      roots.forEach((root) => {
        const message = document.createElement('p');
        message.className = 'text-danger';
        message.textContent = error.message;
        root.replaceChildren(message);
      });
    });
});
