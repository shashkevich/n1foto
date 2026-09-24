// Offline checks of the real calculator handlers with the existing price data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const read = file => fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
const fixture = () => JSON.parse(read('db/pages/pechat-na-bannere.json'));
class Node {
  constructor() { this.children = []; this.roles = {}; this.events = {}; this.attributes = {}; this.textContent = ''; }
  set innerHTML(html) {
    this.html = html; this.children = []; this.roles = {};
    for (const [tag, role] of html.matchAll(/<[^>]+data-role="([^"]+)"[^>]*>/g)) {
      const node = new Node();
      Object.assign(node, { value: tag.match(/\bvalue="([^"]*)"/)?.[1] || '', hidden: tag.includes(' hidden'), checked: tag.includes(' checked') });
      this.roles[role] = node;
    }
    if (html.includes('<button')) this.button = new Node();
  }
  querySelector(selector) { return selector === 'button' ? this.button : this.roles[selector.match(/data-role="([^"]+)"/)[1]]; }
  addEventListener(event, cb) { this.events[event] = cb; }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(key, value) { this.attributes[key] = value; }
  append(node) { node.parent = this; this.children.push(node); }
  remove() { this.parent.children.splice(this.parent.children.indexOf(this), 1); }
  focus() { this.focused = true; }
}
const flush = () => new Promise(setImmediate);
async function load(respond = () => fixture()) {
  const root = new Node(); const errors = []; let requests = 0;
  vm.runInNewContext(read('js/banner-calculator.js'), {
    document: { getElementById: () => root, createElement: () => new Node() },
    console: { error: error => errors.push(error) },
    fetch: async (url, options) => {
      assert.equal(url, '/db/pages/pechat-na-bannere.json'); assert.equal(options.cache, 'no-store');
      return { ok: true, json: async () => respond(++requests) };
    }
  });
  await flush(); return { root, errors };
}
(async () => {
  const { root, errors } = await load();
  assert.equal(errors.length, 0); assert.equal(root.children.length, 1);
  const card = root.children[0]; const fields = card.roles;
  const rows = fields.rows.children;
  const amount = node => Number(node.textContent.replace(/[^0-9]/g, ''));
  const update = (index, values) => {
    for (const [key, value] of Object.entries(values)) rows[index].roles[key].value = String(value);
    card.events.input();
  };
  assert.equal(amount(fields['total-price']), 950);
  assert.equal(rows[0].roles['remove-row'].hidden, true);
  assert.match(card.html, /Проклейка краёв — 100 ₽\/пог\. м/);
  assert.doesNotMatch(card.html, /seam-length|welding|quantity/);
  update(0, { width: 100, height: 200, 'eyelet-count': 4 });
  assert.equal(amount(rows[0].roles['row-total']), 2020);
  fields['add-row'].events.click();
  assert.equal(rows.length, 2);
  assert.equal(rows[1].roles.width.focused, true);
  assert.equal(rows[0].roles['remove-row'].hidden, false);
  update(1, { width: 50, height: 100, 'eyelet-count': 2 });
  assert.equal(amount(rows[1].roles['row-total']), 535);
  assert.equal(amount(fields['total-price']), 2555);
  assert.equal(fields.area.textContent, '2,50 м²');
  rows[0].roles.edging.checked = true;
  card.events.change();
  assert.equal(amount(rows[0].roles['row-total']), 2620);
  assert.equal(amount(rows[1].roles['row-total']), 535);
  assert.equal(amount(fields['total-price']), 3155);
  rows[1].roles.edging.checked = true;
  card.events.change();
  assert.equal(amount(rows[1].roles['row-total']), 835);
  assert.equal(amount(fields['total-price']), 3455);
  update(1, { width: 150 });
  assert.equal(amount(rows[1].roles['row-total']), 1985);
  assert.equal(amount(fields['total-price']), 4605);
  rows[0].roles.edging.checked = false;
  rows[1].roles.edging.checked = false;
  update(1, { width: 50 });
  assert.equal(amount(fields['total-price']), 2555);
  for (const values of [{ width: '' }, { width: 0 }, { width: -1 }, { height: 'Infinity' }, { 'eyelet-count': 1.5 }, { 'eyelet-count': -1 }, { 'eyelet-count': '' }]) {
    update(1, { width: 50, height: 100, 'eyelet-count': 2, ...values });
    assert.equal(fields.validation.hidden, false);
    assert.equal(fields['total-price'].textContent, '—');
    assert.equal(rows[1].roles['row-total'].textContent, '—');
    assert.match(fields.validation.textContent, /Баннер 2:/);
    assert.equal(amount(rows[0].roles['row-total']), 2020);
  }
  rows[1].roles['remove-row'].events.click();
  assert.equal(rows.length, 1); assert.equal(amount(fields['total-price']), 2020);
  assert.equal(fields['add-row'].focused, true);
  rows[0].roles['remove-row'].events.click(); assert.equal(rows.length, 1);
  update(0, { width: '33,3', height: 50, 'eyelet-count': 0 });
  assert.equal(amount(fields['total-price']), 158);
  fields['add-row'].events.click();
  rows[0].roles['remove-row'].events.click();
  assert.equal(rows[0].attributes['aria-label'], 'Баннер 1');
  assert.equal(amount(fields['total-price']), 950);
  const changed = fixture(); changed.sections[0].cards[0].table[0]['Стоимость'] = '1000 ₽/м2';
  changed.sections[0].cards[0].table = changed.sections[0].cards[0].table.filter(row => !row['Наименование'].startsWith('Сварка'));
  assert.equal(amount((await load(() => changed)).root.children[0].roles['total-price']), 1000);
  changed.sections[0].cards[0].archived = true;
  assert.equal((await load(() => changed)).root.children.length, 0);
  const broken = fixture(); broken.sections[0].cards[0].table.pop();
  const retry = await load(attempt => attempt === 1 ? broken : fixture());
  assert.equal(retry.errors.length, 1); assert.equal(retry.root.attributes['aria-busy'], 'false');
  retry.root.button.events.click(); await flush(); assert.equal(retry.root.children.length, 1);
  console.log('PASS: different banner sizes, per-banner eyelets and edging, combined totals, add/remove, validation, decimals, prices, archive and retry.');
})().catch(error => { console.error(error); process.exitCode = 1; });
