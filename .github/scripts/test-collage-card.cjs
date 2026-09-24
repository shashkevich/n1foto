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
      assert.equal(url, cardSource === 'srochnoe-foto' ? '/db/tovary.json' : '/db/pages/sostavlenie-kollagey.json'); assert.equal(options.cache, 'no-store');
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
  const documentData = JSON.parse(read('db/tovary.json'));
  const original = JSON.stringify(documentData);
  const documentCards = await render(() => documentData, 'srochnoe-foto');
  assert.equal(documentCards.errors.length, 0);
  assert.equal(find(documentCards.root, 'article').length, documentData['srochnoe-foto'].length);
  const expected = documentData['srochnoe-foto'][0];
  assert.equal(find(documentCards.root, 'img')[0].src, expected.img);
  assert.equal(find(documentCards.root, 'img')[0].alt, expected.alt);
  assert.equal(find(documentCards.root, 'tbody')[0].children.length, expected.table.length);
  for (const row of expected.table) for (const value of Object.values(row)) assert.ok(documentCards.root.textContent.includes(value));
  assert.ok(documentCards.root.textContent.includes(expected.descr.replace(/<br\s*\/?\s*>/gi, '\n')));
  assert.equal(JSON.stringify(documentData), original, 'Restyling keeps source content unchanged');
  const missingDocument = await render(() => ({}), 'srochnoe-foto');
  assert.equal(missingDocument.errors.length, 1);
  assert.ok(missingDocument.root.textContent.includes('Повторить загрузку'));
  console.log('PASS: collage image, all prices, editable fields, archive/restore, network retry and image fallback.');
})().catch(error => { console.error(error); process.exitCode = 1; });
