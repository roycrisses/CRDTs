const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(2000); // Wait for things to settle
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
  console.log('Screenshot captured as screenshot.png');
})();
