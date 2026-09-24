// Exercise the existing editor's event handlers without a browser or live data writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../admin-deploy/assets/manual-cards-admin.js'), 'utf8');
const fixture = (page) => JSON.parse(fs.readFileSync(path.join(__dirname, `../../db/pages/${page}.json`), 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));
const flush = () => new Promise(setImmediate);

async function editor(page, sections, product = true, initial = fixture(page)) {
  const node = () => ({ dataset: {}, events: {}, disabled: false, innerHTML: '',
    addEventListener(type, callback) { this.events[type] = callback; } });
  const nodes = Object.fromEntries(['manual-cards-editor', 'manualCards', 'manualStatus', 'manualSave', 'manualReload'].map(id => [id, node()]));
  const root = nodes['manual-cards-editor'];
  root.dataset = { createSections: sections.join(','), productCards: product ? '1' : '0',
    publicSiteBase: 'http://n1foto-test', imageUpload: '1', imageSections: sections.join(',') };
  let remote = clone(initial);
  const writes = [];
  const state = { failSave: false, focusCount: 0, confirmDelete: false, confirmations: 0,
    fileSize: 2500000, uploadRequests: 0, failUpload: false };
  nodes.uploadError = { hidden: true, textContent: '' };
  nodes.manualCards.querySelector = (selector) => selector.startsWith('[data-field="title"]')
    ? { focus() { state.focusCount++; } }
    : selector.startsWith('[data-upload-error]') ? nodes.uploadError
    : { files: [{ name: 'photo.webp', size: state.fileSize }] };
  class Form { constructor() { this.values = new Map(); } append(key, value) { this.values.set(key, value); } }
  vm.runInNewContext(source, {
    URLSearchParams, FormData: Form,
    document: { readyState: 'complete', getElementById: id => nodes[id] || null },
    window: { location: { search: `?page=${page}` }, confirm() { state.confirmations++; return state.confirmDelete; } },
    fetch: async (url, options) => {
      if (url === '/api/page-image.php') {
        state.uploadRequests++;
        if (state.failUpload) return { ok: false, status: 400, json: async () => ({ error: 'Image invalid' }) };
        const id = options.body.values.get('cardId');
        const section = remote.sections.find(item => item.id === options.body.values.get('sectionId'));
        const card = section.cards.find(item => item.id === id);
        assert.ok(card, 'Upload must target a saved card');
        const index = options.body.values.get('imageIndex');
        const uploadedPath = `img/test/uploads/${id}-${index ?? 'default'}.webp`;
        if (card.cardType === 'restoration') card.img[Number(index)] = uploadedPath;
        else card.img = [uploadedPath];
        return { ok: true, json: async () => ({ ok: true, path: uploadedPath }) };
      }
      if (options.method === 'POST') {
        if (state.failSave) return { ok: false, status: 500, json: async () => ({ error: 'Save failed' }) };
        remote = JSON.parse(options.body);
        writes.push(clone(remote));
        return { ok: true, json: async () => ({ ok: true, path: 'db/pages/test.json' }) };
      }
      return { ok: true, json: async () => clone(remote) };
    }
  });
  await flush();
  const click = (action, sectionIndex = 0, cardIndex = 0, extras = {}) => nodes.manualCards.events.click({
    target: { closest: () => ({ dataset: { action, sectionIndex, cardIndex, ...extras } }) }
  });
  const input = (field, value, sectionIndex, cardIndex, extras = {}) => nodes.manualCards.events.input({
    target: { matches: () => true, value, checked: value === true, dataset: { field, sectionIndex, cardIndex, ...extras } }
  });
  const fill = (section, card) => {
    input('title', 'Новая услуга', section, card);
    input('cell', '250 ₽', section, card, { rowIndex: 0, header: 'Цена' });
  };
  return { nodes, click, input, fill, writes, state, remote: () => remote,
    save: () => nodes.manualSave.events.click(), reload: () => nodes.manualReload.events.click() };
}

