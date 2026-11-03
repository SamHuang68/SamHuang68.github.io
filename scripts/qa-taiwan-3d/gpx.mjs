// GPX 匯出：全程、當日、爬坡、步道與百岳的檔案內容，以及下載鈕的顯示與手機版面
// 由 scripts/qa-taiwan-3d.mjs 執行；BASE 為子站網址，OUT 為截圖目錄，ok(name, pass, detail) 記錄結果
import fs from 'node:fs';
let BASE, OUT, ok;

const waitFor = (page, fn, arg, ms = 90000) => page.waitForFunction(fn, arg, { timeout: ms, polling: 200 });

async function open(browser, hash, opts = {}) {
  const ctx = await browser.newContext({ viewport: opts.viewport || { width: 1440, height: 900 }, isMobile: !!opts.mobile, hasTouch: !!opts.mobile, acceptDownloads: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(BASE + (hash || ''), { waitUntil: 'load' });
  await waitFor(page, () => window.__tw3d && window.__tw3d.map.loaded());
  return { ctx, page, errors };
}

// 觸發下載，在頁面內以 DOMParser 解析檔案，回傳檔名與內容摘要
async function grab(page, click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), click()]);
  const text = fs.readFileSync(await dl.path(), 'utf8');
  const info = await page.evaluate((t) => {
    const d = new DOMParser().parseFromString(t, 'application/xml');
    const all = (el, tag) => [...el.getElementsByTagName(tag)];
    const name = (el) => el.getElementsByTagName('name')[0]?.textContent;
    const pts = all(d, 'trkpt');
    return {
      err: all(d, 'parsererror').length, ns: d.documentElement.namespaceURI, version: d.documentElement.getAttribute('version'),
      trk: all(d, 'trk').map((k) => ({ name: name(k), pts: all(k, 'trkpt').length, segs: all(k, 'trkseg').length })),
      wpt: all(d, 'wpt').map((w) => ({ name: name(w), type: w.getElementsByTagName('type')[0]?.textContent || '', src: w.getElementsByTagName('src')[0]?.textContent || '' })),
      p100: pts[100] ? [+pts[100].getAttribute('lon'), +pts[100].getAttribute('lat')] : null,
      withEle: pts.filter((p) => p.getElementsByTagName('ele').length).length,
      license: d.getElementsByTagName('license')[0]?.textContent, desc: d.getElementsByTagName('desc')[0]?.textContent || '',
    };
  }, text);
  return { file: dl.suggestedFilename(), bytes: text.length, ...info };
}
const brief = (g) => JSON.stringify({ file: g.file, bytes: g.bytes, err: g.err, trk: g.trk, wpt: g.wpt.length, license: g.license });
const wellFormed = (g) => g.err === 0 && g.ns === 'http://www.topografix.com/GPX/1/1' && g.version === '1.1';

