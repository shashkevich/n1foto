window.addEventListener('DOMContentLoaded', () => {


    const body = document.querySelector('body');
    const cardsField = document.querySelector('.cardsField');
    const fullPrice = document.querySelectorAll('.price');
    const section = document.querySelector('#print-method');

    const createSection = (htmlEelem, obj) => {

        for (let elem in obj) { // перебираем следующий по уровню объект
            let category = obj[elem];

            const card = document.createElement('div');
            card.classList.add('card', 'product-card', 'card-white', 'rounded-4', 'p-3', 'mb-5');
            htmlEelem.append(card);

            const childRow = document.createElement('div');
            childRow.classList.add('row', 'g-0', 'm-3');
            card.append(childRow);

            const col12 = document.createElement('div');
            col12.classList.add('col-md-12', 'pb-3');


            col12.innerHTML = `<h3>${category.title}</h3>
            <p>${category.descr}<br>
            <span class="rounded-pill bg-success px-3">${category.notice}</span></p>`
            childRow.append(col12);

            const col4 = document.createElement('div');
            col4.classList.add('col-md-4');
            col4.innerHTML = `<div style="background-image: url(${category.img})" class="section-card-img"></div>`
            childRow.append(col4);

            const col8 = document.createElement('div');
            col8.classList.add('col-md-8', 'text-center', 'border-table');

            if (category.table) {
                col8.innerHTML = `<h4 class="font-weight-light my-2">Таблица цен</h4>`;
                makeTable(category.table, col8);
            } else if (category.title.includes("DTF")) {
                col8.innerHTML = `
                    <!-- Калькулятор принтов с визуализацией -->
                    <div class="container my-4 px-0">
                        <h4 class="mb-3">Калькулятор принтов с визуализацией</h4>
                        <form id="printForm">
                            <div id="formatList"></div>
                            <button type="button" class="btn btn-outline-primary mb-3" onclick="addFormat()">Добавить формат</button>
                            <button type="submit" class="btn btn-primary mb-3">Рассчитать</button>
                        </form>
                        <div id="result" class="mb-4" style="display:none">
                            <p style="display: none;"><strong>Погонных метров материала:</strong> <span id="totalLength"></span></p>
                            <p><strong>Всего принтов:</strong> <span id="totalCount"></span></p>
                            <p style="display: none;"><strong>Себестоимость на 1 шт:</strong> <span id="costPerUnit"></span></p>
                            <p style="display: none;"><strong>Стоимость нанесения:</strong> <span id="printCost"></span></p>
                            <p><strong>Цена за 1 шт:</strong> <span id="pricePerUnit"></span></p>
                            <p><strong>Общая цена:</strong> <span id="totalPrice"></span></p>
                            <div class="alert alert-warning mt-2" id="minOrderAlert" style="display:none">Минимальный заказ — 1800 руб</div>
                        </div>
                        <h5 class="mt-4">Визуализация размещения</h5>
                        <div id="layout" style="border:2px dashed #888; padding: 10px; background: #f8f9fa;">
                            <svg id="layoutSvg" style="max-width:100%; height:auto; display:block;"></svg>
                        </div>
                    </div>
                `;
                setTimeout(() => { if (typeof addFormat !== 'undefined') addFormat(); }, 0);
            }

            childRow.append(col8);

            const cardFooter = document.createElement('div');
            cardFooter.classList.add("card-footer", "text-start");
            cardFooter.innerHTML = `${category.footer}`;
            col8.append(cardFooter);

        }
    }

    // функция по получению данных из базы данных json
    const getData = async (url) => {
        const price = await fetch(url);

        if (!price.ok) { // проверяем правильно ли обработан запрос
            throw new Error(`Could not fetch ${url}, status: ${price.status}`); // прописываем действия на случай ошибки
        }
        const data = await price.json(); // превращаем json в обычный массив
        return data;
    };

    // вызываем функ-ю получения данных из json и обрабатываем
    getData('/db/sections.json')
        .then(data => {
            for (let key in data) { // перебираем объект полученный от json 
                let obj = data[key];
                createSection(section, obj);
            }
        });

    const makeTable = (obj, elem) => {
        let tableWrap = document.createElement('div');
        tableWrap.classList.add('table-wrap');

        let table = document.createElement('table'); // создаем таблицу
        table.classList.add('table', 'table-striped', 'table-hover', 'table-borderless', 'mb-0');
        let thead = document.createElement('thead'); // создаем заголовок таблицы
        let tbody = document.createElement('tbody'); // создаем тело таблицы

        // создаем заголовок таблицы
        let trHead = document.createElement('tr'); // создаем строку заголовка

        let header = obj[0];
        for (let key in header) {
            let th = document.createElement('th'); // создаем ячейку заголовка
            th.textContent = key; // добавляем текст в ячейку
            trHead.appendChild(th); // добавляем ячейку в строку заголовка
        }

        thead.appendChild(trHead); // добавляем строку заголовка в заголовок таблицы

        // создаем тело таблицы
        for (let i = 0; i <= obj.length; i++) { // перебираем массив объектов
            let tr = document.createElement('tr'); // создаем строку таблицы

            let rows = tbody.getElementsByTagName('tr');
            for (let i = 0; i < rows.length; i++) {
                rows[i].getElementsByTagName('td')[0].classList.add('text-bold');
            }

            for (let prop in obj[i]) {
                let td = document.createElement('td'); // создаем ячейку таблицы
                td.textContent = obj[i][prop]; // добавляем значение свойства в ячейку
                tr.appendChild(td); // добавляем ячейку в строку таблицы            
            }
            tbody.appendChild(tr); // добавляем строку таблицы в тело таблицы

        }
        table.appendChild(thead); // добавляем заголовок таблицы в таблицу
        table.appendChild(tbody); // добавляем тело таблицы в таблицу
        tableWrap.appendChild(table);
        elem.appendChild(tableWrap);
    }

}); // DOMcontentLoaded ends


