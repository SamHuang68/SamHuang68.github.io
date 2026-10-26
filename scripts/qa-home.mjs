// 首頁限定案例：不導覽任何子站、不登入私人入口。
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=process.cwd(),out=process.env.PORTAL_EVIDENCE_DIR||path.join(root,'qa','home-renders');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))throw Error('範圍外');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${server.address().port}/`;
const report={version:'3.2.0',started:new Date().toISOString(),checks:[],errors:[],screenshots:[],scope:'首頁桌面／手機中英、英文初始狀態與既有互動；未開啟目的站'};
const browser=await chromium.launch({headless:true});report.browser=browser.version();
const check=async(name,fn)=>{await fn();report.checks.push({name,result:'通過'});};
const makeContext=async options=>{const c=await browser.newContext({reducedMotion:'reduce',...options});await c.route('**/*',r=>new URL(r.request().url()).origin===new URL(url).origin?r.continue():(report.errors.push('非首頁請求 '+r.request().url()),r.abort()));return c;};
const key='portal_language_choice_v1';let page;
const privacy=async p=>{
 const findings=await p.evaluate(()=>{
  const name=/sam\s*huang|samhuang|\bsh\b/i,han=/\p{Script=Han}/u,en=document.documentElement.lang==='en',hits=[];
  if(name.test(document.title))hits.push('title');
  for(const meta of document.querySelectorAll('meta[content]'))if(meta.getAttribute('property')!=='og:url'&&name.test(meta.content))hits.push('meta '+meta.content);
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);while(w.nextNode()){
   const n=w.currentNode,el=n.parentElement;if(!el||el.closest('script,style,noscript'))continue;
   if(!el.closest('#contact')&&(name.test(n.textContent)||/https?:\/\//.test(n.textContent)))hits.push(n.textContent);
   const r=document.createRange();r.selectNodeContents(n);if(en&&[...r.getClientRects()].some(b=>b.width&&b.height)&&getComputedStyle(el).visibility!=='hidden'&&han.test(n.textContent))hits.push('EN '+n.textContent);
  }
  for(const el of document.querySelectorAll('[aria-label],[alt],[title],[placeholder]'))for(const attr of ['aria-label','alt','title','placeholder']){const t=el.getAttribute(attr)||'';if((!el.closest('#contact')&&name.test(t))||(en&&han.test(t)))hits.push(attr+' '+t);}
  return hits;
 });assert.deepEqual(findings,[]);assert.equal(await p.locator('#contact').getByText('Sam Huang',{exact:true}).count(),1);assert.equal(await p.locator('a[href="https://github.com/SamHuang68"]').count(),1);
};
const layout=async p=>{const d=await p.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,clips:[...document.querySelectorAll('[data-i18n]')].filter(el=>!el.closest('.sr-only')&&el.getClientRects().length&&el.clientWidth&&el.scrollWidth>el.clientWidth+2).map(el=>el.dataset.i18n)}));assert(d.scroll<=d.width+1,JSON.stringify(d));assert.deepEqual(d.clips,[]);};
const settle=async p=>{for(const img of await p.locator('img').all())if(await img.isVisible()){await img.scrollIntoViewIfNeeded();await img.evaluate(el=>el.decode());}await p.evaluate(async()=>{await document.fonts.ready;document.activeElement?.blur();scrollTo({top:0,behavior:'instant'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});};
try{
 const context=await makeContext({locale:'zh-TW'});page=await context.newPage();page.setDefaultTimeout(6000);page.on('pageerror',e=>report.errors.push(e.message));
 await page.goto(url);
 if(!process.argv.includes('--remaining')) {
 await check('中文瀏覽器首次進入為英文，初始化不寫入偏好',async()=>{assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.evaluate(k=>localStorage.getItem(k),key),null);await privacy(page);});
 const expected={nvm:'https://hub.samhuang68.org/',semi:'https://samhuang68.github.io/semiconductor-knowledge-hub/',learn:'https://learn.samhuang68.org/',hardware:'https://hardware.samhuang68.org/',studio:'https://guangxi-studio.samhuang68.workers.dev/',arcade:'https://arcade.samhuang68.org/',d2r:'https://d2r.samhuang68.org/',oip:'https://github.com/SamHuang68/secure-storage-oip-briefing',pulse:'https://github.com/SamHuang68/tw-pulse-terminal',portrait:'https://koei-portrait-archive.samhuang68.chatgpt.site'};
 await check('七公開與三私人入口精確保留、Contact 唯一個人入口',async()=>{const links=await page.locator('[data-project],[data-private]').evaluateAll(es=>es.map(e=>[e.dataset.project||e.dataset.private,e.getAttribute('href')]));assert.equal(links.length,10);assert.deepEqual(Object.fromEntries(links),expected);assert.equal(await page.locator('a[href="https://github.com/SamHuang68"]').evaluate(e=>!!e.closest('#contact')),true);});
 for(const [device,width,height]of[['desktop',1440,1000],['mobile',390,844]])for(const lang of ['en','zh']){
  const label=`${device}-${lang}`;await page.setViewportSize({width,height});await page.goto(`${url}?lang=${lang}`);await settle(page);
  await check(`${label} 語言、可及文字、尺寸與圖片`,async()=>{assert.equal(await page.locator('html').getAttribute('lang'),lang==='en'?'en':'zh-Hant');assert.equal(await page.locator('html').getAttribute('data-language'),lang);await privacy(page);await layout(page);assert.equal(await page.locator('.nvm-evidence [data-evidence]').evaluate(el=>el.classList.contains('evidence-crop')),lang==='en');});
  for(const fullPage of [false,true]){const f=path.join(out,`${label}${fullPage?'':'-hero'}.png`);await page.screenshot({path:f,fullPage,animations:'disabled'});report.screenshots.push(f);}
  await check(`${label} 四區導覽與舊錨點`,async()=>{for(const id of ['case-nvm','selected','explore','contact']){await page.locator(`nav a[href="#${id}"]`).click();const b=await page.locator(`#${id}`).boundingBox();assert(b.y<height&&b.y+b.height>0);}for(const id of ['hero','projects','knowledge','engineering','creative','about','philosophy'])assert.equal(await page.locator(`#${id}`).count(),1);});
  await check(`${label} 私人收合鍵盤與完整警語`,async()=>{const details=page.locator('.private-work');assert.equal(await details.evaluate(e=>e.open),false);await details.locator('summary').focus();await page.keyboard.press('Enter');const t=await details.innerText();for(const s of lang==='en'?['Access required','simulated-data','separate from the current Stock Terminal','No live market data']:['需存取權限','模擬資料','非目前 Stock Terminal','沒有真實行情'])assert(t.includes(s));await layout(page);await privacy(page);await page.keyboard.press('Enter');assert.equal(await details.evaluate(e=>e.open),false);});
  await check(`${label} 圖片放大、模態與焦點復原`,async()=>{const opener=page.locator('[data-evidence]').first();await opener.click();assert(await page.locator('.evidence-dialog').evaluate(e=>e.open&&e.matches(':modal')));await privacy(page);await page.keyboard.press('Tab');assert(await page.evaluate(()=>!!document.activeElement.closest('.evidence-dialog')));await page.keyboard.press('Escape');assert(await opener.evaluate(e=>e===document.activeElement));});
 }
 await check('切換英文後已關閉的圖片對話框同步語言',async()=>{await page.locator('[data-target-lang="en"]').click();await privacy(page);});
 await check('手動偏好持久化；query 不產生偏好且手動切換可取代 query',async()=>{
  await page.goto(`${url}?lang=en`);await page.locator('[data-target-lang="zh"]').click();assert(!new URL(page.url()).searchParams.has('lang'));assert.deepEqual(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)),key),{language:'zh',source:'explicit'});await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'zh-Hant');await page.locator('[data-target-lang="en"]').click();await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'en');
 });
 } else { await page.setViewportSize({width:390,height:844});report.reused='首輪20項、四組畫面沿用本輪 initial-20.json；只補驗尚未執行的互動及語言邊界。'; }
 if(!process.argv.includes('--after-interaction')) {
 await check('快速導覽十入口、三設定、雙語描述搜尋及私人警語',async()=>{
  await page.locator('#commandTrigger').click();assert.equal(await page.locator('.cmd-item').count(),13);assert(await page.locator('#cmdPaletteInput').evaluate(e=>e===document.activeElement));await page.locator('#cmdPaletteInput').fill('模擬資料');assert.equal(await page.locator('.cmd-item').count(),1);assert((await page.locator('.cmd-item').innerText()).includes('Access required'));assert((await page.locator('.cmd-item').innerText()).includes('No live market data'));for(const query of ['PUF','spaced repetition','編曲']){await page.locator('#cmdPaletteInput').fill(query);assert.equal(await page.locator('.cmd-item').count(),1,query);}
  await page.locator('#cmdPaletteInput').fill('不存在項目xyz');assert.equal(await page.locator('.cmd-item').count(),0);assert((await page.locator('#cmdPaletteStatus').innerText()).includes('No matching'));await page.keyboard.press('Escape');assert(await page.locator('#commandTrigger').evaluate(e=>e===document.activeElement));
 });
 await check('快速導覽鍵盤、模態、語言與單色設定',async()=>{
  await page.keyboard.press('Control+k');assert(await page.locator('#commandPaletteModal').evaluate(e=>e.matches(':modal')));await page.keyboard.press('Tab');assert(await page.locator('.cmd-palette-close').evaluate(e=>e===document.activeElement));await page.keyboard.press('Tab');assert(await page.locator('#cmdPaletteInput').evaluate(e=>e===document.activeElement));await page.locator('#cmdPaletteInput').fill('layer');await page.keyboard.press('Enter');assert(await page.locator('body').evaluate(e=>e.classList.contains('xray-mode')));assert((await page.locator('.nvm-evidence img').evaluate(e=>getComputedStyle(e).filter)).includes('grayscale'));
  await page.keyboard.press('Control+k');await page.locator('#cmdPaletteInput').fill('layer');await page.keyboard.press('Enter');await page.keyboard.press('Control+k');await page.locator('#cmdPaletteInput').fill('Switch language');await page.keyboard.press('Enter');assert.equal(await page.locator('html').getAttribute('lang'),'zh-Hant');await page.locator('[data-target-lang="en"]').click();
  await page.keyboard.press('Control+k');await page.keyboard.press('ArrowDown');assert.equal(await page.locator('.cmd-item[aria-selected="true"]').count(),1);assert(await page.locator('#cmdPaletteInput').getAttribute('aria-activedescendant'));await page.keyboard.press('Escape');
 });
 await check('音效預設靜音與可切換狀態',async()=>{assert.equal(await page.evaluate(()=>SiliconAudio.isEnabled()),false);await page.locator('#commandTrigger').click();await page.locator('#cmdPaletteInput').fill('sounds');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>SiliconAudio.isEnabled()),true);await page.locator('#commandTrigger').click();await page.locator('#cmdPaletteInput').fill('sounds');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>SiliconAudio.isEnabled()),false);});
 await check('reduced motion 與窄螢幕 320px',async()=>{await page.setViewportSize({width:320,height:844});await layout(page);assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);});
 }
 await check('200% 文字放大無水平溢出',async()=>{await page.setViewportSize({width:1440,height:1000});await page.evaluate(()=>[...document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,summary,figcaption')].map(e=>[e,parseFloat(getComputedStyle(e).fontSize)]).forEach(([e,size])=>{e.style.fontSize=size*2+'px';}));await layout(page);});
 await context.close();
 for(const [name,stored]of[['舊版自動繁中',null],['損壞 JSON','{broken'],['非法語系',JSON.stringify({language:'fr',source:'explicit'})],['沒有明確選擇標記',JSON.stringify({language:'zh'})],['明確保存繁中',JSON.stringify({language:'zh',source:'explicit'})]]){
  await check(`${name} 初始化`,async()=>{const c=await makeContext({locale:'zh-TW'});await c.addInitScript(({key,stored})=>{localStorage.setItem('sh_portal_lang','zh');if(stored!==null)localStorage.setItem(key,stored);},{key,stored});const p=await c.newPage();await p.goto(url);assert.equal(await p.locator('html').getAttribute('lang'),name==='明確保存繁中'?'zh-Hant':'en');assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),stored);await c.close();});
 }
 await check('query 優先於明確偏好、初始化不寫入',async()=>{const c=await makeContext();await c.addInitScript(k=>localStorage.setItem(k,JSON.stringify({language:'zh',source:'explicit'})),key);const p=await c.newPage();await p.goto(`${url}?lang=en`);assert.equal(await p.locator('html').getAttribute('lang'),'en');assert.equal(await p.evaluate(k=>JSON.parse(localStorage.getItem(k)).language,key),'zh');await c.close();});
 await check('儲存受阻時預設英文、手動切換仍可用',async()=>{const c=await makeContext({locale:'zh-TW'});await c.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));const p=await c.newPage();await p.goto(url);assert.equal(await p.locator('html').getAttribute('lang'),'en');await p.locator('[data-target-lang="zh"]').click();assert.equal(await p.locator('html').getAttribute('lang'),'zh-Hant');await p.reload();assert.equal(await p.locator('html').getAttribute('lang'),'en');await privacy(p);await c.close();});
 await check('無 JavaScript 的完整英文 HTML 與私人原生收合',async()=>{const c=await makeContext({javaScriptEnabled:false,locale:'zh-TW'});const p=await c.newPage();await p.goto(url);await privacy(p);assert.equal(await p.locator('html').getAttribute('lang'),'en');assert.equal(await p.locator('html').getAttribute('data-language'),'en');assert(!(await p.locator('meta[name="description"]').getAttribute('content')).match(/\p{Script=Han}/u));assert.equal(await p.locator('[data-project],[data-private]').count(),10);assert((await p.locator('[data-i18n="nvmOutcome"]').innerText()).length>20);await p.locator('.private-work summary').click();assert(await p.locator('.private-work').evaluate(e=>e.open));assert((await p.locator('.private-work').innerText()).includes('No live market data'));await c.close();});
 assert.deepEqual(report.errors,[]);report.status='通過';
}catch(e){report.status='失敗';report.errors.push(e.stack||e.message);process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});}
finally{await browser.close();await new Promise(r=>server.close(r));report.finished=new Date().toISOString();await writeFile(path.join(out,'結果.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,checks:report.checks.length,errors:report.errors,evidence:out}));}
