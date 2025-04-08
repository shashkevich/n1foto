window.addEventListener('DOMContentLoaded', () => {


const body = document.getElementById('main'),
      div = document.createElement('div'),
      pillsWrap = document.getElementById('pills');

// функция по созданию карточек
function createCards (cardlist, htmlElement) { // первый аргумент - объект из базы json, второй - html элемент в который помещается вёрстка
    for (let key in cardlist) { // проходимся циклом по объекту и для каждого элемента создаём карточку
        htmlElement.innerHTML += `
        <div class="col">
            <div class="card product-card card-white rounded-4">
                <img src="img/sample.png" class="card-img-top" alt="...">
                <div class="card-body">
                    <h5 class="card-text">${key}</h5>
                    <p>${cardlist[key]}</p>
                    
                </div>
            </div>
        </div>`;
    }
}

// функция по получению данных из базы данных json
const getPrice = async (url) => {
    const price = await fetch(url);

    if (!price.ok) { // проверяем правильно ли обработан запрос
        throw new Error(`Could not fetch ${url}, status: ${price.status}`); // прописываем действия на случай ошибки
    }
    const data = await price.json(); // превращаем json в обычный массив
    return data;    
};

// вызываем функ-ю получения данных из json и обрабатываем
getPrice('/price.json')
    .then(data => {
        data.canvas.forEach(canvasStyle => { // проходимся по полученному массиву
            console.log(canvasStyle);
            createCards(canvasStyle, body);
        });
        if (data.pills) {
            data.pills.forEach(pill => {
                console.log(pill);
                if (pillsWrap) {
                    createCards(pill, pillsWrap);
                }                
            })
        }        
    });

    // const body = document.querySelector('body');
    
    const table1 = document.createElement('div');
    table1.innerHTML = `<table class="table mt-5 table-striped table-hover table-borderless">
    <tbody>
        <?php foreach ($info as $data):
            echo '
            <tr>
                <td>' . $data['id'] . '</td>
                <td>' . $data['first'] . '</td>
                <td>' . $data['second'] . '</td>
                <td>' . $data['third'] . '</td>                                                
            </tr>';
        ?>
        <?php endforeach; ?>
            rwgterg!
    </tbody>
</table>`;
    function makeTable () {
        body.append(div);
    }
    makeTable();
    console.log(body);

    const nameOfpage = document.querySelector('h1');
    if (nameOfpage.innerHTML = 'Подарки и сувениры') {
        getPrice('/price.json')
        .then(data => {
            
            if (data.pills) {
                data.pills.forEach(pill => {
                    console.log(pill);
                    if (pillsWrap) {
                        createCards(pill, pillsWrap);
                    }                    
                })
            }            
        });
    }

// тест
    getPrice('/test.json')
    .then(data => {
        data.canvas.forEach(canvasStyle => { // проходимся по полученному массиву
            console.log(canvasStyle);
            createCards(canvasStyle, body);
        });
        if (data.pills) {
            data.pills.forEach(pill => {
                console.log(pill);
                if (pillsWrap) {
                    createCards(pill, pillsWrap);
                }                
            })
        }        
    });

}); // DOMcontentLoaded ends