// === DTF калькулятор ===
const formatOptions = [
    { name: 'A7 (7×10 см)', width: 7, height: 10 },
    { name: 'A6 (10×15 см)', width: 10, height: 15 },
    { name: 'A5 (15×20 см)', width: 15, height: 20 },
    { name: 'A4 (20×30 см)', width: 20, height: 30 },
    { name: 'A3 (30×40 см)', width: 30, height: 40 },
    { name: 'A2 (40×58 см)', width: 40, height: 58 },
    { name: 'Надпись 30×8 см', width: 30, height: 8 },
    { name: 'Свой формат', width: '', height: '' },
];

let formatId = 0;
let placements = [];

function addFormat() {
    const optionsHTML = formatOptions.map(f => `<option value="${f.width},${f.height}">${f.name}</option>`).join('');
    const currentFormat = formatOptions[0];

    const wrapper = document.createElement('div');
    wrapper.className = 'row g-2 align-items-end mb-2';
    wrapper.dataset.id = formatId;

    wrapper.innerHTML = `
        <div class="col-md-3">
          <label class="form-label">Формат</label>
          <select class="form-select" onchange="handleFormatChange(${formatId}, this)">
            ${optionsHTML}
          </select>
        </div>
        <div class="col-md-2">
          <label class="form-label">Ширина (см)</label>
          <input type="number" class="form-control" name="width" value="${currentFormat.width}" required>
        </div>
        <div class="col-md-2">
          <label class="form-label">Высота (см)</label>
          <input type="number" class="form-control" name="height" value="${currentFormat.height}" required>
        </div>
        <div class="col-md-2">
          <label class="form-label">Кол-во</label>
          <input type="number" class="form-control" name="qty" value="1" min="1" required>
        </div>
        <div class="col-md-1">
          <button type="button" class="btn btn-outline-danger" onclick="this.closest('[data-id]').remove()">✕</button>
        </div>
    `;

    const container = document.getElementById('formatList');
    if (container) container.appendChild(wrapper);

    formatId++;
}

window.addFormat = addFormat;

function handleFormatChange(id, select) {
    const [width, height] = select.value.split(',');
    const row = document.querySelector(`[data-id='${id}']`);
    row.querySelector("input[name='width']").value = width;
    row.querySelector("input[name='height']").value = height;
}

