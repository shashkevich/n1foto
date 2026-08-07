window.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('[data-poligrafy-section]');

    if (!containers.length) {
        return;
    }

    const getData = async (url) => {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Could not fetch ${url}, status: ${response.status}`);
        }

        return response.json();
    };

    const makePriceCalculator = (cardData) => {
        const rows = cardData.table || [];
        const materialKey = Object.keys(rows[0])[0];
        const tirageOptions = Object.keys(rows[0]).slice(1);

        const calculator = document.createElement('div');
        calculator.classList.add('d-grid', 'gap-3', 'text-start');

        const materialCol = document.createElement('div');
        materialCol.classList.add('d-flex', 'align-items-center', 'gap-2');

        const materialLabel = document.createElement('label');
        materialLabel.classList.add('form-label', 'mb-0', 'flex-shrink-0', 'small');
        materialLabel.textContent = 'Бумага';

        const materialSelect = document.createElement('select');
        materialSelect.classList.add('form-select', 'form-select-sm');

        rows.forEach((rowData, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = rowData[materialKey];
            materialSelect.append(option);
        });

        materialCol.append(materialLabel, materialSelect);

        const tirageCol = document.createElement('div');
        tirageCol.classList.add('d-flex', 'align-items-center', 'gap-2');

        const tirageLabel = document.createElement('label');
        tirageLabel.classList.add('form-label', 'mb-0', 'flex-shrink-0', 'small');
        tirageLabel.textContent = 'Тираж';

        const tirageSelect = document.createElement('select');
        tirageSelect.classList.add('form-select', 'form-select-sm');

        tirageOptions.forEach((tirage) => {
            const option = document.createElement('option');
            option.value = tirage;
            option.textContent = tirage;
            tirageSelect.append(option);
        });

        tirageCol.append(tirageLabel, tirageSelect);

        const priceCol = document.createElement('div');
        priceCol.classList.add('d-flex', 'align-items-center', 'gap-2');

        const priceLabel = document.createElement('div');
        priceLabel.classList.add('form-label', 'mb-0', 'flex-shrink-0', 'small');
        priceLabel.textContent = 'Цена';

        const priceValue = document.createElement('div');
        priceValue.classList.add('price', 'text-center', 'border-table', 'py-1', 'px-2', 'small', 'flex-grow-1');

        priceCol.append(priceLabel, priceValue);

        const updatePrice = () => {
            const rowData = rows[Number(materialSelect.value)];
            priceValue.textContent = rowData[tirageSelect.value] || '-';
        };

        materialSelect.addEventListener('change', updatePrice);
        tirageSelect.addEventListener('change', updatePrice);
        updatePrice();

        calculator.append(materialCol, tirageCol, priceCol);

        return calculator;
    };

    const renderCard = (cardData) => {
        const column = document.createElement('div');
        column.classList.add('col-12', 'col-md-6', 'col-lg-4');

        const card = document.createElement('div');
        card.classList.add('card', 'product-card', 'card-white', 'rounded-4', 'p-3', 'mb-5');

        const title = document.createElement('h4');
        title.textContent = cardData.title;
        card.append(title);

        const meta = document.createElement('p');
        meta.classList.add('mb-3', 'small');
        meta.textContent = [
            cardData.description,
            cardData.color,
            cardData.printType,
            cardData.format
        ].filter(Boolean).join(' · ');
        card.append(meta);

        if (cardData.img) {
            cardData.img.forEach((image) => {
                const img = document.createElement('img');
                img.classList.add('img-fluid', 'mb-3');
                img.style.cssText = 'max-width: 55%; width: auto; margin-top: 0;';
                img.src = image;
                img.alt = cardData.title;
                card.append(img);
            });
        }

        if (cardData.table && cardData.table.length) {
            card.append(makePriceCalculator(cardData));
        }

        column.append(card);

        return column;
    };

    getData('/db/poligrafy.json')
        .then((data) => {
            containers.forEach((container) => {
                const sectionName = container.dataset.poligrafySection;
                const cards = data[sectionName] || [];

                cards.forEach((card) => {
                    container.append(renderCard(card));
                });
            });
        })
        .catch((error) => {
            console.error(error);
        });
});
