window.addEventListener('DOMContentLoaded', () => {


const body = document.querySelector('body');
const cardsField = document.querySelector('.cardsField');
const navbar = document.querySelector('.navbar-nav');
const firstLi = navbar.querySelector('.nav-item');
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

                // navbar
                const navElement = document.createElement('li');
                navElement.classList.add('nav-item','dropdown');                
                firstLi.insertAdjacentElement('afterend', navElement);

                const navElementItem = document.createElement('a');
                navElementItem.classList.add('nav-link','dropdown-toggle');
                navElementItem.setAttribute('data-bs-toggle', 'dropdown');
                navElementItem.setAttribute('href', '#');
                navElementItem.textContent = `${obj.nav_title}`;
                navElement.append(navElementItem);

                const dropdownMenu = document.createElement('ul');
                dropdownMenu.classList.add('dropdown-menu');
                navElement.append(dropdownMenu);

                obj.content.forEach(elem => {                    
                    const dropdownItem = document.createElement('li');
                    dropdownItem.innerHTML = `<a class="dropdown-item" href="${elem.link}">${elem.name}</a>`;
                    dropdownMenu.append(dropdownItem);
                });

                // navbar ends

                // breadcrumbs

                // const breadcrumbs = document.getElementById('breadcrumbs');
                // breadcrumbs.innerHTML = ''; // Clear previous breadcrumbs

                // // Add Home breadcrumb
                // const homeBreadcrumb = document.createElement('li');
                // homeBreadcrumb.classList.add('breadcrumb-item');
                // homeBreadcrumb.innerHTML = '<a href="#">Главная</a>';
                // breadcrumbs.appendChild(homeBreadcrumb);

                // // Add Category breadcrumb
                // const categoryBreadcrumb = document.createElement('li');
                // categoryBreadcrumb.classList.add('breadcrumb-item');
                // categoryBreadcrumb.innerHTML = `<a href="#">${obj.nav_title}</a>`;
                // breadcrumbs.appendChild(categoryBreadcrumb);

                // obj.content.forEach(elem => {
                //     // Add Page breadcrumb
                //     const pageBreadcrumb = document.createElement('li');
                //     pageBreadcrumb.classList.add('breadcrumb-item', 'active');
                //     pageBreadcrumb.setAttribute('aria-current', 'page');
                //     pageBreadcrumb.textContent = `${elem.name}`;
                //     breadcrumbs.appendChild(pageBreadcrumb);
                // });
                
            }            
        }        
    });



}); // DOMcontentLoaded ends
