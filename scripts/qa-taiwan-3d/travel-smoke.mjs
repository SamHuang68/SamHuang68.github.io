// 旅遊專項煙霧測試＋截圖（只測本次新增流程）
// 由 scripts/qa-taiwan-3d.mjs 執行；BASE 為子站網址，OUT 為截圖目錄，ok(name, pass, detail) 記錄結果
let BASE, OUT, ok;
const waitFor = (page, fn, arg, ms = 90000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 200 });
const settle = async (page) => { await waitFor(page, () => !window.__tw3d.map.isMoving()); await waitFor(page, () => window.__tw3d.map.loaded() && window.__tw3d.map.areTilesLoaded()).catch(() => {}); await page.waitForTimeout(800); };

async function open(browser, hash, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[map]'))) errors.push(m.text()); });
  await page.goto(BASE + (hash || ''), { waitUntil: 'load' });
  await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
  return { ctx, page, errors };
}

export default async function run(browser, opts) {
  ({ base: BASE, out: OUT, ok } = opts);
    // ---------- 自行車環島
    {
      const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7,0,30');
      await page.click('#tab-travel');
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
      const st = await page.evaluate(() => ({
        stats: document.getElementById('bikeStats').innerText.replace(/\s+/g, ' '),
        stages: [...document.querySelectorAll('#bikeStages button')].map((b) => b.innerText.replace(/\s+/g, ' ')),
        climbs: [...document.querySelectorAll('#bikeClimbs button')].map((b) => b.innerText.replace(/\s+/g, ' ')),
        gaps: [...document.querySelectorAll('#bikeGaps button')].map((b) => b.innerText.replace(/\s+/g, ' ')),
        vis: window.__tw3d.map.getLayoutProperty('bike-route', 'visibility'),
        totalUp: Math.round(window.__tw3d.travel.plan.all.up),
      }));
      ok('環島統計與清單', st.stages.length === 9 && st.climbs.length >= 5 && st.gaps.length === 3 && st.vis === 'visible' && /956/.test(st.stats), JSON.stringify({ stats: st.stats, up: st.totalUp }));
      console.log('  stages:', st.stages.join(' | '));
      console.log('  climbs:', st.climbs.slice(0, 5).join(' | '));
      console.log('  gaps:', st.gaps.join(' | '));
      await page.evaluate(() => window.__tw3d.map.jumpTo({ center: [120.95, 23.65], zoom: 6.9, pitch: 30, bearing: 0 }));
      await settle(page);
      await page.screenshot({ path: OUT + '/t1-bike.png' });

      // 方向與天數
      await page.click('#bikeDirSeg [data-dir="cw"]');
      await page.evaluate(() => { const r = document.getElementById('bikeDays'); r.value = 12; r.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.waitForTimeout(400);
      const cw = await page.evaluate(() => ({ n: document.querySelectorAll('#bikeStages button').length, first: document.querySelector('#bikeStages button').innerText.replace(/\s+/g, ' ') }));
      ok('順時針 12 天', cw.n === 12 && /臺北站 →/.test(cw.first), JSON.stringify(cw));
      await page.click('#bikeDirSeg [data-dir="ccw"]');
      await page.evaluate(() => { const r = document.getElementById('bikeDays'); r.value = 9; r.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.waitForTimeout(400);

      // 選一天 → 卡片、高亮、剖面
      await page.click('#bikeStages li:nth-child(6) button');
      await settle(page);
      const card = await page.evaluate(() => ({ title: document.getElementById('cardTitle').textContent, f1: document.getElementById('cardElevLabel').textContent + ' ' + document.getElementById('cardElev').textContent, metric: document.getElementById('cardMetric').textContent, desc: document.getElementById('cardDesc').textContent, ride: !document.getElementById('cardRide').hidden, hl: window.__tw3d.map.querySourceFeatures('bike-hl').length, hash: location.hash }));
      ok('第 6 天卡片', /→/.test(card.title) && card.f1.startsWith('距離') && card.ride && card.hash === '#bike', JSON.stringify(card));
      await page.click('#cardProfile');
      await waitFor(page, () => document.querySelector('#profileChart svg'));
      const pr = await page.evaluate(() => ({ title: document.getElementById('profileTitle').textContent, stats: document.getElementById('profileStats').textContent, deep: document.body.classList.contains('profile-deep') }));
      ok('當日剖面', pr.title.startsWith('第 6 天') && /爬升/.test(pr.stats) && !pr.deep, JSON.stringify(pr));
      await settle(page);
      await page.screenshot({ path: OUT + '/t2-stage.png' });

      // 爬坡
      await page.click('#bikeClimbs li:nth-child(1) button');
      await settle(page);
      const cl = await page.evaluate(() => ({ title: document.getElementById('cardTitle').textContent, metric: document.getElementById('cardMetric').textContent }));
      ok('最大爬坡卡片', cl.title.length > 0 && /km/.test(cl.metric), JSON.stringify(cl));

      // 虛擬騎乘：位置前進、播放器顯示、暫停／停止
      await page.click('#bikeStages li:nth-child(1) button');
      await page.waitForTimeout(300);
      await page.click('#cardRide');
      await page.waitForTimeout(3000);
      const r1 = await page.evaluate(() => ({ on: window.__tw3d.ride.on, pos: window.__tw3d.ride.pos, stop: document.getElementById('playerStop').textContent, prof: document.getElementById('profileTitle').textContent, speed: document.getElementById('pSpeed').textContent }));
      await page.click('#pSpeed');
      await page.waitForTimeout(1500);
      const r2 = await page.evaluate(() => ({ pos: window.__tw3d.ride.pos, speed: document.getElementById('pSpeed').textContent }));
      ok('虛擬騎乘前進與加速', r1.on && r1.pos > 0.2 && r2.pos > r1.pos && r2.speed === '3×' && /km/.test(r1.stop), JSON.stringify({ r1, r2 }));
      await page.screenshot({ path: OUT + '/t3-ride.png' });
      await page.click('#pPlay');
      const p1 = await page.evaluate(() => window.__tw3d.ride.pos);
      await page.waitForTimeout(800);
      const p2 = await page.evaluate(() => window.__tw3d.ride.pos);
      ok('騎乘暫停', p1 === p2, `${p1} ${p2}`);
      await page.click('#pStop');
      ok('騎乘停止', await page.evaluate(() => !window.__tw3d.ride.on && document.getElementById('player').hidden));

      // 補給點圖層
      await page.click('label:has([data-poi="store"])');
      const filt = await page.evaluate(() => JSON.stringify(window.__tw3d.map.getFilter('bike-poi')));
      ok('補給點篩選', filt.includes('store') && filt.includes('station'), filt);
      ok('環島無 JS 錯誤', errors.length === 0, errors.slice(0, 4).join(' | '));
      await ctx.close();
    }

    // ---------- 健行步道
    {
      const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7,0,30');
      await page.click('#tab-travel');
      await page.click('#travelSeg [data-mode="hike"]');
      await waitFor(page, () => document.querySelectorAll('#hikeList button').length > 50, null, 30000);
      const n0 = await page.evaluate(() => document.querySelectorAll('#hikeList button').length);
      await page.fill('#hikeFilter', '嘉明湖');
      // 篩選延遲 120 ms 才重畫，機器忙時固定等 400 ms 不夠；等到清單更新為止，最多 5 秒
      await waitFor(page, () => document.querySelectorAll('#hikeList button').length < 117, null, 5000).catch(() => {});
      const n1 = await page.evaluate(() => [...document.querySelectorAll('#hikeList button')].map((b) => b.innerText.replace(/\s+/g, ' ')));
      ok('步道清單與篩選', n0 === 117 && n1.length >= 1 && n1[0].includes('嘉明湖'), `${n0} → ${n1.join(' | ')}`);
      await page.click('#hikeList li:nth-child(1) button');
      await settle(page);
      const c = await page.evaluate(() => ({ title: document.getElementById('cardTitle').textContent, index: document.getElementById('cardIndex').textContent, metric: document.getElementById('cardMetric').textContent, desc: document.getElementById('cardDesc').textContent, hash: location.hash, hl: JSON.stringify(window.__tw3d.map.getFilter('trail-hl')) }));
      ok('步道卡片', /嘉明湖/.test(c.title) && /級/.test(c.index) && /爬升/.test(c.metric) && c.hash.startsWith('#trail='), JSON.stringify(c));
      await page.click('#cardProfile');
      await waitFor(page, () => document.querySelector('#profileChart svg'));
      await settle(page);
      await page.screenshot({ path: OUT + '/t4-trail.png' });
      await page.click('#cardRide');
      await page.waitForTimeout(2500);
      const r = await page.evaluate(() => ({ on: window.__tw3d.ride.on, mode: window.__tw3d.ride.mode, pos: window.__tw3d.ride.pos }));
      ok('步道飛覽', r.on && r.mode === 'hike' && r.pos > 0.02, JSON.stringify(r));
      await page.keyboard.press('Escape');
      ok('Esc 停止飛覽', await page.evaluate(() => !window.__tw3d.ride.on));
      // 難度篩選
      await page.fill('#hikeFilter', '');
      await page.click('#hikeChips [data-dif="hard"]');
      await page.waitForTimeout(300);
      const hard = await page.evaluate(() => [...document.querySelectorAll('#hikeList .k')].map((k) => k.textContent));
      ok('難度 4 級以上', hard.length > 0 && hard.every((k) => parseInt(k) >= 4), hard.join(','));
      ok('步道無 JS 錯誤', errors.length === 0, errors.slice(0, 4).join(' | '));
      await ctx.close();
    }

    // ---------- 百岳
    {
      const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7,0,30');
      await page.click('#tab-travel');
      await page.click('#travelSeg [data-mode="peaks"]');
      await waitFor(page, () => document.querySelectorAll('#peakList button').length === 100, null, 30000);
      await page.click('#peakList li:nth-child(1) input');
      await page.click('#peakList li:nth-child(2) input');
      const prog = await page.evaluate(() => ({ done: document.getElementById('peakDone').textContent, ls: localStorage.getItem('tw3d-peaks-done-v1') }));
      ok('登頂紀錄', prog.done === '2' && prog.ls === '[1,2]', JSON.stringify(prog));
      await page.click('#peakChips [data-f="todo"]');
      const todo = await page.evaluate(() => document.querySelectorAll('#peakList button').length);
      ok('未登頂篩選', todo === 98, String(todo));
      await page.click('#peakChips [data-f="all"]');
      await page.click('#peakList li:nth-child(1) button');
      await settle(page);
      const c = await page.evaluate(() => ({ title: document.getElementById('cardTitle').textContent, index: document.getElementById('cardIndex').textContent, f1: document.getElementById('cardElev').textContent, desc: document.getElementById('cardDesc').textContent, hash: location.hash, ride: document.getElementById('cardRide').hidden }));
      ok('玉山卡片', c.title === '玉山' && c.index.includes('已登頂') && /3,952/.test(c.f1) && c.hash === '#peak=1' && c.ride && /玉山東峰|玉山北峰/.test(c.desc), JSON.stringify(c));
      await page.screenshot({ path: OUT + '/t5-peak.png' });
      // 下一座
      await page.click('#cardNext');
      await page.waitForTimeout(300);
      ok('下一座百岳', await page.evaluate(() => document.getElementById('cardTitle').textContent === '雪山'));
      // 重新整理後紀錄仍在。重新整理會取消舊頁面進行中的圖磚請求，Firefox 與 WebKit 會把它記成地圖錯誤
      // （Firefox：NetworkError／aborted；WebKit：Load failed／access control checks，斷在讀取圖磚內容時是「reading the Blob argument」）。
      // 只排除舊頁面卸載期間（到新頁面開始載入為止）的這幾種訊息，新頁面自己的錯誤照算
      const n0 = errors.length;
      await page.reload({ waitUntil: 'commit' });
      errors.push(...errors.splice(n0).filter((e) => !/NetworkError when attempting to fetch resource|The operation was aborted|Load failed|due to access control checks|error occured reading the Blob argument/.test(e)));
      await page.waitForLoadState('load');
      await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
      await waitFor(page, () => window.__tw3d.travel.data.peaks && document.getElementById('cardTitle').textContent === '雪山', null, 30000);
      const kept = await page.evaluate(() => document.getElementById('peakDone').textContent);
      ok('重新整理後保留登頂與 #peak 連結', kept === '2', kept);
      ok('百岳無 JS 錯誤', errors.length === 0, errors.slice(0, 4).join(' | '));
      await ctx.close();
    }

    // ---------- 搜尋與分享連結
    {
      const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7,0,30');
      await page.keyboard.press('/');
      await page.keyboard.type('奇萊');
      await waitFor(page, () => [...document.querySelectorAll('#searchResults li .kind')].some((k) => k.textContent.startsWith('百岳')), null, 30000);
      const res = await page.evaluate(() => [...document.querySelectorAll('#searchResults li')].map((li) => li.innerText.replace(/\s+/g, ' ')).slice(0, 5));
      ok('搜尋奇萊找到百岳', res.some((r) => r.includes('奇萊主山')), res.join(' | '));
      await page.fill('#searchInput', '環島');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
      await waitFor(page, () => !document.getElementById('pane-travel').hidden && window.__tw3d.travel.plan, null, 30000);
      ok('搜尋環島開啟專項', true);
      ok('搜尋無 JS 錯誤', errors.length === 0, errors.slice(0, 4).join(' | '));
      await ctx.close();
      const t = await open(browser, '#trail=139');
      await waitFor(t.page, () => /嘉明湖/.test(document.getElementById('cardTitle').textContent), null, 40000);
      ok('#trail=139 開啟嘉明湖', true);
      await t.ctx.close();
    }

    // ---------- 手機
    {
      const { ctx, page, errors } = await open(browser, '#bike', { viewport: { width: 375, height: 812 }, mobile: true });
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
      await page.click('#sheetHandle');
      await page.waitForTimeout(600);
      const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, tabs: [...document.querySelectorAll('.tabs button')].map((b) => { const r = b.getBoundingClientRect(); return [b.textContent, Math.round(r.width), b.scrollWidth <= b.clientWidth + 1]; }) }));
      ok('手機分頁與寬度', m.sw <= 375 && m.tabs.every((t) => t[2]), JSON.stringify(m));
      await page.screenshot({ path: OUT + '/t6-mobile-pane.png' });
      await page.click('#bikeStages li:nth-child(5) button');
      await settle(page);
      await page.screenshot({ path: OUT + '/t7-mobile-stage.png' });
      const cardOk = await page.evaluate(() => { const r = document.getElementById('card').getBoundingClientRect(); const a = document.querySelector('.card-actions').getBoundingClientRect(); return { cardH: Math.round(r.height), actionsW: Math.round(a.width), fits: a.right <= innerWidth }; });
      ok('手機卡片按鈕不超出', cardOk.fits, JSON.stringify(cardOk));
      ok('手機無 JS 錯誤', errors.length === 0, errors.slice(0, 4).join(' | '));
      await ctx.close();
    }
}
