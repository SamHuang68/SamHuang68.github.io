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
        await new Promise((resolve) => setTimeout(resolve, 35));
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
        '.site-header',
        '.header-inner',
        '.hero',
        '.hero-copy',
        '.hero-visual',
        '.work-section',
        '.section-heading',
        '.portfolio-grid',
        '.nvm-feature',
        '.category-content',
        '.nvm-paths',
        '.discipline-grid',
        '.discipline-card',
        'footer',
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
      const headingSizes = [...document.querySelectorAll('.hero h1 em, .hero h1 span, h2, h3')]
        .filter(visible)
        .map((element) => ({
          selector: element.matches('.hero h1 em')
            ? '.hero h1 em'
            : element.matches('.hero h1 span')
              ? '.hero h1 span'
              : element.tagName.toLowerCase(),
          size: parseFloat(getComputedStyle(element).fontSize),
        }));
      const prose = [...document.querySelectorAll('.hero-lead, .section-intro, .category-description, .discipline-card p')]
        .filter(visible)
        .map((element) => ({ selector: element.className || element.tagName, size: parseFloat(getComputedStyle(element).fontSize) }));
      const tapTargets = [...document.querySelectorAll('.hero-actions a, .menu-toggle, .primary-navigation a, .feature-entry, .nvm-paths a, .discipline-card a, .footer-links a')]
        .filter(visible)
        .map((element) => ({
          text: element.textContent.trim().slice(0, 30),
          height: element.getBoundingClientRect().height,
          kind: element.matches('.hero-actions a, .menu-toggle') ? 'primary' : 'compact',
          fontSize: parseFloat(getComputedStyle(element).fontSize),
          minimumFontSize: element.matches('.hero-actions a')
            ? 10
            : element.matches('.nvm-paths a, .discipline-card a, .footer-links a')
              ? 9
              : 0,
        }));
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
          const color = getComputedStyle(current).backgroundColor;
          const values = color.match(/[\d.]+/g)?.map(Number) ?? [];
          if (values.length >= 3 && (values.length < 4 || values[3] >= 0.98)) return values.slice(0, 3);
          current = current.parentElement;
        }
        return [255, 255, 255];
      };
      const contrastChecks = [
        '.section-kicker',
        '.section-kicker span',
        '.learning-card .category-topline',
        '.learning-card .category-topline span',
        '.hardware-card .category-topline',
        '.hardware-card .category-topline span',
      ].flatMap((selector) =>
        [...document.querySelectorAll(selector)].filter(visible).map((element) => {
          const foreground = parseRgb(getComputedStyle(element).color);
          const background = nearestBackground(element);
          const lighter = Math.max(luminance(foreground), luminance(background));
          const darker = Math.min(luminance(foreground), luminance(background));
          return { selector, ratio: (lighter + 0.05) / (darker + 0.05) };
        }),
      );
      return {
        document: {
          innerWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          scrollHeight: document.documentElement.scrollHeight,
        },
        body: { clientWidth: document.body.clientWidth, scrollWidth: document.body.scrollWidth },
        internalOverflow,
        viewportOverflow,
        imageFailures,
        headingSizes,
        prose,
        tapTargets,
        contrastChecks,
        headerPosition: getComputedStyle(document.querySelector('.site-header')).position,
        reducedMotion: getComputedStyle(document.documentElement).scrollBehavior,
        ownerText: document.querySelector('.identity-copy strong')?.textContent.trim(),
        ownerHeading: document.querySelector('.hero h1 em')?.textContent.trim(),
      };
    });

    if (metrics.document.scrollWidth > width + 1 || metrics.body.scrollWidth > width + 1) {
      failures.push(`${width}px document overflow: ${JSON.stringify({ document: metrics.document, body: metrics.body })}`);
    }
    if (metrics.internalOverflow.length) failures.push(`${width}px internal overflow: ${JSON.stringify(metrics.internalOverflow)}`);
    if (metrics.viewportOverflow.length) failures.push(`${width}px viewport clipping: ${JSON.stringify(metrics.viewportOverflow.slice(0, 12))}`);
    if (metrics.imageFailures.length) failures.push(`${width}px image failures: ${metrics.imageFailures.join(', ')}`);
    if (metrics.ownerText !== 'Sam Huang' || metrics.ownerHeading !== 'Sam Huang') {
      failures.push(`${width}px owner-first identity missing: ${JSON.stringify({ header: metrics.ownerText, hero: metrics.ownerHeading })}`);
    }

    for (const heading of metrics.headingSizes) {
      const max = heading.selector === '.hero h1 em'
        ? (width <= 760 ? 44 : 72)
        : heading.selector === '.hero h1 span'
          ? (width <= 760 ? 30 : 40)
          : heading.selector === 'h2'
            ? (width <= 760 ? 38 : 56)
            : 30;
      if (heading.size > max + 0.5) failures.push(`${width}px ${heading.selector} is too large: ${heading.size}px`);
    }

    if (metrics.prose.some(({ size }) => size < 15)) {
      failures.push(`${width}px primary prose below 15px: ${JSON.stringify(metrics.prose)}`);
    }

    const undersizedTargets = metrics.tapTargets.filter(({ height: targetHeight, kind }) => targetHeight < (kind === 'primary' ? 44 : 36));
    if (undersizedTargets.length) {
      failures.push(`${width}px interactive target below commercial floor: ${JSON.stringify(undersizedTargets)}`);
    }

    const undersizedInteractionType = metrics.tapTargets.filter(({ fontSize, minimumFontSize }) => fontSize < minimumFontSize);
    if (undersizedInteractionType.length) {
      failures.push(`${width}px interaction type below commercial floor: ${JSON.stringify(undersizedInteractionType)}`);
    }

    const lowContrast = metrics.contrastChecks.filter(({ ratio }) => ratio < 4.5);
    if (lowContrast.length) failures.push(`${width}px light-section metadata below 4.5:1 contrast: ${JSON.stringify(lowContrast)}`);

    const maximumPageHeight = width >= 1200 ? 1800 : width >= 761 ? 2150 : 2050;
    if (metrics.document.scrollHeight > maximumPageHeight) {
      failures.push(`${width}px page is not sufficiently condensed: ${metrics.document.scrollHeight}px > ${maximumPageHeight}px`);
    }

    if (metrics.headerPosition !== 'sticky') failures.push(`${width}px header is not sticky`);
    if (metrics.reducedMotion !== 'auto') failures.push(`${width}px reduced motion does not disable smooth scrolling`);
    runtimeErrors.forEach((error) => failures.push(`${width}px ${error}`));

    await page.screenshot({ path: path.join(outputDir, `home-${width}.png`), fullPage: true });

    if (width === 390) {
      const toggle = page.locator('.menu-toggle');
      const accessibleName = await toggle.getAttribute('aria-label');
      if (accessibleName !== '開啟主選單') failures.push(`390px menu accessible name is wrong: ${accessibleName}`);

      await toggle.click();
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') failures.push('390px menu did not open');
      await page.waitForTimeout(50);

      const focusedAfterOpen = await page.evaluate(() => ({
        href: document.activeElement?.getAttribute('href'),
        tag: document.activeElement?.tagName,
        className: document.activeElement?.className,
      }));
      if (focusedAfterOpen.href !== '#work') failures.push(`390px menu focus did not move to first link: ${JSON.stringify(focusedAfterOpen)}`);

      const inertState = await page.evaluate(() => ({
        main: document.querySelector('main')?.hasAttribute('inert'),
        footer: document.querySelector('footer')?.hasAttribute('inert'),
      }));
      if (!inertState.main || !inertState.footer) failures.push(`390px open menu does not isolate background: ${JSON.stringify(inertState)}`);

      await page.screenshot({ path: path.join(outputDir, 'home-390-menu.png'), fullPage: false });
      await page.keyboard.press('Escape');
      if ((await toggle.getAttribute('aria-expanded')) !== 'false') failures.push('390px Escape did not close menu');
      const toggleFocused = await page.evaluate(() => document.activeElement?.classList.contains('menu-toggle'));
      if (!toggleFocused) failures.push('390px Escape did not return focus to menu button');

      await toggle.click();
      await page.locator('.primary-navigation a[href="#work"]').click();
      await page.waitForTimeout(80);
      if (!page.url().endsWith('#work')) failures.push(`390px section jump did not update hash: ${page.url()}`);
      if ((await toggle.getAttribute('aria-expanded')) !== 'false') failures.push('390px menu did not close after section jump');
      const anchorTop = await page.locator('#work').evaluate((element) => element.getBoundingClientRect().top);
      const headerHeight = await page.locator('.site-header').evaluate((element) => element.getBoundingClientRect().height);
      if (anchorTop < headerHeight - 2) failures.push(`390px sticky header obscures #work: top=${anchorTop}, header=${headerHeight}`);
    }

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

console.log(`Rendered homepage QA PASS: ${viewports.length} viewports, owner-first hierarchy, condensed layout, zero overflow/runtime/image/type/menu failures`);
