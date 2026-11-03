// 審查意見的定向回歸：每條修正一個情境
// 由 scripts/qa-taiwan-3d.mjs 執行；BASE 為子站網址，OUT 為截圖目錄，ok(name, pass, detail) 記錄結果
let BASE, OUT, ok;
const waitFor = (page, fn, arg, ms = 90000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 150 });

async function open(browser, hash = '', opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, reducedMotion: opts.reducedMotion || 'no-preference' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  // 慢速載入在頁面內延遲 fetch：WebKit 一啟用 page.route，MapLibre 在 Worker 內的圖磚請求就會卡住
  if (opts.slowCatalog) await page.addInitScript(({ ms }) => { const f = window.fetch; window.fetch = (...a) => (/quakes\.json/.test(String(a[0]?.url || a[0])) ? new Promise((s) => setTimeout(s, ms)).then(() => f(...a)) : f(...a)); }, { ms: opts.slowCatalog });
  await page.goto(BASE + hash, { waitUntil: 'load' });
  await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
  return { ctx, page, errors };
}
const sectionDrawn = (page) => waitFor(page, () => window.__tw3d.profile.samples && document.querySelectorAll('#profileChart circle.hypo').length > 0, null, 90000);

export default async function run(browser, opts) {
  ({ base: BASE, out: OUT, ok } = opts);
    // 1. 剖面點選模式中按預設剖面 → 點選模式結束
    {
      const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7,0,40');
      await page.click('#tProfile');
      await page.click('#tab-layers');
      await page.click('#qSections [data-section="ryukyu"]');
      await sectionDrawn(page);
      const st = await page.evaluate(() => ({ picking: window.__tw3d.profile.picking, cls: document.body.classList.contains('map-cursor-pick'), section: window.__tw3d.profile.section }));
      ok('1 預設剖面結束點選模式', !st.picking && !st.cls && st.section === 'ryukyu', JSON.stringify(st));

      // 2. 定值深度畫成空心；集集地震彈出視窗註明定值
      const fx = await page.evaluate(() => ({ fixed: document.querySelectorAll('#profileChart circle.hypo-fixed').length, free: document.querySelectorAll('#profileChart circle.hypo').length, label: document.querySelector('#profileChart .panel-label').textContent }));
      ok('2 定值深度空心、標籤含筆數', fx.fixed > 100 && fx.free > 500 && /1,337 筆/.test(fx.label) && fx.label.includes('定值'), JSON.stringify(fx));
      await page.evaluate(() => { const q = window.__tw3d.quake.list.find((x) => x.id === 'usp0009eq0'); window.__chichi = q; });
      const chichi = await page.evaluate(() => ({ fx: window.__chichi.fx, d: window.__chichi.d }));
      ok('2 集集地震標為定值深度', chichi.fx === true && chichi.d === 33, JSON.stringify(chichi));

      // 5. 關閉目錄 → 清掉剖面說明、#section、讀數與彈出視窗
      await page.evaluate(() => { const m = window.__tw3d.map; const q = window.__tw3d.quake.list.at(-1); new Promise(() => {}); });
      await page.click('#qLatest');
      await waitFor(page, () => document.querySelector('.maplibregl-popup'), null, 20000);
      await page.click('label:has(#qCatalog)');
      const off = await page.evaluate(() => ({ note: document.getElementById('profileNote').hidden, hash: location.hash, out: document.getElementById('qOut').textContent, popup: !!document.querySelector('.maplibregl-popup'), section: window.__tw3d.profile.section, deep: document.body.classList.contains('profile-deep') }));
      ok('5 關閉目錄清掉殘留狀態', off.note && off.hash === '' && off.out === '' && !off.popup && off.section === null && !off.deep, JSON.stringify(off));

      // 8. 時間滑桿的 aria-valuetext
      await page.click('label:has(#qCatalog)');
      await waitFor(page, () => window.__tw3d.quake.on && document.getElementById('qOut').textContent);
      await page.evaluate(() => { const r = document.getElementById('qTime'); r.value = 1985.4; r.dispatchEvent(new Event('input', { bubbles: true })); });
      await waitFor(page, () => document.getElementById('qTime').getAttribute('aria-valuetext') !== '到現在', null, 10000).catch(() => {});
      const vt = await page.evaluate(() => ({ vt: document.getElementById('qTime').getAttribute('aria-valuetext'), live: document.getElementById('qOut').getAttribute('aria-live') }));
      ok('8 滑桿 aria-valuetext、讀數不朗讀', vt.vt === '1985 年 5 月' && vt.live === 'off', JSON.stringify(vt));

      // 10. 播放時剖面重畫節流
      await page.click('#qSections [data-section="collision"]');
      await sectionDrawn(page);
      await page.evaluate(() => { const r = document.getElementById('qTime'); r.value = 1990; r.dispatchEvent(new Event('input', { bubbles: true })); window.__draws = 0; new MutationObserver(() => window.__draws++).observe(document.getElementById('profileChart'), { childList: true }); });
      await page.click('#qPlay');
      await page.waitForTimeout(2000);
      await page.click('#qPlay');
      const draws = await page.evaluate(() => window.__draws);
      ok('10 播放時剖面約每 250 ms 重畫', draws >= 3 && draws <= 12, `2 秒內重畫 ${draws} 次`);
      ok('無 JS 錯誤（桌面）', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // 3. 減少動態：最新一筆會彈出視窗
    {
      const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7,0,40', { reducedMotion: 'reduce' });
      await page.click('#tab-layers');
      await page.click('label:has(#qCatalog)');
      await waitFor(page, () => !document.getElementById('qLatest').hidden);
      await page.click('#qLatest');
      await page.waitForTimeout(800);
      const pop = await page.evaluate(() => document.querySelector('.maplibregl-popup-content')?.innerText || '');
      ok('3 減少動態時最新一筆彈出資訊', /M\d\.\d/.test(pop), pop.replace(/\n/g, ' / '));
      ok('無 JS 錯誤（減少動態）', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // 4a. 目錄還在載入時按預設剖面 → 仍會開啟
    {
      const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7,0,40', { slowCatalog: 2500 });
      await page.click('#tab-layers');
      await page.click('label:has(#qCatalog)');
      await page.click('#qSections [data-section="manila"]');
      await sectionDrawn(page);
      const st = await page.evaluate(() => ({ section: window.__tw3d.profile.section, n: document.querySelectorAll('#profileChart circle.hypo, #profileChart circle.hypo-fixed').length }));
      ok('4a 載入中按剖面仍會開啟', st.section === 'manila' && st.n > 100, JSON.stringify(st));
      ok('無 JS 錯誤（4a）', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // 4b. #section 載入期間關掉目錄 → 不開啟剖面
    {
      const { ctx, page, errors } = await open(browser, '#section=ryukyu', { slowCatalog: 8000 });
      await waitFor(page, () => window.__tw3d.quake.on);
      await page.click('#tab-layers');
      await page.click('label:has(#qCatalog)');
      const stillLoading = await page.evaluate(() => !window.__tw3d.quake.list);
      await waitFor(page, () => window.__tw3d.quake.list, null, 30000);
      await page.waitForTimeout(1500);
      const st = await page.evaluate(() => ({ hidden: document.getElementById('profile').hidden, section: window.__tw3d.profile.section, on: window.__tw3d.quake.on }));
      ok('4b 載入中關掉目錄就不開剖面', stillLoading && st.hidden && st.section === null && !st.on, JSON.stringify({ stillLoading, ...st }));
      ok('無 JS 錯誤（4b）', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // 6. 矮視窗：剖面高度有上限
    {
      const { ctx, page } = await open(browser, '#section=collision', { viewport: { width: 1024, height: 520 } });
      await sectionDrawn(page);
      await waitFor(page, () => !window.__tw3d.map.isMoving());
      const st = await page.evaluate(() => ({ h: document.getElementById('profile').offsetHeight, pad: window.__tw3d.map.getPadding().bottom }));
      ok('6 矮視窗剖面高度受限、padding 跟著', st.h <= 262 && st.h >= 212 && Math.abs(st.pad - (st.h + 24)) < 2, JSON.stringify(st));
      await ctx.close();
    }

    // 7. 手機：筆數在剖面圖內看得到
    {
      const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      const page = await ctx.newPage();
      await page.goto(BASE + '#section=ryukyu', { waitUntil: 'load' });
      await sectionDrawn(page);
      const st = await page.evaluate(() => { const t = document.querySelector('#profileChart .panel-label'); const r = t.getBoundingClientRect(), c = document.getElementById('profileChart').getBoundingClientRect(); return { text: t.textContent, inside: r.right <= c.right + 1 }; });
      ok('7 手機剖面標籤含筆數且不超出', /筆/.test(st.text) && st.inside, JSON.stringify(st));
      await ctx.close();
    }
}