export default async function run(browser, opts) {
  ({ base: BASE, out: OUT, ok } = opts);
  // 1–4. 環島：全程、當日、爬坡、換方向
  {
    const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7,0,30');
    await page.click('#tab-travel');
    await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
    const plan = await page.evaluate(() => { const p = window.__tw3d.travel.plan; return { n: p.m.path.length, stages: p.stages.length, p100: p.m.path[100].p }; });
    const all = await grab(page, () => page.click('#bikeGpx'));
    ok('1 全程 GPX：一條軌跡、每點有高度、每日終點航點、ODbL 授權', wellFormed(all) && all.trk.length === 1 && all.trk[0].pts === plan.n && all.withEle === plan.n
      && all.wpt.length === plan.stages && /逆時針-9天\.gpx$/.test(all.file) && /odbl/.test(all.license) && /OpenStreetMap/.test(all.desc), brief(all));

    await page.click('#bikeStages li:nth-child(3) button');
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'stage');
    const st = await page.evaluate(() => { const s = window.__tw3d.travel.plan.stages[2]; return { n: s.b - s.a + 1, from: s.from, to: s.to, stations: window.__tw3d.travel.plan.m.pois.station.filter((x) => x.d > s.d0 + 0.5 && x.d < s.d1 - 0.5).length, gpx: !document.getElementById('cardGpx').hidden }; });
    const day = await grab(page, () => page.click('#cardGpx'));
    ok('2 第 3 天 GPX：當日軌跡、起終點與途經車站', st.gpx && wellFormed(day) && day.trk.length === 1 && day.trk[0].pts === st.n && day.wpt.length === st.stations + 2
      && day.wpt[0].name === `起點 ${st.from}` && day.wpt.at(-1).name === `終點 ${st.to}` && day.wpt.slice(1, -1).every((w) => w.type === '臺鐵車站') && /D3/.test(day.file), `${brief(day)} ${JSON.stringify(st)}`);

    await page.click('#bikeClimbs li:nth-child(1) button');
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'climb');
    const cn = await page.evaluate(() => { const c = window.__tw3d.travel.plan.climbs[0]; return c.b - c.a + 1; });
    const climb = await grab(page, () => page.click('#cardGpx'));
    ok('3 爬坡 GPX：坡段軌跡與坡底、坡頂', wellFormed(climb) && climb.trk[0].pts === cn && climb.wpt.map((w) => w.name).join() === '坡底,坡頂', brief(climb));

    await page.click('#bikeDirSeg [data-dir="cw"]');
    await waitFor(page, () => window.__tw3d.travel.dir === 'cw' && window.__tw3d.travel.plan.m.dir === 'cw');
    const cw100 = await page.evaluate(() => window.__tw3d.travel.plan.m.path[100].p);
    const cw = await grab(page, () => page.click('#bikeGpx'));
    // 兩個方向都從臺北出發，以第 100 點（約 10 km 處）分辨方向
    const near = (a, b) => Math.abs(a[0] - b[0]) < 2e-5 && Math.abs(a[1] - b[1]) < 2e-5;
    ok('4 順時針 GPX：檔名與軌跡方向跟著改', /順時針/.test(cw.file) && near(cw.p100, cw100) && near(all.p100, plan.p100) && !near(cw.p100, all.p100) && cw.trk[0].pts === plan.n,
      `${cw.file} ${JSON.stringify({ cw: cw.p100, ccw: all.p100 })}`);
    ok('5 環島匯出無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 6. 步道：主線、支線分段與入口
  {
    const { ctx, page, errors } = await open(browser, '#trail=139');
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'trail' && !document.getElementById('cardGpx').hidden, null, 60000);
    const t = await page.evaluate(() => { const t = window.__tw3d.travel.data.hike.trails.find((x) => x.id === '139'); return { main: t.segs[0].lon.length, rest: t.segs.length - 1, entrances: t.entrances.length }; });
    const g = await grab(page, () => page.click('#cardGpx'));
    ok('6 步道 GPX：主線、其他分段與入口航點', wellFormed(g) && g.trk[0].pts === t.main && /主線/.test(g.trk[0].name) && g.trk[1]?.segs === t.rest && g.wpt.length === t.entrances
      && /data\.gov\.tw\/license/.test(g.license) && /嘉明湖/.test(g.file), `${brief(g)} ${JSON.stringify(t)}`);
    ok('6 步道匯出無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
  // 7. 百岳：山頂航點；8. 導覽點卡片不顯示下載鈕
  {
    const { ctx, page } = await open(browser, '#peak=1');
    await waitFor(page, () => window.__tw3d.travel.sel?.kind === 'peak' && !document.getElementById('cardGpx').hidden, null, 60000);
    const g = await grab(page, () => page.click('#cardGpx'));
    const src = await page.evaluate(() => window.__tw3d.travel.data.peaks.peaks[0].src);
    ok('7 百岳 GPX：玉山山頂航點、CC BY-SA 授權與座標出處', wellFormed(g) && g.trk.length === 0 && g.wpt.length === 1 && g.wpt[0].name === '玉山' && /by-sa/.test(g.license)
      && (src === 'osm' ? /OpenStreetMap.*ODbL/ : /Wikidata.*CC0/).test(g.wpt[0].src), `${brief(g)} src=${src} ${g.wpt[0].src}`);
    await page.click('#tab-spots');
    await page.click('#spotList li:nth-child(2) button');
    await waitFor(page, () => window.__tw3d.state.current);
    ok('8 導覽點卡片不顯示 GPX 下載鈕', await page.evaluate(() => document.getElementById('cardGpx').hidden));
    await ctx.close();
  }
  // 9. 手機：選取當日後，卡片按鈕列（含下載鈕）不超出、文字不被截斷
  {
    const { ctx, page, errors } = await open(browser, '#cam=121,23.7,7,0,30', { viewport: { width: 375, height: 812 }, mobile: true });
    await page.click('#tab-travel');
    await waitFor(page, () => window.__tw3d.travel.plan, null, 30000);
    await page.click('#bikeStages li:nth-child(2) button');
    await waitFor(page, () => !window.__tw3d.map.isMoving());
    const r = await page.evaluate(() => {
      const bs = [...document.querySelectorAll('.card-actions .btn')].filter((b) => !b.hidden);
      return { n: bs.length, gpx: !document.getElementById('cardGpx').hidden, fits: bs.every((b) => b.getBoundingClientRect().right <= innerWidth && b.scrollWidth <= b.clientWidth + 1), w: bs.map((b) => Math.round(b.getBoundingClientRect().width)) };
    });
    await page.screenshot({ path: `${OUT}/gpx-mobile-card.png` });
    ok('9 手機卡片按鈕列含下載鈕且不超出', r.gpx && r.n === 6 && r.fits, JSON.stringify(r));
    ok('9 手機無 JS 錯誤', errors.length === 0, errors.slice(0, 3).join(' | '));
    await ctx.close();
  }
}
