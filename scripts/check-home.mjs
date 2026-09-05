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

const ids = [...html.matchAll(/(?:^|\s)id="([^"]+)"/g)].map((match) => match[1]);
const idSet = new Set(ids);
if (idSet.size !== ids.length) fail('duplicate ids found');

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
  ['header identity', /class="identity-copy"[^>]*>[\s\S]*?<strong>Sam Huang<\/strong>/i],
  ['portal owner', /<h1[^>]*>[\s\S]*?<em>Sam Huang<\/em>/i],
  ['footer identity', /class="footer-brand"[^>]*>[\s\S]*?<strong>Sam Huang<\/strong>/i],
];

for (const [label, pattern] of ownerSignals) {
  if (!pattern.test(html)) fail(`owner-first signal missing: ${label}`);
}

const requiredDestinations = [
  'https://samhuang68.github.io/nvm-knowledge-hub/',
  'https://github.com/SamHuang68/secure-storage-oip-briefing',
  'https://samhuang68.github.io/chu-han-realm-pages/',
  'https://samhuang68.github.io/E-Learning/',
  'https://github.com/SamHuang68/tw-pulse-terminal',
  'https://samhuang68.github.io/my-hardware/',
];

for (const destination of requiredDestinations) {
  if (!html.includes(`href="${destination}"`)) fail(`required destination is missing: ${destination}`);
}

const cards = [...html.matchAll(/<a\b([^>]*class="[^"]*portal-card[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi)];
if (cards.length !== 6) fail(`expected 6 full-card anchors, found ${cards.length}`);

for (const [index, card] of cards.entries()) {
  const attributes = card[1];
  const content = card[2];
  if (!/href="[^"]+"/i.test(attributes)) fail(`portal card ${index + 1} has no href`);
  if (!/aria-label="[^"]+"/i.test(attributes)) fail(`portal card ${index + 1} has no accessible name`);
  if (/<(?:a|button|input|select|textarea)\b/i.test(content)) fail(`portal card ${index + 1} contains a nested interactive element`);
  if (!/class="availability\s+availability--(?:live|source)"/i.test(content)) fail(`portal card ${index + 1} has no availability status`);
  if (!/class="card-enter"/i.test(content)) fail(`portal card ${index + 1} has no action label`);
}

const liveCount = cards.filter(([, content]) => /portal-card--live/i.test(content)).length;
const sourceCount = cards.filter(([, content]) => /portal-card--source/i.test(content)).length;
if (liveCount !== 4) fail(`expected 4 runnable cards, found ${liveCount}`);
if (sourceCount !== 2) fail(`expected 2 source-only cards, found ${sourceCount}`);

if (!html.includes('可執行網站 · LIVE WEB')) fail('runnable web label is missing');
if (!html.includes('僅 Git 專案 · SOURCE ONLY')) fail('source-only label is missing');
if (!html.includes('sam-huang-portfolio-architecture-v2.webp')) fail('approved architecture artwork is not referenced');
if (html.includes('sam-huang-portfolio-atelier-v1')) fail('rejected desk-prop artwork must not be referenced');

const forbiddenPrivateRepositories = ['AI_Stock', 'agent-hive-bridge', 'chu-han-realm"', 'SengokuStrategy', 'HeroesOfTheLake"'];
for (const repository of forbiddenPrivateRepositories) {
  if (html.includes(`github.com/SamHuang68/${repository}`)) fail(`private repository exposed: ${repository}`);
}

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

if (/body\s*\{[^}]*min-width\s*:\s*3(?:1[3-9]|[2-9]\d)px/is.test(css)) fail('body declares a minimum width above the 312px viewport');
if (!css.includes(':focus-visible')) fail('focus-visible treatment is missing');
if (!css.includes('prefers-reduced-motion')) fail('reduced-motion treatment is missing');
if (!/\.portal-card\s*\{[\s\S]*?display:\s*grid;/i.test(css)) fail('portal card is not a full-frame grid anchor');
if (!/\.portal-card\s*\{[\s\S]*?min-height:\s*1(?:5[0-9]|[6-9][0-9]|[2-9][0-9]{2})px/i.test(css)) fail('portal card lacks a substantial full-frame target');
if (!js.includes("querySelectorAll('.portal-card')")) fail('portal touch feedback enhancement is missing');
if (!js.includes("querySelector('[data-current-year]')")) fail('current-year enhancement is missing');

if (failures.length) {
  console.error('Homepage integrity check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Homepage integrity PASS: ${cards.length} full-card portals, ${liveCount} runnable sites, ${sourceCount} source-only repositories, ${localAssets.size} local assets`);
