window.addEventListener('DOMContentLoaded', () => {


const body = document.querySelector('body');
const cardsField = document.querySelector('.cardsField');
const main = document.querySelector('#main');

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
getData('db/main-page-cards.json')
    .then(data => {
        // console.log(data);
        for (let key in data) { // перебираем объект полученный от json
            let arr = data[key];

            for (let subkey in arr) {
                let obj = arr[subkey]; // создаем новую переменную для упрощения

                const section = document.createElement('section');
                section.classList.add('pt-3', 'mb-5');
                section.innerHTML = `<h1 class="fw-light mb-2">${obj.title}</h1>`
                main.append(section);

                let category = document.createElement('div');
                category.classList.add('row', 'justify-content-md-center', 'row-cols-2', 'row-cols-md-4', 'row-cols-lg-6', 'row-cols-xl-6', 'my-3', 'text-center')
                section.append(category);
                
                obj.content.forEach(({ img, alt, name, title, link }) => { // обращаемся к свойству data (автоматически полученное, можно увидеть в консоли) и перебираем массив
                    let card = new ProductCard(img, alt, name, title, link, category); // деструктуризируем объект по частям
                    card.render(); // все части передаем в конструктор в качестве аргумента и рендерим    
                });
        
                // После рендеринга всех карточек, выравниваем их по высоте
                window.addEventListener('load', () => {
                    alignCardsHeight(category);
                });
            }            
        }        
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
            <a href="${this.link}">
                <img src=${this.img} class="card-img-top rounded-top-4" alt=${this.alt}>
            </a>
            
            <div class="card-body" name="${this.name}" style="display: flex; align-items: center; justify-content: center;">                
                <a href="${this.link}">${this.title}</a>
            </div>
        </div>                
        `;
        
        this.parent.append(element); // помещаем созданную структуру div во внутрь родителя (родитель будет передаваться через аргумент при создании экземпляра класса)
    }  
}

}); // DOMcontentLoaded ends