function calculateMaterial(data) {
    const maxWidth = 58; // Ширина рулона
    const spacing = 0.3; // 3mm технологический отступ
    let allItems = [];

    // 1. Создаем массив всех принтов С УЧЕТОМ ОТСТУПОВ
    data.forEach(item => {
        for (let i = 0; i < item.qty; i++) {
            allItems.push({
                originalWidth: item.width,  // Сохраняем оригинальные размеры
                originalHeight: item.height,
                width: item.width + spacing,  // Добавляем отступ к ширине
                height: item.height + spacing, // Добавляем отступ к высоте
                label: `${item.width}×${item.height}` // Подпись без учета отступов
            });
        }
    });

    // 2-4. Остальная логика остается без изменений
    function findOptimalLayout(items) {
        let bestLayout = null;
        let minLength = Infinity;

        const totalCombinations = Math.pow(2, items.length);
        for (let mask = 0; mask < totalCombinations; mask++) {
            const orientedItems = items.map((item, index) => {
                const rotated = (mask & (1 << index)) !== 0;
                return {
                    ...item,
                    width: rotated ? item.height : item.width,
                    height: rotated ? item.width : item.height,
                    label: rotated ? `${item.originalHeight}×${item.originalWidth}` : item.label
                };
            });

            const { rows, totalLength } = tryPackItems(orientedItems);
            
            if (totalLength < minLength) {
                minLength = totalLength;
                bestLayout = { rows, totalLength };
            }
        }

        return bestLayout;
    }

    function tryPackItems(items) {
        const sortedItems = [...items].sort((a, b) => b.height - a.height);
        const rows = [];

        for (const item of sortedItems) {
            let placed = false;
            
            for (const row of rows) {
                const rowWidth = row.items.reduce((sum, it) => sum + it.width, 0); // Отступы УЖЕ в размерах
                if (rowWidth + item.width <= maxWidth) {
                    row.items.push(item);
                    row.height = Math.max(row.height, item.height);
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                rows.push({
                    items: [item],
                    height: item.height
                });
            }
        }

        // Отступы УЖЕ учтены в высоте элементов
        const totalLength = rows.reduce((sum, row) => sum + row.height, 0);
        return { rows, totalLength: totalLength / 100 };
    }

    if (allItems.length <= 8) {
        return findOptimalLayout(allItems);
    } else {
        const { rows, totalLength } = tryPackItems(allItems.map(item => {
            const fitsOriginal = item.width <= maxWidth && item.height <= maxWidth;
            const fitsRotated = item.height <= maxWidth && item.width <= maxWidth;
            
            if (fitsOriginal && fitsRotated) {
                return item.height < item.width 
                    ? { ...item, width: item.height, height: item.width, label: `${item.originalHeight}×${item.originalWidth}` }
                    : item;
            } else if (fitsRotated) {
                return { ...item, width: item.height, height: item.width, label: `${item.originalHeight}×${item.originalWidth}` };
            } else {
                return item;
            }
        }));
        
        return { rows, totalLength };
    }
}

function drawLayout(rows) {
    const svg = document.getElementById('layoutSvg');
    svg.innerHTML = '';

    const rollWidth = 58; // фактическая ширина рулона
    const margin = 1;     // визуальные отступы с двух сторон (в см)
    const spacing = 0.3;
    const viewBoxPadding = 2;

    const totalHeight = rows.reduce((sum, row) => sum + row.height + spacing, 0);
    const visualWidth = rollWidth + margin * 2;

    const scale = Math.min(
        500 / visualWidth,
        300 / totalHeight
    );

    svg.setAttribute('viewBox', `0 0 ${visualWidth + viewBoxPadding * 2} ${totalHeight + viewBoxPadding * 2}`);
    svg.style.width = `${visualWidth * scale}px`;
    svg.style.height = `${totalHeight * scale}px`;

    // Левая жёлтая зона
    const leftMargin = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    leftMargin.setAttribute("x", viewBoxPadding);
    leftMargin.setAttribute("y", viewBoxPadding);
    leftMargin.setAttribute("width", margin);
    leftMargin.setAttribute("height", totalHeight);
    leftMargin.setAttribute("fill", "#ffc107");
    svg.appendChild(leftMargin);

    // Правая жёлтая зона
    const rightMargin = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rightMargin.setAttribute("x", viewBoxPadding + margin + rollWidth);
    rightMargin.setAttribute("y", viewBoxPadding);
    rightMargin.setAttribute("width", margin);
    rightMargin.setAttribute("height", totalHeight);
    rightMargin.setAttribute("fill", "#ffc107");
    svg.appendChild(rightMargin);

    // Рулон (область печати)
    const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bgRect.setAttribute("x", viewBoxPadding + margin);
    bgRect.setAttribute("y", viewBoxPadding);
    bgRect.setAttribute("width", rollWidth);
    bgRect.setAttribute("height", totalHeight);
    bgRect.setAttribute("fill", "#f8f9fa");
    //bgRect.setAttribute("stroke", "#000");
    //bgRect.setAttribute("stroke-width", "0.5");
    svg.appendChild(bgRect);

    // Отрисовка рядов
    let y = viewBoxPadding;
    rows.forEach(row => {
        let x = viewBoxPadding + margin;

        row.items.forEach((item, index) => {
            if (index > 0) x += spacing;

            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", x);
            rect.setAttribute("y", y);
            rect.setAttribute("width", item.width);
            rect.setAttribute("height", item.height);
            rect.setAttribute("fill", isRotated(item) ? "#dc3545" : "#0d6efd");
            rect.setAttribute("stroke", "#000");
            rect.setAttribute("stroke-width", "0.2");
            svg.appendChild(rect);

            if (item.width > 5 && item.height > 3) {
                const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
                text.setAttribute("x", x + item.width / 2);
                text.setAttribute("y", y + item.height / 2);
                text.setAttribute("fill", "#fff");
                text.setAttribute("font-size", "2");
                text.setAttribute("text-anchor", "middle");
                text.setAttribute("dominant-baseline", "middle");
                text.textContent = item.label;
                svg.appendChild(text);
            }

            x += item.width;
        });

        y += row.height + spacing;
    });

    function isRotated(item) {
        const [w, h] = item.label.split('×').map(Number);
        return (w === item.height && h === item.width) ||
               (item.width > rollWidth && item.height <= rollWidth);
    }
}


function getPrintPrice(n) {
    if (n <= 2) return 150;
    if (n <= 20) return 100;
    if (n <= 39) return 75;
    if (n <= 99) return 50;
    return 40;
}

function getMaterialCost(len) {
    if (len < 1) return 1500;
    if (len < 4) return 1400;
    if (len < 10) return 1300;
    if (len < 30) return 1120;
    if (len < 50) return 900;
    return 850;
}

document.addEventListener('submit', function (e) {
    if (!e.target.matches('#printForm')) return;
    e.preventDefault();

    const formData = [...document.querySelectorAll('#formatList > div')].map(row => ({
        width: parseFloat(row.querySelector("input[name='width']").value),
        height: parseFloat(row.querySelector("input[name='height']").value),
        qty: parseInt(row.querySelector("input[name='qty']").value)
    }));

    const totalQty = formData.reduce((sum, f) => sum + f.qty, 0);
    const { totalLength, rows } = calculateMaterial(formData);
    const materialPrice = getMaterialCost(totalLength);
    const totalMaterialCost = Math.ceil(totalLength * materialPrice);
    const delivery = 350;
    const printPrice = getPrintPrice(totalQty);

    const totalCost = totalMaterialCost + delivery;
    const costPerUnit = totalCost / totalQty;
    const pricePerUnit = Math.ceil((costPerUnit * 1.4 + printPrice) / 10) * 10;
    const totalPrice = pricePerUnit * totalQty;

    document.getElementById('totalLength').textContent = `${totalLength.toFixed(2)} м`;
    document.getElementById('totalCount').textContent = `${totalQty} шт`;
    document.getElementById('costPerUnit').textContent = `${costPerUnit.toFixed(2)} руб`;
    document.getElementById('printCost').textContent = `${printPrice} руб`;
    document.getElementById('pricePerUnit').textContent = `${pricePerUnit} руб`;
    document.getElementById('totalPrice').textContent = `${totalPrice} руб`;
    document.getElementById('result').style.display = 'block';
    document.getElementById('minOrderAlert').style.display = totalPrice < 1800 ? 'block' : 'none';

    drawLayout(rows);

    const nameMap = formatOptions.reduce((acc, item) => {
        const key = `${item.width}×${item.height}`;
        acc[key] = item.name.split(' ')[0]; // A4, A3, и т.п.
        return acc;
    }, {});

    // Подсчёт длины по форматам
    const formatLengths = {};

    rows.forEach(row => {
        row.items.forEach(item => {
            const label = item.label;
            const name = nameMap[label] || label;
            formatLengths[name] = (formatLengths[name] || 0) + item.height;
        });
    });

    
});
