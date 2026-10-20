// AL-11: automated run of the Sprint 1 test cases in tests/test-cases.md
// Usage (needs Node.js + Playwright):  node tests/run-tests.mjs
// Optional env: PLAYWRIGHT_MODULE=<path to playwright index.mjs>, CHROMIUM_PATH=<browser binary>
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP = pathToFileURL(path.join(root, 'index.html')).href;
const KITCHEN = pathToFileURL(path.join(root, 'kitchen.html')).href;

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const results = [];

async function newPage(width = 360) {
  const context = await browser.newContext({ viewport: { width, height: 740 } });
  const page = await context.newPage();
  page.errors = [];
  page.on('pageerror', (e) => page.errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.errors.push(m.text()); });
  return page;
}

async function addItem(page, name) {
  const category = await page.evaluate((n) => MENU.find((m) => m.name.includes(n)).category, name);
  await page.locator(`.category-tab[data-category="${category}"]`).click();
  await page.locator(`.item:has-text("${name}") .add-btn`).first().click();
  await page.waitForTimeout(1050); // "Added ✓" lasts 1 second
}

async function test(id, story, fn) {
  const page = await newPage(id === 'TC18' ? 320 : 360);
  try {
    const remark = await fn(page);
    if (page.errors.length) throw new Error('Console error: ' + page.errors.join('; '));
    results.push({ id, story, result: 'Pass', remark });
  } catch (error) {
    results.push({ id, story, result: 'Fail', remark: error.message.split('\n')[0] });
  } finally {
    await page.context().close();
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

await test('TC01', 'AL-6', async (p) => {
  await p.goto(APP);
  let total = 0;
  for (const cat of ['Snacks', 'Meals', 'Beverages']) {
    await p.locator(`.category-tab[data-category="${cat}"]`).click();
    const cards = await p.$$eval('#menu-list .item', (els) => els.map((e) => [e.querySelector('.item-name').textContent, e.querySelector('.price').textContent]));
    expect(cards.every(([n, pr]) => n && /^₹\d+/.test(pr)), `${cat}: an item is missing its name or price`);
    total += cards.length;
  }
  const available = await p.evaluate(() => MENU.filter((m) => m.available).length);
  expect(total === available, `Shown ${total}, expected ${available}`);
  return `${total} available items listed with name and price`;
});

await test('TC02', 'AL-6', async (p) => {
  await p.goto(APP);
  const hidden = await p.evaluate(() => MENU.filter((m) => !m.available).map((m) => m.name));
  for (const cat of ['Snacks', 'Meals', 'Beverages']) {
    await p.locator(`.category-tab[data-category="${cat}"]`).click();
    const names = await p.$$eval('.item-name', (els) => els.map((e) => e.textContent));
    expect(!names.some((n) => hidden.includes(n)), `Unavailable item shown in ${cat}`);
  }
  return `Hidden: ${hidden.join(', ')}`;
});

await test('TC03', 'AL-7', async (p) => {
  await p.goto(APP);
  const active = await p.locator('.category-tab.active').first().textContent();
  const cats = await p.$$eval('.item', (els) => els.map((e) => e.dataset.id));
  const allSnacks = await p.evaluate((ids) => ids.every((id) => MENU.find((m) => String(m.id) === id).category === 'Snacks'), cats);
  expect(active.trim() === 'Snacks' && allSnacks, 'Default tab is not Snacks-only');
  return `Snacks selected by default, ${cats.length} snack items`;
});

await test('TC04', 'AL-7', async (p) => {
  await p.goto(APP);
  for (const cat of ['Meals', 'Beverages']) {
    await p.locator(`.category-tab[data-category="${cat}"]`).click();
    const ids = await p.$$eval('.item', (els) => els.map((e) => e.dataset.id));
    const ok = await p.evaluate(([ids, c]) => ids.every((id) => MENU.find((m) => String(m.id) === id).category === c), [ids, cat]);
    expect(ok && ids.length > 0, `${cat} tab shows items from another category`);
  }
  return 'Meals and Beverages tabs show only their own items';
});

await test('TC05', 'AL-7', async (p) => {
  await p.goto(APP);
  await p.locator('.category-tab[data-category="Meals"]').click();
  const bad = await p.$$eval('.item', (els) => els.filter((e) => {
    const n = e.querySelector('.item-name');
    const item = MENU.find((m) => String(m.id) === e.dataset.id);
    const label = e.querySelector('.diet-badge').textContent;
    return n.scrollWidth > n.clientWidth + 1 || label !== (item.veg ? 'Veg' : 'Non-veg');
  }).length);
  expect(bad === 0, `${bad} item(s) cut off or with the wrong Veg label`);
  return 'Long names wrap fully; Veg/Non-veg labels match the data';
});

await test('TC06', 'AL-8', async (p) => {
  await p.goto(APP);
  await addItem(p, 'Samosa'); await addItem(p, 'Samosa'); await addItem(p, 'Masala Chai');
  const bar = await p.locator('#cart-bar-text').textContent();
  expect(bar.startsWith('3 items · ₹65'), `Cart bar shows "${bar}"`);
  expect(await p.locator('#cart-bar').isVisible(), 'Sticky cart bar not visible');
  return bar;
});

await test('TC07', 'AL-8', async (p) => {
  await p.goto(APP);
  await addItem(p, 'Masala Chai');
  await p.locator('.cart-item-row:has-text("Masala Chai") .qty-btn').first().click();
  expect(await p.locator('#cart-bar').isHidden(), 'Item not removed when quantity reached 0');
  return 'Quantity 1 → 0 removes the item; cart hides';
});

await test('TC08', 'AL-8', async (p) => {
  await p.goto(APP + '?time=11:00');
  await addItem(p, 'Samosa');
  await p.locator('.pickup-slot-btn:has-text("12:30")').click();
  await p.locator('#place-order-btn').click();
  const msg = await p.locator('#checkout-error').textContent();
  const saved = await p.evaluate(() => JSON.parse(localStorage.getItem('orders') || '[]').length);
  expect(/name/i.test(msg) && saved === 0, 'Order placed without a name');
  return `Blocked: "${msg}"`;
});

await test('TC09', 'AL-10', async (p) => {
  await p.goto(APP + '?time=12:10');
  await addItem(p, 'Samosa');
  const slots = await p.$$eval('.pickup-slot-time', (els) => els.map((e) => e.textContent));
  expect(slots[0] === '12:15' && !slots.includes('12:00'), `Slots offered: ${slots.join(', ')}`);
  return `At 12:10 offered: ${slots.join(', ')}`;
});

await test('TC10', 'AL-10', async (p) => {
  await p.goto(APP + '?time=13:50');
  await addItem(p, 'Samosa');
  const text = await p.locator('#pickup-slot-buttons').innerText();
  expect(/No more pickup slots/i.test(text), `Shows "${text}"`);
  return 'At 13:50: "No more pickup slots today."';
});

await test('TC11', 'AL-10', async (p) => {
  await p.goto(APP + '?time=11:00');
  await addItem(p, 'Samosa');
  await p.fill('#customer-name', 'Riya');
  await p.locator('#place-order-btn').click();
  const msg = await p.locator('#checkout-error').textContent();
  expect(/pickup time/i.test(msg), 'Order placed without a pickup slot');
  return `Blocked: "${msg}"`;
});

await test('TC12', 'AL-8 / AL-10', async (p) => {
  await p.goto(APP + '?time=11:00');
  await addItem(p, 'Samosa'); await addItem(p, 'Masala Chai');
  await p.locator('.pickup-slot-btn:has-text("12:45")').click();
  await p.fill('#customer-name', 'Riya Test');
  await p.locator('#place-order-btn').click();
  await p.waitForTimeout(800);
  const msg = await p.locator('#order-message-text').textContent();
  expect(await p.locator('#order-message').isVisible() && /#1001/.test(msg) && /12:45/.test(msg), `Confirmation: "${msg}"`);
  await p.locator('#view-orders-btn').click();
  const card = await p.locator('.order-card').first().innerText();
  expect(/Received/.test(card) && /12:45/.test(card) && /Riya Test/.test(card) && /₹40/.test(card), 'My Orders card incomplete');
  return `"${msg}" → My Orders: Received, pickup 12:45, ₹40`;
});

await test('TC13', 'AL-10', async (p) => {
  await p.goto(APP + '?time=12:10&test=1');
  await addItem(p, 'Samosa');
  await p.locator('#test-fill-slot-btn').click();
  const btn = p.locator('.pickup-slot-btn:has-text("12:30")');
  expect(/Full/.test(await btn.textContent()) && await btn.isDisabled(), '12:30 not shown as Full');
  return '12:30 with 20 orders shows "Full" and cannot be tapped';
});

await test('TC14', 'AL-10 / AL-54', async (p) => {
  await p.goto(APP + '?time=12:10&test=1');
  await addItem(p, 'Samosa');
  await p.locator('.pickup-slot-btn:has-text("12:30")').click();
  await p.locator('#test-fill-slot-btn').click();
  await p.fill('#customer-name', 'Late Student');
  await p.locator('#place-order-btn').click();
  const count = await p.evaluate(() => JSON.parse(localStorage.getItem('orders')).filter((o) => o.pickupSlot === '12:30').length);
  expect(count === 20, `12:30 now has ${count} orders`);
  return 'Slot filled after selection → order blocked, slot stays at 20';
});

await test('TC15', 'AL-9', async (p) => {
  await p.goto(KITCHEN);
  expect(await p.locator('#kitchen-section').isHidden(), 'Orders visible without PIN');
  await p.fill('#pin-input', '0000');
  await p.locator('#pin-form button').click();
  expect(await p.locator('#pin-error').isVisible() && await p.locator('.kitchen-order').count() === 0, 'Wrong PIN shows orders');
  return 'No PIN / wrong PIN: no orders shown, error message displayed';
});

await test('TC16', 'AL-9', async (p) => {
  await p.goto(APP + '?time=11:00');
  for (const [item, slot, name] of [['Samosa', '13:15', 'Riya'], ['Masala Dosa', '12:00', 'Arjun'], ['Egg Roll', '12:30', 'Sana']]) {
    await p.goto(APP + '?time=11:00');
    await addItem(p, item);
    await p.locator(`.pickup-slot-btn:has-text("${slot}")`).click();
    await p.fill('#customer-name', name);
    await p.locator('#place-order-btn').click();
    await p.waitForTimeout(200);
  }
  await p.goto(KITCHEN);
  await p.fill('#pin-input', '1234');
  await p.locator('#pin-form button').click();
  const headings = await p.$$eval('.slot-heading', (h) => h.map((x) => x.textContent.split(' ·')[0]));
  expect(headings.join(',') === '12:00,12:30,13:15', `Order of slots: ${headings.join(', ')}`);
  return `Placed 13:15, 12:00, 12:30 → kitchen shows ${headings.join(' → ')}`;
});

await test('TC17', 'AL-9', async (p) => {
  await p.goto(APP);
  const links = await p.locator('a[href*="kitchen"]').count();
  expect(links === 0, 'Student app links to the kitchen view');
  return 'No link to kitchen.html in the student app';
});

await test('TC18', 'All', async (p) => {
  await p.goto(APP + '?time=11:00');
  await addItem(p, 'Paneer Butter Masala');
  const overflow = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(!overflow, 'Page scrolls sideways at 320px');
  return 'No sideways scrolling on a 320px phone';
});

await browser.close();
console.log(JSON.stringify(results, null, 2));
const failed = results.filter((r) => r.result === 'Fail').length;
console.error(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
