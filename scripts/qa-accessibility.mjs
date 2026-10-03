import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium, firefox, webkit } from 'playwright';

// Engine automation and semantic evidence; not physical-device or screen-reader listening tests.
const root = process.cwd();
const out = path.join(root, 'qa', 'accessibility');
await mkdir(out, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const server = createServer(async (request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const file = path.resolve(root, name === '/' ? 'index.html' : `.${name}`);
  if (!file.startsWith(root + path.sep)) return response.writeHead(403).end();
  try {
    response.setHeader('Content-Type', `${mime[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`);
    response.end(await readFile(file));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = process.env.QA_URL || `http://127.0.0.1:${server.address().port}/`;
const records = [];
const spacing = '*{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}p{margin-bottom:2em!important}';

async function focused(page, selector) {
  await page.waitForFunction(sel => document.activeElement === document.querySelector(sel), selector);
}

try {
  for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await type.launch({ headless: true });
    try {
      // 320x256 is the reflow equivalent of a 1280x1024 viewport at 400%, not browser zoom.
      for (const [width, height] of [[1440, 900], [390, 844], [320, 256]]) {
        const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', hasTouch: width < 400 });
        const page = await context.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(url, { waitUntil: 'networkidle' });
        const result = { engine, version: browser.version(), width, height, languages: [] };
        for (const lang of ['zh', 'en']) {
          await page.locator(`[data-target-lang="${lang}"]`).click();
          const descriptions = await page.locator('.node-card').evaluateAll(cards => cards.map(card => ({
            name: card.getAttribute('aria-label'),
            description: document.getElementById(card.getAttribute('aria-describedby'))?.textContent.trim(),
            summary: card.querySelector('.node-summary').textContent.trim()
          })));
          assert.equal(descriptions.length, 6);
          for (const card of descriptions) { assert.ok(card.name); assert.ok(card.description); assert.equal(card.description, card.summary); }
          assert.match(descriptions[5].description, lang === 'en' ? /simulated data only/ : /僅使用模擬資料/);
          if (width < 400) await page.locator('#commandTrigger').tap();
          else await page.locator('#commandTrigger').click();
          await focused(page, '#cmdPaletteInput');
          await page.keyboard.press('ArrowDown');
          assert.equal(await page.getByRole('option', { selected: true }).count(), 1);
          await page.keyboard.press('Tab');
          await focused(page, '.cmd-palette-close');
          await page.keyboard.press('Shift+Tab');
          await focused(page, '#cmdPaletteInput');
          await page.keyboard.press('Escape');
          await focused(page, '#commandTrigger');
          assert.equal(await page.locator('dialog').evaluate(el => el.open), false);
          // Shortcut invocation restores the keyboard user's original control.
          await page.locator(`[data-target-lang="${lang}"]`).focus();
          await page.keyboard.press('Control+k');
          await focused(page, '#cmdPaletteInput');
          await page.getByRole('combobox').fill('definitely-no-result');
          assert.equal(await page.getByRole('option').count(), 0);
          assert.match(await page.locator('#cmdPaletteStatus').textContent(), lang === 'en' ? /No matching/ : /沒有符合/);
          await page.locator('.cmd-palette-close').click();
          await focused(page, `[data-target-lang="${lang}"]`);
          result.languages.push({ lang, descriptions, palette: 'pass' });
        }
        await page.addStyleTag({ content: spacing });
        await page.locator('.philosophy-disclosure').evaluate(el => el.open = true);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false, `${engine} ${width}: text spacing overflow`);
        const clipped = await page.locator('.node-summary, .node-domain, .footer-desc, .footer-links a, .philo-text').evaluateAll(elements => elements.filter(el => el.getClientRects().length && (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)).map(el => el.textContent));
        assert.deepEqual(clipped, [], `${engine} ${width}: clipped text`);
        await page.locator('.footer-links a').last().scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(out, `${engine}-${width}-spacing.png`) });
        await writeFile(path.join(out, `${engine}-${width}-aria.txt`), await page.locator('body').ariaSnapshot());
        if (engine === 'chromium' && width === 390) {
          const client = await context.newCDPSession(page);
          const { nodes } = await client.send('Accessibility.getFullAXTree');
          const links = nodes.filter(node => node.role?.value === 'link' && node.name?.value.includes('GitHub Access Required'));
          assert.equal(links.length, 2);
          assert.ok(links.every(link => link.description?.value));
          await writeFile(path.join(out, 'chromium-private-links-ax.json'), JSON.stringify(links, null, 2));
        }
        await page.locator('#commandTrigger').click();
        assert.equal(await page.locator('dialog').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
        await page.screenshot({ path: path.join(out, `${engine}-${width}-dialog.png`) });
        await page.keyboard.press('Escape');
        await focused(page, '#commandTrigger');
        assert.deepEqual(errors, []);
        result.textSpacing = 'pass';
        records.push(result);
        await context.close();
      }
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.addInitScript(() => {
        window.__qaFrames = 0;
        const request = window.requestAnimationFrame;
        window.requestAnimationFrame = callback => request.call(window, time => { window.__qaFrames++; callback(time); });
      });
      await page.goto(url, { waitUntil: 'networkidle' });
      for (let cycle = 0; cycle < 2; cycle++) {
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.waitForTimeout(200);
        assert.equal(await page.locator('#silicon-canvas').isVisible(), true);
        const running = await page.evaluate(() => window.__qaFrames);
        await page.waitForTimeout(250);
        assert.ok(await page.evaluate(() => window.__qaFrames) > running);
        await page.locator('.node-card').first().hover();
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => !document.querySelector('#silicon-canvas').getClientRects().length);
        assert.equal(await page.locator('#silicon-canvas').isVisible(), false);
        assert.equal(await page.locator('#rippleCanvas').isVisible(), false);
        assert.equal(await page.locator('.node-card').first().evaluate(el => el.style.transform), '');
        const stopped = await page.evaluate(() => window.__qaFrames);
        await page.mouse.move(12, 12);
        // Covers the old 2.4-second pulse and 3-second idle timers as well as immediate animation.
        await page.waitForTimeout(3300);
        assert.equal(await page.evaluate(() => window.__qaFrames), stopped);
      }
      records.push({ engine, runtimeReducedMotion: 'pass (two stop/resume cycles)' });
      await context.close();
    } finally { await browser.close(); }
  }
} finally {
  await new Promise(resolve => server.close(resolve));
  await writeFile(path.join(out, 'results.json'), JSON.stringify(records, null, 2));
}
console.log(`Accessibility regression passed: ${records.length} viewport/motion cases across Chromium, Firefox, and WebKit. Physical phones, Safari, and screen-reader listening are not covered.`);
