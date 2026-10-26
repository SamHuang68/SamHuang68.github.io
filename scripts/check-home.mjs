import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import assert from 'node:assert/strict';

const html = await readFile('index.html', 'utf8');
const css = await readFile('styles.css', 'utf8');
const app = await readFile('app.js', 'utf8');
const palette = await readFile('command-palette.js', 'utf8');
const audio = await readFile('audio-engine.js', 'utf8');
for (const [name, source] of [['app.js',app],['command-palette.js',palette],['audio-engine.js',audio]]) new Script(source, { filename: name });
for (const source of [html,css,app,palette]) assert(!/[\uFFFD\u0080-\u009f]/u.test(source), 'UTF-8 編碼須完整');
const dictionaries = JSON.parse(app.match(/const I18N = ([\s\S]+?);\r?\nfunction/)[1]);
assert.deepEqual(Object.keys(dictionaries.zh), Object.keys(dictionaries.en), '中英詞典鍵須一致');
for (const [, key] of html.matchAll(/data-i18n(?:-label|-alt)?="([^"]+)"/g)) {
  assert.equal(typeof dictionaries.zh[key], 'string', `繁中詞典缺少 ${key}`);
  assert.equal(typeof dictionaries.en[key], 'string', `英文詞典缺少 ${key}`);
}
for (const value of Object.values(dictionaries.en)) assert(!/\p{Script=Han}/u.test(value), '英文詞典不可混入中文');
const stack=[];
const voids=new Set(['meta','link','img','br','input','hr','source','wbr']);
for(const [full,tag] of html.matchAll(/<\/?([a-z][\w-]*)(?:\s+[^>]*?)?\/?\s*>/gi)) {
  if (full.startsWith('</')) assert.equal(stack.pop(),tag,`HTML 結構不平衡：${tag}`);
  else if (!voids.has(tag) && !full.endsWith('/>')) stack.push(tag);
}
assert.equal(stack.length,0,'HTML 必須完整閉合');
const pkg=JSON.parse(await readFile('package.json','utf8'));
const lock=JSON.parse(await readFile('package-lock.json','utf8'));
assert.equal(pkg.version,'3.2.0');assert.equal(lock.version,pkg.version);assert.equal(lock.packages[''].version,pkg.version);
for (const filename of ['styles.css','audio-engine.js','app.js','command-palette.js']) assert(html.includes(`${filename}?v=${pkg.version}`));
assert(css.includes('prefers-reduced-motion:reduce'));
assert(!html.includes('effects.js'),'首頁不可載入原霓虹動態效果');
const expected = new Map([
 ['01','https://hub.samhuang68.org/'], ['07','https://samhuang68.github.io/semiconductor-knowledge-hub/'],
 ['03','https://learn.samhuang68.org/'], ['04','https://hardware.samhuang68.org/'],
 ['09','https://guangxi-studio.samhuang68.workers.dev/'], ['02','https://arcade.samhuang68.org/'], ['10','https://d2r.samhuang68.org/'],
 ['05','https://github.com/SamHuang68/secure-storage-oip-briefing'], ['06','https://github.com/SamHuang68/tw-pulse-terminal'], ['08','https://koei-portrait-archive.samhuang68.chatgpt.site']
]);
for(const match of html.matchAll(/<a\b[^>]*data-node="(\d+)"[^>]*>/g)) {
  const url=match[0].match(/href="([^"]+)"/)[1];assert.equal(url,expected.get(match[1])); expected.delete(match[1]);
}
assert.equal(expected.size,0,'十個原有目的網址皆須保留');
for(const [,src] of html.matchAll(/(?:src|href)="((?:assets|fonts)\/[^"?]+)(?:\?[^"]*)?"/g)) await readFile(src);
console.log(`首頁結構、十個目的網址、${Object.keys(dictionaries.en).length} 組雙語鍵、腳本語法與版本一致性通過。`);

assert(html.includes('lang="en" data-lang="en" data-language="en"'), '基礎 HTML 必須為英文');
assert(html.includes('data-version="3.2.0"'));
assert(!/Sam Huang|samhuang|\bSH\b/i.test(html.match(/<title>(.*?)<\/title>/)[1]), '頁面標題不可有姓名');
