// 僅限此首頁：不導覽目的站、不登入、不執行全專案測試。
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.cwd();
const out=process.env.PORTAL_EVIDENCE_DIR || path.join(root,'qa','home-renders');
await mkdir(out,{recursive:true});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{try {const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)) throw Error('範圍外');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));}catch{res.writeHead(404).end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url=`http://127.0.0.1:${server.address().port}/`;
const browser=await chromium.launch({headless:true});
const records=[];const failures=[];
const check=async(name,action)=>{try{await action();records.push({case:name,result:'通過'});}catch(e){failures.push({case:name,error:e.message});}};
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const errors=[];const requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`);});page.on('request',r=>requests.push(r.url()));
 await page.goto(url,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 await check('七公開與三私人入口及分類順序',async()=>{
  assert.deepEqual(await page.locator('.project-card').evaluateAll(xs=>xs.map(x=>x.dataset.node)),['01','07','03','04','09','02','10']);
  assert.deepEqual(await page.locator('.private-workspace [data-node]').evaluateAll(xs=>xs.map(x=>x.dataset.node)),['05','06','08']);
  assert.equal(await page.locator('.private-workspace').getAttribute('open'),null);
  for(const card of await page.locator('.project-card').all()) assert((await card.locator('.tags li').count())<=3);
  assert(!/NODE[-:]|Engines|Project Nodes/.test(await page.locator('body').innerText()));
  assert.equal(await page.locator('.hero-actions a').first().getAttribute('href'),'#knowledge');
  assert.equal(await page.locator('.hero-actions a').last().getAttribute('href'),'#projects');
 });
 await check('所有頁內導覽有實際目標',async()=>{for(const href of await page.locator('a[href^="#"]').evaluateAll(xs=>xs.map(x=>x.getAttribute('href')))) assert.equal(await page.locator(href).count(),1,href);await page.locator('.main-nav a[href="#engineering"]').click();assert.equal(await page.evaluate(()=>location.hash),'#engineering');await page.locator('.back-top').click();});
 await check('鍵盤跳至內容及焦點可見',async()=>{await page.goto(url);await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('class'),'skip-link');assert.equal(await page.locator(':focus').evaluate(x=>getComputedStyle(x).outlineStyle),'solid');await page.keyboard.press('Enter');assert.equal(await page.locator(':focus').getAttribute('id'),'main-content');});
 await check('搜尋鍵盤、無結果、模態焦點與 Escape 復原',async()=>{
  await page.locator('#commandTrigger').focus();await page.keyboard.press('Enter');assert(await page.locator('#commandPaletteModal').evaluate(x=>x.open));assert.equal(await page.locator(':focus').getAttribute('id'),'cmdPaletteInput');
  await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('class'),'cmd-palette-close');await page.keyboard.press('Tab');assert.equal(await page.locator(':focus').getAttribute('id'),'cmdPaletteInput');await page.keyboard.press('Shift+Tab');assert.equal(await page.locator(':focus').getAttribute('class'),'cmd-palette-close');await page.keyboard.press('Shift+Tab');
  await page.locator('#cmdPaletteInput').fill('NVM');assert.equal(await page.locator('[role="option"]').count(),1);await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#cmdPaletteInput').getAttribute('aria-activedescendant'),await page.locator('[role="option"]').first().getAttribute('id'));
  await page.locator('#cmdPaletteInput').fill('unmatched-zzzz');assert.equal(await page.locator('[role="option"]').count(),0);assert((await page.locator('#cmdPaletteStatus').innerText()).includes('沒有'));await page.keyboard.press('Escape');assert.equal(await page.locator(':focus').getAttribute('id'),'commandTrigger');
  await page.keyboard.press('Control+k');assert(await page.locator('#commandPaletteModal').evaluate(x=>x.open));await page.keyboard.press('Escape');
 });
 await check('雙語含私人區、標籤、可及性文字、快速導覽與重新載入記憶',async()=>{
  await page.locator('[data-target-lang="en"]').click();await page.locator('.private-workspace summary').click();await page.locator('#commandTrigger').click();
  const text=await page.locator('body').innerText();assert(!/\p{Script=Han}/u.test(text),'英文可見內容混入中文');
  const attrs=await page.locator('[aria-label],[title],[placeholder]').evaluateAll(xs=>xs.flatMap(x=>['aria-label','title','placeholder'].map(k=>x.getAttribute(k)||'')));assert(!attrs.some(x=>/\p{Script=Han}/u.test(x)),'英文可及性文字混入中文');
  assert.equal(await page.locator('html').getAttribute('lang'),'en');await page.keyboard.press('Escape');await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert((await page.title()).startsWith('Sam Huang'));assert(!/\p{Script=Han}/u.test(await page.title()));
  await page.locator('#commandTrigger').click();await page.locator('#cmdPaletteInput').fill('Switch language');await page.keyboard.press('Enter');assert.equal(await page.locator('html').getAttribute('lang'),'zh-Hant');
 });
 await check('預設靜音與既有音效、圖層檢視設定',async()=>{assert.equal(await page.evaluate(()=>window.SiliconAudio.isEnabled()),false);await page.locator('#commandTrigger').click();await page.locator('#cmdPaletteInput').fill('操作音效');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.SiliconAudio.isEnabled()),true);await page.locator('#commandTrigger').click();await page.locator('#cmdPaletteInput').fill('操作音效');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>window.SiliconAudio.isEnabled()),false);await page.locator('#commandTrigger').click();await page.locator('#cmdPaletteInput').fill('圖層檢視');await page.keyboard.press('Enter');assert(await page.locator('body').evaluate(x=>x.classList.contains('xray-mode')));await page.evaluate(()=>document.body.classList.remove('xray-mode'));});
 for(const [label,width,height] of [['桌面',1440,1000],['低高度桌面',1280,720],['平板',768,1024],['手機',390,844],['窄手機',320,740]]){
  await page.setViewportSize({width,height});
  for(const lang of ['zh','en']){
   await page.locator(`[data-target-lang="${lang}"]`).click();await page.evaluate(()=>window.scrollTo(0,0));
   await check(`${label} ${width}×${height} ${lang} 重排與視覺資產`,async()=>{assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await page.locator('img').evaluateAll(xs=>xs.every(x=>x.complete&&x.naturalWidth>0)));const sizes=await page.locator('.project-card h3,.card-description').evaluateAll(xs=>xs.map(x=>parseFloat(getComputedStyle(x).fontSize)));assert(sizes.every(s=>s>=13));});
   if(['桌面','手機'].includes(label)){await page.screenshot({path:path.join(out,`首頁-${label}-${lang}.png`),fullPage:true});if(label==='桌面') await page.screenshot({path:path.join(out,`首頁-首屏-${lang}.png`)});}
   await page.locator('.private-workspace summary').click();await check(`${label} ${lang} 私人區展開`,async()=>{assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await page.locator('[data-node="06"]').isVisible());});await page.locator('.private-workspace summary').click();
  }
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#commandTrigger').click();await page.screenshot({path:path.join(out,'首頁-手機-快速導覽-en.png')});await page.keyboard.press('Escape');
 await check('reduced motion 與一般動態偏好',async()=>{assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');assert.equal(await page.evaluate(()=>document.getAnimations().length),0);await page.emulateMedia({reducedMotion:'no-preference'});assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'smooth');assert.equal(await page.evaluate(()=>document.getAnimations().length),0);await page.emulateMedia({reducedMotion:'reduce'});});
 await check('200% 文字縮放重排',async()=>{await page.setViewportSize({width:1280,height:900});await page.addStyleTag({content:'body * {font-size:200% !important}'}); /* 下方以實際計算值逐一放大，避免巢狀累乘。 */ await page.locator('style').last().evaluate(x=>x.remove());await page.evaluate(()=>{const nodes=[...document.querySelectorAll('body *')];const sizes=nodes.map(x=>parseFloat(getComputedStyle(x).fontSize));nodes.forEach((x,i)=>x.style.fontSize=`${sizes[i]*2}px`);});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.reload();});
 await check('無腳本仍可閱讀七個公開入口及私人權限說明',async()=>{const ctx=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}});const fallback=await ctx.newPage();await fallback.goto(url);assert.equal(await fallback.locator('.project-card').count(),7);await fallback.locator('.private-workspace summary').click();assert(await fallback.locator('[data-node="06"]').isVisible());await ctx.close();});
 await check('儲存不可用時仍可切換語系',async()=>{const ctx=await browser.newContext();await ctx.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('儲存不可用')};Storage.prototype.setItem=()=>{throw Error('儲存不可用')};});const fallback=await ctx.newPage();const errs=[];fallback.on('pageerror',e=>errs.push(e.message));await fallback.goto(url);await fallback.locator('[data-target-lang="en"]').click();assert.equal(await fallback.locator('html').getAttribute('lang'),'en');assert.equal(errs.length,0);await ctx.close();});
 await check('無執行錯誤、資源失敗或外部資料請求',async()=>{assert.deepEqual(errors,[]);assert(requests.every(u=>u.startsWith(url)));});
 await writeFile(path.join(out,'首頁驗證結果.json'),JSON.stringify({host:'NUCBOX_EVO-T1',browser:browser.version(),url,records,failures},null,2));
 console.log(JSON.stringify({passed:records.length,failures,output:out}));
 if(failures.length) process.exitCode=1;
} finally {await browser.close();await new Promise(r=>server.close(r));}
