// 旅遊專項審查意見的定向回歸：每條一個情境
// 由 scripts/qa-taiwan-3d.mjs 執行；BASE 為子站網址，OUT 為截圖目錄，ok(name, pass, detail) 記錄結果
let BASE, OUT, ok;
const waitFor = (page, fn, arg, ms = 90000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 150 });
const still = (page) => waitFor(page, () => !window.__tw3d.map.isMoving());

async function open(browser, hash, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const page = await ctx.newPage();
  const errors = [], fitWarn = [], urls = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); if (/cannot fit/i.test(m.text())) fitWarn.push(m.text()); });
  page.on('request', (r) => urls.push(r.url()));
  // 慢速載入在頁面內延遲 fetch：WebKit 一啟用 page.route，MapLibre 在 Worker 內的圖磚請求就會卡住
  if (opts.slow) await page.addInitScript(({ re, ms }) => { const f = window.fetch; window.fetch = (...a) => (new RegExp(re).test(String(a[0]?.url || a[0])) ? new Promise((s) => setTimeout(s, ms)).then(() => f(...a)) : f(...a)); }, opts.slow);
  await page.goto(BASE + (hash || ''), { waitUntil: 'load' });
  await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
  return { ctx, page, errors, fitWarn, urls };
}
const center = (page) => page.evaluate(() => { const c = window.__tw3d.map.getCenter(); return [c.lng, c.lat]; });

