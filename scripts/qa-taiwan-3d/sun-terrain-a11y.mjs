// 2.4.0：夜光圖磚延遲載入、地形壞值修補、百岳日出、剖面鍵盤操作與文字摘要
// 由 scripts/qa-taiwan-3d.mjs 執行；BASE 為子站網址，OUT 為截圖目錄，ok(name, pass, detail) 記錄結果
let BASE, OUT, ok;

const waitFor = (page, fn, arg, ms = 90000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 200 });
const settle = (page) => waitFor(page, () => !window.__tw3d.map.isMoving() && window.__tw3d.map.areTilesLoaded(), null, 120000);

async function open(browser, hash) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const errors = [], night = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[map]'))) errors.push(m.text()); });
  page.on('request', (r) => { if (/gibs\.earthdata\.nasa\.gov/.test(r.url())) night.push(r.url()); });
  await page.goto(BASE + (hash || ''), { waitUntil: 'load' });
  await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
  return { ctx, page, errors, night };
}

export default async function run(browser, opts) {
  ({ base: BASE, out: OUT, ok } = opts);

  // 1–3. 夜光圖磚：白天不載；碰到日照時間才預先載入；拖到夜晚時燈光出現
  {
    const { ctx, page, errors, night } = await open(browser, '#cam=121,23.7,7.4,16,52');
    await settle(page);
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => ({ vis: window.__tw3d.map.getLayoutProperty('night', 'visibility'), min: window.__tw3d.state.sunMinutes }));
    ok('1 白天預設不載夜光圖磚', st.vis === 'none' && night.length === 0, `${JSON.stringify(st)} 請求 ${night.length}`);
    await page.click('#tab-layers');
    await page.focus('#sun');
    await waitFor(page, () => window.__tw3d.map.getLayoutProperty('night', 'visibility') === 'visible', null, 10000);
    // 圖層改成可見後下一個畫格才發圖磚請求，最多等 15 秒
    for (let i = 0; i < 30 && !night.length; i++) await page.waitForTimeout(500);
    await settle(page);
    ok('2 聚焦日照時間後預先載入夜光圖磚', night.length > 0, `請求 ${night.length}`);
    await page.evaluate(() => { const s = document.getElementById('sun'); s.value = '1200'; s.dispatchEvent(new Event('input', { bubbles: true })); });
    const op = await page.evaluate(() => JSON.stringify(window.__tw3d.map.getPaintProperty('night', 'raster-opacity')));
    ok('3 拖到 20:00 夜光圖層可見且有透明度', /0\.9/.test(op) && (await page.evaluate(() => window.__tw3d.map.getLayoutProperty('night', 'visibility'))) === 'visible', op);
    ok('1–3 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 3b. 沒碰過控制項、太陽在地平線下時也一定顯示（以程式改滑桿值，不觸發聚焦與指標事件）
  {
    const { ctx, page, errors, night } = await open(browser, '#cam=121,23.7,7.4,16,52');
    await settle(page);
    await page.evaluate(() => { const s = document.getElementById('sun'); s.value = '1200'; s.dispatchEvent(new Event('input', { bubbles: true })); });
    const vis = await page.evaluate(() => ({ vis: window.__tw3d.map.getLayoutProperty('night', 'visibility'), focus: document.activeElement?.id || '' }));
    for (let i = 0; i < 30 && !night.length; i++) await page.waitForTimeout(500);
    ok('3b 未預先載入時，入夜也會顯示並下載夜光圖磚', vis.vis === 'visible' && vis.focus !== 'sun' && night.length > 0, `${JSON.stringify(vis)} 請求 ${night.length}`);
    ok('3b 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 4–5. 地形壞值：z14 沿 121°E 的壞線補成周圍高度，兩種地形來源都一樣
  {
    const P = [120.99978, 23.28644];
    const { ctx, page, errors } = await open(browser, `#cam=${P[0]},${P[1]},15.6,40,62`);
    const probe = async () => {
      await waitFor(page, () => window.__tw3d.map.isMoving(), null, 30000).catch(() => {});
      await settle(page);
      return page.evaluate(([lon, lat]) => {
        const m = window.__tw3d.map, ex = m.getTerrain().exaggeration;
        const row = [];
        for (let k = -4; k <= 4; k++) row.push(Math.round(m.queryTerrainElevation([lon + k * 0.00006, lat]) / ex));
        return { src: m.getTerrain().source, zoom: +m.getZoom().toFixed(2), row, spread: Math.max(...row) - Math.min(...row), fix: window.__tw3d.demFixes.get('14/13698/7101') || 0 };
      }, P);
    };
    const flat = await probe();
    ok('4 衛星模式壞線補平（9 點起伏 < 30 m）', flat.src === 'dem-flat' && flat.zoom > 15 && flat.spread < 30 && flat.fix >= 200, JSON.stringify(flat));
    await page.evaluate(() => document.querySelector('#basemapSeg [data-base="ocean"]').click());
    await page.evaluate(([lon, lat]) => window.__tw3d.map.jumpTo({ center: [lon, lat], zoom: 15.6, bearing: 40, pitch: 62 }), P);
    const raw = await probe();
    ok('5 海底地形模式壞線補平', raw.src === 'dem-raw' && raw.zoom > 15 && raw.spread < 30, JSON.stringify(raw));
    ok('4–5 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 6–8. 百岳日出：算法對照 USNO（2026-11-04 臺北 06:03、高雄 06:05）、玉山卡片、其他卡片不顯示
  {
    const { ctx, page, errors } = await open(browser, '#peak=1');
    const calc = await page.evaluate(() => {
      const f = (lat, lon, h, iso) => { const r = window.__tw3d.nextSunrise(lat, lon, h, new Date(iso)); return { t: r.date.getTime(), az: r.azimuth, tomorrow: r.tomorrow }; };
      return {
        taipei: f(25.033, 121.5654, 0, '2026-11-04T00:00:00+08:00'), kaohsiung: f(22.6273, 120.3014, 0, '2026-11-04T00:00:00+08:00'),
        yushan: f(23.47, 120.9572, 3952, '2026-11-04T00:00:00+08:00'), yushan0: f(23.47, 120.9572, 0, '2026-11-04T00:00:00+08:00'),
        evening: f(23.47, 120.9572, 3952, '2026-11-04T19:00:00+08:00'),
      };
    });
    const near = (t, iso) => Math.abs(t - Date.parse(iso)) <= 30000;
    // 基準值 06:02:46、06:04:44 與 USNO 公布的 06:03、06:05 四捨五入後一致
    ok('6 日出算法回歸：2026-11-04 臺北、高雄海平面日出與方位', near(calc.taipei.t, '2026-11-04T06:02:46+08:00') && near(calc.kaohsiung.t, '2026-11-04T06:04:44+08:00')
      && Math.abs(calc.taipei.az - 106.5) < 0.5, JSON.stringify({ taipei: new Date(calc.taipei.t).toISOString(), az: calc.taipei.az.toFixed(1), kaohsiung: new Date(calc.kaohsiung.t).toISOString() }));
    const dipMin = (calc.yushan0.t - calc.yushan.t) / 60000;
    ok('6 山高讓日出提早、晚上改算明天', dipMin > 7 && dipMin < 10 && !calc.yushan.tomorrow && calc.evening.tomorrow && calc.evening.t - calc.yushan.t > 23 * 3600e3, `提早 ${dipMin.toFixed(1)} 分`);
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'peak' && !document.getElementById('cardSun').hidden, null, 60000);
    const card = await page.evaluate(() => {
      const r = window.__tw3d.nextSunrise(23.47, 120.9572, 3952), p = window.__tw3d.travel.data.peaks.peaks[0];
      const e = window.__tw3d.nextSunrise(p.lat, p.lon, p.h), t = new Date(Math.round(e.date.getTime() / 60000) * 60000 + 8 * 3600e3);
      return { text: document.getElementById('cardSun').textContent, hm: `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')}`, az: Math.round(e.azimuth), coord: document.getElementById('cardCoord').textContent, rough: Math.abs(r.date - e.date) < 120000 };
    });
    ok('7 玉山卡片顯示日出時間與方位，座標仍在', /^(今天|明天)（\d{1,2}\/\d{1,2}）日出 \d\d:\d\d · 方位 \d+°（[東西南北]+）$/.test(card.text) && card.text.includes(card.hm) && card.text.includes(`${card.az}°`)
      && /°N .*°E/.test(card.coord) && card.rough, JSON.stringify(card));
    await page.click('#tab-spots');
    await page.click('#spotList li:nth-child(2) button');
    await waitFor(page, () => window.__tw3d.state.current);
    ok('8 導覽點卡片不顯示日出', await page.evaluate(() => document.getElementById('cardSun').hidden));
    await page.evaluate(() => { location.hash = '#trail=139'; });
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'trail', null, 30000);
    ok('8 步道卡片不顯示日出', await page.evaluate(() => document.getElementById('cardSun').hidden));
    ok('6–8 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 9–12. 剖面鍵盤：直線剖面是 slider，左右鍵移動且不切換導覽點；點選中沒有焦點；環島剖面 Enter 選取該天
  {
    const { ctx, page, errors } = await open(browser, '#spot=yushan');
    await waitFor(page, () => window.__tw3d.state.current?.id === 'yushan', null, 30000);
    await page.click('#cardProfile');
    await waitFor(page, () => window.__tw3d.profile.samples && document.getElementById('profileChart').getAttribute('role') === 'slider', null, 60000);
    const a = await page.evaluate(() => { const b = document.getElementById('profileChart'), S = window.__tw3d.profile.samples; return { tab: b.tabIndex, max: +b.getAttribute('aria-valuemax'), len: +S[S.length - 1].d.toFixed(1), label: b.getAttribute('aria-label'), summary: document.getElementById('profileSummary').textContent, desc: b.getAttribute('aria-describedby') }; });
    ok('9 剖面是可聚焦的 slider，附文字摘要', a.tab === 0 && a.max === a.len && /剖面/.test(a.label) && a.desc === 'profileSummary' && /全長 [\d.]+ km/.test(a.summary) && /最高點海拔 [\d,]+ m，在 [\d.]+ km 處/.test(a.summary), JSON.stringify(a));
    await page.focus('#profileChart');
    await page.keyboard.press('End');
    const end = await page.evaluate(() => +document.getElementById('profileChart').getAttribute('aria-valuenow'));
    await page.keyboard.press('Home');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Shift+ArrowRight');
    const k = await page.evaluate(() => {
      const S = window.__tw3d.profile.samples, n = S.length - 1, i = 3 * Math.max(1, Math.round(n / 100)) + Math.max(1, Math.round(n / 10));
      return { now: +document.getElementById('profileChart').getAttribute('aria-valuenow'), expect: +S[i].d.toFixed(1), text: document.getElementById('profileChart').getAttribute('aria-valuetext'), tip: document.querySelector('#pgHover').getAttribute('visibility'), cursor: window.__tw3d.map.getSource('cursor')._data?.geometry?.type || window.__tw3d.map.getSource('cursor').serialize().data?.geometry?.type, spot: window.__tw3d.state.current?.id };
    });
    ok('10 End／Home／左右鍵移動游標，地圖同步標出，不切換導覽點', Math.abs(end - a.len) < 0.15 && k.now === k.expect && /km，海拔 [\d,]+ m/.test(k.text) && k.tip === 'visible' && k.cursor === 'Point' && k.spot === 'yushan', JSON.stringify({ end, ...k }));
    // 滑鼠點剖面不搶焦點：先移走焦點，點一下剖面，全站左右鍵仍切換導覽點
    await page.evaluate(() => document.activeElement.blur());
    const r = await page.evaluate(() => { const b = document.querySelector('#pgHit').getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; });
    await page.mouse.click(r.x, r.y);
    const focusAfterClick = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
    ok('10b 滑鼠點剖面不會讓剖面取得焦點', focusAfterClick !== 'profileChart', focusAfterClick);
    await page.screenshot({ path: `${OUT}/a11y-profile-key.png` });
    // 剖面開著時工具列按鈕是「關閉」，先關掉再按一次進入點選起終點
    await page.click('#profileClose');
    await page.click('#tProfile');
    await waitFor(page, () => window.__tw3d.profile.picking, null, 10000);
    const busy = await page.evaluate(() => { const b = document.getElementById('profileChart'); return { role: b.getAttribute('role'), tab: b.getAttribute('tabindex'), summary: document.getElementById('profileSummary').textContent }; });
    ok('11 點選起終點時剖面區不是 slider、摘要清空', busy.role === null && busy.tab === null && busy.summary === '', JSON.stringify(busy));
    await page.keyboard.press('Escape');
    await page.click('#tab-travel');
    await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
    await page.click('#bikeProfile');
    await waitFor(page, () => window.__tw3d.profile.path?.onPick && document.getElementById('profileChart').getAttribute('role') === 'slider', null, 30000);
    await page.focus('#profileChart');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'stage', null, 10000);
    const sel = await page.evaluate(() => ({ k: window.__tw3d.travel.sel.k, n: window.__tw3d.travel.plan.stages.length, summary: document.getElementById('profileSummary').textContent }));
    ok('12 環島剖面 End＋Enter 選取最後一天', sel.k === sel.n, JSON.stringify(sel));
    ok('9–12 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 13–16. 點數少的步道、只有一個點的步道、飛覽中跳轉、起終點重合
  {
    const { ctx, page, errors } = await open(browser, '#trail=107');
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'trail', null, 60000);
    await page.click('#cardProfile');
    await waitFor(page, () => document.getElementById('profileChart').getAttribute('role') === 'slider', null, 30000);
    await page.focus('#profileChart');
    await page.keyboard.press('Home');
    const steps = [];
    for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); steps.push(await page.evaluate(() => window.__tw3d.profile.keyI)); }
    const S = await page.evaluate(() => window.__tw3d.profile.samples.length);
    ok('13 只有 3 點的步道（107 崁頂）左右鍵每次移一點、到終點為止', S === 3 && steps.join() === '1,2,2', `樣本 ${S} 點，按鍵後索引 ${steps.join()}`);

    await page.evaluate(() => { location.hash = '#trail=180'; });
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'trail' && document.getElementById('cardTitle').textContent === '龍麟山步道', null, 30000);
    await page.keyboard.press('Escape');
    // 在頁面內量點擊處理的同步耗時（修正前長度 0 的剖面會讓刻度迴圈跑約 5 秒）
    const one = await page.evaluate(() => {
      const t = (id) => { const t0 = performance.now(); document.getElementById(id).click(); return Math.round(performance.now() - t0); };
      const msProfile = t('cardProfile');
      const r = { msProfile, open: !document.getElementById('profile').hidden, toast: document.getElementById('toast').textContent };
      r.msRide = t('cardRide');
      r.ride = window.__tw3d.ride.on;
      return r;
    });
    ok('14 只有一個點的步道（180）按剖面與飛覽不會卡住，提示無法畫剖面', one.msProfile < 500 && one.msRide < 500 && !one.open && !one.ride && /只有一個點/.test(one.toast), JSON.stringify(one));

    await page.evaluate(() => { location.hash = '#trail=139'; });
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'trail' && document.getElementById('cardTitle').textContent.includes('嘉明湖'), null, 30000);
    await page.click('#cardRide');
    await waitFor(page, () => window.__tw3d.ride.on && window.__tw3d.profile.path?.ride === 'hike' && document.getElementById('profileChart').getAttribute('role') === 'slider', null, 30000);
    await page.focus('#profileChart');
    await page.keyboard.press('End');
    await page.waitForTimeout(800);
    const held = await page.evaluate(() => ({ now: +document.getElementById('profileChart').getAttribute('aria-valuenow'), max: +document.getElementById('profileChart').getAttribute('aria-valuemax'), pos: window.__tw3d.ride.pos }));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    const jumped = await page.evaluate(() => ({ pos: window.__tw3d.ride.pos, end: window.__tw3d.ride.end }));
    ok('15 飛覽中鍵盤游標不被騎乘位置拉回，Enter 跳到該處', held.now === held.max && held.pos < held.max - 1 && jumped.end - jumped.pos < 0.3, JSON.stringify({ held, jumped }));
    await page.keyboard.press('Escape');

    await page.evaluate(() => { location.hash = ''; });
    await page.keyboard.press('Escape');
    await waitFor(page, () => !window.__tw3d.ride.on, null, 10000);
    if (!(await page.evaluate(() => document.getElementById('profile').hidden))) await page.click('#profileClose');
    await page.click('#tProfile');
    await waitFor(page, () => window.__tw3d.profile.picking, null, 10000);
    // 同一個座標送兩次地圖點擊。用真的滑鼠點同一像素不保證同一地點：3D 地形下 WebKit 換算出的座標會隨地形圖磚細化而差幾公尺
    await page.evaluate(() => { const m = window.__tw3d.map, ll = m.getCenter(); for (let i = 0; i < 2; i++) m.fire('click', { lngLat: ll, point: m.project(ll) }); });
    await waitFor(page, () => /太短/.test(document.getElementById('profileChart').textContent), null, 30000).catch(() => {});
    const zero = await page.evaluate(() => ({ text: document.getElementById('profileChart').textContent, role: document.getElementById('profileChart').getAttribute('role') }));
    ok('16 起終點點在同一處：提示太短、不是 slider', /太短/.test(zero.text) && zero.role === null, JSON.stringify(zero));
    ok('13–16 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
}
