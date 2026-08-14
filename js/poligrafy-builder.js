window.addEventListener('DOMContentLoaded', () => {
    const containers = document.querySelectorAll('[data-poligrafy-section], [data-poligrafy-sections]');

    if (!containers.length) {
        return;
    }

    const getData = async (url) => {
        const response = await fetch(url, { cache: 'no-store' });

        if (!response.ok) {
            throw new Error(`Could not fetch ${url}, status: ${response.status}`);
        }

        return response.json();
    };

    const getColorShortLabel = (color) => {
        const lowerColor = String(color || '').toLowerCase();

        if (lowerColor.includes('двух сторон')) {
            return '2 стороны';
        }

        if (lowerColor.includes('одной стороны')) {
            return '1 сторона';
        }

        return color;
    };

    const makeSelectRow = (labelText, select) => {
        const row = document.createElement('div');
        row.classList.add('d-flex', 'align-items-center', 'gap-2');

        const label = document.createElement('label');
        label.classList.add('form-label', 'mb-0', 'flex-shrink-0', 'small');
        label.textContent = labelText;

        row.append(label, select);

        return row;
    };

    const makeLeafletSelectRow = (labelText, select) => {
        const row = document.createElement('div');
        row.classList.add('leaflet-calculator__row');

        const label = document.createElement('label');
        label.classList.add('leaflet-calculator__label');
        label.textContent = labelText;

        select.classList.add('leaflet-calculator__control');
        row.append(label, select);

        return row;
    };

    const fillSelect = (select, options, selectedValue = '') => {
        select.replaceChildren();
        select.disabled = options.length === 0;

        options.forEach((optionData) => {
            const option = document.createElement('option');
            option.value = optionData.value;
            option.textContent = optionData.label;
            select.append(option);
        });

        if (selectedValue && options.some((optionData) => optionData.value === selectedValue)) {
            select.value = selectedValue;
        }
    };

    const getMaterialKey = (rows) => Object.keys(rows[0] || {})[0];

    const isPriceAvailable = (price) => {
        const normalizedPrice = String(price || '').trim();

        return normalizedPrice !== '' && normalizedPrice !== '-';
    };

    const getAvailableTirages = (rowData) => {
        return Object.keys(rowData || {})
            .slice(1)
            .filter((tirage) => isPriceAvailable(rowData[tirage]));
    };

    const hasAvailablePrices = (card) => {
        return (card.table || []).some((rowData) => getAvailableTirages(rowData).length > 0);
    };

    const getSectionTitle = (sectionName) => {
        if (sectionName === 'listovki-cifra') {
            return 'Цифровая печать';
        }

        if (sectionName === 'listovki' || sectionName === 'buklety') {
            return 'Офсетная печать';
        }

        return '';
    };

    const getProductLabel = (cardData) => {
        const productLabels = {
            booklet_1fold: 'Буклет с одним сгибом',
            eurobooklet_2fold: 'Буклет с двумя сгибами (евробуклет)',
            leaflet: 'Листовки',
            leaflet_digital: 'Цифровые листовки'
        };

        return productLabels[cardData.productId] || cardData.productId || cardData.title;
    };

    const getSectionLeadTime = (sectionName) => {
        if (sectionName === 'listovki-cifra') {
            return 'примерный срок изготовления - 1-3 дня';
        }

        if (sectionName === 'listovki') {
            return 'примерный срок изготовления - 7 дней';
        }

        return '';
    };

    const makePriceCalculator = (cardData) => {
        const rows = cardData.table || [];
        const materialKey = getMaterialKey(rows);
        const tirageOptions = Object.keys(rows[0]).slice(1);

        const calculator = document.createElement('div');
        calculator.classList.add('d-grid', 'gap-3', 'text-start');

        const materialSelect = document.createElement('select');
        materialSelect.classList.add('form-select', 'form-select-sm');

        rows.forEach((rowData, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = rowData[materialKey];
            materialSelect.append(option);
        });

        const tirageSelect = document.createElement('select');
        tirageSelect.classList.add('form-select', 'form-select-sm');

        tirageOptions.forEach((tirage) => {
            const option = document.createElement('option');
            option.value = tirage;
            option.textContent = tirage;
            tirageSelect.append(option);
        });

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

        calculator.append(
            makeSelectRow('Бумага', materialSelect),
            makeSelectRow('Тираж', tirageSelect),
            priceCol
        );

        return calculator;
    };

    const makeGroupedPriceCalculator = (cards) => {
        const availableCards = cards.filter(hasAvailablePrices);
        const calculator = document.createElement('div');
        calculator.classList.add('leaflet-calculator');

        const productSelect = document.createElement('select');
        productSelect.classList.add('form-select', 'form-select-sm');

        const formatSelect = document.createElement('select');
        formatSelect.classList.add('form-select', 'form-select-sm');

        const colorSelect = document.createElement('select');
        colorSelect.classList.add('form-select', 'form-select-sm');

        const materialSelect = document.createElement('select');
        materialSelect.classList.add('form-select', 'form-select-sm');

        const tirageSelect = document.createElement('select');
        tirageSelect.classList.add('form-select', 'form-select-sm');

        const priceCol = document.createElement('div');
        priceCol.classList.add('leaflet-calculator__row', 'leaflet-calculator__price-row');

        const priceLabel = document.createElement('div');
        priceLabel.classList.add('leaflet-calculator__label');
        priceLabel.textContent = 'Цена';

        const priceValue = document.createElement('div');
        priceValue.classList.add('price', 'leaflet-calculator__price');

        priceCol.append(priceLabel, priceValue);

        const productOptions = [...new Map(availableCards.map((card) => [card.productId || card.title, {
            value: card.productId || card.title,
            label: getProductLabel(card)
        }])).values()];
        const useProductSelect = productOptions.length > 1;
        const useColorSelect = new Set(availableCards.map((card) => card.color).filter(Boolean)).size > 1;

        const getCardsForProduct = () => {
            if (!useProductSelect) {
                return availableCards;
            }

            return availableCards.filter((card) => (card.productId || card.title) === productSelect.value);
        };

        const getCurrentCard = () => {
            const productCards = getCardsForProduct();

            return productCards.find((card) => card.format === formatSelect.value && card.color === colorSelect.value)
                || productCards.find((card) => card.format === formatSelect.value)
                || productCards[0]
                || availableCards[0];
        };

        const updateFormatOptions = () => {
            const currentFormat = formatSelect.value;
            const formatOptions = [...new Map(getCardsForProduct().map((card) => [card.format, {
                value: card.format,
                label: card.format
            }])).values()];

            fillSelect(formatSelect, formatOptions, currentFormat);
        };

        const updateColorOptions = () => {
            const currentColor = colorSelect.value;
            const colorOptions = getCardsForProduct()
                .filter((card) => card.format === formatSelect.value)
                .map((card) => ({
                    value: card.color,
                    label: getColorShortLabel(card.color)
                }));

            fillSelect(colorSelect, colorOptions, currentColor);
        };

        const updateMaterialOptions = () => {
            const currentMaterial = materialSelect.value;
            const card = getCurrentCard();
            const rows = card ? card.table || [] : [];
            const materialKey = getMaterialKey(rows);
            const materialOptions = rows
                .map((rowData, index) => ({ rowData, index }))
                .filter(({ rowData }) => getAvailableTirages(rowData).length > 0)
                .map(({ rowData, index }) => ({
                    value: String(index),
                    label: rowData[materialKey]
                }));

            fillSelect(materialSelect, materialOptions, currentMaterial);
        };

        const updateTirageOptions = () => {
            const currentTirage = tirageSelect.value;
            const card = getCurrentCard();
            const rows = card ? card.table || [] : [];
            const rowData = rows[Number(materialSelect.value)] || rows[0] || {};
            const tirageOptions = getAvailableTirages(rowData).map((tirage) => ({
                value: tirage,
                label: tirage
            }));

            fillSelect(tirageSelect, tirageOptions, currentTirage);
        };

        const updatePrice = () => {
            const card = getCurrentCard();
            const rows = card ? card.table || [] : [];
            const rowData = rows[Number(materialSelect.value)] || rows[0] || {};
            priceValue.textContent = rowData[tirageSelect.value] || '-';
        };

        const updateByFormat = () => {
            updateColorOptions();
            updateMaterialOptions();
            updateTirageOptions();
            updatePrice();
        };

        const updateByColor = () => {
            updateMaterialOptions();
            updateTirageOptions();
            updatePrice();
        };

        const updateByMaterial = () => {
            updateTirageOptions();
            updatePrice();
        };

        const updateByProduct = () => {
            updateFormatOptions();
            updateByFormat();
        };

        fillSelect(productSelect, productOptions);
        updateByProduct();

        productSelect.addEventListener('change', updateByProduct);
        formatSelect.addEventListener('change', updateByFormat);
        colorSelect.addEventListener('change', updateByColor);
        materialSelect.addEventListener('change', updateByMaterial);
        tirageSelect.addEventListener('change', updatePrice);

        if (useProductSelect) {
            calculator.append(makeLeafletSelectRow('Тип', productSelect));
        }

        calculator.append(makeLeafletSelectRow('Формат', formatSelect));

        if (useColorSelect) {
            calculator.append(makeLeafletSelectRow('Печать', colorSelect));
        }

        calculator.append(
            makeLeafletSelectRow('Бумага', materialSelect),
            makeLeafletSelectRow('Тираж', tirageSelect),
            priceCol
        );

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

    const renderGroupedCard = (sectionName, cards) => {
        const firstCard = cards[0];
        const column = document.createElement('div');
        column.classList.add('col-12', 'col-lg-6', 'leaflet-card-column');

        if (sectionName === 'buklety') {
            column.classList.add('col-xl-5', 'booklet-card-column');
        }

        const card = document.createElement('div');
        card.classList.add('card', 'product-card', 'card-white', 'leaflet-card', 'rounded-4', 'p-4', 'mb-5');

        const titleText = sectionName === 'buklety'
            ? getProductLabel(firstCard)
            : getSectionTitle(sectionName);

        if (titleText) {
            const title = document.createElement('h4');
            title.textContent = titleText;
            card.append(title);
        }

        const leadTimeText = getSectionLeadTime(sectionName);

        if (leadTimeText) {
            const leadTime = document.createElement('p');
            leadTime.classList.add('leaflet-card__lead-time');
            leadTime.textContent = leadTimeText;
            card.append(leadTime);
        }

        const defaultImages = {
            listovki: 'img/listovki/fly_a5.jpg',
            'listovki-cifra': 'img/listovki/fly_a5.jpg'
        };
        const imagePath = (firstCard.img || []).find(Boolean) || defaultImages[sectionName] || '';

        if (imagePath) {
            const imageWrap = document.createElement('div');
            imageWrap.classList.add('poligrafy-card__image');

            const image = document.createElement('img');
            image.src = imagePath;
            image.alt = titleText || firstCard.title || '';
            image.loading = 'lazy';
            imageWrap.append(image);
            card.append(imageWrap);
        }

        const subtitle = document.createElement('p');
        subtitle.classList.add('leaflet-card__subtitle');
        subtitle.textContent = 'Выберите параметры для расчета стоимости';
        card.append(subtitle);

        card.append(makeGroupedPriceCalculator(cards));

        if (firstCard.footer) {
            const footer = document.createElement('div');
            footer.classList.add('leaflet-card__footer');
            footer.innerHTML = firstCard.footer;
            card.append(footer);
        }

        column.append(card);

        return column;
    };

    const renderSectionCards = (sectionName, cards) => {
        if (!['listovki', 'listovki-cifra', 'buklety'].includes(sectionName)) {
            return cards.map(renderCard);
        }

        if (sectionName === 'buklety') {
            const productOrder = ['booklet_1fold', 'eurobooklet_2fold'];
            const groups = new Map();

            cards
                .filter((card) => productOrder.includes(card.productId))
                .forEach((card) => {
                    groups.set(card.productId, [...(groups.get(card.productId) || []), card]);
                });

            return productOrder
                .filter((productId) => groups.has(productId))
                .map((productId) => renderGroupedCard(sectionName, groups.get(productId)));
        }

        const groups = new Map();

        cards.forEach((card) => {
            const groupKey = card.productId || card.title;
            groups.set(groupKey, [...(groups.get(groupKey) || []), card]);
        });

        return [...groups.values()].map((groupCards) => {
            return groupCards.length > 1 ? renderGroupedCard(sectionName, groupCards) : renderCard(groupCards[0]);
        });
    };

    getData('/db/poligrafy.json')
        .then((data) => {
            containers.forEach((container) => {
                const sectionNames = (container.dataset.poligrafySections || container.dataset.poligrafySection || '')
                    .split(',')
                    .map((sectionName) => sectionName.trim())
                    .filter(Boolean);

                sectionNames.forEach((sectionName) => {
                    const cards = data[sectionName] || [];

                    renderSectionCards(sectionName, cards).forEach((cardElement) => {
                        container.append(cardElement);
                    });
                });
            });
        })
        .catch((error) => {
            console.error(error);
        });
});
