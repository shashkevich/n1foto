window.addEventListener('DOMContentLoaded', () => {
    const roots = document.querySelectorAll('[data-manual-page]');

    if (!roots.length) {
        return;
    }

    const getData = async (url) => {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Could not fetch ${url}, status: ${response.status}`);
        }

        return response.json();
    };

    const makeTable = (rows) => {
        const tableWrap = document.createElement('div');
        tableWrap.classList.add('table-wrap');

        const table = document.createElement('table');
        table.classList.add('table', 'table-striped', 'table-hover', 'table-borderless', 'mb-0');

        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        const headerRow = document.createElement('tr');
        const headers = Object.keys(rows[0] || {});

        headers.forEach((header) => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.append(th);
        });

        thead.append(headerRow);

        rows.forEach((row) => {
            const tr = document.createElement('tr');

            headers.forEach((header, index) => {
                const td = document.createElement('td');
                td.textContent = row[header] || '';

                if (index === 0) {
                    td.classList.add('text-bold');
                }

                tr.append(td);
            });

            tbody.append(tr);
        });

        table.append(thead, tbody);
        tableWrap.append(table);

        return tableWrap;
    };

    const renderCard = (cardData) => {
        const col = document.createElement('div');
        col.classList.add('col');

        const card = document.createElement('div');
        card.classList.add('card', 'product-card', 'card-white', 'rounded-4', 'p-3', 'mb-5');

        const row = document.createElement('div');
        row.classList.add('row');

        const title = document.createElement('h3');
        title.innerHTML = cardData.title || '';
        row.append(title);

        const body = document.createElement('div');
        body.classList.add('col-md-12', 'text-center');

        (cardData.img || []).forEach((image) => {
            if (!image) {
                return;
            }

            const img = document.createElement('img');
            img.classList.add('img-fluid', 'mb-3');
            img.style.cssText = 'max-width: 80%; width: auto; margin-top: 0;';
            img.src = image;
            img.alt = cardData.title || '';
            body.append(img);
        });

        if (cardData.price_title) {
            const priceTitle = document.createElement('p');
            priceTitle.innerHTML = cardData.price_title;
            body.append(priceTitle);
        }

        if (Array.isArray(cardData.table) && cardData.table.length) {
            body.append(makeTable(cardData.table));
        }

        if (cardData.footer) {
            const footer = document.createElement('div');
            footer.classList.add('card-footer', 'text-start');
            footer.innerHTML = cardData.footer;
            body.append(footer);
        }

        row.append(body);
        card.append(row);
        col.append(card);

        return col;
    };

    getData('/db/pages/vizitki.json')
        .then((pageData) => {
            roots.forEach((root) => {
                const sectionIds = (root.dataset.manualSections || '')
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean);

                const sections = Array.isArray(pageData.sections) ? pageData.sections : [];

                sections
                    .filter((section) => sectionIds.includes(section.id))
                    .forEach((section) => {
                        (section.cards || []).forEach((card) => {
                            root.append(renderCard(card));
                        });
                    });
            });
        })
        .catch((error) => {
            console.error(error);
        });
});
