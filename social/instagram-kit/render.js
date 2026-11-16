// node render.js post1-intro.html [more.html...]  -> out/<name>-01.png ... (1080 px wide, exact size)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, deviceScaleFactor: 1 });
  for (const f of process.argv.slice(2)) {
    const name = path.basename(f, '.html');
    await page.goto('file://' + path.resolve(__dirname, f));
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(300);
    const sel = (await page.$('.reel,.hl,.pp')) ? '.reel,.hl,.pp,.slide' : '.slide';
    const els = await page.$$(sel);
    for (let i = 0; i < els.length; i++) {
      const id = await els[i].getAttribute('data-name');
      const out = path.join(__dirname, process.env.OUT || 'out', id || `${name}-${String(i + 1).padStart(2, '0')}.png`);
      await els[i].screenshot({ path: out });
    }
    console.log(name, els.length);
  }
  await browser.close();
})();
