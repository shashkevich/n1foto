window.addEventListener('DOMContentLoaded', () => {

const body = document.querySelector('body');
const cardsField = document.querySelector('.cardsField');
// const priceA = document.querySelector('#A4');
const fullPrice = document.querySelectorAll('.price');
const cardsFeild = document.querySelector('.cardsField');

// функция по получению данных из базы данных json
const getData = async (url) => {
    const price = await fetch(url);

    if (!price.ok) { // проверяем правильно ли обработан запрос
        throw new Error(`Could not fetch ${url}, status: ${price.status}`); // прописываем действия на случай ошибки
    }
    const data = await price.json(); // превращаем json в обычный массив
    return data;    
};

const descr = (text, elem) => {
    if (text) {
        
        const descr = document.createElement('div');
        descr.innerHTML = `<div class="card-footer bg-transparent border-secondary centered">
                                <small>${text}</small>						
                           </div>`
        elem.appendChild(descr);
        return `<div class="card-footer bg-transparent border-secondary centered">
                    <small>${descr}</small>						
                </div>`
    } else {
        return ``
    }
   
}

// вызываем функ-ю получения данных из json и обрабатываем
getData('db/tovary.json')
    .then(data => {
        for (let key in data) { // перебираем объект полученный от json
            
            if (key ===  cardsField.id) { // если значение ключа равно значению html элемента (названию страницы)
                let name = cardsFeild.getAttribute('name');
                
                if (key === name) {
                    data[key].forEach(elem => {                        
                        const col = document.createElement('div'); // создание элемента div на странице
                        col.classList.add('col', 'stretch');
                        
                        let card = document.createElement('div');                        
                        card.classList.add('card', 'product-card', 'card-white', 'rounded-4', 'mb-4');
                        card.innerHTML = `<img src="${elem.img}" alt="${elem.alt}" >`
                        
                        const cardBody = document.createElement('div');
                        cardBody.classList.add('card-body');
                        cardBody.innerHTML = `<h5 class="card-text">${elem.title}</h5>`

                        
                        card.appendChild(cardBody);
                        if (elem.price_title) {                            
                            const priceTitle = document.createElement('p');                            
                            priceTitle.innerHTML = `${elem.price_title}`;
                            cardBody.append(priceTitle);
                        }

                        makeTable(elem.table, cardBody);
                        col.appendChild(card);
                        cardsField.appendChild(col);

                        descr(elem.descr, cardBody);
                    });
                    
                } else {
                    let obj = data[key]; // создаем новую переменную для упрощения
                    obj.forEach(({ // обращаемся к свойству data (автоматически полученное, можно увидеть в консоли) и перебираем массив
                        img, alt, name, title, price, textToPrice, descr, secondPrice, thirdPrice, forthPrice// деструктуризируем объект по частям
                    }) => {
                        let card = new ProductCard(img, alt, name, title, price, textToPrice, descr, '.cardsField', secondPrice, thirdPrice, forthPrice);
                        card.render(); // все части передаем в конструктор в качестве аргумента и рендерим
                        // card.addPrice();
                    }); 
                }               
            }
        }        
    });

// пробуем карточки с классом

class ProductCard {
    constructor(src, alt, name, title, price, textToPrice, descr, parentSelector, ...prices) {
        this.img = src;
        this.alt = alt;
        this.name = name;
        this.title = title;
        this.price = price;
        this.textToPrice = textToPrice;
        this.descr = descr;        
        this.prices = prices;
        this.parent = document.querySelector(parentSelector); // получение DOM - элемента будет просиходить в зависимости от переданного аргумента
    }

    render() {
        const element = document.createElement('div'); // создание элемента div на странице
        element.classList.add('col', 'stretch');
        
        const descr = () => {
            if (this.descr) {
                
                return `<div class="card-footer bg-transparent border-secondary centered">
                            <small>${this.descr}</small>						
                        </div>`
            } else {
                return ``
            }
           
        }
        const addAnotherPrice = () => {
            if (this.prices) {
                for (let i=0; i < this.prices.length; i++) {                
                    let p = [];
                    this.prices.forEach(pr => {  
                        if(pr) {
                            p += `<p><span class="price">${pr} </span></p>`;
                        }                    
                    })
                    return p;
                }
            } else {
                return ``
            }
            
        }  

        const price = () => {
            if (this.price) {
                return `<p><span class="price">${this.price}</span>` + `${this.textToPrice}</p>`
            } else {
                return ``
            }
        }

        // прописываем html внутри div :
        element.innerHTML += `    
        <div class="card product-card card-white rounded-4 mb-4">
            <img src=${this.img} alt=${this.alt}>
            <div class="card-body" name="${this.name}">
                <h5 class="card-text">${this.title}</h5>
                
                ${price()}
                ${addAnotherPrice()}
                ${descr()}
                
            </div>
        </div>                
        `;
        this.parent.append(element); // помещаем созданную структуру div во внутрь родителя (родитель будет передаваться через аргумент при создании экземпляра класса)
    }    
}

const makeTable = (obj, elem) => {
    let table = document.createElement('table'); // создаем таблицу
    table.classList.add('table', 'table-striped', 'table-hover', 'table-borderless');
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
    for (let i = 0; i < obj.length; i++) { // перебираем массив объектов
        let tr = document.createElement('tr'); // создаем строку таблицы

        let rows = tbody.getElementsByTagName('tr');
        for (let i = 0; i < rows.length; i++) {
            rows[i].getElementsByTagName('td')[0].classList.add('bold');
        }            

        for (let prop in obj[i]) {
            let td = document.createElement('td'); // создаем ячейку таблицы
            td.textContent = obj[i][prop]; // добавляем значение свойства в ячейку
            tr.appendChild(td); // добавляем ячейку в строку таблицы
            // console.log(obj[i][prop]);
        }
         tbody.appendChild(tr); // добавляем строку таблицы в тело таблицы
         
    }
    table.appendChild(thead); // добавляем заголовок таблицы в таблицу
    table.appendChild(tbody); // добавляем тело таблицы в таблицу
    elem.appendChild(table);
}

}); // DOMcontentLoaded ends
