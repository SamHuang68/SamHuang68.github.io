// 審查修正的定向回歸：只測受影響流程，不是整站 QA
// 由 scripts/qa-taiwan-3d.mjs 執行；BASE 為子站網址，OUT 為截圖目錄，ok(name, pass, detail) 記錄結果
let BASE, OUT, ok;

async function open(browser, hash, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1280, height: 720 }, reducedMotion: opts.reducedMotion || 'no-preference', isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE + (hash || ''), { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tw3d && window.__tw3d.map.loaded(), null, { timeout: 120000 });
  return { ctx, page, errors };
}
const rect = (page, sel) => page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; }, sel);
const overlap = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b && a.w > 0 && b.w > 0;
const waitFor = (page, fn, arg, ms = 90000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 200 });

export default async function run(browser, opts) {
  ({ base: BASE, out: OUT, ok } = opts);
    // 0. 水深補回：zoom 12 的海底地形模式，花蓮外海地形要低於海平面；衛星模式則壓平在 0 m 以上
    {
      const { ctx, page, errors } = await open(browser, '#cam=121.80,23.95,12,0,50');
      await page.waitForTimeout(2000);
      await page.evaluate(() => { const m = window.__tw3d.map; m.stop(); m.jumpTo({ center: [121.8, 23.95], zoom: 12, pitch: 50, bearing: 0 }); document.querySelector('[data-base="ocean"]').click(); });
      await waitFor(page, () => window.__tw3d.map.loaded() && window.__tw3d.map.areTilesLoaded());
      await page.waitForTimeout(1500);
      const oceanH = await page.evaluate(() => window.__tw3d.map.queryTerrainElevation([121.8, 23.95]));
      const sampled = await page.evaluate(() => window.__tw3d.elevationAt(121.8, 23.95, 12));
      ok('0 海底模式 zoom 12 地形保有水深', oceanH !== null && oceanH < -200, `terrain=${Math.round(oceanH)} sampler=${Math.round(sampled)}`);
      await page.evaluate(() => document.querySelector('[data-base="satellite"]').click());
      await waitFor(page, () => window.__tw3d.map.loaded() && window.__tw3d.map.areTilesLoaded());
      await page.waitForTimeout(1500);
      const satH = await page.evaluate(() => window.__tw3d.map.queryTerrainElevation([121.8, 23.95]));
      ok('0 衛星模式海面壓平', satH !== null && satH >= -1, `terrain=${Math.round(satH)}`);
      ok('0 無 JS 錯誤', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // 1. 減少動態：路線不可卡在第一站
    {
      const { ctx, page, errors } = await open(browser, '#tour=peaks', { reducedMotion: 'reduce' });
      try {
        await waitFor(page, () => document.getElementById('playerStop').textContent.startsWith('2.'), null, 40000);
        ok('1 減少動態時路線自動換站', true);
      } catch { ok('1 減少動態時路線自動換站', false, await page.evaluate(() => document.getElementById('playerStop').textContent)); }
      ok('1 無 JS 錯誤', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // 2/6/9. 路線飛行中按工具列縮放 → 暫停、不在半空停留；繼續 → 重新飛到本站並開始停留；剖面會暫停路線
    {
      const { ctx, page, errors } = await open(browser, '#tour=peaks');
      // 停留時的環繞也算 isMoving；WebKit 載入較慢，第一段飛行可能已結束，所以要等到「尚未抵達本站」的飛行階段
      await waitFor(page, () => document.getElementById('playerStop').textContent && !window.__tw3d.tour.arrived && window.__tw3d.map.isMoving());
      await page.click('#tZoomIn');
      await page.waitForTimeout(500);
      const icon = await page.getAttribute('#pPlay use', 'href');
      ok('2 飛行中按縮放會暫停路線', icon === '#i-play', icon);
      const p0 = await page.evaluate(() => document.querySelector('#playerTrack i.cur')?.style.getPropertyValue('--p'));
      ok('2 暫停時沒有開始停留進度', !p0 || +p0 === 0, `p=${p0}`);
      await page.click('#pPlay');
      // 不變式：停留進度在跑時，鏡頭中心就是「目前這一站」（輪詢可能晚到下一站，所以不寫死第 1 站）
      const dwellAt = await page.evaluate(() => new Promise((res) => {
        const check = () => {
          const p = +(document.querySelector('#playerTrack i.cur')?.style.getPropertyValue('--p') || 0);
          if (p > 0.05) {
            const short = document.getElementById('playerStop').textContent.replace(/^\d+\.\s*/, '');
            const s = window.__tw3d.SPOTS.find((x) => x.short === short);
            const c = window.__tw3d.map.getCenter();
            return res({ stop: short, dLng: Math.abs(c.lng - s.lon), dLat: Math.abs(c.lat - s.lat), p });
          }
          requestAnimationFrame(check);
        };
        check();
      }));
      ok('9 繼續後在本站位置停留', dwellAt.dLng < 0.02 && dwellAt.dLat < 0.02, JSON.stringify(dwellAt));
      await page.click('#cardProfile');
      await page.waitForTimeout(400);
      ok('6 開剖面會暫停路線', (await page.getAttribute('#pPlay use', 'href')) === '#i-play');
      // 10. 關閉剖面、重新點選模式後 resize 不會畫回舊剖面
      await waitFor(page, () => /長/.test(document.getElementById('profileStats').textContent));
      await page.click('#profileClose');
      await page.click('#tProfile');
      await page.setViewportSize({ width: 1240, height: 720 });
      await page.waitForTimeout(500);
      const stats = await page.textContent('#profileStats');
      ok('10 重新點選時不殘留舊剖面', stats.includes('點選起點'), stats);
      await page.click('#profileClose');
      // 3. 路線停留中拖曳：第一次拖曳就移動地圖並暫停
      await page.click('#pPlay');
      await waitFor(page, () => +(document.querySelector('#playerTrack i.cur')?.style.getPropertyValue('--p') || 0) > 0.05);
      const before = await page.evaluate(() => window.__tw3d.map.getCenter().toArray());
      await page.mouse.move(700, 400);
      await page.mouse.down();
      for (let k = 1; k <= 10; k++) await page.mouse.move(700 + k * 15, 400 + k * 6);
      await page.mouse.up();
      await page.waitForTimeout(400);
      const after = await page.evaluate(() => window.__tw3d.map.getCenter().toArray());
      const moved = Math.hypot(after[0] - before[0], after[1] - before[1]);
      ok('3 第一次拖曳就移動地圖', moved > 0.001, `Δ=${moved.toFixed(4)}°`);
      ok('3 拖曳後路線暫停', (await page.getAttribute('#pPlay use', 'href')) === '#i-play');
      ok('2 無 JS 錯誤', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // 7. 桌面 1280：卡片開啟時搜尋框不壓卡片；1024 也檢查
    for (const w of [1280, 1024]) {
      const { ctx, page, errors } = await open(browser, '#spot=yushan', { viewport: { width: w, height: 720 } });
      await page.waitForSelector('#card:not([hidden])');
      await page.waitForTimeout(600);
      const a = await rect(page, '.search-trigger'), b = await rect(page, '#card');
      ok(`7 ${w}px 搜尋框與介紹卡不重疊`, !overlap(a, b), `search ${Math.round(a.l)}–${Math.round(a.r)} card ${Math.round(b.l)}–${Math.round(b.r)}`);
      // 13. 收合面板後 inert
      await page.click('#panelToggle');
      ok(`13 ${w}px 收合面板設為 inert`, await page.evaluate(() => document.getElementById('panel').inert === true));
      if (w === 1280) {
        // 環繞：飛行結束後啟動，鏡頭方位要持續改變且無例外
        await waitFor(page, () => !window.__tw3d.map.isMoving());
        const b0 = await page.evaluate(() => window.__tw3d.map.getBearing());
        await page.click('#cardOrbit');
        // 機器忙時無頭 Chromium 的軟體繪圖一秒可能不到一格（2.5 秒只轉 1.1°，舊版同樣會發生），等到轉超過 2° 為止，最多 10 秒
        await waitFor(page, (b) => Math.abs(window.__tw3d.map.getBearing() - b) > 2, b0, 10000).catch(() => {});
        const b1 = await page.evaluate(() => window.__tw3d.map.getBearing());
        ok('環繞會轉動鏡頭', Math.abs(b1 - b0) > 2, `Δ=${(b1 - b0).toFixed(1)}°`);
        ok('環繞無 JS 錯誤', errors.length === 0, errors.join(' | '));
      }
      await ctx.close();
    }

    // 5/8/13. 手機 375×667：從清單選點，目標落在卡片上方；工具列不壓卡片關閉鈕；收合抽屜內容 inert
    {
      const { ctx, page, errors } = await open(browser, '', { viewport: { width: 375, height: 667 }, mobile: true });
      ok('13 手機抽屜收合時清單 inert', await page.evaluate(() => document.getElementById('pane-spots').inert === true));
      await page.click('#tab-spots');
      ok('13 展開抽屜後清單可用', await page.evaluate(() => document.getElementById('pane-spots').inert === false));
      await page.click('#spotList button[data-id="taroko_gorge"]');
      await page.waitForSelector('#card:not([hidden])');
      await waitFor(page, () => !window.__tw3d.map.isMoving());
      await page.waitForTimeout(500);
      const card = await rect(page, '#card');
      const pt = await page.evaluate(() => window.__tw3d.map.project([121.562, 24.162]));
      ok('5 手機選點後目標在卡片上方', pt.y < card.t - 10, `target y=${Math.round(pt.y)} card top=${Math.round(card.t)}`);
      const tools = await rect(page, '.tools'), close = await rect(page, '#cardClose');
      ok('8 手機工具列不壓卡片關閉鈕', !overlap(tools, close), `tools bottom=${Math.round(tools.b)} close top=${Math.round(close.t)}`);
      ok('5 無 JS 錯誤', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }

    // 12. 輸入法選字中的 Enter 不選取、不關閉搜尋框
    {
      const { ctx, page } = await open(browser, '');
      await page.keyboard.press('/');
      await page.fill('#searchInput', '玉');
      await page.evaluate(() => document.getElementById('searchInput').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', isComposing: true, bubbles: true })));
      ok('12 選字中 Enter 不關閉搜尋', await page.evaluate(() => document.getElementById('search').open));
      await ctx.close();
    }
}
