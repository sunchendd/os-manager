const { chromium } = require('playwright');
const path = require('path');

const BASE_URL = 'http://localhost:3002';
const OUT_DIR = path.join(__dirname, 'screenshots');

const screenshots = [
  { name: 'chat-interface.png', panel: 'chat', wait: 2000 },
  { name: 'system-dashboard.png', panel: 'dashboard', wait: 3000 },
  { name: 'services-panel.png', panel: 'services', wait: 2000 },
  { name: 'optimization-panel.png', panel: 'optimize', wait: 2000 },
  { name: 'skill-marketplace.png', panel: 'skills', wait: 2000 },
  { name: 'agent-panel-empty.png', panel: 'agents', wait: 2000 },
  { name: 'scheduled-tasks.png', panel: 'scheduled', wait: 2000 },
];

async function capture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Accept any alerts
  page.on('dialog', async dialog => await dialog.accept());

  for (const shot of screenshots) {
    try {
      console.log(`Capturing ${shot.name}...`);
      await page.goto(`${BASE_URL}/?panel=${shot.panel}`, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(shot.wait);
      await page.screenshot({
        path: path.join(OUT_DIR, shot.name),
        fullPage: false,
      });
      console.log(`  ✓ ${shot.name}`);
    } catch (e) {
      console.error(`  ✗ ${shot.name}: ${e.message}`);
    }
  }

  await browser.close();
  console.log('Done!');
}

capture().catch(console.error);
