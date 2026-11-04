// 2.5.0／2.5.1：旅遊專項延遲載入模組、百岳日出隨時間更新、無障礙修正（工具列 landmark、來源說明鈕不被剖面蓋住、手機把手觸控高度；2.5.1 介紹卡播報）
// 由 scripts/qa-taiwan-3d.mjs 執行；BASE 為子站網址，OUT 為截圖目錄，ok(name, pass, detail) 記錄結果
let BASE, OUT, ok;

const waitFor = (page, fn, arg, ms = 90000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 200 });

async function open(browser, hash, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, isMobile: !!opts.mobile, hasTouch: !!opts.mobile });
  const page = await ctx.newPage();
  const errors = [], reqs = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || (m.type() === 'warning' && m.text().includes('[map]'))) errors.push(m.text()); });
  page.on('request', (r) => { if (/travel\.js|cycling\.json|trails\.json|peaks\.json/.test(r.url())) reqs.push(r.url().split('/').pop()); });
  if (opts.clock) await page.clock.install({ time: opts.clock });
  await page.goto(BASE + (hash || ''), { waitUntil: 'load' });
  await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
  return { ctx, page, errors, reqs };
}

export default async function run(browser, opts) {
  ({ base: BASE, out: OUT, ok } = opts);
  const engine = browser.browserType().name();

  // 1–3. 預設不載旅遊模組與資料；開旅遊分頁才載，而且只載一次；控制項正常
  {
    const { ctx, page, errors, reqs } = await open(browser, '#cam=121,23.7,7.4,16,52');
    await waitFor(page, () => !window.__tw3d.map.isMoving(), null, 60000);
    await page.waitForTimeout(1500);
    ok('1 預設畫面不下載旅遊模組與資料', reqs.length === 0, reqs.join(', '));
    await page.click('#tab-travel');
    await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
    await page.click('#travelSeg [data-mode="hike"]');
    await waitFor(page, () => document.querySelectorAll('#hikeList button').length > 50, null, 30000);
    const mods = reqs.filter((u) => u.startsWith('travel.js'));
    ok('2 開旅遊分頁才載入模組，只載一次', mods.length === 1 && reqs.some((u) => u.startsWith('cycling.json')), reqs.join(', '));
    await page.click('#travelSeg [data-mode="bike"]');
    await page.evaluate(() => { const s = document.getElementById('bikeDays'); s.value = '12'; s.dispatchEvent(new Event('input', { bubbles: true })); });
    await waitFor(page, () => window.__tw3d.travel.plan?.stages.length === 12, null, 10000);
    ok('3 模組綁定的控制項可用（天數改 12 天）', await page.evaluate(() => document.getElementById('bikeDaysOut').textContent === '12 天'));
    ok('1–3 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 4. 模組載入前就動過天數滑桿：載入後以畫面上的值為準
  {
    const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7.4,16,52');
    await page.evaluate(() => { const s = document.getElementById('bikeDays'); s.value = '6'; s.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.click('#tab-travel');
    await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
    const st = await page.evaluate(() => ({ days: window.__tw3d.travel.days, stages: window.__tw3d.travel.plan.stages.length, out: document.getElementById('bikeDaysOut').textContent }));
    ok('4 載入前改的天數在載入後生效', st.days === 6 && st.stages === 6 && st.out === '6 天', JSON.stringify(st));
    ok('4 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 5. 搜尋：沒開過旅遊分頁也能搜到百岳並開啟卡片
  {
    const { ctx, page, errors, reqs } = await open(browser, '#cam=121,23.7,7.4,16,52');
    await page.keyboard.press('/');
    await page.keyboard.type('雪山');
    // 只認種類標「百岳 #」的結果：「百岳圈谷路線」這條導覽路線也含「百岳」二字，資料到達前可能排在前面
    const isPeak = '[...document.querySelectorAll("#searchResults [role=option]")].find((x) => /^百岳 #/.test(x.querySelector(".kind")?.textContent || "") && x.querySelector(".nm")?.textContent === "雪山")';
    await waitFor(page, `!!${isPeak}`, null, 30000);
    const pick = await page.evaluate(`(() => { const el = ${isPeak}; el.click(); return el.textContent.slice(0, 30); })()`);
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'peak' && document.getElementById('cardTitle').textContent === '雪山', null, 30000);
    ok('5 未開旅遊分頁時搜尋百岳：載入模組並開啟雪山卡片', reqs.some((u) => u.startsWith('travel.js')), `${pick} ${reqs.join(', ')}`);
    ok('5 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 6–7. 日出一行隨時間更新：跨過日出改成明天；系統時間跳過午夜後「明天」改成「今天」
  {
    const { ctx, page, errors } = await open(browser, '#peak=1', { clock: new Date('2026-11-04T05:50:00+08:00') });
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'peak' && !document.getElementById('cardSun').hidden, null, 60000);
    const t = () => page.evaluate(() => document.getElementById('cardSun').textContent);
    const idle = () => waitFor(page, () => !window.__tw3d.map.isMoving() && window.__tw3d.map.areTilesLoaded(), null, 120000);
    // 快轉時鐘會讓進行中的地形圖磚請求直接觸發網站的 12 秒逾時（實測 dem-shade z11「signal timed out」），
    // 等地圖靜止也不保證沒有請求在路上。只排除快轉那一刻的逾時與取消訊息，其餘錯誤照算
    const jump = async (fn) => {
      const n0 = errors.length;
      await fn();
      await page.waitForTimeout(500);
      errors.push(...errors.splice(n0).filter((e) => !/signal timed out|The user aborted a request/.test(e)));
    };
    await idle();
    const a = await t();
    await jump(() => page.clock.fastForward('10:00'));
    const b = await t();
    await idle();
    await jump(async () => { await page.clock.setSystemTime(new Date('2026-11-04T23:59:40+08:00')); await page.clock.fastForward('01:05'); });
    const c = await t();
    ok('6 卡片開著跨過日出：今天 → 明天', /^今天（11\/4）日出 05:5\d/.test(a) && /^明天（11\/5）日出 05:5\d/.test(b), `${a} → ${b}`);
    ok('7 系統時間跳過午夜：明天 → 今天（同一天日出）', /^今天（11\/5）日出 05:5\d/.test(c), c);
    ok('6–7 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 8–9. 無障礙：工具列在 landmark 內；剖面開著時來源說明鈕不被蓋住、可點
  {
    const { ctx, page, errors } = await open(browser, '#spot=yushan');
    await waitFor(page, () => window.__tw3d.state.current?.id === 'yushan', null, 30000);
    const land = await page.evaluate(() => { const t = document.querySelector('.tools'), a = t.closest('aside, nav, main, header, footer, [role="region"], [role="complementary"], [role="navigation"]'); return { tag: a?.tagName, label: a?.getAttribute('aria-label') }; });
    ok('8 地圖工具列在有名稱的 landmark 內', land.tag === 'ASIDE' && !!land.label, JSON.stringify(land));
    await page.click('#cardProfile');
    await waitFor(page, () => document.querySelector('#profileChart svg'), null, 60000);
    await page.waitForTimeout(800);
    const at = await page.evaluate(() => {
      const a = document.querySelector('.maplibregl-ctrl-attrib-button').getBoundingClientRect(), p = document.getElementById('profile').getBoundingClientRect();
      const top = document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2);
      return { size: [Math.round(a.width), Math.round(a.height)], overlap: !(a.bottom <= p.top || a.top >= p.bottom || a.right <= p.left || a.left >= p.right), top: top?.classList.contains('maplibregl-ctrl-attrib-button') };
    });
    ok('9 剖面開著時來源說明鈕不被剖面蓋住、至少 24 px', !at.overlap && at.top && at.size[0] >= 24 && at.size[1] >= 24, JSON.stringify(at));
    ok('8–9 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 9b. 每日行程卡片按「飛覽」：卡片、全程剖面與播放器同時開著，來源說明鈕不被剖面或播放器蓋住（1024 寬最擠）
  {
    const { ctx, page, errors } = await open(browser, '#bike', { viewport: { width: 1024, height: 768 } });
    await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
    await page.click('#bikeStages li:nth-child(3) button');
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'stage', null, 10000);
    await page.click('#cardRide');
    await waitFor(page, () => window.__tw3d.ride.on && document.querySelector('#profileChart svg') && !document.getElementById('player').hidden, null, 30000);
    await page.waitForTimeout(800);
    const at = await page.evaluate(() => {
      const box = (el) => el.getBoundingClientRect(), hit = (a, b) => !(a.bottom <= b.top || a.top >= b.bottom || a.right <= b.left || a.left >= b.right);
      const a = box(document.querySelector('.maplibregl-ctrl-attrib-button'));
      // 按鈕是圓的，取內切圓裡的上下左右與中心五點（外接方框的角落點擊會落到地圖上）
      const cx = a.left + a.width / 2, cy = a.top + a.height / 2, r = a.width * 0.35;
      const pts = [[cx, cy], [cx - r, cy], [cx + r, cy], [cx, cy - r], [cx, cy + r]];
      return { profile: hit(a, box(document.getElementById('profile'))), player: hit(a, box(document.getElementById('player'))), card: !document.getElementById('card').hidden, allOnTop: pts.every(([x, y]) => document.elementFromPoint(x, y)?.closest('.maplibregl-ctrl-attrib-button')) };
    });
    ok('9b 卡片＋剖面＋播放器同時開著：來源說明鈕上下左右與中心都點得到', at.card && !at.profile && !at.player && at.allOnTop, JSON.stringify(at));
    ok('9b 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 10. 手機：抽屜把手觸控高度 ≥ 24 px，分頁鈕仍 ≥ 24 px，兩者都在露出的 58 px 內；步道剖面開著時來源說明鈕不被蓋住
  {
    const { ctx, page, errors } = await open(browser, '#cam=121,23.7,6.45,16,46', { viewport: { width: 375, height: 812 }, mobile: engine !== 'firefox' });
    const g = await page.evaluate(() => {
      const r = (s) => document.querySelector(s).getBoundingClientRect(), panel = r('#panel'), tab = r('#tab-spots');
      return { handle: Math.round(r('#sheetHandle').height), tab: Math.round(tab.height), used: Math.round(tab.bottom - panel.top), peek: Math.round(innerHeight - panel.top) };
    });
    ok('10 手機把手 ≥ 24 px、分頁鈕 ≥ 24 px，都在露出的 58 px 內', g.handle >= 24 && g.tab >= 24 && g.used <= g.peek && g.peek === 58, JSON.stringify(g));
    await page.evaluate(() => { location.hash = '#trail=139'; });
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'trail', null, 60000);
    await page.click('#cardProfile');
    await waitFor(page, () => document.querySelector('#profileChart svg'), null, 60000);
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => {
      const a = document.querySelector('.maplibregl-ctrl-attrib-button').getBoundingClientRect(), p = document.getElementById('profile').getBoundingClientRect();
      return { overlap: !(a.bottom <= p.top || a.top >= p.bottom || a.right <= p.left || a.left >= p.right), top: !!document.elementFromPoint(a.left + a.width / 2, a.top + a.height / 2)?.closest('.maplibregl-ctrl-attrib-button') };
    });
    ok('10 手機步道剖面開著時來源說明鈕不被蓋住', !m.overlap && m.top, JSON.stringify(m));
    ok('10 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 10b. 從網址、搜尋、分頁三種入口都碰過之後，旅遊控制項的事件只綁一次（模組只 init 一次）
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await ctx.addInitScript(() => {
      window.__bind = {};
      const add = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, fn, o) { if (this.id) { const k = `${this.id}:${type}`; window.__bind[k] = (window.__bind[k] || 0) + 1; } return add.call(this, type, fn, o); };
    });
    const page = await ctx.newPage();
    await page.goto(BASE + '#peak=1', { waitUntil: 'load' });
    await waitFor(page, () => window.__tw3d?.travel.sel?.kind === 'peak', null, 90000);
    await page.keyboard.press('/');
    await page.keyboard.type('嘉明湖');
    await page.waitForTimeout(800);
    // 搜尋框是 type=search：第一次 Esc 只清空文字，第二次才關閉對話框
    for (let i = 0; i < 3 && (await page.evaluate(() => document.getElementById('search').open)); i++) await page.keyboard.press('Escape');
    await page.click('#tab-travel');
    await page.click('#travelSeg [data-mode="bike"]');
    await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
    const b = await page.evaluate(() => ({ days: window.__bind['bikeDays:input'], gpx: window.__bind['bikeGpx:click'], ride: window.__bind['cardRide:click'], peaks: window.__bind['peakList:click'] }));
    ok('10b 三種入口都用過後，旅遊控制項各只綁一次', b.days === 1 && b.gpx === 1 && b.ride === 1 && b.peaks === 1, JSON.stringify(b));
    await ctx.close();
  }

  // 16（2.5.1，NVDA 2026.3 實測後的修正）：介紹卡改由 #cardStatus 依畫面順序播報一次
  {
    const { ctx, page, errors } = await open(browser, '#peak=1');
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'peak' && !document.getElementById('cardSun').hidden, null, 60000);
    const order = (s, words) => words.every((w, i) => s.indexOf(w) >= 0 && (i === 0 || s.indexOf(w) > s.indexOf(words[i - 1])));
    const peak = await page.evaluate(() => ({ live: document.getElementById('card').getAttribute('aria-live'), role: document.getElementById('cardStatus').getAttribute('role'), text: document.getElementById('cardStatus').textContent, sun: document.getElementById('cardSun').textContent }));
    ok('16 百岳卡片：卡片本身不是 live region，#cardStatus 依序念出名稱、測高、座標、日出與說明', peak.live === null && peak.role === 'status' && order(peak.text, ['百岳 #1', '玉山', '最新測高 3,952 m', '座標', peak.sun.replace(/[。\s]+$/, ''), '常見登山路線']), JSON.stringify(peak).slice(0, 400));
    await page.click('#cardNext');
    await waitFor(page, () => document.getElementById('cardTitle').textContent === '雪山', null, 30000);
    await page.waitForTimeout(200);
    const next = await page.evaluate(() => document.getElementById('cardStatus').textContent);
    ok('16 按「下一個」：播報換成雪山，只有一段', order(next, ['百岳 #2', '雪山', '最新測高']) && !/玉山（/.test(next.split('常見登山路線')[0]), next.slice(0, 120));
    await page.click('#tab-spots');
    await page.click('#spotList li:nth-child(2) button');
    await waitFor(page, () => window.__tw3d.state.current, null, 30000);
    await page.waitForTimeout(200);
    const spot = await page.evaluate(() => ({ title: document.getElementById('cardTitle').textContent, text: document.getElementById('cardStatus').textContent }));
    ok('16 導覽點卡片也由 #cardStatus 播報，名稱在前、說明在後', spot.text.includes(spot.title) && order(spot.text, [spot.title, '海拔', '座標']), JSON.stringify(spot).slice(0, 200));
    ok('16 無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }

  // 11–14 需要攔截或延遲 travel.js。page.route 會讓 WebKit 的圖磚請求卡住，只在 Chromium／Firefox 測
  if (engine !== 'webkit') {
    const routed = async (handler) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.route(/travel\.js/, handler);
      return { ctx, page, errors };
    };
    // 11. 第一次載入失敗：顯示提示；再按一次就以新網址重試成功
    {
      let n = 0;
      const { ctx, page, errors } = await routed((r) => (n++ === 0 ? r.abort() : r.continue()));
      await page.goto(BASE + '#cam=121,23.7,7.4,16,52', { waitUntil: 'load' });
      await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
      await page.click('#tab-travel');
      await waitFor(page, () => /載入失敗/.test(document.getElementById('bikeHint').textContent), null, 20000).catch(() => {});
      const hint = await page.evaluate(() => document.getElementById('bikeHint').textContent);
      await page.click('#travelSeg [data-mode="bike"]');
      await waitFor(page, () => window.__tw3d.travel.plan, null, 30000).catch(() => {});
      const plan = await page.evaluate(() => !!window.__tw3d.travel.plan);
      ok('11 模組載入失敗時顯示提示，再按一次重試成功', /旅遊專項載入失敗/.test(hint) && plan && n === 2 && errors.length === 0, `${hint} 請求 ${n} 次 plan=${plan} ${errors.slice(0, 2).join(' | ')}`);
      await ctx.close();
    }
    // 12. #peak= 深層連結載入失敗：直接切到百岳子面板，提示看得到
    {
      const { ctx, page, errors } = await routed((r) => r.abort());
      await page.goto(BASE + '#peak=1', { waitUntil: 'load' });
      await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
      await waitFor(page, () => /載入失敗/.test(document.getElementById('peakHint').textContent), null, 20000).catch(() => {});
      const st = await page.evaluate(() => ({ peaksPane: !document.getElementById('travel-peaks').hidden, bikePane: !document.getElementById('travel-bike').hidden, seg: document.querySelector('#travelSeg [aria-checked="true"]')?.dataset.mode, hint: document.getElementById('peakHint').textContent }));
      ok('12 #peak= 連結在模組載入失敗時切到百岳子面板並顯示提示', st.peaksPane && !st.bikePane && st.seg === 'peaks' && /旅遊專項載入失敗/.test(st.hint) && errors.length === 0, JSON.stringify(st));
      await ctx.close();
    }
    // 13. 競態：#peak= 等模組下載時使用者先點了導覽點，延遲的百岳選取要放棄
    {
      const { ctx, page, errors } = await routed(async (r) => { await new Promise((s) => setTimeout(s, 3000)); r.continue(); });
      await page.goto(BASE + '#peak=1', { waitUntil: 'load' });
      await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
      await page.click('#tab-spots');
      await page.click('#spotList li:nth-child(2) button');
      const spot = await page.evaluate(() => window.__tw3d.state.current?.id);
      await waitFor(page, () => window.__tw3d.travel.data.peaks, null, 30000);
      await page.waitForTimeout(800);
      const st = await page.evaluate(() => ({ spot: window.__tw3d.state.current?.id, sel: window.__tw3d.travel.sel?.kind || null }));
      ok('13 模組到達前先選了導覽點：延遲的百岳選取被放棄', !!spot && st.spot === spot && st.sel === null && errors.length === 0, JSON.stringify({ spot, ...st }));
      await ctx.close();
    }
    // 14. 模組下載期間按「順時針」與「百岳」：載入後方向照按的套用，分段鈕的鍵盤焦點順序也正確
    {
      // 延遲 6 秒：機器忙時三次點擊可能就超過 2 秒，模組先到了，就測不到「下載期間」
      const { ctx, page, errors } = await routed(async (r) => { await new Promise((s) => setTimeout(s, 6000)); r.continue(); });
      await page.goto(BASE + '#cam=121,23.7,7.4,16,52', { waitUntil: 'load' });
      await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
      await page.click('#tab-travel');
      await page.click('#bikeDirSeg [data-dir="cw"]');
      await page.click('#travelSeg [data-mode="peaks"]');
      const early = await page.evaluate(() => ({ loaded: !!window.__tw3d.travel.data.peaks, peaksPane: !document.getElementById('travel-peaks').hidden }));
      await waitFor(page, () => window.__tw3d.travel.data.peaks && document.querySelectorAll('#peakList button').length === 100, null, 30000);
      await page.waitForTimeout(300);
      const st = await page.evaluate(() => {
        const seg = (sel, key) => [...document.querySelectorAll(`${sel} button`)].map((b) => `${b.dataset[key]}:${b.getAttribute('aria-checked')}:${b.tabIndex}`).join(' ');
        return { dir: window.__tw3d.travel.dir, travelSeg: seg('#travelSeg', 'mode'), dirSeg: seg('#bikeDirSeg', 'dir') };
      });
      ok('14 下載期間按的「順時針」載入後生效，「百岳」立刻切換', !early.loaded && early.peaksPane && st.dir === 'cw' && /cw:true/.test(st.dirSeg) && errors.length === 0, JSON.stringify({ early, ...st }));
      ok('14 分段鈕只有選中的那顆可用 Tab 聚焦', /peaks:true:0/.test(st.travelSeg) && !/:false:0/.test(st.travelSeg) && /cw:true:0/.test(st.dirSeg) && !/:false:0/.test(st.dirSeg), `${st.travelSeg} ｜ ${st.dirSeg}`);
      await ctx.close();
    }
  }
}
