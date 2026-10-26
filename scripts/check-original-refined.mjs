import {readFile} from 'node:fs/promises';
import {Script,runInNewContext} from 'node:vm';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const base='c389121b424582c8a75f155cab95ef2d33003e55';
const git=file=>execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8'}).replaceAll('\r\n','\n');
const [html,app,palette,css]=await Promise.all(['index.html','app.js','command-palette.js','styles.css'].map(f=>readFile(f,'utf8')));
for(const f of['app.js','command-palette.js','effects.js','audio-engine.js'])new Script(await readFile(f,'utf8'),{filename:f});
const d=runInNewContext(app.split('let currentLang')[0]+';I18N');assert.deepEqual(Object.keys(d.en).sort(),Object.keys(d.zh).sort());
for(const [,key]of html.matchAll(/data-i18n(?:-label)?="([^"]+)"/g)){assert.equal(typeof d.en[key],'string',key);assert.equal(typeof d.zh[key],'string',key);}
for(const value of Object.values(d.en))assert(!/\p{Script=Han}/u.test(value),value);
if(process.argv.includes('--baseline-proof')){
assert(css.replaceAll('\r\n','\n').startsWith(git('styles.css')),'原CSS完整保留，僅追加限定微調');
for(const f of['effects.js','audio-engine.js'])assert.equal((await readFile(f,'utf8')).replaceAll('\r\n','\n'),git(f),'保留原互動引擎');
assert.equal(await readFile('assets/luminous-wafer-bg.jpg').then(b=>b.toString('base64')),execFileSync('git',['show',`${base}:assets/luminous-wafer-bg.jpg`]).toString('base64'));
}
const baseLinks=[["01", "https://hub.samhuang68.org/"], ["02", "https://arcade.samhuang68.org/"], ["03", "https://learn.samhuang68.org/"], ["04", "https://hardware.samhuang68.org/"], ["05", "https://github.com/SamHuang68/secure-storage-oip-briefing"], ["06", "https://github.com/SamHuang68/tw-pulse-terminal"], ["07", "https://samhuang68.github.io/semiconductor-knowledge-hub/"], ["08", "https://koei-portrait-archive.samhuang68.chatgpt.site"], ["09", "https://guangxi-studio.samhuang68.workers.dev/"], ["10", "https://d2r.samhuang68.org/"]];
const links=[...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*data-node="(\d+)"[^>]*>/g)].map(m=>[m[2],m[1]]).sort();assert.equal(links.length,10);assert.deepEqual(links,baseLinks);
const expected={professional:['01','07','03','04'],leisure:['09','02','10']};for(const [id,ids]of Object.entries(expected)){const part=html.match(new RegExp(`<section class="project-group" id="${id}"[\\s\\S]*?</section>`))[0];assert.deepEqual([...part.matchAll(/data-node="(\d+)"/g)].map(m=>m[1]),ids);}
assert(html.includes('<html lang="en" data-lang="en"'));assert(!/<span class="node-serial">NODE/.test(html));
const title=html.match(/<title>(.*?)<\/title>/)[1];assert(!/Sam Huang|samhuang|\bSH\b/i.test(title));
const stack=[],voids=new Set(['meta','link','img','br','input','hr','source','wbr']);for(const [full,tag]of html.matchAll(/<\/?([a-z][\w-]*)(?:\s+[^>]*?)?\/?\s*>/gi)){if(full.startsWith('</'))assert.equal(stack.pop(),tag);else if(!voids.has(tag)&&!full.endsWith('/>'))stack.push(tag);}assert.equal(stack.length,0);
const p=JSON.parse(await readFile('package.json','utf8')),l=JSON.parse(await readFile('package-lock.json','utf8'));assert.equal(p.version,'3.4.1-preview.1');assert.equal(l.version,p.version);assert.equal(l.packages[''].version,p.version);assert(html.includes(`data-version="${p.version}"`));
console.log('分類、10個原URL、HTML／JS語法、雙語與版本核對通過。');if(process.argv.includes('--baseline-proof'))console.log('原作CSS／背景／兩個互動引擎完整保留。');