(async () => {
  for (const page of ['rollup', 'ruchki', 'shirokofrmatnaya-pechat', 'vyshivka']) {
    const app = await editor(page, [], false);
    assert.match(app.nodes.manualCards.innerHTML, /data-field="contactPhone"/);
    assert.doesNotMatch(app.nodes.manualCards.innerHTML, /manual-edit-table/);
    for (const [field, value] of Object.entries({title:'Новое имя',description:'Описание',footer:'Текст',contactPhone:'+7-900-123-45-67',contactTelegram:'new_name',contactVk:'new_vk'})) app.input(field,value,0,0);
    await app.save(); await app.reload();
    const saved=app.remote().sections[0].cards[0];
    assert.equal(saved.contactPhone,'+7-900-123-45-67'); assert.equal(saved.contactTelegram,'new_name'); assert.equal(saved.contactVk,'new_vk');
    assert.equal(saved.title,'Новое имя'); assert.equal(saved.footer,'Текст');
  }
  const restorationEditor = await editor('sostavlenie-kollagey', [], false);
  assert.match(restorationEditor.nodes.manualCards.innerHTML, /Было — до реставрации/);
  assert.match(restorationEditor.nodes.manualCards.innerHTML, /Стало — после реставрации/);
  const originalPair = fixture('sostavlenie-kollagey').sections[1].cards[0].img;
  await restorationEditor.click('upload-page-image', 1, 0, { imageIndex: '1' });
  await restorationEditor.save();
  assert.deepEqual(restorationEditor.remote().sections[1].cards[0].img, [originalPair[0], 'img/test/uploads/photo-restoration-1.webp']);
  await restorationEditor.click('upload-page-image', 1, 0, { imageIndex: '0' });
  await restorationEditor.save();
  assert.deepEqual(restorationEditor.remote().sections[1].cards[0].img, ['img/test/uploads/photo-restoration-0.webp', 'img/test/uploads/photo-restoration-1.webp']);
  for (const page of ['pechat-na-kruzhkah', 'sostavlenie-kollagey', 'tablichki', 'bloknoty', 'rollup', 'ruchki', 'shirokofrmatnaya-pechat', 'vyshivka', 'pechat-na-bannere', 'srochnoe-foto']) {
    const original = fixture(page);
    const app = await editor(page, [], false, original);
    for (const [sectionIndex, section] of original.sections.entries()) {
      if (!section.cards.length) continue;
      const card = section.cards[0];
      assert.match(app.nodes.manualCards.innerHTML, /role="switch" data-field="archived"/);
      app.input('archived', true, sectionIndex, 0);
      assert.equal(app.writes.length, sectionIndex * 2, 'Archiving is not published before save');
      await app.save();
      await app.reload();
      assert.deepEqual(app.remote().sections[sectionIndex].cards[0], { ...card, archived: true }, 'Archiving retains every card field');
      assert.match(app.nodes.manualCards.innerHTML, new RegExp(`data-section-index="${sectionIndex}" data-card-index="0" checked`));
      app.input('archived', false, sectionIndex, 0);
      await app.save();
      assert.deepEqual(app.remote().sections[sectionIndex].cards[0], { ...card, archived: false }, 'Restoring retains photo and prices');
    }
  }
  const homeData = { main: [{ title: 'Услуги', content: [{ title: 'Коллажи', img: 'img/collage.jpg', link: 'sostavlenie-kollagey.html' }] }] };
  const home = await editor('home', [], false, homeData);
  home.input('archived', true, 0, 0);
  await home.save();
  await home.reload();
  assert.equal(home.remote().main[0].content[0].archived, true);
  assert.match(home.nodes.manualCards.innerHTML, /data-card-index="0" checked/);
  home.input('archived', false, 0, 0);
  await home.save();
  assert.deepEqual(home.remote().main[0].content[0], { ...homeData.main[0].content[0], archived: false });

  for (const [page, sections, product] of [
    ['pechat-na-kruzhkah', ['kruzhki'], true], ['shary', ['shary'], true],
    ['bloknoty', ['bloknoty'], true],
    ['pechat-i-kopirovanie', ['copyandprint', 'chertezhy'], false]
  ]) {
    const original = fixture(page);
    const app = await editor(page, sections, product);
    const count = original.sections[0].cards.length;
    await app.click('add-card');
    assert.equal(app.writes.length, 0, 'Draft creation does not publish');
    assert.match(app.nodes.manualCards.innerHTML, /Отменить добавление/);
    assert.equal(app.state.focusCount, 1);
    await app.save();
    assert.equal(app.writes.length, 0, 'Empty title must not publish');
    app.input('title', 'Новая услуга', 0, count);
    await app.save();
    assert.equal(app.writes.length, 0, 'Empty price must not publish');
    app.fill(0, count);
    app.state.failSave = true;
    await app.save();
    assert.match(app.nodes.manualCards.innerHTML, /Отменить добавление/, 'Failed save retains draft');
    assert.equal(app.nodes.manualCards.inert, false);
    assert.equal(app.nodes.manualSave.disabled, false);
    app.state.failSave = false;
    await app.save();
    assert.equal(app.writes.length, 1);
    const added = app.remote().sections[0].cards[count];
    assert.equal(added.title, 'Новая услуга');
    assert.equal(added.cardType === 'product', product);
    assert.match(added.id, /^[a-z0-9-]+$/);
    assert.deepEqual(app.remote().sections[0].cards.slice(0, count), original.sections[0].cards, 'Existing cards unchanged');
    assert.doesNotMatch(app.nodes.manualCards.innerHTML, /Отменить добавление/);
    await app.click('upload-page-image', 0, count);
    assert.match(app.remote().sections[0].cards[count].img[0], /\.webp$/);
    await app.reload();
    assert.match(app.nodes.manualCards.innerHTML, /Новая услуга/);
    await app.click('add-card');
    await app.click('remove-card', 0, count + 1);
    assert.doesNotMatch(app.nodes.manualCards.innerHTML, /Отменить добавление/);
    const beforeCancelExisting = app.nodes.manualCards.innerHTML;
    await app.click('remove-card', 0, 0);
    assert.equal(app.nodes.manualCards.innerHTML, beforeCancelExisting, 'Declining confirmation preserves a saved card');
    assert.equal(app.state.confirmations, 1);

    const first = clone(app.remote().sections[0].cards[0]);
    const second = clone(app.remote().sections[0].cards[1]);
    await app.click('move-card-up', 0, 0);
    await app.click('move-card-down', 0, count);
    assert.equal(app.nodes.manualCards.innerHTML, beforeCancelExisting, 'Boundary moves are ignored');
    await app.click('move-card-down', 0, 0);
    assert.deepEqual(app.remote().sections[0].cards[0], first, 'Order changes stay local until save');
    await app.save();
    assert.deepEqual(app.remote().sections[0].cards[0], second);
    assert.deepEqual(app.remote().sections[0].cards[1], first, 'Image, prices and ID move together');
    await app.click('move-card-up', 0, 1);
    await app.save();
    assert.deepEqual(app.remote().sections[0].cards[0], first);
    app.state.confirmDelete = true;
    await app.click('remove-card', 0, 0);
    assert.equal(app.remote().sections[0].cards.length, count + 1, 'Delete stays local until save');
    await app.save();
    assert.equal(app.remote().sections[0].cards.length, count);
    assert.ok(!app.remote().sections[0].cards.some(card => card.id === first.id));
    await app.reload();
    assert.equal(app.remote().sections[0].cards.length, count);
  }

  for (const [page, section] of [['tablichki', 'address-signs'], ['printcanvas', 'canvas-styles']]) {
    const app = await editor(page, [section]);
    const before = app.nodes.manualCards.innerHTML;
    await app.click('add-card', 0);
    await app.click('remove-card', 0, 0);
    await app.click('move-card-down', 0, 0);
    assert.equal(app.nodes.manualCards.innerHTML, before, 'Specialized sections cannot create product cards');
    const count = app.remote().sections[1].cards.length;
    await app.click('add-card', 1);
    app.fill(1, count);
    await app.save();
    assert.deepEqual(app.remote().sections[0], fixture(page).sections[0]);
    assert.equal(app.remote().sections[1].cards.length, count + 1);
  }

  const empty = { sections: [{ id: 'kruzhki', title: 'Кружки', cards: [] }] };
  const app = await editor('pechat-na-kruzhkah', ['kruzhki'], true, empty);
  await app.click('add-card');
  app.fill(0, 0);
  await app.click('add-card');
  app.fill(0, 1);
  await app.save();
  const cards = app.remote().sections[0].cards;
  assert.equal(cards.length, 2, 'Empty sections support new cards');
  assert.notEqual(cards[0].id, cards[1].id, 'New IDs are unique');
  assert.deepEqual(cards[0].img, [], 'No borrowed image or invented price');
  app.state.confirmDelete = true;
  await app.click('remove-card', 0, 1);
  await app.click('remove-card', 0, 0);
  await app.save();
  assert.equal(app.remote().sections[0].cards.length, 0, 'Last card can be removed');
  await app.reload();
  assert.match(app.nodes.manualCards.innerHTML, /Добавить карточку/);
  await app.click('add-card');
  app.fill(0, 0);
  await app.save();
  assert.equal(app.remote().sections[0].cards.length, 1, 'Empty section can be repopulated');
  app.state.fileSize = 10 * 1024 * 1024 + 1;
  const requests = app.state.uploadRequests;
  await app.click('upload-page-image');
  assert.equal(app.state.uploadRequests, requests, 'Oversized file is rejected before the request');
  assert.equal(app.nodes.uploadError.hidden, false);
  assert.match(app.nodes.uploadError.textContent, /10 МБ/);
  app.state.fileSize = 2500000;
  app.state.failUpload = true;
  await app.click('upload-page-image');
  assert.equal(app.nodes.uploadError.textContent, 'Image invalid', 'API error is visible beside the upload button');
  assert.equal(app.nodes.uploadError.hidden, false);
  app.state.failUpload = false;
  await app.click('upload-page-image');
  assert.equal(app.nodes.uploadError.hidden, true, 'Retry clears the inline error');
  console.log('PASS: creation, deletion/confirmation, reordering, draft validation, save failure/retry, persistence, image upload, unique IDs, empty and mixed sections.');
})().catch(error => { console.error(error); process.exitCode = 1; });
