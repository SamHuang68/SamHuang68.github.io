import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const root = process.cwd();
const outputDir = path.join(root, 'qa', 'home-renders');
await mkdir(outputDir, { recursive: true });

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.woff2', 'font/woff2'],
]);

const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
  const resolved = path.resolve(root, relative);
  if (!resolved.startsWith(root)) return response.writeHead(403).end('Forbidden');

  try {
    const info = await stat(resolved);
    if (!info.isFile()) throw new Error('Not a file');
    response.writeHead(200, {
      'Content-Type': mime.get(path.extname(resolved).toLowerCase()) || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(resolved).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const baseUrl = `http://127.0.0.1:${server.address().port}/`;
const viewports = [
  [1440, 900],
  [1280, 900],
  [1024, 900],
  [768, 1024],
  [390, 844],
];

const browser = await chromium.launch({ headless: true });
const failures = [];
const records = [];

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const runtimeErrors = [];

    page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
    });

    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(150);

    const metrics = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
      };
      const cards = [...document.querySelectorAll('.node-card')].filter(visible).map((card) => {
        const rect = card.getBoundingClientRect();
        return {
          tag: card.tagName,
          width: rect.width,
          height: rect.height,
          href: card.getAttribute('href'),
          ariaLabel: card.getAttribute('aria-label'),
          live: Boolean(card.querySelector('.badge-live')),
          source: Boolean(card.querySelector('.badge-source')),
          nestedInteractive: card.querySelectorAll('a, button, input, select, textarea').length,
          cursor: getComputedStyle(card).cursor,
          bottom: rect.bottom,
        };
      });

      const firstCard = document.querySelector('.node-card');
      firstCard?.focus();
      const focusStyle = firstCard ? getComputedStyle(firstCard) : null;

      return {
        document: {
          innerWidth,
          innerHeight,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        },
        body: {
          clientWidth: document.body.clientWidth,
          scrollWidth: document.body.scrollWidth,
          backgroundColor: getComputedStyle(document.body).backgroundColor,
        },
        cards,
        headerPosition: getComputedStyle(document.querySelector('.cockpit-header')).position,
        focusOutline: focusStyle ? { style: focusStyle.outlineStyle, width: focusStyle.outlineWidth } : null,
      };
    });

    if (metrics.document.scrollWidth > width + 1 || metrics.body.scrollWidth > width + 1) {
      failures.push(`${width}px horizontal overflow: scrollWidth=${metrics.document.scrollWidth}`);
    }
    if (metrics.cards.length !== 6) {
      failures.push(`${width}px expected 6 .node-card elements, found ${metrics.cards.length}`);
    }
    if (metrics.cards.filter((c) => c.live).length !== 4 || metrics.cards.filter((c) => c.source).length !== 2) {
      failures.push(`${width}px live/source badge counts mismatch`);
    }
    if (metrics.cards.some((c) => c.tag !== 'A' || !c.href || !c.ariaLabel || c.nestedInteractive !== 0)) {
      failures.push(`${width}px a .node-card is not a single full-frame accessible <a> anchor`);
    }
    if (metrics.cards.some((c) => c.height < 120 || c.width < 240)) {
      failures.push(`${width}px a .node-card is too small: ${JSON.stringify(metrics.cards.map((c) => [c.width, c.height]))}`);
    }
    if (width >= 1280) {
      if (metrics.document.scrollHeight > height) {
        failures.push(`${width}x${height} page does not fit in a single screen: scrollHeight=${metrics.document.scrollHeight}px > ${height}px`);
      }
      if (Math.max(...metrics.cards.map((c) => c.bottom)) > height) {
        failures.push(`${width}x${height} cards exceed initial viewport bottom`);
      }
    }
    runtimeErrors.forEach((error) => failures.push(`${width}px ${error}`));

    records.push({
      viewport: { width, height },
      pageHeight: metrics.document.scrollHeight,
      bodyBg: metrics.body.backgroundColor,
      portalCount: metrics.cards.length,
      minimumCardWidth: Math.round(Math.min(...metrics.cards.map((c) => c.width))),
      minimumCardHeight: Math.round(Math.min(...metrics.cards.map((c) => c.height))),
      maximumCardBottom: Math.round(Math.max(...metrics.cards.map((c) => c.bottom))),
      runtimeErrorCount: runtimeErrors.length,
    });

    await page.evaluate(() => document.activeElement?.blur());
    await page.screenshot({ path: path.join(outputDir, `home-${width}.png`), fullPage: true });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

await writeFile(
  path.join(outputDir, 'report.json'),
  `${JSON.stringify({ gate: failures.length ? 'FAIL' : 'PASS', generatedAt: new Date().toISOString(), records, failures }, null, 2)}\n`,
  'utf8',
);

if (failures.length) {
  console.error('Rendered homepage QA failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`✅ Rendered homepage QA PASS: ${viewports.length} viewports, 6 full-card <a class="node-card"> portals, single-page desktop fit (<=900px), zero overflow.`);
