window.addEventListener('DOMContentLoaded', () => {


const body = document.querySelector('body');
const cardsField = document.querySelector('.cardsField');
const navbar = document.querySelector('.navbar-nav');
if (!navbar) return;
const firstLi = navbar.querySelector('.nav-item');
if (!firstLi) return;
const currentPath = window.location.pathname === '/' ? '/index.html' : window.location.pathname;
const markCurrentLink = (link) => {
    const target = new URL(link.href, window.location.href);
    const active = target.origin === window.location.origin && target.pathname === currentPath;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
    return active;
};
navbar.querySelectorAll('a.nav-link').forEach(markCurrentLink);
const main = document.querySelector('#main');

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
        (Array.isArray(data.main) ? data.main : []).forEach((obj) => {
                if (!obj || !Array.isArray(obj.content)) {
                    return;
                }

                // navbar
                const navElement = document.createElement('li');
                navElement.classList.add('nav-item','dropdown');                
                firstLi.insertAdjacentElement('afterend', navElement);

                const navElementItem = document.createElement('a');
                navElementItem.classList.add('nav-link','dropdown-toggle');
                navElementItem.setAttribute('data-bs-toggle', 'dropdown');
                navElementItem.setAttribute('href', '#');
                navElementItem.setAttribute('role', 'button');
                navElementItem.setAttribute('aria-expanded', 'false');
                navElementItem.textContent = `${obj.nav_title}`;
                navElement.append(navElementItem);

                const dropdownMenu = document.createElement('ul');
                dropdownMenu.classList.add('dropdown-menu');
                navElement.append(dropdownMenu);

                obj.content.forEach(elem => {
                    if (!elem || !elem.link || !(elem.name || elem.title)) return;
                    const dropdownItem = document.createElement('li');
                    const dropdownLink = document.createElement('a');
                    dropdownLink.classList.add('dropdown-item');
                    dropdownLink.href = elem.link || '#';
                    dropdownLink.textContent = elem.name || elem.title || '';
                    if (markCurrentLink(dropdownLink)) navElementItem.classList.add('active');
                    dropdownItem.append(dropdownLink);
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
                
        });
    })
    .catch((error) => {
        console.error('Не удалось построить верхнее меню:', error);
    });



}); // DOMcontentLoaded ends
