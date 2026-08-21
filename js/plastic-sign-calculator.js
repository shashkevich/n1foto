(function () {
    const calculator = document.getElementById('plasticSignCalculator');

    if (!calculator) {
        return;
    }

    const rowsRoot = document.getElementById('plasticCalculatorRows');
    const addRowButton = document.getElementById('plasticAddRow');
    const areaOutput = document.getElementById('plasticArea');
    const totalOutput = document.getElementById('plasticTotal');
    const minimumNotice = document.getElementById('plasticMinimum');
    const title = document.getElementById('plasticCalculatorTitle');
    const description = document.getElementById('plasticCalculatorDescription');
    const cutDescription = document.getElementById('plasticCutDescription');
    const footer = document.getElementById('plasticCalculatorFooter');
    const status = document.getElementById('plasticCalculatorStatus');
    const imageWrap = document.getElementById('plasticCalculatorImage');
    const image = document.getElementById('plasticCalculatorImageElement');
    const moneyFormatter = new Intl.NumberFormat('ru-RU', {
        maximumFractionDigits: 0
    });
    const areaFormatter = new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    });
    let settings = null;
    let rowCounter = 0;

    const toPositiveNumber = (value) => {
        const number = Number.parseFloat(String(value).replace(',', '.'));
        return Number.isFinite(number) && number > 0 ? number : 0;
    };

    const formatMoney = (value) => `${moneyFormatter.format(Math.ceil(value - 0.000001))} ₽`;

    const getMaterialOptions = (selectedId) => settings.materials.map((item) => {
        const option = document.createElement('option');
        option.value = item.id || item.label;
        option.textContent = item.label || 'Материал';
        option.dataset.priceSmall = toPositiveNumber(item.priceUpToThreshold);
        option.dataset.priceLarge = toPositiveNumber(item.priceAboveThreshold);
        option.selected = option.value === selectedId;
        return option.outerHTML;
    }).join('');

    const updateRemoveButtons = () => {
        const rows = rowsRoot.querySelectorAll('.plastic-calculator__row');

        rows.forEach((row) => {
            const button = row.querySelector('[data-action="remove-row"]');
            button.hidden = rows.length === 1;
        });
    };

    const addRow = (values = {}) => {
        rowCounter += 1;
        const row = document.createElement('div');
        const defaultMaterial = settings.materials[0];
        const materialId = values.materialId || defaultMaterial.id || defaultMaterial.label;

        row.className = 'plastic-calculator__row';
        row.dataset.rowId = String(rowCounter);
        row.innerHTML = `
            <label class="plastic-calculator__row-field plastic-calculator__row-field--material">
                <span>Материал</span>
                <select class="form-select" data-field="material" aria-label="Материал таблички">
                    ${getMaterialOptions(materialId)}
                </select>
            </label>
            <label class="plastic-calculator__row-field">
                <span>Ширина, см</span>
                <input class="form-control" data-field="width" aria-label="Ширина таблички, см" type="number" min="0.1" step="0.1" inputmode="decimal" value="${values.width || 60}">
            </label>
            <label class="plastic-calculator__row-field">
                <span>Высота, см</span>
                <input class="form-control" data-field="height" aria-label="Высота таблички, см" type="number" min="0.1" step="0.1" inputmode="decimal" value="${values.height || 40}">
            </label>
            <label class="plastic-calculator__row-field">
                <span>Количество</span>
                <input class="form-control" data-field="quantity" aria-label="Количество табличек" type="number" min="1" step="1" inputmode="numeric" value="${values.quantity || 1}">
            </label>
            <label class="plastic-calculator__row-field plastic-calculator__row-field--cut">
                <span>Резка</span>
                <input class="form-check-input" data-field="cut" aria-label="Резка по внешнему контуру" type="checkbox"${values.cut ? ' checked' : ''}>
            </label>
            <div class="plastic-calculator__row-total">
                <span>Сумма</span>
                <strong data-output="row-total">—</strong>
            </div>
            <button class="plastic-calculator__remove" data-action="remove-row" type="button" aria-label="Удалить табличку" title="Удалить табличку">×</button>
        `;

        rowsRoot.append(row);
        updateRemoveButtons();
        calculate();
    };

    const getRowData = (row) => {
        const material = row.querySelector('[data-field="material"]');
        const width = toPositiveNumber(row.querySelector('[data-field="width"]').value);
        const height = toPositiveNumber(row.querySelector('[data-field="height"]').value);
        const quantity = Math.floor(toPositiveNumber(row.querySelector('[data-field="quantity"]').value));
        const area = (width / 100) * (height / 100) * quantity;

        return {
            row,
            material: material.options[material.selectedIndex],
            width,
            height,
            quantity,
            area,
            cut: row.querySelector('[data-field="cut"]').checked,
            valid: width > 0 && height > 0 && quantity > 0
        };
    };

    const calculate = () => {
        if (!settings) {
            return;
        }

        const rows = Array.from(rowsRoot.querySelectorAll('.plastic-calculator__row')).map(getRowData);
        const validRows = rows.filter((item) => item.valid);
        const totalArea = validRows.reduce((sum, item) => sum + item.area, 0);
        const threshold = toPositiveNumber(settings.areaThreshold);
        const useLargeRate = totalArea > threshold;
        const cutPrice = toPositiveNumber(settings.cutPrice);
        let calculatedTotal = 0;

        rows.forEach((item) => {
            const output = item.row.querySelector('[data-output="row-total"]');

            if (!item.valid) {
                output.textContent = '—';
                return;
            }

            const rate = toPositiveNumber(useLargeRate
                ? item.material.dataset.priceLarge
                : item.material.dataset.priceSmall);
            const printCost = item.area * rate;
            const perimeterMeters = ((item.width * 2) + (item.height * 2)) / 100;
            const cutCost = item.cut ? perimeterMeters * item.quantity * cutPrice : 0;
            const rowTotal = printCost + cutCost;

            calculatedTotal += rowTotal;
            output.textContent = formatMoney(rowTotal);
        });

        const minimumOrder = toPositiveNumber(settings.minimumOrder);
        const hasValidOrder = validRows.length > 0;
        const total = hasValidOrder ? Math.max(calculatedTotal, minimumOrder) : 0;

        areaOutput.textContent = hasValidOrder ? `${areaFormatter.format(totalArea)} м²` : '—';
        totalOutput.textContent = hasValidOrder ? formatMoney(total) : '—';
        minimumNotice.hidden = !hasValidOrder || calculatedTotal >= minimumOrder;
        minimumNotice.textContent = `Применен минимальный заказ — ${formatMoney(minimumOrder)}.`;
    };

    const applySettings = (card) => {
        const materials = Array.isArray(card.materials) ? card.materials : [];

        if (!materials.length) {
            throw new Error('В JSON не настроены материалы для расчета.');
        }

        settings = card;
        title.textContent = card.title || 'Расчет стоимости таблички';
        description.textContent = card.description || '';
        cutDescription.textContent = `${card.cutLabel || 'Резка по внешнему контуру'}: ${card.notice || 'для нестандартной формы'}, ${formatMoney(toPositiveNumber(card.cutPrice))} за погонный метр`;
        footer.textContent = card.footer || '';
        footer.hidden = !footer.textContent;

        const imagePath = Array.isArray(card.img) ? card.img.find(Boolean) : '';
        imageWrap.hidden = !imagePath;

        if (imagePath) {
            image.src = `/${String(imagePath).replace(/^\//, '')}`;
            image.alt = card.title || 'Печать на пластике';
        }

        rowsRoot.innerHTML = '';
        addRow();
        addRowButton.disabled = false;
        status.hidden = true;
    };

    const initialize = async () => {
        try {
            const response = await fetch('/db/pages/tablichki.json', { cache: 'no-store' });

            if (!response.ok) {
                throw new Error(`Не удалось загрузить цены: ${response.status}`);
            }

            const data = await response.json();
            const section = Array.isArray(data.sections)
                ? data.sections.find((item) => item.id === 'plastic-sign')
                : null;
            const card = section && Array.isArray(section.cards) ? section.cards[0] : null;

            if (!card) {
                throw new Error('В JSON не найден калькулятор печати на пластике.');
            }

            applySettings(card);
        } catch (error) {
            description.textContent = 'Расчет временно недоступен.';
            status.textContent = error.message;
            status.classList.add('is-error');
        }
    };

    rowsRoot.addEventListener('input', calculate);
    rowsRoot.addEventListener('change', calculate);
    rowsRoot.addEventListener('click', (event) => {
        const removeButton = event.target.closest('[data-action="remove-row"]');

        if (!removeButton) {
            return;
        }

        removeButton.closest('.plastic-calculator__row').remove();
        updateRemoveButtons();
        calculate();
    });
    addRowButton.addEventListener('click', () => addRow());

    initialize();
}());
