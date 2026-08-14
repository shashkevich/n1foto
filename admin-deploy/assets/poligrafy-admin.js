(function () {
  const MATERIAL_INDEX = 0;
  const COLOR_INDEX = 1;
  const FORMAT_INDEX = 2;
  const TIRAGE_INDEX = 3;
  const PRINT_TYPE_INDEX = 5;
  const PRICE_INDEX = 6;

  const sectionSelect = document.getElementById('sectionSelect');
  const productSelect = document.getElementById('productSelect');
  const csvInput = document.getElementById('csvInput');
  const buildPreviewButton = document.getElementById('buildPreview');
  const resetWorkButton = document.getElementById('resetWork');
  const importStatus = document.getElementById('importStatus');
  const coefficientsGrid = document.getElementById('coefficientsGrid');
  const applyCoefficientsButton = document.getElementById('applyCoefficients');
  const resultPanel = document.getElementById('resultPanel');
  const resultMeta = document.getElementById('resultMeta');
  const positionsBody = document.getElementById('positionsBody');
  const saveInlineButton = document.getElementById('saveInline');
  const saveJsonButton = document.getElementById('saveJson');
  const formatFilter = document.getElementById('formatFilter');
  const colorFilter = document.getElementById('colorFilter');
  const tableSearch = document.getElementById('tableSearch');
  const previewPanel = document.getElementById('previewPanel');
  const cardsMeta = document.getElementById('cardsMeta');
  const cardPreview = document.getElementById('cardPreview');
  const editorRoot = document.querySelector('[data-poligrafy-editor]');
  const productImageInput = document.getElementById('productImageInput');
  const uploadProductImageButton = document.getElementById('uploadProductImage');
  const productImagePreview = document.getElementById('productImagePreview');
  const productImagePreviewImg = document.getElementById('productImagePreviewImg');
  const productImageProductName = document.getElementById('productImageProductName');

  const config = {
    buklety: {
      name: 'Буклеты',
      page: 'buklety.html',
      roundTo: 10,
      roundMode: 'ceil',
      costMultiplierRules: [
        { to: 3000, multiplier: 2 },
        { from: 3000.01, to: 7000, multiplier: 1.8 },
        { from: 7000.01, to: 15000, multiplier: 1.5 },
        { from: 15000.01, to: 40000, multiplier: 1.4 },
        { from: 40000.01, multiplier: 1.3 }
      ],
      products: {
        booklet_1fold: {
          name: 'Буклет с одним сгибом',
          titleTemplate: 'Буклет {format}, 1 сгиб',
          description: 'Цветная печать с двух сторон, офсет',
          image: 'img/buklety/buklet_A4-A5.jpg'
        },
        eurobooklet_2fold: {
          name: 'Буклет с двумя сгибами (евробуклет)',
          titleTemplate: 'Буклет с двумя сгибами (евробуклет) {format}',
          description: 'Цветная печать с двух сторон, офсет',
          image: 'img/buklety/buklet_eu.jpg'
        }
      }
    },
    listovki: {
      name: 'Листовки',
      page: 'listovki.html',
      roundTo: 10,
      roundMode: 'ceil',
      costMultiplierRules: [
        { to: 3000, multiplier: 2 },
        { from: 3000.01, to: 7000, multiplier: 1.8 },
        { from: 7000.01, to: 15000, multiplier: 1.5 },
        { from: 15000.01, to: 40000, multiplier: 1.4 },
        { from: 40000.01, multiplier: 1.3 }
      ],
      products: {
        leaflet: {
          name: 'Листовки',
          titleTemplate: 'Листовки {format}, {colorShort}',
          description: 'Цветная печать, офсет',
          image: 'img/listovki/fly_a5.jpg'
        }
      }
    }
  };

  const initialSection = editorRoot && config[editorRoot.dataset.poligrafyEditor]
    ? editorRoot.dataset.poligrafyEditor
    : 'buklety';

  const state = {
    headers: [],
    rows: [],
    positions: [],
    cards: [],
    existingJson: null,
    csvName: '',
    sourceMode: 'empty',
    selectedSection: initialSection,
    selectedProduct: 'booklet_1fold'
  };

  const coefficientLimits = [
    ...Array.from({ length: 15 }, (_, index) => (index + 1) * 1000),
    20000,
    25000,
    30000,
    35000,
    40000,
    45000,
    50000,
    Infinity
  ];

  const formatRub = (value) => {
    if (!Number.isFinite(value)) {
      return '-';
    }

    return `${Math.round(value).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} ₽`;
  };

  const parseDecimal = (value) => Number(String(value || '').replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;

  const parseOptionalPrice = (value) => {
    const normalizedValue = String(value || '').trim();

    return !normalizedValue || normalizedValue === '-' ? null : parseDecimal(normalizedValue);
  };

  const roundRetail = (value) => {
    const section = config[state.selectedSection];
    const roundTo = Number(section.roundTo || 1);
    const steps = value / roundTo;

    if (section.roundMode === 'floor') {
      return Math.floor(steps) * roundTo;
    }

    if (section.roundMode === 'round') {
      return Math.round(steps) * roundTo;
    }

    return Math.ceil(steps) * roundTo;
  };

  const getProductConfig = () => config[state.selectedSection].products[state.selectedProduct];

  const getAutoMultiplier = (cost, rules = config[state.selectedSection].costMultiplierRules) => {
    const rule = rules.find((item) => {
      const from = item.from ?? -Infinity;
      const to = item.to ?? Infinity;
      return cost >= from && cost <= to;
    });

    return Number(rule ? rule.multiplier : 1.5);
  };

  const makeKeySource = (format, material, tirage, color, printType) => [
    format,
    material,
    tirage,
    color,
    printType
  ].join('|');

  const sha1Fallback = (value) => {
    const bytes = new TextEncoder().encode(value);
    const words = [];

    for (let i = 0; i < bytes.length; i += 1) {
      words[i >> 2] |= bytes[i] << (24 - (i % 4) * 8);
    }

    words[bytes.length >> 2] |= 0x80 << (24 - (bytes.length % 4) * 8);
    words[(((bytes.length + 8) >> 6) + 1) * 16 - 1] = bytes.length * 8;

    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;

    const rotateLeft = (valueToRotate, shift) => (valueToRotate << shift) | (valueToRotate >>> (32 - shift));

    for (let i = 0; i < words.length; i += 16) {
      const block = words.slice(i, i + 16);

      for (let j = 16; j < 80; j += 1) {
        block[j] = rotateLeft(block[j - 3] ^ block[j - 8] ^ block[j - 14] ^ block[j - 16], 1);
      }

      let a = h0;
      let b = h1;
      let c = h2;
      let d = h3;
      let e = h4;

      for (let j = 0; j < 80; j += 1) {
        let f;
        let k;

        if (j < 20) {
          f = (b & c) | ((~b) & d);
          k = 0x5a827999;
        } else if (j < 40) {
          f = b ^ c ^ d;
          k = 0x6ed9eba1;
        } else if (j < 60) {
          f = (b & c) | (b & d) | (c & d);
          k = 0x8f1bbcdc;
        } else {
          f = b ^ c ^ d;
          k = 0xca62c1d6;
        }

        const temp = (rotateLeft(a, 5) + f + e + k + (block[j] >>> 0)) >>> 0;
        e = d;
        d = c;
        c = rotateLeft(b, 30) >>> 0;
        b = a;
        a = temp;
      }

      h0 = (h0 + a) >>> 0;
      h1 = (h1 + b) >>> 0;
      h2 = (h2 + c) >>> 0;
      h3 = (h3 + d) >>> 0;
      h4 = (h4 + e) >>> 0;
    }

    return [h0, h1, h2, h3, h4]
      .map((item) => item.toString(16).padStart(8, '0'))
      .join('');
  };

  const sha1 = async (value) => {
    if (!window.crypto || !window.crypto.subtle) {
      return sha1Fallback(value);
    }

    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-1', bytes);
    return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  };

  const getOverridesKey = () => `n1foto-poligrafy-overrides:${state.selectedProduct}`;

  const loadCurrentJson = async () => {
    const response = await fetch('/api/poligrafy-json.php', {
      credentials: 'same-origin',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`Не удалось загрузить текущий poligrafy.json: ${response.status}`);
    }

    state.existingJson = await response.json();
  };

  const getExistingProductCards = () => {
    const sectionCards = Array.isArray(state.existingJson && state.existingJson[state.selectedSection])
      ? state.existingJson[state.selectedSection]
      : [];

    return sectionCards.filter((card) => card.productId === state.selectedProduct);
  };

  const renderProductImage = (cacheBust = false) => {
    if (!productImagePreview || !productImagePreviewImg) {
      return;
    }

    const productName = config[state.selectedSection].products[state.selectedProduct].name;

    if (productImageProductName) {
      productImageProductName.textContent = productName;
    }

    const cards = getExistingProductCards();
    const imagePath = cards.flatMap((card) => card.img || []).find(Boolean) || '';

    if (!imagePath) {
      productImagePreview.classList.add('is-empty');
      productImagePreviewImg.removeAttribute('src');
      productImagePreviewImg.alt = '';
      return;
    }

    const publicBase = String(editorRoot.dataset.publicSiteBase || '').replace(/\/$/, '');
    const imageUrl = `${publicBase}/${String(imagePath).replace(/^\//, '')}${cacheBust ? `?v=${Date.now()}` : ''}`;
    productImagePreviewImg.src = imageUrl;
    productImagePreviewImg.alt = productName;
    productImagePreview.classList.remove('is-empty');
  };

  const loadExistingProductPrices = async () => {
    const cards = getExistingProductCards();

    if (!cards.length) {
      resetWork();
      renderProductImage();
      setStatus('Для выбранного типа изделия в poligrafy.json пока нет цен. Загрузите CSV.', 'muted');
      return;
    }

    const headers = ['Материал', 'Цвет', 'Формат', 'Тираж', 'Служебное поле', 'Тип печати', 'Цена'];
    const rows = [];

    cards.forEach((card) => {
      (card.table || []).forEach((tableRow) => {
        const materialHeader = Object.keys(tableRow)[0];
        const material = tableRow[materialHeader];

        Object.keys(tableRow).slice(1).forEach((tirageHeader) => {
          const priceText = String(tableRow[tirageHeader] || '').trim();

          rows.push({
            [headers[MATERIAL_INDEX]]: material,
            [headers[COLOR_INDEX]]: card.color || '',
            [headers[FORMAT_INDEX]]: card.format || card.formatLabel || '',
            [headers[TIRAGE_INDEX]]: tirageHeader,
            [headers[PRINT_TYPE_INDEX]]: card.printType || '',
            [headers[PRICE_INDEX]]: priceText
          });
        });
      });
    });

    state.headers = headers;
    state.rows = rows;
    state.csvName = '';
    state.sourceMode = 'json';
    state.positions = await Promise.all(rows.map(async (row, rowIndex) => {
      const material = row[headers[MATERIAL_INDEX]];
      const color = row[headers[COLOR_INDEX]];
      const format = row[headers[FORMAT_INDEX]];
      const tirage = Number.parseInt(row[headers[TIRAGE_INDEX]], 10);
      const printType = row[headers[PRINT_TYPE_INDEX]];
      const retail = parseOptionalPrice(row[headers[PRICE_INDEX]]);
      const key = await sha1(makeKeySource(format, material, tirage, color, printType));

      return {
        rowIndex,
        key,
        format,
        color,
        printType,
        material,
        tirage,
        cost: null,
        autoMultiplier: null,
        multiplier: null,
        retail,
        margin: null,
        warnings: []
      };
    }));

    buildCards();
    updateFilters();
    setEnabledState(true);
    renderPositions();
    renderProductImage();
    resultMeta.textContent = `Текущие цены из poligrafy.json: позиций ${state.positions.length}, карточек ${state.cards.length}`;
    setStatus('Текущие цены загружены. Их можно изменить в колонке «Цена» без загрузки CSV.', 'success');
  };

  const loadOverrides = () => {
    try {
      return JSON.parse(localStorage.getItem(getOverridesKey()) || '{}');
    } catch (error) {
      return {};
    }
  };

  const saveOverrides = () => {
    const overrides = {};

    state.positions.forEach((position) => {
      overrides[position.key] = {
        multiplier: position.multiplier,
        retail: position.retail
      };
    });

    localStorage.setItem(getOverridesKey(), JSON.stringify(overrides));
    setStatus('Правки сохранены в этом браузере.', 'success');
  };

  const setStatus = (message, type = 'muted') => {
    importStatus.textContent = message;
    importStatus.className = `notice notice-${type}`;
  };

  const unique = (items) => [...new Set(items.filter((item) => String(item || '').trim() !== ''))];

  const getFileText = async (file) => {
    const buffer = await file.arrayBuffer();
    const utf8 = new TextDecoder('utf-8').decode(buffer);

    if (!utf8.includes('\uFFFD')) {
      return utf8;
    }

    return new TextDecoder('windows-1251').decode(buffer);
  };

  const parseCsv = (text) => {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];

      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
        continue;
      }

      if (char === '"') {
        quoted = !quoted;
        continue;
      }

      if (char === ';' && !quoted) {
        row.push(cell.trim());
        cell = '';
        continue;
      }

      if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') {
          i += 1;
        }

        row.push(cell.trim());
        cell = '';

        if (row.some((value) => value !== '')) {
          rows.push(row);
        }

        row = [];
        continue;
      }

      cell += char;
    }

    row.push(cell.trim());

    if (row.some((value) => value !== '')) {
      rows.push(row);
    }

    if (!rows.length || rows[0].length < 7) {
      throw new Error('В CSV должно быть минимум 7 колонок.');
    }

    const headers = rows.shift().map((header, index) => index === 0 ? header.replace(/^\uFEFF/, '') : header);
    const dataRows = rows
      .filter((item) => item.length === headers.length)
      .map((item) => Object.fromEntries(headers.map((header, index) => [header, item[index] || ''])))
      .filter((item) => (
        String(item[headers[MATERIAL_INDEX]] || '').trim() !== ''
        && String(item[headers[FORMAT_INDEX]] || '').trim() !== ''
        && String(item[headers[TIRAGE_INDEX]] || '').trim() !== ''
        && String(item[headers[PRICE_INDEX]] || '').trim() !== ''
      ));

    if (!dataRows.length) {
      throw new Error('В CSV не найдено строк с ценами.');
    }

    return { headers, rows: dataRows };
  };

  const extractFormatLabel = (format) => {
    const match = String(format || '').match(/\(([^)]+)\)/u);
    return match ? match[1] : format;
  };

  const getColorShortLabel = (color) => {
    const value = String(color || '').toLowerCase();

    if (value.includes('двух сторон')) {
      return '2 стороны';
    }

    if (value.includes('одной стороны')) {
      return '1 сторона';
    }

    return color;
  };

  const makeTitle = (productConfig, data) => productConfig.titleTemplate
    .replace('{format}', data.format)
    .replace('{formatLabel}', data.formatLabel)
    .replace('{color}', data.color)
    .replace('{colorShort}', data.colorShort);

  const makePositions = async () => {
    const overrides = loadOverrides();
    const headers = state.headers;

    state.positions = await Promise.all(state.rows.map(async (row, rowIndex) => {
      const material = row[headers[MATERIAL_INDEX]];
      const color = row[headers[COLOR_INDEX]];
      const format = row[headers[FORMAT_INDEX]];
      const tirage = Number.parseInt(row[headers[TIRAGE_INDEX]], 10);
      const printType = row[headers[PRINT_TYPE_INDEX]];
      const cost = parseDecimal(row[headers[PRICE_INDEX]]);
      const key = await sha1(makeKeySource(format, material, tirage, color, printType));
      const saved = overrides[key] || {};
      const autoMultiplier = getAutoMultiplier(cost);
      const multiplier = Number(saved.multiplier || autoMultiplier);
      const retail = Number(saved.retail || roundRetail(cost * multiplier));

      return {
        rowIndex,
        key,
        format,
        color,
        printType,
        material,
        tirage,
        cost,
        autoMultiplier,
        multiplier,
        retail,
        margin: retail - cost,
        warnings: []
      };
    }));

    updateWarnings();
  };

  const updateWarnings = () => {
    state.positions.forEach((position) => {
      position.warnings = [];
      position.margin = Number.isFinite(position.cost) && Number.isFinite(position.retail)
        ? position.retail - position.cost
        : null;
    });

    const groups = new Map();

    state.positions.forEach((position) => {
      const key = [position.format, position.color, position.printType, position.material].join('|');
      groups.set(key, [...(groups.get(key) || []), position]);
    });

    groups.forEach((positions) => {
      positions.sort((a, b) => a.tirage - b.tirage);
      let previous = null;

      positions.filter((position) => Number.isFinite(position.retail)).forEach((position) => {
        if (previous && position.retail < previous.retail) {
          position.warnings.push('ниже предыдущего тиража');
        }

        previous = position;
      });
    });
  };

  const buildCards = () => {
    const product = getProductConfig();
    const headers = state.headers;
    const grouped = new Map();

    state.rows.forEach((row) => {
      const key = [
        row[headers[FORMAT_INDEX]],
        row[headers[COLOR_INDEX]],
        row[headers[PRINT_TYPE_INDEX]]
      ].join('|');

      grouped.set(key, [...(grouped.get(key) || []), row]);
    });

    state.cards = [...grouped.values()].map((rows) => {
      const first = rows[0];
      const format = first[headers[FORMAT_INDEX]];
      const color = first[headers[COLOR_INDEX]];
      const printType = first[headers[PRINT_TYPE_INDEX]];
      const formatLabel = extractFormatLabel(format);
      const colorShort = getColorShortLabel(color);
      const existingCard = getExistingProductCards().find((card) => (
        card.format === format
        && card.color === color
        && card.printType === printType
      ));
      const tirages = unique(rows.map((row) => Number.parseInt(row[headers[TIRAGE_INDEX]], 10))).sort((a, b) => a - b);
      const materials = unique(rows.map((row) => row[headers[MATERIAL_INDEX]]));
      const materialHeader = Object.keys((existingCard && existingCard.table && existingCard.table[0]) || {})[0]
        || `${headers[MATERIAL_INDEX]}\\${headers[TIRAGE_INDEX]}`;

      const table = materials.map((material) => {
        const tableRow = { [materialHeader]: material };

        tirages.forEach((tirage) => {
          const position = state.positions.find((item) => (
            item.format === format
            && item.color === color
            && item.printType === printType
            && item.material === material
            && item.tirage === tirage
          ));

          tableRow[`${tirage} шт`] = position && Number.isFinite(position.retail) ? formatRub(position.retail) : '-';
        });

        return tableRow;
      });

      return {
        ...(existingCard || {}),
        productId: state.selectedProduct,
        title: existingCard ? existingCard.title : makeTitle(product, { format, formatLabel, color, colorShort }),
        description: existingCard ? existingCard.description : product.description,
        format,
        formatLabel,
        color,
        printType,
        img: existingCard ? (existingCard.img || []) : (product.image ? [product.image] : []),
        table
      };
    }).sort((a, b) => a.format.localeCompare(b.format, 'ru'));
  };

  const makeOutputJson = () => {
    const section = state.selectedSection;
    const productOrder = Object.keys(config[section].products);
    const source = state.existingJson
      ? JSON.parse(JSON.stringify(state.existingJson))
      : { meta: {}, [section]: [] };
    const existingCards = Array.isArray(source[section]) ? source[section] : [];
    const keptCards = existingCards.filter((card) => card.productId !== state.selectedProduct);

    source.meta = {
      ...(source.meta || {}),
      generatedAt: new Date().toISOString().slice(0, 19).replace('T', ' ')
    };

    source[section] = [...keptCards, ...state.cards].sort((a, b) => {
      const aOrder = productOrder.indexOf(a.productId);
      const bOrder = productOrder.indexOf(b.productId);
      const normalizedA = aOrder === -1 ? 999 : aOrder;
      const normalizedB = bOrder === -1 ? 999 : bOrder;

      if (normalizedA === normalizedB) {
        return String(a.title || '').localeCompare(String(b.title || ''), 'ru');
      }

      return normalizedA - normalizedB;
    });

    return source;
  };

  const saveJsonToServer = async () => {
    buildCards();
    const output = makeOutputJson();
    const response = await fetch('/api/poligrafy-json.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(output)
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || `Не удалось сохранить JSON: ${response.status}`);
    }

    state.existingJson = output;
    setStatus(`Цены сохранены в тестовый сайт: ${payload.path}. После проверки сделайте коммит и пуш.`, 'success');
  };

  const fillSelect = (select, options, selectedValue = '') => {
    select.replaceChildren();

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

  const renderSections = () => {
    fillSelect(sectionSelect, Object.entries(config).map(([value, item]) => ({
      value,
      label: item.name
    })), state.selectedSection);
  };

  const renderProducts = () => {
    const products = config[state.selectedSection].products;
    const productOptions = Object.entries(products).map(([value, item]) => ({
      value,
      label: item.name
    }));

    if (!products[state.selectedProduct]) {
      state.selectedProduct = productOptions[0].value;
    }

    fillSelect(productSelect, productOptions, state.selectedProduct);
  };

  const renderCoefficientInputs = () => {
    coefficientsGrid.replaceChildren();

    coefficientLimits.forEach((limit) => {
      const cost = limit === Infinity ? 50000.01 : limit;
      const wrapper = document.createElement('label');
      wrapper.className = 'coef-cell';
      wrapper.innerHTML = `
        <span>${limit === Infinity ? 'свыше 50 000 ₽' : `до ${formatRub(limit)}`}</span>
        <input class="coefficient-input" inputmode="decimal" data-to="${limit === Infinity ? '' : limit}" value="${getAutoMultiplier(cost)}">
      `;
      coefficientsGrid.append(wrapper);
    });
  };

  const getCoefficientRulesFromForm = () => {
    const inputs = [...document.querySelectorAll('.coefficient-input')];
    let from = null;

    return inputs.map((input) => {
      const to = input.dataset.to === '' ? null : Number(input.dataset.to);
      const rule = {
        multiplier: parseDecimal(input.value) || 1
      };

      if (from !== null) {
        rule.from = from;
      }

      if (to !== null) {
        rule.to = to;
        from = to + 0.01;
      }

      return rule;
    });
  };

  const updateFilters = () => {
    const formats = [{ value: '', label: 'Все' }, ...unique(state.positions.map((item) => item.format)).map((value) => ({ value, label: value }))];
    const colors = [{ value: '', label: 'Все' }, ...unique(state.positions.map((item) => getColorShortLabel(item.color))).map((value) => ({ value, label: value }))];

    fillSelect(formatFilter, formats, formatFilter.value);
    fillSelect(colorFilter, colors, colorFilter.value);
  };

  const getVisiblePositions = () => {
    const formatValue = formatFilter.value;
    const colorValue = colorFilter.value;
    const search = tableSearch.value.trim().toLowerCase();

    return state.positions.filter((position) => {
      const colorShort = getColorShortLabel(position.color);
      const haystack = [
        position.format,
        colorShort,
        position.material,
        position.tirage,
        position.cost,
        position.retail
      ].join(' ').toLowerCase();

      return (!formatValue || position.format === formatValue)
        && (!colorValue || colorShort === colorValue)
        && (!search || haystack.includes(search));
    });
  };

  const renderPositions = () => {
    updateWarnings();
    buildCards();

    const visiblePositions = getVisiblePositions();

    if (!visiblePositions.length) {
      positionsBody.innerHTML = '<tr><td colspan="9" class="empty-cell">Нет строк по выбранным фильтрам.</td></tr>';
      return;
    }

    positionsBody.innerHTML = visiblePositions.map((position) => `
      <tr data-key="${position.key}" class="${position.warnings.length ? 'warn-row' : ''}">
        <td>${escapeHtml(position.format)}</td>
        <td>${escapeHtml(getColorShortLabel(position.color))}</td>
        <td>${escapeHtml(position.material)}</td>
        <td>${position.tirage} шт</td>
        <td>${Number.isFinite(position.cost) ? formatRub(position.cost) : '—'}</td>
        <td>${Number.isFinite(position.cost)
          ? `<input class="position-multiplier" inputmode="decimal" value="${position.multiplier}" data-key="${position.key}">`
          : '<span class="muted-value" title="Себестоимость появится после импорта CSV">—</span>'}</td>
        <td><input class="position-retail" inputmode="numeric" value="${Number.isFinite(position.retail) ? Math.round(position.retail) : '-'}" data-key="${position.key}"></td>
        <td class="price-value">${Number.isFinite(position.margin) ? formatRub(position.margin) : '—'}</td>
        <td>${position.warnings.length ? `<span class="warn-text">${position.warnings.join(', ')}</span>` : ''}</td>
      </tr>
    `).join('');

    renderCardsPreview();
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const setEnabledState = (enabled) => {
    [saveJsonButton, formatFilter, colorFilter, tableSearch].forEach((element) => {
      element.disabled = !enabled;
    });
    applyCoefficientsButton.disabled = !enabled || state.sourceMode !== 'csv';
    saveInlineButton.disabled = !enabled || state.sourceMode !== 'csv';

    resultPanel.classList.toggle('is-empty', !enabled);
    previewPanel.classList.toggle('is-empty', !enabled);
  };

  const renderCardsPreview = () => {
    cardsMeta.textContent = `Сформировано карточек: ${state.cards.length}`;
    cardPreview.innerHTML = state.cards.slice(0, 12).map((card, index) => {
      const rows = card.table || [];
      const materialKey = Object.keys(rows[0] || {})[0];
      const firstMaterial = rows[0] || {};
      const tirages = Object.keys(firstMaterial).slice(1).filter((key) => firstMaterial[key] && firstMaterial[key] !== '-');

      return `
        <article class="preview-card" data-card-index="${index}">
          <h3>${escapeHtml(card.title)}</h3>
          <small>${escapeHtml([card.description, getColorShortLabel(card.color), card.printType].filter(Boolean).join(' · '))}</small>
          <label class="calc-row">
            <span>Бумага</span>
            <select class="preview-material">
              ${rows.map((row, rowIndex) => `<option value="${rowIndex}">${escapeHtml(row[materialKey])}</option>`).join('')}
            </select>
          </label>
          <label class="calc-row">
            <span>Тираж</span>
            <select class="preview-tirage">
              ${tirages.map((tirage) => `<option value="${escapeHtml(tirage)}">${escapeHtml(tirage)}</option>`).join('')}
            </select>
          </label>
          <div class="calc-price">${escapeHtml(firstMaterial[tirages[0]] || '-')}</div>
        </article>
      `;
    }).join('');

    if (state.cards.length > 12) {
      const note = document.createElement('div');
      note.className = 'notice notice-muted';
      note.textContent = `В предпросмотре показано 12 карточек из ${state.cards.length}.`;
      cardPreview.append(note);
    }
  };

  const updatePreviewCardPrice = (cardElement) => {
    const card = state.cards[Number(cardElement.dataset.cardIndex)];
    const rows = card.table || [];
    const materialIndex = Number(cardElement.querySelector('.preview-material').value || 0);
    const materialRow = rows[materialIndex] || {};
    const tirageSelect = cardElement.querySelector('.preview-tirage');
    const currentTirage = tirageSelect.value;
    const availableTirages = Object.keys(materialRow).slice(1).filter((key) => materialRow[key] && materialRow[key] !== '-');

    fillSelect(tirageSelect, availableTirages.map((tirage) => ({ value: tirage, label: tirage })), currentTirage);
    cardElement.querySelector('.calc-price').textContent = materialRow[tirageSelect.value] || '-';
  };

  const rebuildAll = async () => {
    if (!csvInput.files.length) {
      throw new Error('Выберите CSV прайс партнера.');
    }

    const csvText = await getFileText(csvInput.files[0]);
    const parsed = parseCsv(csvText);

    state.headers = parsed.headers;
    state.rows = parsed.rows;
    state.csvName = csvInput.files[0].name;
    state.sourceMode = 'csv';

    await makePositions();
    buildCards();
    updateFilters();
    renderPositions();

    resultMeta.textContent = `${state.csvName}: строк ${state.positions.length}, карточек ${state.cards.length}`;
    setEnabledState(true);

    setStatus('Прайс разобран. Проверьте таблицу, при необходимости поправьте цены и сохраните в тестовый сайт.', 'success');
  };

  const resetWork = () => {
    state.headers = [];
    state.rows = [];
    state.positions = [];
    state.cards = [];
    state.csvName = '';
    state.sourceMode = 'empty';
    csvInput.value = '';
    formatFilter.value = '';
    colorFilter.value = '';
    tableSearch.value = '';
    resultMeta.textContent = 'Нет загруженных цен';
    cardsMeta.textContent = 'Карточки пока не сформированы';
    positionsBody.innerHTML = '<tr><td colspan="9" class="empty-cell">Здесь появятся текущие цены или данные после импорта CSV.</td></tr>';
    cardPreview.replaceChildren();
    setEnabledState(false);
    setStatus('Для загрузки нового прайса выберите CSV и нажмите «Построить».');
  };

  if (sectionSelect) {
    sectionSelect.addEventListener('change', () => {
      state.selectedSection = sectionSelect.value;
      renderProducts();
      renderCoefficientInputs();
      resetWork();
    });
  }

  productSelect.addEventListener('change', async () => {
    state.selectedProduct = productSelect.value;
    await loadExistingProductPrices();
  });

  if (productImageInput && uploadProductImageButton) {
    productImageInput.addEventListener('change', () => {
      uploadProductImageButton.disabled = !productImageInput.files.length;
    });

    uploadProductImageButton.addEventListener('click', async () => {
      if (!productImageInput.files.length) {
        return;
      }

      const formData = new FormData();
      formData.append('section', state.selectedSection);
      formData.append('productId', state.selectedProduct);
      formData.append('image', productImageInput.files[0]);

      try {
        uploadProductImageButton.disabled = true;
        setStatus('Загружаю изображение...');

        const response = await fetch('/api/poligrafy-image.php', {
          method: 'POST',
          credentials: 'same-origin',
          body: formData
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || `Не удалось загрузить изображение: ${response.status}`);
        }

        getExistingProductCards().forEach((card) => {
          card.img = [payload.path];
        });
        buildCards();
        renderCardsPreview();
        renderProductImage(true);
        productImageInput.value = '';
        setStatus(`Изображение загружено и применено к карточке: ${payload.path}`, 'success');
      } catch (error) {
        setStatus(error.message, 'danger');
      } finally {
        uploadProductImageButton.disabled = !productImageInput.files.length;
      }
    });
  }

  buildPreviewButton.addEventListener('click', async () => {
    try {
      buildPreviewButton.disabled = true;
      setStatus('Разбираю прайс...');
      await rebuildAll();
    } catch (error) {
      setStatus(error.message, 'danger');
    } finally {
      buildPreviewButton.disabled = false;
    }
  });

  resetWorkButton.addEventListener('click', resetWork);

  applyCoefficientsButton.addEventListener('click', () => {
    const rules = getCoefficientRulesFromForm();

    state.positions.forEach((position) => {
      position.multiplier = getAutoMultiplier(position.cost, rules);
      position.retail = roundRetail(position.cost * position.multiplier);
    });

    renderPositions();
    saveOverrides();
  });

  saveInlineButton.addEventListener('click', saveOverrides);

  saveJsonButton.addEventListener('click', async () => {
    try {
      saveJsonButton.disabled = true;
      setStatus('Сохраняю цены в db/poligrafy.json...');
      await saveJsonToServer();
    } catch (error) {
      setStatus(error.message, 'danger');
    } finally {
      saveJsonButton.disabled = false;
    }
  });

  [formatFilter, colorFilter, tableSearch].forEach((element) => {
    element.addEventListener('input', renderPositions);
    element.addEventListener('change', renderPositions);
  });

  const updatePositionFromField = (input, renderAfterUpdate = false) => {
    if (!input || !input.classList || (!input.classList.contains('position-multiplier') && !input.classList.contains('position-retail'))) {
      return;
    }

    const position = state.positions.find((item) => item.key === input.dataset.key);

    if (!position) {
      return;
    }

    if (input.classList.contains('position-multiplier')) {
      position.multiplier = parseDecimal(input.value) || 1;
      position.retail = roundRetail(position.cost * position.multiplier);
      const retailInput = input.closest('tr').querySelector('.position-retail');

      if (retailInput) {
        retailInput.value = Math.round(position.retail);
      }
    } else {
      const retail = parseOptionalPrice(input.value);
      position.retail = Number.isFinite(retail) ? Math.round(retail) : null;
      position.multiplier = position.cost > 0 && Number.isFinite(position.retail)
        ? Number((position.retail / position.cost).toFixed(3))
        : null;
      const multiplierInput = input.closest('tr').querySelector('.position-multiplier');

      if (multiplierInput) {
        multiplierInput.value = position.multiplier;
      }
    }

    position.margin = Number.isFinite(position.cost) && Number.isFinite(position.retail)
      ? position.retail - position.cost
      : null;
    const marginCell = input.closest('tr').querySelector('.price-value');

    if (marginCell) {
      marginCell.textContent = Number.isFinite(position.margin) ? formatRub(position.margin) : '—';
    }

    buildCards();
    renderCardsPreview();

    if (renderAfterUpdate) {
      renderPositions();
    }
  };

  positionsBody.addEventListener('input', (event) => {
    updatePositionFromField(event.target, false);
  });

  positionsBody.addEventListener('change', (event) => {
    updatePositionFromField(event.target, true);
  });

  cardPreview.addEventListener('change', (event) => {
    const cardElement = event.target.closest('.preview-card');

    if (cardElement) {
      updatePreviewCardPrice(cardElement);
    }
  });

  if (sectionSelect) {
    renderSections();
  }

  renderProducts();
  renderCoefficientInputs();
  setEnabledState(false);
  loadCurrentJson()
    .then(async () => {
      await loadExistingProductPrices();
    })
    .catch((error) => {
      setStatus(error.message, 'danger');
    });
})();
