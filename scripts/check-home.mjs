import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const css = await readFile(path.join(root, 'styles.css'), 'utf8');
const js = await readFile(path.join(root, 'site.js'), 'utf8');
const failures = [];

const fail = (message) => failures.push(message);
const stripMarkup = (value) => value.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();

if (!/<html\s+lang="zh-Hant"/i.test(html)) fail('html lang must be zh-Hant');

const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
if (h1s.length !== 1) fail(`expected one h1, found ${h1s.length}`);

const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((match) => ({
  level: Number(match[1]),
  text: stripMarkup(match[2]),
}));

for (let index = 1; index < headings.length; index += 1) {
  if (headings[index].level > headings[index - 1].level + 1) {
    fail(`heading level jumps from h${headings[index - 1].level} to h${headings[index].level}: ${headings[index].text}`);
  }
}

for (const heading of headings) {
  if (/[。.!?！？]$/.test(heading.text)) fail(`display heading ends with sentence punctuation: ${heading.text}`);
}

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
const idSet = new Set(ids);
if (idSet.size !== ids.length) {
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  fail(`duplicate ids: ${[...new Set(duplicates)].join(', ')}`);
}

for (const match of html.matchAll(/href="#([^"]+)"/g)) {
  if (!idSet.has(match[1])) fail(`missing local anchor target: #${match[1]}`);
}

for (const match of html.matchAll(/<section\b[^>]*aria-labelledby="([^"]+)"[^>]*>/gi)) {
  if (!idSet.has(match[1])) fail(`section aria-labelledby target missing: ${match[1]}`);
}

for (const match of html.matchAll(/<a\b([^>]*target="_blank"[^>]*)>/gi)) {
  if (!/rel="[^"]*noopener[^"]*noreferrer[^"]*"/i.test(match[1])) {
    fail(`target=_blank link is missing noopener noreferrer: ${stripMarkup(match[0])}`);
  }
}

const ownerSignals = [
  ['document title', /<title>Sam Huang｜/i],
  ['Open Graph site name', /property="og:site_name"\s+content="Sam Huang"/i],
  ['header identity', /class="identity-copy"[\s\S]*?<strong>Sam Huang<\/strong>/i],
  ['hero owner', /<h1[^>]*>[\s\S]*?<em>Sam Huang<\/em>/i],
  ['footer identity', /class="footer-brand"[\s\S]*?<strong>Sam Huang<\/strong>/i],
];

for (const [label, pattern] of ownerSignals) {
  if (!pattern.test(html)) fail(`owner-first signal missing: ${label}`);
}

const forbiddenRootSignals = [
  ['NVM document title', /<title>\s*NVM/i],
  ['NVM Open Graph site name', /property="og:site_name"\s+content="NVM/i],
  ['NVM header owner', /class="identity-copy"[\s\S]{0,180}<strong>NVM<\/strong>/i],
  ['NVM footer owner', /class="footer-brand"[\s\S]{0,180}<strong>NVM/i],
];

for (const [label, pattern] of forbiddenRootSignals) {
  if (pattern.test(html)) fail(`NVM must remain a category, not the homepage owner: ${label}`);
}

const requiredCategories = [
  'NVM &amp; SEMICONDUCTOR',
  'STRATEGY &amp; GAMES',
  'LEARNING',
  'DATA INTERFACES',
  'HARDWARE &amp; TOOLS',
];

for (const category of requiredCategories) {
  if (!html.includes(category)) fail(`required top-level category is missing: ${stripMarkup(category)}`);
}

const requiredDestinations = [
  'https://samhuang68.github.io/secure-storage-knowledge-hub/',
  'https://samhuang68.github.io/secure-storage-knowledge-hub/secure-storage.html',
  'https://samhuang68.github.io/secure-storage-knowledge-hub/ai-nvm-opportunities.html',
  'https://samhuang68.github.io/nvm-whitepaper-site/',
  'https://samhuang68.github.io/chu-han-realm-pages/',
  'https://samhuang68.github.io/E-Learning/',
  'https://github.com/SamHuang68/tw-pulse-terminal',
  'https://samhuang68.github.io/my-hardware/',
  'https://github.com/SamHuang68/quick-archimedes',
];

for (const destination of requiredDestinations) {
  if (!html.includes(`href="${destination}"`)) fail(`required destination is missing: ${destination}`);
}

const nvmFeature = html.match(/<article\s+class="category-card nvm-feature">([\s\S]*?)<\/article>/i)?.[1] ?? '';
for (const destination of requiredDestinations.slice(0, 4)) {
  if (!nvmFeature.includes(`href="${destination}"`)) fail(`NVM destination must remain nested inside the NVM category: ${destination}`);
}

if (!html.includes('sam-huang-portfolio-architecture-v2.webp')) fail('approved owner-level hero artwork is not referenced');
if (html.includes('sam-huang-portfolio-atelier-v1')) fail('rejected desk-prop hero artwork must not be referenced');

const localAssets = new Set();
for (const match of html.matchAll(/(?:src|href)="\.\/([^"#?]+)"/g)) localAssets.add(match[1]);
for (const asset of localAssets) {
  const resolved = path.resolve(root, asset);
  if (!resolved.startsWith(root)) {
    fail(`asset escapes repository root: ${asset}`);
    continue;
  }
  try {
    await access(resolved);
    const info = await stat(resolved);
    if (!info.isFile() || info.size === 0) fail(`asset is empty or not a file: ${asset}`);
  } catch {
    fail(`local asset is missing: ${asset}`);
  }
}

if (/body\s*\{[^}]*min-width\s*:\s*3(?:1[3-9]|[2-9]\d)px/is.test(css)) {
  fail('body declares a minimum width above the 312px acceptance viewport');
}

if (!css.includes(':focus-visible')) fail('global focus-visible treatment is missing');
if (!css.includes('prefers-reduced-motion')) fail('reduced-motion treatment is missing');
if (!html.includes('class="menu-toggle"')) fail('accessible mobile menu control is missing');
if (!/class="menu-toggle"[\s\S]{0,180}aria-label="開啟主選單"/.test(html)) fail('mobile menu control needs a persistent accessible name');
if (!html.includes('class="skip-link"')) fail('skip link is missing');
if (!js.includes("setAttribute('inert', '')")) fail('mobile navigation must make background regions inert');
if (!js.includes("event.key !== 'Tab'")) fail('mobile navigation focus containment is missing');

if (failures.length) {
  console.error('Homepage integrity check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(
  `Homepage integrity PASS: owner-first identity, ${requiredCategories.length} categories, ${requiredDestinations.length} destinations, ${localAssets.size} local assets`,
);
