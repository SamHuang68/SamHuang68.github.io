// 地震與板塊功能的煙霧測試＋截圖（只測本次新增流程）
// 由 scripts/qa-taiwan-3d.mjs 執行；BASE 為子站網址，OUT 為截圖目錄，ok(name, pass, detail) 記錄結果
let BASE, OUT, ok;
const waitFor = (page, fn, arg, ms = 90000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 200 });
const idle = (page) => waitFor(page, () => window.__tw3d.map.loaded() && window.__tw3d.map.areTilesLoaded());

export default async function run(browser, opts) {
  ({ base: BASE, out: OUT, ok } = opts);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[map]'))) errors.push(m.text()); });
    await page.goto(BASE + '#cam=121.2,23.6,6.7,0,30', { waitUntil: 'load' });
    await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
    ok('樣式載入', true);
    await page.click('#tab-layers');
    await page.click('label:has(#qCatalog)');
    await waitFor(page, () => window.__tw3d.quake.list && window.__tw3d.quake.live !== 'pending', null, 30000);
    const st = await page.evaluate(() => ({ n: window.__tw3d.quake.list.length, live: window.__tw3d.quake.live, out: document.getElementById('qOut').textContent, hint: document.getElementById('qHint').textContent, latest: document.getElementById('qLatest').textContent, vis: window.__tw3d.map.getLayoutProperty('catalog-dot', 'visibility') }));
    ok('目錄載入', st.n >= 7130 && st.vis === 'visible', JSON.stringify(st));
    await page.click('label:has(#qPlates)');
    await page.waitForTimeout(500);
    await page.evaluate(() => window.__tw3d.map.jumpTo({ center: [121.3, 23.5], zoom: 6.55, pitch: 35, bearing: 0 }));
    await idle(page);
    await page.waitForTimeout(1500);
    const rendered = await page.evaluate(() => ({ dots: window.__tw3d.map.queryRenderedFeatures({ layers: ['catalog-dot'] }).length, plates: window.__tw3d.map.queryRenderedFeatures({ layers: ['plates-line', 'plates-rift'] }).length, names: window.__tw3d.map.queryRenderedFeatures({ layers: ['plates-name'] }).map((f) => f.properties.label) }));
    const names = [...new Set(rendered.names)];
    ok('地圖上有震源圓點與板塊線', rendered.dots > 1000 && rendered.plates > 0 && ['琉球海溝', '馬尼拉海溝', '沖繩海槽', '菲律賓海板塊', '歐亞板塊'].every((n) => names.includes(n)), JSON.stringify({ ...rendered, names }));
    await page.screenshot({ path: OUT + '/q1-catalog.png' });

    // 規模篩選
    await page.click('#qMagSeg [data-mag="6"]');
    await page.waitForTimeout(400);
    const m6 = await page.evaluate(() => document.getElementById('qOut').textContent);
    ok('M6 以上篩選', /^\d+ 筆$/.test(m6) && parseInt(m6) < 120, m6);
    await page.click('#qMagSeg [data-mag="4"]');

    // 時間軸：拖到 1999.8 → 只剩當時以前
    await page.evaluate(() => { const r = document.getElementById('qTime'); r.value = 1999.8; r.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(300);
    const t99 = await page.evaluate(() => document.getElementById('qOut').textContent);
    ok('時間軸篩選', t99.startsWith('1999 年 10 月'), t99);

    // 播放：數秒後時間往前推進，再暫停
    await page.click('#qPlay');
    await page.waitForTimeout(3000);
    const play = await page.evaluate(() => ({ T: window.__tw3d.quake.T, playing: window.__tw3d.quake.playing, flash: window.__tw3d.map.getLayoutProperty('catalog-flash', 'visibility'), out: document.getElementById('qOut').textContent }));
    // 從時間軸目前位置（1999.8）接著播
    ok('播放推進', play.playing && play.T > 1999.8 && play.T < 2010 && play.flash === 'visible', JSON.stringify(play));
    await page.screenshot({ path: OUT + '/q2-playing.png' });
    await page.click('#qPlay');
    const paused = await page.evaluate(() => ({ playing: window.__tw3d.quake.playing, flash: window.__tw3d.map.getLayoutProperty('catalog-flash', 'visibility') }));
    ok('暫停', !paused.playing && paused.flash === 'none', JSON.stringify(paused));

    // 琉球隱沒帶剖面
    await page.click('#qSections [data-section="ryukyu"]');
    await waitFor(page, () => window.__tw3d.profile.samples && document.querySelector('#profileChart svg'), null, 60000);
    await page.waitForTimeout(300);
    const sec = await page.evaluate(() => {
      const hy = [...document.querySelectorAll('#profileChart circle.hypo')];
      const ys = hy.map((c) => +c.getAttribute('cy'));
      return { n: hy.length, stats: document.getElementById('profileStats').textContent, note: document.getElementById('profileNote').textContent, deep: document.body.classList.contains('profile-deep'), h: document.getElementById('profile').offsetHeight, T: window.__tw3d.quake.T, hash: location.hash, ymax: Math.max(...ys) };
    });
    ok('琉球剖面畫出震源', sec.n > 800 && sec.deep && sec.h > 300 && sec.hash === '#section=ryukyu' && sec.T === Infinity, JSON.stringify(sec));
    await waitFor(page, () => !window.__tw3d.map.isMoving());
    await idle(page);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: OUT + '/q3-ryukyu.png' });

    // 剖面地底區 hover：找一顆深的震源
    const target = await page.evaluate(() => {
      const c = [...document.querySelectorAll('#profileChart circle.hypo')].sort((a, b) => b.getAttribute('cy') - a.getAttribute('cy'))[0];
      const r = c.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    await page.mouse.move(target.x, target.y);
    await page.waitForTimeout(200);
    const tip = await page.evaluate(() => document.querySelector('#pgHover .tip').textContent);
    ok('剖面震源提示', /M\d\.\d · 深 \d+ km/.test(tip), tip);
    await page.screenshot({ path: OUT + '/q4-hover.png', clip: { x: 0, y: 450, width: 1440, height: 450 } });

    // 地圖點震源 → 彈出視窗
    // 挑一顆附近沒有導覽點、也不在面板或剖面後面的大地震（導覽點點擊優先）
    const pt = await page.evaluate(() => {
      const m = window.__tw3d.map;
      const prof = document.getElementById('profile').getBoundingClientRect();
      const fs = m.queryRenderedFeatures({ layers: ['catalog-dot'] }).sort((a, b) => b.properties.m - a.properties.m);
      for (const f of fs) {
        const p = m.project(f.geometry.coordinates);
        if (p.x < 400 || p.x > 1360 || p.y < 80 || p.y > prof.top - 10) continue;
        const near = m.queryRenderedFeatures([[p.x - 16, p.y - 16], [p.x + 16, p.y + 16]], { layers: ['spots-dot', 'spots-label-major', 'spots-label'] });
        if (!near.length) return { x: p.x, y: p.y, m: f.properties.m };
      }
      return null;
    });
    await page.mouse.click(pt.x, pt.y);
    await page.waitForTimeout(400);
    const pop = await page.evaluate(() => document.querySelector('.maplibregl-popup-content')?.innerText || '');
    ok('點震源彈出資訊', /M\d\.\d/.test(pop) && pop.includes('USGS'), pop.replace(/\n/g, ' / '));

    // 關閉剖面 → 高度與 hash 復原
    await page.click('#profileClose');
    const closed = await page.evaluate(() => ({ deep: document.body.classList.contains('profile-deep'), hash: location.hash }));
    ok('關閉剖面復原', !closed.deep && closed.hash === '', JSON.stringify(closed));

    // 關閉目錄 → 剖面回到純地形
    await page.click('label:has(#qCatalog)');
    const off = await page.evaluate(() => ({ vis: window.__tw3d.map.getLayoutProperty('catalog-dot', 'visibility'), body: document.getElementById('quakeBody').hidden }));
    ok('關閉目錄', off.vis === 'none' && off.body, JSON.stringify(off));
    ok('無 JS 錯誤', errors.length === 0, errors.slice(0, 5).join(' | '));
    await ctx.close();

    // 直接開分享連結：#section=manila
    {
      const ctx2 = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const p2 = await ctx2.newPage();
      const errs = [];
      p2.on('pageerror', (e) => errs.push(e.message));
      await p2.goto(BASE + '#section=manila', { waitUntil: 'load' });
      await waitFor(p2, () => window.__tw3d && window.__tw3d.profile.samples && document.querySelectorAll('#profileChart circle.hypo').length > 0, null, 90000);
      await waitFor(p2, () => !window.__tw3d.map.isMoving());
      await waitFor(p2, () => window.__tw3d.map.loaded() && window.__tw3d.map.areTilesLoaded());
      await p2.waitForTimeout(1500);
      const r = await p2.evaluate(() => ({ n: document.querySelectorAll('#profileChart circle.hypo').length, note: document.getElementById('profileNote').textContent, cat: document.getElementById('qCatalog').checked }));
      ok('分享連結開啟馬尼拉剖面', r.n > 50 && r.cat && r.note.includes('呂宋'), JSON.stringify(r));
      await p2.screenshot({ path: OUT + '/q5-manila.png' });
      ok('分享連結無 JS 錯誤', errs.length === 0, errs.join(' | '));
      await ctx2.close();
    }

    // 手機：花東碰撞帶
    {
      const ctx3 = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
      const p3 = await ctx3.newPage();
      const errs = [];
      p3.on('pageerror', (e) => errs.push(e.message));
      await p3.goto(BASE + '#section=collision', { waitUntil: 'load' });
      await waitFor(p3, () => window.__tw3d && window.__tw3d.profile.samples && document.querySelectorAll('#profileChart circle.hypo').length > 0, null, 90000);
      await waitFor(p3, () => !window.__tw3d.map.isMoving());
      await p3.waitForTimeout(2500);
      const r = await p3.evaluate(() => { const pr = document.getElementById('profile').getBoundingClientRect(); return { h: pr.height, top: pr.top, bottom: pr.bottom, vw: innerWidth, sw: document.documentElement.scrollWidth }; });
      ok('手機剖面版面', r.h >= 290 && r.top > 200 && r.sw <= r.vw, JSON.stringify(r));
      await p3.screenshot({ path: OUT + '/q6-mobile.png' });
      ok('手機無 JS 錯誤', errs.length === 0, errs.join(' | '));
      await ctx3.close();
    }
}
