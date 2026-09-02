window.addEventListener('DOMContentLoaded', () => {


const body = document.querySelector('body');
const cardsField = document.querySelector('.cardsField');
const main = document.querySelector('#main');

const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

// функция по получению данных из базы данных json
const getData = async (url) => {
    const price = await fetch(url, { cache: 'no-store' });

    if (!price.ok) { // проверяем правильно ли обработан запрос
        throw new Error(`Could not fetch ${url}, status: ${price.status}`); // прописываем действия на случай ошибки
    }
    const data = await price.json(); // превращаем json в обычный массив
    return data;    
};

// вызываем функ-ю получения данных из json и обрабатываем
getData('db/main-page-cards.json')
    .then(data => {
        (data.main || []).forEach((obj) => {
            const section = document.createElement('section');
            section.classList.add('pt-3', 'mb-5');
            section.innerHTML = `<h1 class="fw-light mb-2">${escapeHtml(obj.title)}</h1>`
            main.append(section);

            const category = document.createElement('div');
            category.classList.add('row', 'justify-content-md-center', 'row-cols-2', 'row-cols-md-4', 'row-cols-lg-6', 'row-cols-xl-6', 'my-3', 'text-center')
            section.append(category);

            obj.content.forEach(({ img, alt, name, title, link }) => {
                const card = new ProductCard(img, alt, name, title, link, category);
                card.render();
            });

            window.addEventListener('load', () => {
                alignCardsHeight(category);
            });
        });
    });


function alignCardsHeight(container) {
    const cards = container.querySelectorAll('.product-card');

    // Находим максимальную высоту среди всех карточек
    let maxHeight = 0;
    cards.forEach(card => {
        const cardHeight = card.offsetHeight;
        if (cardHeight > maxHeight) {
            maxHeight = cardHeight;
        }
    });

    // Устанавливаем всем карточкам максимальную высоту
    cards.forEach(card => {
        card.style.height = `${maxHeight}px`;
    });
}

// пробуем карточки с классом

class ProductCard {
    constructor(src, alt, name, title, link, parentSelector) {
        this.img = src;
        this.alt = alt;
        this.name = name;
        this.title = title;
        this.link = link;        
        this.parent = parentSelector; // получение DOM - элемента будет просиходить в зависимости от переданного аргумента
    }
    ///!!!
    render() {
        const element = document.createElement('div'); // создание элемента div на странице
        element.classList.add('col', 'stretch');
        // прописываем html внутри div :
        element.innerHTML += `    
        <div class="card main-page-card rounded-4 mb-4">
            <a href="${escapeHtml(this.link)}">
                <img src="${escapeHtml(this.img)}" class="card-img-top rounded-top-4" alt="${escapeHtml(this.alt)}">
            </a>
            
            <div class="card-body" name="${escapeHtml(this.name)}" style="display: flex; align-items: center; justify-content: center;">
                <a href="${escapeHtml(this.link)}">${escapeHtml(this.title)}</a>
            </div>
        </div>                
        `;
        
        this.parent.append(element); // помещаем созданную структуру div во внутрь родителя (родитель будет передаваться через аргумент при создании экземпляра класса)
    }  
}

}); // DOMcontentLoaded ends