export default async function run(browser, opts) {
  ({ base: BASE, out: OUT, ok } = opts);
    // 1. 1024×600：選第 3 天、第 6 天、第 1 大爬坡都會移動鏡頭，不出現 cannot fit
    {
      const { ctx, page, errors, fitWarn } = await open(browser, '#cam=121,23.7,7,0,30', { viewport: { width: 1024, height: 600 } });
      await page.click('#tab-travel');
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
      const moves = [];
      for (const sel of ['#bikeStages li:nth-child(3) button', '#bikeStages li:nth-child(6) button', '#bikeClimbs li:nth-child(1) button']) {
        const before = await center(page);
        await page.click(sel);
        await page.waitForTimeout(300);
        await still(page);
        const after = await center(page);
        moves.push(Math.hypot(after[0] - before[0], after[1] - before[1]).toFixed(2));
      }
      ok('1 1024×600 選取會移動鏡頭', moves.every((m) => +m > 0.05) && fitWarn.length === 0, `${moves.join(',')} warn=${fitWarn.length}`);
      // 第 3 天的中點要在畫面可視區內
      const inView = await page.evaluate(() => {
        const t = window.__tw3d.travel, st = t.plan.stages[1];
        const P = t.plan.m.path, mid = P[Math.round((st.a + st.b) / 2)].p;
        const pt = window.__tw3d.map.project(mid);
        return { x: Math.round(pt.x), y: Math.round(pt.y), w: innerWidth, h: innerHeight };
      });
      await page.click('#bikeStages li:nth-child(2) button');
      await page.waitForTimeout(300);
      await still(page);
      const v2 = await page.evaluate(() => {
        const t = window.__tw3d.travel, st = t.plan.stages[1];
        const P = t.plan.m.path, mid = P[Math.round((st.a + st.b) / 2)].p;
        const pt = window.__tw3d.map.project(mid);
        return { x: Math.round(pt.x), y: Math.round(pt.y) };
      });
      ok('1 第 2 天落在可視區', v2.x > 330 && v2.x < 1024 - 300 && v2.y > 40 && v2.y < 600, JSON.stringify(v2));
      ok('1 無 JS 錯誤', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
    // 1b. 手機第 3 天不會飛到海上
    {
      const { ctx, page } = await open(browser, '#bike', { viewport: { width: 375, height: 812 }, mobile: true });
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
      await page.evaluate(() => document.querySelector('#bikeStages li:nth-child(3) button').click());
      await page.waitForTimeout(300);
      await still(page);
      const r = await page.evaluate(() => {
        const t = window.__tw3d.travel, st = t.plan.stages[2], P = t.plan.m.path;
        const lats = P.slice(st.a, st.b + 1).map((s) => s.p[1]);
        const c = window.__tw3d.map.getCenter();
        return { c: [+c.lng.toFixed(2), +c.lat.toFixed(2)], lo: Math.min(...lats).toFixed(2), hi: Math.max(...lats).toFixed(2) };
      });
      ok('1b 手機第 3 天鏡頭在路段範圍', r.c[1] >= +r.lo - 0.6 && r.c[1] <= +r.hi + 0.6, JSON.stringify(r));
      await ctx.close();
    }
    // 2. 騎乘中選百岳：騎乘停止、鏡頭飛到山頂
    {
      const { ctx, page, errors } = await open(browser, '#bike');
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
      await page.click('#bikeRide');
      await page.waitForTimeout(1500);
      await page.click('#travelSeg [data-mode="peaks"]');
      await waitFor(page, () => document.querySelectorAll('#peakList button').length === 100, null, 30000);
      await page.click('#peakList li:nth-child(1) button');
      await page.waitForTimeout(300);
      await still(page);
      const r = await page.evaluate(() => { const c = window.__tw3d.map.getCenter(); return { on: window.__tw3d.ride.on, d: Math.hypot(c.lng - 120.957, c.lat - 23.47) }; });
      ok('2 騎乘中選百岳會停止騎乘並飛過去', !r.on && r.d < 0.05, JSON.stringify(r));
      ok('2 無 JS 錯誤', errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
    // 3. 騎乘中改天數：騎乘停止；當日剖面改天數後關閉
    {
      const { ctx, page } = await open(browser, '#bike');
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
      await page.click('#bikeRide');
      await page.waitForTimeout(800);
      await page.evaluate(() => { const r = document.getElementById('bikeDays'); r.value = 5; r.dispatchEvent(new Event('input', { bubbles: true })); });
      const stoppedNow = await page.evaluate(() => !window.__tw3d.ride.on);
      await waitFor(page, () => document.querySelectorAll('#bikeStages button').length === 5, null, 15000);
      await page.waitForTimeout(300);
      const a = await page.evaluate(() => ({ on: window.__tw3d.ride.on, marks: document.querySelectorAll('#profileChart line[stroke-dasharray="2 3"]').length }));
      ok('3 改天數立即停止騎乘、全線剖面重畫為 5 天', stoppedNow && !a.on && a.marks === 4, JSON.stringify({ stoppedNow, ...a }));
      await page.click('#bikeStages li:nth-child(2) button');
      await page.click('#cardProfile');
      await waitFor(page, () => document.getElementById('profileTitle').textContent.startsWith('第 2 天'));
      await page.evaluate(() => { const r = document.getElementById('bikeDays'); r.value = 7; r.dispatchEvent(new Event('input', { bubbles: true })); });
      // 重算排在下一個畫格；無頭 SwiftShader 飛行中一格可能超過 400 ms，所以等兩個畫格再判定，不用固定時間
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const st = await page.evaluate(() => ({ hidden: document.getElementById('profile').hidden, title: document.getElementById('profileTitle').textContent, days: window.__tw3d.travel.days, stages: document.querySelectorAll('#bikeStages button').length }));
      ok('3 改天數關掉舊的當日剖面', st.hidden, JSON.stringify(st));
      await ctx.close();
    }
    // 4. 捲動後切換列蓋住清單
    {
      const { ctx, page } = await open(browser, '#bike');
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
      // 開場遮罩淡出完才做命中測試
      await waitFor(page, () => getComputedStyle(document.getElementById('veil')).visibility === 'hidden' || getComputedStyle(document.getElementById('veil')).display === 'none' || getComputedStyle(document.getElementById('veil')).pointerEvents === 'none', null, 20000);
      await page.evaluate(() => { document.getElementById('pane-travel').scrollTop = 500; });
      await page.waitForTimeout(1200);
      const r = await page.evaluate(() => {
        const seg = document.getElementById('travelSeg').getBoundingClientRect();
        const pane = document.getElementById('pane-travel').getBoundingClientRect();
        const el = document.elementFromPoint(seg.left + 6, pane.top + 2);
        return { segTop: Math.round(seg.top), paneTop: Math.round(pane.top), hit: el?.closest('#travelSeg') ? 'seg' : el?.className };
      });
      ok('4 切換列貼齊頂端並蓋住內容', r.hit === 'seg' && r.segTop <= r.paneTop, JSON.stringify(r));
      await ctx.close();
    }
    // 5、6. 國家公園外、別名清理
    {
      const { ctx, page } = await open(browser, '#peak=95');
      await waitFor(page, () => document.getElementById('cardTitle').textContent && window.__tw3d.travel.data.peaks, null, 30000);
      const r = await page.evaluate(() => ({ badge: document.getElementById('cardBadge').textContent, metric: document.getElementById('cardMetric').textContent, outside: [...document.querySelectorAll('#peakList .s')].filter((s) => s.textContent.includes('無國家公園')).length }));
      ok('5/6 #95 別名乾淨、沒有「無國家公園」', !/</.test(r.badge) && r.outside === 0, JSON.stringify(r));
      await ctx.close();
    }
    // 7. #trail 不下載環島資料
    {
      const { ctx, page, urls } = await open(browser, '#trail=139');
      await waitFor(page, () => /嘉明湖/.test(document.getElementById('cardTitle').textContent), null, 40000);
      ok('7 #trail 不載入 cycling.json', !urls.some((u) => u.includes('cycling.json')), urls.filter((u) => /json/.test(u)).map((u) => u.split('/').pop()).join(','));
      await ctx.close();
    }
    // 8、9. 當日卡片列出 100 m 以上的坡；當日剖面提示含全線里程
    {
      const { ctx, page } = await open(browser, '#bike');
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
      // 第 2 天以後（起點里程不為 0）且有前 8 名以外的坡
      const k = await page.evaluate(() => { const t = window.__tw3d.travel; const s = t.plan.stages.find((st) => st.k > 1 && t.plan.allClimbs.some((c) => c.d0 >= st.d0 - 1 && c.d1 <= st.d1 + 1 && !t.plan.climbs.includes(c))); return s?.k ?? 6; });
      await page.click(`#bikeStages li:nth-child(${k}) button`);
      const desc = await page.evaluate(() => document.getElementById('cardDesc').textContent);
      ok('8 當日卡片列出前 8 名以外的坡', /本日主要爬坡/.test(desc), `D${k}: ${desc.slice(0, 60)}`);
      await page.click('#cardProfile');
      await waitFor(page, () => document.querySelector('#pgHit'));
      const box = await page.evaluate(() => { const r = document.getElementById('pgHit').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      await page.mouse.move(box.x, box.y);
      const tip = await page.evaluate(() => document.querySelector('#pgHover .tip').textContent);
      ok('9 當日剖面提示含全線里程', /全線 \d+\.\d km/.test(tip), tip);
      // 15. 卡片與播放器的無障礙標籤
      const lab = await page.evaluate(() => document.getElementById('cardPrev').getAttribute('aria-label'));
      await page.click('#cardRide');
      await page.waitForTimeout(500);
      const pl = await page.evaluate(() => document.getElementById('pPrev').getAttribute('aria-label'));
      ok('15 無障礙標籤隨模式更新', lab === '上一個' && pl === '上一天', `${lab} / ${pl}`);
      // 10. 播放器標題不換行
      const ws = await page.evaluate(() => getComputedStyle(document.getElementById('playerTour')).whiteSpace);
      ok('10 播放器標題單行', ws === 'nowrap', ws);
      await ctx.close();
    }
    // 11. 方向鍵切換專項
    {
      const { ctx, page } = await open(browser, '#bike');
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
      await page.focus('#travelSeg [data-mode="bike"]');
      await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(300);
      const r = await page.evaluate(() => ({ mode: window.__tw3d.travel.mode, focus: document.activeElement.dataset.mode, tabs: [...document.querySelectorAll('#travelSeg button')].map((b) => b.tabIndex).join(',') }));
      ok('11 方向鍵切換專項', r.mode === 'hike' && r.focus === 'hike' && r.tabs === '-1,0,-1', JSON.stringify(r));
      await ctx.close();
    }
    // 14. #peak 載入很慢時先選了導覽點：不再被覆蓋
    {
      const { ctx, page } = await open(browser, '#peak=1', { slow: { re: 'peaks\\.json', ms: 6000 } });
      await page.click('#tab-spots');
      await page.click('#spotList li:nth-child(3) button');
      await page.waitForTimeout(8000);
      const r = await page.evaluate(() => ({ spot: window.__tw3d.state.current?.id, sel: window.__tw3d.travel.sel, hash: location.hash }));
      ok('14 慢速載入不覆蓋使用者的選取', !!r.spot && !r.sel && r.hash.startsWith('#spot='), JSON.stringify(r));
      await ctx.close();
    }
}
