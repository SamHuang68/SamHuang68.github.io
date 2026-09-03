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
  [1440, 1000],
  [1361, 900],
  [1280, 900],
  [1101, 900],
  [1100, 900],
  [1024, 900],
  [901, 900],
  [900, 900],
  [768, 1024],
  [621, 900],
  [620, 900],
  [390, 844],
  [312, 720],
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
    page.on('requestfailed', (request) => runtimeErrors.push(`requestfailed: ${request.url()}`));
    page.on('response', (response) => {
      if (response.url().startsWith(baseUrl) && response.status() >= 400) runtimeErrors.push(`HTTP ${response.status()}: ${response.url()}`);
    });

    await page.goto(baseUrl, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(async () => {
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
      const keySelectors = ['.site-header', '.header-inner', '.portal-intro', '.intro-copy', '.legend', '.portal-section', '.section-bar', '.portal-grid', '.portal-card', 'footer'];
      const internalOverflow = keySelectors.flatMap((selector) =>
        [...document.querySelectorAll(selector)]
          .filter(visible)
          .filter((element) => element.scrollWidth > element.clientWidth + 1)
          .map((element) => ({ selector, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth })),
      );
      const viewportOverflow = [...document.querySelectorAll('body *')]
        .filter(visible)
        .filter((element) => !element.closest('.ambient-architecture'))
        .map((element) => ({ element, rect: element.getBoundingClientRect() }))
        .filter(({ rect }) => rect.left < -1 || rect.right > innerWidth + 1)
        .map(({ element, rect }) => ({ tag: element.tagName, className: String(element.className || ''), left: rect.left, right: rect.right }));
      const imageFailures = [...document.images]
        .filter((image) => !image.complete || image.naturalWidth === 0)
        .map((image) => image.getAttribute('src'));
      const cards = [...document.querySelectorAll('.portal-card')].filter(visible).map((card) => {
        const rect = card.getBoundingClientRect();
        return {
          tag: card.tagName,
          width: rect.width,
          height: rect.height,
          href: card.getAttribute('href'),
          ariaLabel: card.getAttribute('aria-label'),
          live: card.classList.contains('portal-card--live'),
          source: card.classList.contains('portal-card--source'),
          nestedInteractive: card.querySelectorAll('a, button, input, select, textarea').length,
          cursor: getComputedStyle(card).cursor,
          bottom: rect.bottom,
        };
      });
      const headingSizes = [...document.querySelectorAll('.portal-intro h1 em, .portal-intro h1 span, h2, h3')]
        .filter(visible)
        .map((element) => ({
          selector: element.matches('.portal-intro h1 em') ? 'h1-em' : element.matches('.portal-intro h1 span') ? 'h1-span' : element.tagName.toLowerCase(),
          size: parseFloat(getComputedStyle(element).fontSize),
        }));
      const prose = [...document.querySelectorAll('.portal-intro .intro-copy > p:last-child, .portal-card p')]
        .filter(visible)
        .map((element) => ({ selector: element.className || element.tagName, size: parseFloat(getComputedStyle(element).fontSize) }));
      const tapTargets = [...document.querySelectorAll('.github-profile, .portal-card, footer > a')]
        .filter(visible)
        .map((element) => ({ text: element.textContent.trim().slice(0, 32), height: element.getBoundingClientRect().height, card: element.classList.contains('portal-card') }));

      const parseRgb = (value) => {
        const parts = value.match(/[\d.]+/g)?.map(Number) ?? [];
        return parts.length >= 3 ? parts.slice(0, 3) : null;
      };
      const luminance = ([red, green, blue]) => {
        const channels = [red, green, blue].map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      const nearestBackground = (element) => {
        let current = element;
        while (current) {
          const values = getComputedStyle(current).backgroundColor.match(/[\d.]+/g)?.map(Number) ?? [];
          if (values.length >= 3 && (values.length < 4 || values[3] >= 0.98)) return values.slice(0, 3);
          current = current.parentElement;
        }
        return [4, 20, 31];
      };
      const contrastChecks = ['.availability--live', '.availability--source', '.portal-card h3', '.portal-card p', '.card-enter'].flatMap((selector) =>
        [...document.querySelectorAll(selector)].filter(visible).map((element) => {
          const foreground = parseRgb(getComputedStyle(element).color);
          const background = nearestBackground(element);
          const lighter = Math.max(luminance(foreground), luminance(background));
          const darker = Math.min(luminance(foreground), luminance(background));
          return { selector, ratio: (lighter + 0.05) / (darker + 0.05) };
        }),
      );

      const firstCard = document.querySelector('.portal-card');
      firstCard?.focus();
      const focusStyle = firstCard ? getComputedStyle(firstCard) : null;
      const introBottom = document.querySelector('.portal-intro')?.getBoundingClientRect().bottom ?? null;
      const sectionTop = document.querySelector('#project-portals')?.getBoundingClientRect().top ?? null;

      return {
        document: { innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
        body: { clientWidth: document.body.clientWidth, scrollWidth: document.body.scrollWidth },
        internalOverflow,
        viewportOverflow,
        imageFailures,
        cards,
        headingSizes,
        prose,
        tapTargets,
        contrastChecks,
        headerPosition: getComputedStyle(document.querySelector('.site-header')).position,
        reducedMotion: getComputedStyle(document.documentElement).scrollBehavior,
        ownerText: document.querySelector('.identity-copy strong')?.textContent.trim(),
        ownerHeading: document.querySelector('.portal-intro h1 em')?.textContent.trim(),
        focusOutline: focusStyle ? { style: focusStyle.outlineStyle, width: focusStyle.outlineWidth } : null,
        introBottom,
        sectionTop,
      };
    });

    if (metrics.document.scrollWidth > width + 1 || metrics.body.scrollWidth > width + 1) failures.push(`${width}px document overflow: ${JSON.stringify({ document: metrics.document, body: metrics.body })}`);
    if (metrics.internalOverflow.length) failures.push(`${width}px internal overflow: ${JSON.stringify(metrics.internalOverflow)}`);
    if (metrics.viewportOverflow.length) failures.push(`${width}px viewport clipping: ${JSON.stringify(metrics.viewportOverflow.slice(0, 12))}`);
    if (metrics.imageFailures.length) failures.push(`${width}px image failures: ${metrics.imageFailures.join(', ')}`);
    if (metrics.ownerText !== 'Sam Huang' || metrics.ownerHeading !== 'Sam Huang') failures.push(`${width}px owner identity missing`);
    if (metrics.cards.length !== 6) failures.push(`${width}px expected 6 portal cards, found ${metrics.cards.length}`);
    if (metrics.cards.filter((card) => card.live).length !== 4 || metrics.cards.filter((card) => card.source).length !== 2) failures.push(`${width}px availability counts are incorrect`);
    if (metrics.cards.some((card) => card.tag !== 'A' || !card.href || !card.ariaLabel || card.nestedInteractive !== 0)) failures.push(`${width}px a portal card is not a single accessible anchor`);
    if (metrics.cards.some((card) => card.height < 120 || card.width < 250)) failures.push(`${width}px a portal card is not a substantial full-frame target`);
    if (metrics.focusOutline?.style === 'none' || parseFloat(metrics.focusOutline?.width || '0') < 2) failures.push(`${width}px portal focus outline is not visible`);
    if (metrics.introBottom !== null && metrics.sectionTop !== null && metrics.sectionTop < metrics.introBottom - 1) failures.push(`${width}px portal section overlaps the intro`);

    for (const heading of metrics.headingSizes) {
      const max = heading.selector === 'h1-span' ? (width <= 760 ? 40 : 44) : heading.selector === 'h1-em' ? 20 : heading.selector === 'h2' ? 28 : 30;
      if (heading.size > max + 0.5) failures.push(`${width}px ${heading.selector} is too large: ${heading.size}px`);
    }

    if (metrics.prose.some(({ size }) => size < 14)) failures.push(`${width}px primary prose below 14px: ${JSON.stringify(metrics.prose)}`);
    const undersizedTargets = metrics.tapTargets.filter(({ height: targetHeight, card }) => targetHeight < (card ? 120 : 44));
    if (undersizedTargets.length) failures.push(`${width}px interaction target below floor: ${JSON.stringify(undersizedTargets)}`);
    const lowContrast = metrics.contrastChecks.filter(({ ratio }) => ratio < 4.5);
    if (lowContrast.length) failures.push(`${width}px text below 4.5:1 contrast: ${JSON.stringify(lowContrast)}`);

    const maximumPageHeight = width >= 1200 ? 1120 : width >= 761 ? 1580 : 2050;
    if (metrics.document.scrollHeight > maximumPageHeight) failures.push(`${width}px page is not sufficiently condensed: ${metrics.document.scrollHeight}px > ${maximumPageHeight}px`);
    if (width === 1440 && Math.max(...metrics.cards.map((card) => card.bottom)) > height) failures.push(`1440px portal grid does not fit in the initial viewport`);
    if (metrics.headerPosition !== 'sticky') failures.push(`${width}px header is not sticky`);
    if (metrics.reducedMotion !== 'auto') failures.push(`${width}px reduced motion does not disable smooth scrolling`);
    runtimeErrors.forEach((error) => failures.push(`${width}px ${error}`));

    records.push({
      viewport: { width, height },
      pageHeight: metrics.document.scrollHeight,
      portalCount: metrics.cards.length,
      liveCount: metrics.cards.filter((card) => card.live).length,
      sourceOnlyCount: metrics.cards.filter((card) => card.source).length,
      minimumCardWidth: Math.round(Math.min(...metrics.cards.map((card) => card.width))),
      minimumCardHeight: Math.round(Math.min(...metrics.cards.map((card) => card.height))),
      maximumCardBottom: Math.round(Math.max(...metrics.cards.map((card) => card.bottom))),
      horizontalOverflow: metrics.document.scrollWidth > width + 1 || metrics.body.scrollWidth > width + 1,
      internalOverflowCount: metrics.internalOverflow.length,
      viewportClippingCount: metrics.viewportOverflow.length,
      imageFailureCount: metrics.imageFailures.length,
      runtimeErrorCount: runtimeErrors.length,
      focusOutline: metrics.focusOutline,
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

console.log(`Rendered homepage QA PASS: ${viewports.length} viewports, 9 full-card portals, zero overflow, visible focus, classified availability and first-viewport desktop fit`);
