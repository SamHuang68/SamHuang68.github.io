import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
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
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}/`;
const viewports = [
  [1440, 1000],
  [1361, 900],
  [1280, 900],
  [1101, 900],
  [901, 900],
  [768, 1024],
  [621, 900],
  [390, 844],
  [312, 720],
];

const browser = await chromium.launch({ headless: true });
const failures = [];

try {
  for (const [width, height] of viewports) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const runtimeErrors = [];

    page.on('pageerror', (error) => runtimeErrors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
    });
    page.on('requestfailed', (request) => runtimeErrors.push(`requestfailed: ${request.url()}`));
    page.on('response', (response) => {
      if (response.url().startsWith(baseUrl) && response.status() >= 400) {
        runtimeErrors.push(`HTTP ${response.status()}: ${response.url()}`);
      }
    });

    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
      for (const image of [...document.images]) {
        image.scrollIntoView({ block: 'center' });
        await new Promise((resolve) => setTimeout(resolve, 60));
      }
      await Promise.all(
        [...document.images].map((image) =>
          image.complete
            ? Promise.resolve()
            : new Promise((resolve) => {
                image.addEventListener('load', resolve, { once: true });
                image.addEventListener('error', resolve, { once: true });
              }),
        ),
      );
      scrollTo(0, 0);
    });

    const metrics = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
      };
      const keySelectors = [
        '.site-header', '.header-inner', '.hero', '.hero-copy', '.hero-visual', '.hero-facts',
        '.spine-map', '.platform-entry', '.lens-grid', '.lens-card', '.studio-layout',
        '.workbench-visual', '.transfer-lanes', '.archive-list', 'footer',
      ];
      const internalOverflow = keySelectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)]
          .filter(visible)
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => ({ selector, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })),
      );
      const viewportOverflow = [...document.querySelectorAll('body *')]
        .filter(visible)
        .filter((element) => !element.closest('.ambient-field'))
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.left < -1 || rect.right > innerWidth + 1)
        .map(({ element, rect }) => ({
          tag: element.tagName,
          className: String(element.className || ''),
          left: Math.round(rect.left * 10) / 10,
          right: Math.round(rect.right * 10) / 10,
        }));
      const imageFailures = [...document.images]
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute('src'));
      const h1 = document.querySelector('h1');
      const h2s = [...document.querySelectorAll('h2')];
      const prose = [...document.querySelectorAll('.hero-lead, .section-intro, .spine-map p, .lens-copy > strong, .workbench-copy > p, .transfer-lanes p')]
        .filter(visible)
        .map((element) => ({
          selector: element.className || element.tagName,
          size: parseFloat(getComputedStyle(element).fontSize),
        }));
      return {
        document: {
          innerWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
        },
        body: { clientWidth: document.body.clientWidth, scrollWidth: document.body.scrollWidth },
        internalOverflow,
        viewportOverflow,
        imageFailures,
        h1: h1 ? parseFloat(getComputedStyle(h1).fontSize) : null,
        h2: h2s.map((element) => parseFloat(getComputedStyle(element).fontSize)),
        prose,
        headerPosition: getComputedStyle(document.querySelector('.site-header')).position,
        reducedMotion: getComputedStyle(document.documentElement).scrollBehavior,
      };
    });

    if (metrics.document.scrollWidth > width + 1 || metrics.body.scrollWidth > width + 1) {
      failures.push(`${width}px document overflow: ${JSON.stringify({ document: metrics.document, body: metrics.body })}`);
    }
    if (metrics.internalOverflow.length) failures.push(`${width}px internal overflow: ${JSON.stringify(metrics.internalOverflow)}`);
    if (metrics.viewportOverflow.length) failures.push(`${width}px viewport clipping: ${JSON.stringify(metrics.viewportOverflow.slice(0, 12))}`);
    if (metrics.imageFailures.length) failures.push(`${width}px image failures: ${metrics.imageFailures.join(', ')}`);
    if (metrics.h1 > (width <= 620 ? 44 : 72)) failures.push(`${width}px h1 is too large: ${metrics.h1}px`);
    if (width <= 620 && metrics.h2.some((size) => size > 38)) failures.push(`${width}px mobile h2 is too large: ${metrics.h2.join(', ')}`);
    if (metrics.prose.some(({ size }) => size < 15)) failures.push(`${width}px primary prose below 15px: ${JSON.stringify(metrics.prose)}`);
    if (metrics.headerPosition !== 'sticky') failures.push(`${width}px header is not sticky`);
    if (metrics.reducedMotion !== 'auto') failures.push(`${width}px reduced motion does not disable smooth scrolling`);
    runtimeErrors.forEach((error) => failures.push(`${width}px ${error}`));

    if (width === 390) {
      const toggle = page.locator('.menu-toggle');
      await toggle.click();
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') failures.push('390px menu did not open');
      await page.waitForTimeout(220);
      const focusedAfterOpen = await page.evaluate(() => ({
        href: document.activeElement?.getAttribute('href'),
        tag: document.activeElement?.tagName,
        className: document.activeElement?.className,
      }));
      if (focusedAfterOpen.href !== '#platform') failures.push(`390px menu focus did not move to first link: ${JSON.stringify(focusedAfterOpen)}`);
      await page.keyboard.press('Escape');
      if ((await toggle.getAttribute('aria-expanded')) !== 'false') failures.push('390px Escape did not close menu');
      const toggleFocused = await page.evaluate(() => document.activeElement?.classList.contains('menu-toggle'));
      if (!toggleFocused) failures.push('390px Escape did not return focus to menu button');
      await toggle.click();
      await page.locator('.primary-navigation a[href="#platform"]').click();
      await page.waitForTimeout(80);
      if (!page.url().endsWith('#platform')) failures.push(`390px section jump did not update hash: ${page.url()}`);
      if ((await toggle.getAttribute('aria-expanded')) !== 'false') failures.push('390px menu did not close after section jump');
      const anchorTop = await page.locator('#platform').evaluate((element) => element.getBoundingClientRect().top);
      const headerHeight = await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().height);
      if (anchorTop < headerHeight - 2) failures.push(`390px sticky header obscures #platform: top=${anchorTop}, header=${headerHeight}`);
    }

    await page.screenshot({ path: path.join(outputDir, `home-${width}.png`), fullPage: true });
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

if (failures.length) {
  console.error('Rendered homepage QA failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Rendered homepage QA PASS: ${viewports.length} viewports, zero overflow/runtime/image/type/menu failures`);
