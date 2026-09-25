/**
 * @fileoverview 8D Prevention Counter-Method Gate (check-home.mjs)
 * Enforces:
 * 1. Zero UTF-8 Mojibake / encoding corruption across HTML, CSS, JS (Gotcha 0003)
 * 2. Strict HTML tag closure balance
 * 3. Mandatory Light/Pale Theme & Non-Flat Ambient Background (Rule 0003)
 * 4. 6 Core Project Nodes & 100% Bilingual i18n Dictionary Coverage
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const css = await readFile(path.join(root, 'styles.css'), 'utf8');
const js = await readFile(path.join(root, 'app.js'), 'utf8');

const failures = [];
const fail = (msg) => failures.push(msg);

// 1. [8D Counter-Method] UTF-8 Mojibake & Encoding Integrity Gate
const mojibakeRegex = /(\uFFFD|\?\?[a-zA-Z<\u4e00-\u9fa5]|[\u0080-\u009F]|ï¿½|\?|\?|\?€)/g;
for (const [name, content] of [['index.html', html], ['styles.css', css], ['app.js', js]]) {
  const matches = content.match(mojibakeRegex);
  if (matches) {
    fail(`[Encoding Gate] Mojibake or corrupted UTF-8 sequence detected in ${name}: ${matches.slice(0, 5).join(', ')}`);
  }
}

// 2. [8D Counter-Method] HTML Tag Closure Balance Gate
const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const tagRegex = /<\/?([a-zA-Z0-9\-]+)(?:\s+[^>]*?)?(\/?)>/g;
const tagStack = [];
let tMatch;
while ((tMatch = tagRegex.exec(html)) !== null) {
  const full = tMatch[0];
  const tagName = tMatch[1].toLowerCase();
  if (full.startsWith('<!--') || full.startsWith('<!doctype')) continue;
  const isClosing = full.startsWith('</');
  const isSelfClosing = full.endsWith('/>') || tMatch[2] === '/' || voidTags.has(tagName);

  if (isClosing) {
    if (tagStack.length === 0) {
      fail(`[HTML Gate] Unexpected closing tag </${tagName}> at offset ${tMatch.index}`);
    } else {
      const top = tagStack.pop();
      if (top.name !== tagName) {
        fail(`[HTML Gate] Mismatched closing tag: expected </${top.name}> but found </${tagName}> at offset ${tMatch.index}`);
      }
    }
  } else if (!isSelfClosing) {
    tagStack.push({ name: tagName, index: tMatch.index });
  }
}
if (tagStack.length > 0) {
  fail(`[HTML Gate] Unclosed tags remaining: ${tagStack.map((t) => t.name).join(', ')}`);
}

// 3. [Rule 0003 Gate] Mandatory Light Theme & Zero Dark Remnants
if (html.includes('class="dark"') || css.includes('color-scheme: dark')) {
  fail('[Rule 0003 Gate] Prohibited dark theme declaration detected.');
}
if (!html.includes('class="light-mode"') || !css.includes('color-scheme: light')) {
  fail('[Rule 0003 Gate] Missing mandatory light-mode class or color-scheme: light declaration.');
}
if (!css.includes('--bg-canvas: #f8fafc')) {
  fail('[Rule 0003 Gate] Missing light platinum canvas token (--bg-canvas: #f8fafc).');
}

// 4. [Rule 0003 Gate] Rich Non-Flat Ambient Background Verification
for (const selector of ['.ambient-layer', '.aurora-orb', '.circuit-grid-pattern', '.wafer-radial-sheen', '#silicon-canvas']) {
  const token = selector.replace(/^[.#]/, '');
  if (!html.includes(token)) {
    fail(`[Ambient Gate] Missing non-flat background element in HTML: ${selector}`);
  }
}

// 5. Core 6 Project Nodes & Bilingual i18n Parity Gate
for (const nodeId of ['01', '02', '03', '04', '05', '06']) {
  if (!html.includes(`data-node="${nodeId}"`)) {
    fail(`[Node Gate] Missing project node card: NODE-${nodeId}`);
  }
}

const htmlI18nKeys = new Set([...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]));
for (const key of htmlI18nKeys) {
  if (!js.includes(`${key}:`)) {
    fail(`[i18n Gate] Key "${key}" used in HTML is missing from app.js I18N dictionary.`);
  }
}

if (failures.length > 0) {
  console.error('❌ 8D Pre-Push Quality Gate FAILED:');
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}

console.log(`✅ 8D Pre-Push Quality Gate PASS: UTF-8 clean, HTML balanced, Light-Theme enforced, Ambient layers verified, ${htmlI18nKeys.size} i18n keys matched.`);
