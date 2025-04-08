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
        col8.innerHTML = `<h4 class="font-weight-light my-2">Таблица цен</h4>`
        childRow.append(col8);
        makeTable(category.table, col8);    
        
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
