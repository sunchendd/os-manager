const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const OUT_DIR = path.join(__dirname, 'screenshots');

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on('dialog', async dialog => await dialog.accept());

  console.log('Capturing scheduled-tasks.png...');
  await page.goto(`${BASE_URL}/?panel=scheduled`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  const outPath = path.join(OUT_DIR, 'scheduled-tasks.png');
  await page.screenshot({ path: outPath, fullPage: false });
  console.log(`Saved to ${outPath}`);

  await browser.close();
}

capture().catch(e => { console.error(e); process.exit(1); });
