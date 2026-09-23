// Verify empty archived sections in the specialized public renderers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.join(__dirname, '../..', file), 'utf8');
const fixture = page => JSON.parse(read(`db/pages/${page}.json`));
class Node {
  constructor(tag = 'div') { this.tag = tag; this.children = []; this.dataset = {}; this.style = {}; this.textContent = ''; this.innerHTML = ''; this.classList = { add() {} }; }
  append(...nodes) { for (const node of nodes) this.children.push(...(node.tag === 'fragment' ? node.children : [node])); }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  addEventListener() {}
}
async function run(file, data, dataset = {}) {
  const root = new Node(); root.dataset = dataset;
  const nodes = new Map([['plasticSignCalculator', root]]); const errors = [];
  for (const section of data.sections || []) for (const card of section.cards || []) card.archived = true;
  const original = JSON.stringify(data);
  vm.runInNewContext(read(`js/${file}.js`), {
    window: { addEventListener: (name, cb) => { if (name === 'DOMContentLoaded') cb(); } },
    document: {
      querySelector: () => root, querySelectorAll: () => [root],
      getElementById: id => {
        if (file !== 'plastic-sign-calculator') return root;
        if (!nodes.has(id)) nodes.set(id, new Node());
        return nodes.get(id);
      },
      createElement: tag => new Node(tag), createDocumentFragment: () => new Node('fragment')
    },
    console: { error: error => errors.push(error) },
    fetch: async () => ({ ok: true, json: async () => data })
  });
  await new Promise(setImmediate); await new Promise(setImmediate);
  assert.equal(errors.length, 0, `${file}: no loading errors for archived data`);
  assert.equal(root.children.length, 0, `${file}: archived cards must not render`);
  assert.equal(root.innerHTML, '', `${file}: no error placeholder`);
  assert.equal(JSON.stringify(data), original, `${file}: data retained`);
  return root;
}
(async () => {
  await run('clothing-print-builder', fixture('pechat-na-odezhde'));
  const stickers = fixture('nakleyki');
  await run('sticker-calculators', stickers);
  const requested = stickers.sections.flatMap(section => section.cards).find(card => card.calculatorType === 'plotter-stickers');
  assert.ok(requested, 'Plotter fixture exists');
  await run('sticker-calculators', stickers, { cardId: requested.id });
  await run('print-copy-cards', fixture('pechat-i-kopirovanie'), { printCopySection: 'copyandprint' });
  await run('manual-table-page', fixture('vizitki'), { manualSections: 'vizitki-cifra,vizitki-offset' });
  const plastic = await run('plastic-sign-calculator', fixture('tablichki'));
  assert.equal(plastic.hidden, true); assert.equal(plastic.style.display, 'none');
  await run('poligrafy-builder', { 'listovki-cifra': [{ archived: true }] }, { poligrafySections: 'listovki-cifra' });
  await run('main-page-builder', { main: [{ title: 'Hidden section', content: [{ archived: true }] }] });
  console.log('PASS: archive hides specialized cards, plotter, plastic calculator and empty home sections without errors.');
})().catch(error => { console.error(error); process.exitCode = 1; });
