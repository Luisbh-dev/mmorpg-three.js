// Headless smoke test: register/login -> create char if needed -> enter world ->
// screenshot + report console errors. Optionally walk forward to show the avatar.
//
// Usage: node scripts/smoke.mjs            (servers must be running on :3000 and :3001)
//        SMOKE_CLASS=Hunter node scripts/smoke.mjs
import puppeteer from 'puppeteer-core';
import { io } from 'socket.io-client';

const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL = 'http://localhost:3000';
const USER = process.env.SMOKE_USER || 'tester';
const PASS = process.env.SMOKE_PASS || 'tester123';
const CHAR = 'Probador' + Math.floor(Math.random() * 100000);
const OUT = process.env.SMOKE_OUT || 'scripts/smoke.png';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ensureAccount() {
  return new Promise((resolve) => {
    const s = io('http://localhost:3001', { transports: ['websocket'] });
    let done = false;
    const finish = (m) => { if (!done) { done = true; s.close(); resolve(m); } };
    s.on('connect', () => s.emit('auth:register', { username: USER, password: PASS }, (res) => finish('register: ' + JSON.stringify(res))));
    s.on('connect_error', (e) => finish('connect_error: ' + e.message));
    setTimeout(() => finish('register timeout'), 5000);
  });
}

async function clickByText(page, selector, text) {
  const h = await page.evaluateHandle((sel, txt) => {
    const els = Array.from(document.querySelectorAll(sel));
    return els.find((el) => el.textContent && el.textContent.trim().includes(txt)) || null;
  }, selector, text);
  const el = h.asElement();
  if (!el) throw new Error(`No <${selector}> with text "${text}"`);
  await el.click();
}

(async () => {
  const errors = [];
  console.log(await ensureAccount());

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--window-size=1280,720']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console.error: ' + m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => { if (/\.(glb|gltf|fbx|bin|png)(\?|$)/i.test(r.url())) errors.push('assetfail: ' + r.url()); });

  await page.goto(URL, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('input[type=text]', { timeout: 15000 });
  await sleep(800);
  await page.type('input[type=text]', USER);
  await page.type('input[type=password]', PASS);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => /crear nuevo|nivel/i.test(document.body.innerText), { timeout: 15000 });
  await sleep(400);

  const hasChar = await page.evaluate(() => /nivel/i.test(document.body.innerText));
  if (!hasChar) {
    await clickByText(page, 'div', 'Crear Nuevo');
    await page.waitForSelector('input[type=text]', { timeout: 10000 });
    if (process.env.SMOKE_CLASS) { try { await clickByText(page, 'div', process.env.SMOKE_CLASS); } catch {} }
    await page.type('input[type=text]', CHAR);
    await clickByText(page, 'button', 'Forjar Destino');
    await page.waitForFunction(() => /nivel/i.test(document.body.innerText), { timeout: 15000 });
    await sleep(400);
  }

  await page.evaluate(() => { const h2 = document.querySelector('h2'); if (h2) h2.click(); });
  await page.waitForSelector('canvas', { timeout: 25000 });
  await sleep(8000);
  await page.screenshot({ path: OUT });

  const probe = await page.evaluate(() => ({ canvases: document.querySelectorAll('canvas').length }));
  console.log('PROBE:', JSON.stringify(probe), '-> screenshot', OUT);
  console.log('ERRORS(' + errors.length + '):');
  errors.slice(0, 40).forEach((e) => console.log('  - ' + e));

  await browser.close();
  process.exit(errors.length ? 2 : 0);
})().catch((e) => { console.error('SMOKE FAILED:', e); process.exit(1); });
