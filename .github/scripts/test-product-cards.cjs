// Offline integration checks. This DOM stub checks data/rendering, not browser layout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const rootDir = path.resolve(__dirname, '../..');
const read = (name) => fs.readFileSync(path.join(rootDir, name), 'utf8');
const fixture = (page) => JSON.parse(read(`db/pages/${page}.json`));
const source = read('js/product-cards.js');
const plain = (value) => String(value ?? '').replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<\/(?:p|li|div)>/gi, '\n').replace(/<[^>]*>/g, '')
  .replace(/&nbsp;/g, '\u00a0').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();

class Element {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.attributes = {};
    this.events = {};
    this.className = '';
    this.value = '';
    this.classList = { add: (...names) => { this.className += ` ${names.join(' ')}`; } };
    if (tag === 'template') this.content = { textContent: '' };
  }
  set textContent(value) { this.value = String(value); this.children = []; }
  get textContent() { return this.value + this.children.map((child) => child.textContent).join(''); }
  set innerHTML(value) {
    assert.equal(this.tagName, 'TEMPLATE', 'The renderer must create content via DOM nodes');
    this.content.textContent = plain(value);
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.value = ''; this.children = nodes; }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(type, callback) { this.events[type] = callback; }
}
const all = (node, predicate) => [node, ...node.children.flatMap((child) => all(child, predicate))].filter(predicate);
const byClass = (node, name) => all(node, (item) => item.className.split(/\s+/).includes(name));
const tags = (node, tag) => all(node, (item) => item.tagName === tag.toUpperCase());
const flush = async () => { await new Promise(setImmediate); await new Promise(setImmediate); };
const bindings = new Map();
for (const file of fs.readdirSync(rootDir).filter((file) => file.endsWith('.html'))) {
  const html = read(file);
  const roots = [...html.matchAll(/<[^>]+\bdata-product-page="[^"]+"[^>]*>/g)].map(([tag]) => {
    const root = new Element('div');
    for (const [, key, value] of tag.matchAll(/data-([a-z-]+)="([^"]*)"/g)) {
      root.dataset[key.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
    return root;
  });
  if (roots.length) {
    assert.equal((html.match(/src="js\/product-cards\.js\?/g) || []).length, 1, `${file}: renderer loaded once`);
    assert.match(html, /href="css\/product-cards\.css\?/);
    assert.doesNotMatch(html, /src="js\/(?:cardsBuilder|cards-builder-table)\.js/);
    bindings.set(file.slice(0, -5), roots.map((root) => root.dataset));
  }
}
async function run(page, respond = () => fixture(page)) {
  const roots = bindings.get(page).map((dataset) => Object.assign(new Element('div'), { dataset }));
  const requests = [];
  const errors = [];
  let ready;
  vm.runInNewContext(source, {
    document: { createElement: (tag) => new Element(tag), querySelectorAll: () => roots },
    window: { addEventListener: (event, callback) => { assert.equal(event, 'DOMContentLoaded'); ready = callback; } },
    console: { error: (error) => errors.push(error) },
    fetch: async (url, options) => {
      requests.push(url);
      assert.equal(url, `/db/pages/${page}.json`);
      assert.equal(options.cache, 'no-store');
      const result = await respond(requests.length);
      return result?.response || { ok: true, json: async () => result };
    },
  });
  ready();
  assert.ok(roots.every((root) => root.attributes['aria-busy'] === 'true'));
  await flush();
  return { roots, requests, errors };
}

(async () => {
  assert.equal(bindings.size, 14, 'All 14 requested pages must use the catalog renderer');
  let cards = 0;
  let media = 0;
  const results = new Map();
  for (const [page] of bindings) {
    const data = fixture(page);
    const result = await run(page);
    results.set(page, result);
    assert.equal(result.requests.length, 1, `${page}: all sections share one JSON request`);
    assert.equal(result.errors.length, 0, `${page}: rendering failed`);
    for (const root of result.roots) {
      const section = data.sections.find((section) => section.id === root.dataset.productSection);
      assert.ok(section, `${page}: HTML section exists in JSON`);
      assert.equal(root.children.length, section.cards.length, `${page}: all cards rendered`);
      assert.equal(root.attributes['aria-busy'], 'false');
      assert.equal(root.attributes['aria-live'], 'polite');
      assert.doesNotMatch(root.textContent, /undefined|\bnull\b|\uFFFD/);
      for (const [index, card] of section.cards.entries()) {
        const rendered = root.children[index];
        for (const field of ['title', 'description', 'footer', 'price_title']) {
          if (card[field]) assert.ok(rendered.textContent.replace(/\s/g, '').includes(plain(card[field]).replace(/\s/g, '')), `${page}/${card.id}: ${field} retained`);
        }
        if (root.dataset.productLayout === 'table') {
          for (const row of card.table) for (const value of Object.values(row)) {
            assert.ok(rendered.textContent.includes(plain(value)), `${page}/${card.id}: table value retained`);
          }
        } else {
          const rows = byClass(rendered, 'catalog-card__price-row');
          assert.equal(rows.length, card.table.length, `${page}/${card.id}: all price tiers retained`);
          for (const [i, values] of card.table.map(Object.values).entries()) {
            const renderedCondition = tags(rows[i], 'dt')[0].textContent;
            assert.ok(renderedCondition.includes(plain(values[0])), `${page}/${card.id}: tier condition retained`);
            if (i === 0 && card.price_title) assert.ok(renderedCondition.includes(plain(card.price_title)));
            assert.equal(tags(rows[i], 'dd')[0].textContent, plain(values[1]));
          }
          assert.equal(byClass(rendered, 'catalog-card__price-row--primary').length, 1);
        }
        for (const image of card.img || []) {
          // Exact filename case and Unicode matter on production Linux.
          let resolved = rootDir;
          for (const part of image.split('/')) {
            assert.ok(fs.readdirSync(resolved).includes(part), `${page}/${card.id}: missing/case-mismatched image ${image}`);
            resolved = path.join(resolved, part);
          }
          assert.ok(fs.statSync(resolved).isFile());
          media++;
        }
        if (card.img?.length) assert.equal(tags(rendered, 'img')[0].src, card.img[0]);
        cards++;
      }
    }
  }
  const content = (page, section = 0) => results.get(page).roots[section].textContent;
  for (const expected of ['Цена за 1 шт.', '35 ₽', 'Комплект 15 шт', '400 ₽', 'Комплект 25 шт', '550 ₽']) assert.ok(content('insta-pechat').includes(expected));
  for (const expected of ['За 10 шт.', '3000 ₽', 'За 100 шт.', '6000 ₽', 'Фигурная форма + 10%']) assert.ok(content('magnity').includes(expected));
  for (const expected of ['До 2 часов видео', '6 ₽/мин', 'Более 2 часов видео', '5 ₽/мин', '300 руб.']) assert.ok(content('ocifrovka-videokasset').includes(expected));
  for (const expected of ['За одно лицо', 'Каждое дополнительное лицо', '+600 ₽', '+850 ₽', 'Бесплатно']) assert.ok(content('printcanvas', 1).includes(expected));
  for (const expected of ['1–14 шт.', '400 ₽', 'от 15 шт.', '300 ₽', 'Диаметр — 7 см']) assert.ok(content('shary').includes(expected));
  const canvas = results.get('printcanvas').roots[0];
  assert.equal(tags(canvas, 'thead')[0].children[0].children.length, 14, 'Canvas horizontal price table: size heading + 13 sizes');
  assert.equal(tags(canvas, 'tbody')[0].children.length, 1, 'Canvas has one horizontal price row');
  assert.equal(tags(canvas, 'tbody')[0].children[0].children[13].textContent, '9800 ₽');

  for (const failure of [null, {}, { sections: [] }, { response: { ok: false, status: 503 } }]) {
    const result = await run('shary', (attempt) => attempt === 1 ? failure : fixture('shary'));
    const root = result.roots[0];
    assert.equal(result.errors.length, 1);
    assert.match(root.textContent, /Не удалось загрузить карточки и цены/);
    assert.equal(root.attributes['aria-busy'], 'false');
    const retry = tags(root, 'button')[0];
    retry.events.click();
    assert.equal(retry.disabled, true);
    await flush();
    assert.equal(result.requests.length, 2);
    assert.equal(tags(root, 'button').length, 0);
    assert.match(root.textContent, /400 ₽/);
  }
  const network = await run('shary', () => { throw new Error('Offline'); });
  assert.match(network.roots[0].textContent, /Повторить загрузку/);
  const missingPrice = fixture('shary');
  missingPrice.sections[0].cards[0].table = null;
  const empty = await run('shary', () => missingPrice);
  assert.match(empty.roots[0].textContent, /Стоимость уточняйте у менеджера/);
  assert.equal(empty.errors.length, 0);
  const picture = tags(results.get('shary').roots[0], 'img')[0];
  picture.events.error();
  assert.match(content('shary'), /Фото временно недоступно/);
  assert.match(content('shary'), /400 ₽/);
  console.log(`PASS: ${bindings.size} pages, ${cards} cards, ${media} exact image paths; price units, canvas shared request/table, legacy shary schema, error/retry and image fallback.`);
})().catch((error) => { console.error(error); process.exitCode = 1; });
