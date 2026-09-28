// Offline data/rendering checks; no live site requests.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
const fixture = () => JSON.parse(read('db/pages/sostavlenie-kollagey.json'));
class Node {
  constructor(tag) {
    this.tag = tag; this.children = []; this.events = {}; this.attributes = {}; this.dataset = {}; this.className = ''; this.value = '';
    this.classList = { add: name => { this.className += ` ${name}`; } };
    this.style = { setProperty: (key, value) => { this.style[key] = value; } };
  }
  set textContent(value) { this.value = String(value); }
  get textContent() { return this.value + this.children.map(child => child.textContent).join(''); }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = children; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(name, callback) { this.events[name] = callback; }
}
const find = (node, tag) => [node, ...node.children.flatMap(child => find(child, tag))].filter(node => node.tag === tag);
const flush = () => new Promise(setImmediate);
async function render(respond = () => fixture(), cardSource = '') {
  const root = new Node('div'); const errors = []; let requests = 0;
  root.dataset.cardSource = cardSource;
  vm.runInNewContext(read('js/collage-card.js'), {
    window: { addEventListener: (_, ready) => ready() },
    document: { querySelector: () => root, createElement: tag => new Node(tag) },
    console: { error: error => errors.push(error) },
    fetch: async (url, options) => {
      const expectedUrl = `/db/pages/${cardSource || 'sostavlenie-kollagey'}.json`;
      assert.equal(url, expectedUrl); assert.equal(options.cache, 'no-store');
      return { ok: true, json: async () => respond(++requests) };
    }
  });
  await flush(); return { root, errors };
}
(async () => {
  const { root, errors } = await render();
  assert.equal(errors.length, 0); assert.equal(find(root, 'article').length, 2);
  const card = fixture().sections[0].cards[0];
  assert.equal(find(root, 'img')[0].src, card.img[0]);
  assert.equal(find(root, 'thead')[0].children[0].children.length, 3);
  assert.equal(find(root, 'tbody')[0].children.length, 5);
  for (const row of card.table) for (const value of Object.values(row)) assert.ok(root.textContent.includes(value));
  assert.equal(find(root, 'td').find(node => node.textContent === 'бесплатно').className, 'price-cell free-cell');
  const restoration = find(root, 'article')[1];
  assert.equal(find(restoration, 'table').length, 0, 'Restoration has no price table');
  assert.ok(restoration.textContent.includes('Цена рассчитывается индивидуально по запросу.'));
  const comparison = restoration.children[0];
  const slider = find(restoration, 'input')[0];
  assert.equal(slider.type, 'range'); assert.equal(slider.value, '50');
  for (const value of ['0', '25', '100']) {
    slider.value = value; slider.events.input();
    assert.equal(comparison.style['--comparison-position'], `${value}%`);
    assert.match(slider.attributes['aria-valuetext'], new RegExp(`До реставрации: ${value}%`));
  }
  assert.equal(find(comparison, 'img')[0].src, fixture().sections[1].cards[0].img[1]);
  assert.equal(find(comparison, 'img')[1].src, fixture().sections[1].cards[0].img[0]);
  find(comparison, 'img')[0].events.error();
  assert.equal(find(comparison, 'input').length, 0, 'Failed photo removes misleading comparison');
  const data = fixture(); data.sections.forEach(section => section.cards.forEach(card => { card.archived = true; }));
  const archived = await render(() => data);
  assert.equal(archived.root.children.length, 0); assert.equal(archived.errors.length, 0);
  data.sections[0].cards[0] = { ...card, archived: false, title: '<b>Новое имя</b>', description: 'Новый текст', footer: 'Примечание', price_title: 'Новые цены', img: ['img/new.webp'] };
  const restored = await render(() => data);
  for (const value of ['<b>Новое имя</b>', 'Новый текст', 'Примечание', 'Новые цены']) assert.ok(restored.root.textContent.includes(value));
  assert.equal(find(restored.root, 'img')[0].src, 'img/new.webp');
  const failed = await render(attempt => { if (attempt === 1) throw new Error('Offline'); return fixture(); });
  assert.equal(failed.errors.length, 1); find(failed.root, 'button')[0].events.click(); await flush();
  assert.equal(find(failed.root, 'article').length, 2); assert.equal(failed.root.attributes['aria-busy'], 'false');
  find(root, 'img')[0].events.error(); assert.ok(root.textContent.includes('Фото временно недоступно'));
  assert.ok(root.textContent.includes('150 ₽'));
  const legacyData = JSON.parse(read('db/tovary.json'));
  const documentData = JSON.parse(read('db/pages/srochnoe-foto.json'));
  const original = JSON.stringify(documentData);
  const documentCards = await render(() => documentData, 'srochnoe-foto');
  assert.equal(documentCards.errors.length, 0);
  assert.equal(find(documentCards.root, 'article').length, documentData.sections[0].cards.length);
  const expected = documentData.sections[0].cards[0];
  assert.equal(find(documentCards.root, 'img')[0].src, expected.img[0]);
  assert.equal(find(documentCards.root, 'img')[0].alt, expected.title);
  assert.equal(find(documentCards.root, 'tbody')[0].children.length, expected.table.length);
  for (const row of expected.table) for (const value of Object.values(row)) assert.ok(documentCards.root.textContent.includes(value));
  assert.ok(documentCards.root.textContent.includes(expected.footer));
  assert.equal(JSON.stringify(documentData), original, 'Restyling keeps source content unchanged');
  const notebookData = JSON.parse(read('db/pages/bloknoty.json'));
  const notebookSnapshot = JSON.stringify(notebookData);
  const notebooks = await render(() => notebookData, 'bloknoty');
  assert.equal(notebooks.errors.length, 0);
  const notebookCards = find(notebooks.root, 'article');
  assert.equal(notebookCards.length, 4);
  for (const [index, notebook] of legacyData.bloknoty.entries()) {
    const rendered = notebookCards[index];
    assert.equal(find(rendered, 'img')[0].src, notebook.img);
    for (const value of [notebook.title, notebook.descr, notebook.price_title]) assert.ok(rendered.textContent.includes(value));
    const tiers = notebook.table.flatMap(row => Object.entries(row));
    const rows = find(rendered, 'tbody')[0].children;
    assert.equal(rows.length, tiers.length);
    for (const [i, [quantity, price]] of tiers.entries()) {
      assert.equal(rows[i].children[0].textContent, quantity);
      assert.equal(rows[i].children[1].textContent, price);
    }
  }
  assert.equal(JSON.stringify(notebookData), notebookSnapshot, 'Rendering preserves editable notebook data');
  const edited = notebookData.sections[0].cards[0];
  edited.title = 'Новое название';
  edited.description = 'Новое описание';
  edited.footer = 'Новое примечание';
  edited.img = ['img/bloknoty/uploads/custom.webp'];
  edited.table[0]['Стоимость'] = '999 ₽';
  notebookData.sections[0].cards[1].archived = true;
  const changed = await render(() => notebookData, 'bloknoty');
  assert.equal(find(changed.root, 'article').length, 3);
  for (const value of [edited.title, edited.description, edited.footer, '999 ₽']) assert.ok(changed.root.textContent.includes(value));
  assert.equal(find(changed.root, 'img')[0].src, edited.img[0]);
  notebookData.sections[0].cards[1].archived = false;
  assert.equal(find((await render(() => notebookData, 'bloknoty')).root, 'article').length, 4);
  const bindingData = JSON.parse(read('db/pages/broshurovka.json'));
  const binding = await render(() => bindingData, 'broshurovka');
  assert.equal(binding.errors.length, 0);
  assert.equal(find(binding.root, 'article').length, 2);
  for (const [index, card] of bindingData.sections[0].cards.entries()) {
    const rendered = find(binding.root, 'article')[index];
    assert.equal(find(rendered, 'img')[0].src, legacyData.broshurovka[index].img);
    assert.deepEqual(find(rendered, 'thead')[0].children[0].children.map(cell => cell.textContent), ['Формат', 'Цена']);
    for (const [i, price] of [legacyData.broshurovka[index].price, legacyData.broshurovka[index].secondPrice].entries()) {
      assert.equal(card.table[i]['Цена'], price.split('Цена: ')[1]);
      assert.ok(rendered.textContent.includes(card.table[i]['Цена']));
    }
  }
  bindingData.sections[0].cards[0].archived = true;
  bindingData.sections[0].cards[1].table[0]['Цена'] = '999 ₽';
  const editedBinding = await render(() => bindingData, 'broshurovka');
  assert.equal(find(editedBinding.root, 'article').length, 1);
  assert.ok(editedBinding.root.textContent.includes('999 ₽'));
  const calendarData = JSON.parse(read('db/pages/kalendari.json'));
  const calendars = await render(() => calendarData, 'kalendari');
  assert.equal(calendars.errors.length, 0);
  assert.equal(find(calendars.root, 'article').length, 3);
  for (const [index, card] of calendarData.sections[0].cards.entries()) {
    const original = legacyData.kalendari[index];
    const rendered = find(calendars.root, 'article')[index];
    assert.equal(find(rendered, 'img')[0].src, original.img);
    assert.ok(rendered.textContent.includes(original.title));
    assert.ok(rendered.textContent.includes(original.descr));
    assert.deepEqual(card.table.map(row => row['Условие'] + ' - ' + row['Цена']), [original.price,original.secondPrice,original.thirdPrice].filter(Boolean));
    for (const row of card.table) for (const value of Object.values(row)) assert.ok(rendered.textContent.includes(value));
  }
  calendarData.sections[0].cards[0].archived=true;
  calendarData.sections[0].cards[1].title='Новый календарь';
  calendarData.sections[0].cards[1].img=['img/kalendari/uploads/new.webp'];
  calendarData.sections[0].cards[1].table[0]['Цена']='999 ₽';
  const editedCalendars=await render(()=>calendarData,'kalendari');
  assert.equal(find(editedCalendars.root,'article').length,2);
  assert.equal(find(editedCalendars.root,'img')[0].src,'img/kalendari/uploads/new.webp');
  assert.ok(editedCalendars.root.textContent.includes('Новый календарь'));
  assert.ok(editedCalendars.root.textContent.includes('999 ₽'));
  const businessData = JSON.parse(read('db/pages/vizitki.json'));
  const businessOriginal = JSON.stringify(businessData);
  const business = await render(() => businessData, 'vizitki');
  assert.equal(business.errors.length, 0);
  const businessCards = find(business.root, 'article');
  const businessSource = businessData.sections.flatMap(section => section.cards);
  assert.equal(businessCards.length, businessSource.length);
  for (const [index, source] of businessSource.entries()) {
    const rendered = businessCards[index];
    const quantities = Object.keys(source.table[0]).slice(1);
    const rows = find(rendered, 'tbody')[0].children;
    assert.equal(rows.length, quantities.length);
    for (const [i, quantity] of quantities.entries()) {
      assert.equal(rows[i].children[0].textContent, quantity);
      source.table.forEach((priceRow, j) => assert.equal(rows[i].children[j + 1].textContent, priceRow[quantity]));
    }
    assert.ok(rendered.textContent.includes(source.footer.replace(/<br\s*\/?\s*>/gi, '\n')));
    assert.ok(!rendered.textContent.includes('<br>'));
  }
  assert.equal(JSON.stringify(businessData), businessOriginal, 'Display must not transpose saved admin tables');
  businessData.sections[0].cards[0].archived = true;
  businessData.sections[1].cards[0].title = 'Изменено в админке';
  businessData.sections[1].cards[0].img = ['img/vizitki/custom.jpg'];
  businessData.sections[1].cards[0].table[0]['500 шт'] = '777 ₽';
  const editedBusiness = await render(() => businessData, 'vizitki');
  assert.equal(find(editedBusiness.root, 'article').length, 2);
  assert.ok(editedBusiness.root.textContent.includes('Изменено в админке'));
  assert.ok(editedBusiness.root.textContent.includes('777 ₽'));
  assert.equal(find(editedBusiness.root, 'img').at(-1).src, 'img/vizitki/custom.jpg');
  const missingDocument = await render(() => ({}), 'srochnoe-foto');
  assert.equal(missingDocument.errors.length, 1);
  assert.ok(missingDocument.root.textContent.includes('Повторить загрузку'));
  console.log('PASS: collage image, all prices, editable fields, archive/restore, network retry and image fallback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
