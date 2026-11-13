(() => {
    const form = document.querySelector('#pdf-form');
    const input = document.querySelector('#pdf-file');
    const drop = document.querySelector('.pdf-drop');
    const button = form.querySelector('button');
    const status = document.querySelector('#pdf-status');
    const report = document.querySelector('#pdf-report');
    const details = document.querySelector('#pdf-details');
    const findings = document.querySelector('#pdf-findings');
    const maxBytes = 20 * 1024 * 1024;

    const errors = {
        size: 'Файл превышает 20 МБ. Выберите PDF меньшего размера.',
        upload: 'Выберите один PDF-файл и повторите загрузку.',
        invalid: 'Не удалось прочитать PDF. Проверьте файл или заново экспортируйте макет.',
        encrypted: 'PDF защищён. Для проверки экспортируйте копию без защиты.',
        pages: 'В файле больше 250 страниц. Разделите PDF и проверьте части отдельно.',
        limit: 'Файл слишком сложный для автоматической проверки. Попробуйте проверить его по частям.',
        busy: 'Сейчас проверяется другой файл. Повторите попытку через несколько секунд.',
        unavailable: 'Проверка временно недоступна. Попробуйте позже.',
    };
    const warnings = {
        'untagged-rgb': 'Обнаружен DeviceRGB. Если для него не задан профиль по умолчанию, уточните исходное пространство RGB перед конвертацией.',
        'missing-output-intent': 'Output Intent отсутствует. Целевые условия печати не указаны в PDF.',
        'spot-colors': 'Уточните, должны ли плашечные краски печататься отдельными красками или переводиться в CMYK.',
        'transparency': 'Проверьте, как выглядят прозрачные участки после обработки макета для печати.',
        'overprint': 'Проверьте макет в режиме предварительного просмотра наложения красок.',
        'unembedded-fonts': 'Часть шрифтов не встроена. При печати возможна их замена.',
        'content-stream-unparsed': 'Часть содержимого PDF не удалось разобрать. Список цветов и других параметров может быть неполным.',
        'missing-trimbox': 'На части страниц отсутствует TrimBox. Проверьте границы готового изделия.',
    };
    const labels = {
        DeviceRGB: 'RGB (DeviceRGB)',
        DeviceCMYK: 'CMYK (DeviceCMYK)',
        DeviceGray: 'Оттенки серого (DeviceGray)',
        CalRGB: 'RGB (CalRGB)',
        CalGray: 'Оттенки серого (CalGray)',
        Separation: 'Spot (Separation)',
        DeviceN: 'Spot / многоканальный (DeviceN)',
    };

    function showStatus(message, isError = false) {
        status.textContent = message;
        status.classList.toggle('text-danger', isError);
    }

    function card(title, value) {
        const column = document.createElement('div');
        column.className = 'col-12 col-sm-6';
        const panel = document.createElement('div');
        panel.className = 'card rounded-4 h-100 p-3';
        const heading = document.createElement('h3');
        heading.className = 'h6';
        heading.textContent = title;
        const text = document.createElement('p');
        text.className = 'mb-0';
        text.textContent = value;
        panel.append(heading, text);
        column.append(panel);
        details.append(column);
    }

    function listText(items, count, empty) {
        if (!items.length) return empty;
        const remaining = count - items.length;
        return items.join(', ') + (remaining > 0 ? ' и ещё ' + remaining : '');
    }

    function render(data, filename) {
        document.querySelector('#pdf-summary').textContent = filename + ' · Страниц: ' + data.pages;
        details.replaceChildren();
        findings.replaceChildren();

        const spaces = data.spaces.map(space => Object.hasOwn(labels, space) ? labels[space] : space);
        card('Цветовые пространства', spaces.join(', ') || 'Явные цветовые пространства не обнаружены');
        if (data.spotColors.length) card('Имена красок', data.spotColors.join(', '));

        const profiles = data.profiles.map(profile =>
            profile.name + (profile.channels ? ' (каналов: ' + profile.channels + ')' : '')
        );
        card('Встроенные ICC-профили', listText(profiles, data.profileCount, 'Не обнаружены'));

        const intents = data.intents.map(intent =>
            intent.name + (intent.embedded ? ' (ICC встроен)' : ' (без встроенного ICC)')
        );
        card('Output Intent', listText(intents, data.intentCount, 'Не указан'));
        card('Прозрачности', data.transparency ? 'Обнаружены' : 'Не обнаружены');
        card('Наложение красок (Overprint)', data.overprint ? 'Обнаружено' : 'Не обнаружено');

        const messages = data.findings.filter(code => Object.hasOwn(warnings, code)).map(code => warnings[code]);
        if (data.spaces.some(space => /RGB|^Lab$/.test(space))) {
            messages.push('Если для тиража требуется CMYK, согласуйте цветовой профиль с типографией. При переводе RGB или Lab в CMYK отдельные оттенки могут измениться.');
        }
        if (data.intents.some(intent => !intent.embedded)) {
            messages.push('Для части условий печати в Output Intent отсутствует встроенный ICC-профиль.');
        }
        if (!messages.length) messages.push('По проверенным параметрам замечаний нет.');
        for (const message of messages) {
            const item = document.createElement('li');
            item.textContent = message;
            findings.append(item);
        }
        report.hidden = false;
        report.focus();
    }

    input.addEventListener('change', () => {
        report.hidden = true;
        showStatus('');
    });

    drop.addEventListener('dragover', event => {
        event.preventDefault();
        if (!button.disabled) drop.classList.add('is-dragging');
    });
    drop.addEventListener('dragleave', event => {
        if (!drop.contains(event.relatedTarget)) drop.classList.remove('is-dragging');
    });
    drop.addEventListener('drop', event => {
        event.preventDefault();
        drop.classList.remove('is-dragging');
        if (button.disabled) return;
        report.hidden = true;
        if (event.dataTransfer.files.length !== 1) {
            input.value = '';
            showStatus(errors.upload, true);
            return;
        }
        input.files = event.dataTransfer.files;
        showStatus('');
    });

    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (button.disabled) return;
        report.hidden = true;
        const file = input.files[0];
        if (!file || !/\.pdf$/i.test(file.name)) return showStatus(errors.upload, true);
        if (file.size > maxBytes) return showStatus(errors.size, true);

        const body = new FormData(form);
        input.disabled = true;
        button.disabled = true;
        showStatus('Проверяем PDF…');
        try {
            const response = await fetch(form.action, { method: 'POST', body });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = Object.hasOwn(errors, data.error) ? errors[data.error] : errors.unavailable;
                showStatus(response.status === 413 ? errors.size : message, true);
                return;
            }
            render(data, file.name);
            showStatus('');
        } catch {
            showStatus(errors.unavailable, true);
        } finally {
            input.disabled = false;
            button.disabled = false;
        }
    });
})();
