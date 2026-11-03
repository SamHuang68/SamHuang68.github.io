// 用子站本身的 Terrarium 解碼（window.__tw3d.elevationAt）替環島、步道與百岳候選點取高程
// 會在本機啟動 scripts/serve-local.mjs，以無頭 Chromium 開子站；輸出到快取目錄的 *-elev.json
// 用法：node taiwan-3d-map/tools/elevate.mjs [--cache=<目錄>] [--playwright=<playwright 套件目錄>] [--port=4191]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { ROOT, args, cached, readJson, resample, writeJson } from './lib.mjs';

const R = Math.PI / 180;
const spec = args.playwright || process.env.PLAYWRIGHT_MODULE || 'playwright';
const { chromium } = await import(fs.existsSync(spec) ? pathToFileURL(path.join(spec, 'index.mjs')).href : spec);
const port = Number(args.port || 4191);

const server = spawn(process.execPath, ['scripts/serve-local.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
let browser = null;
// 伺服器啟動與瀏覽器 launch 都在 try 內：任何一步失敗，finally 都會收掉伺服器
try {
  await new Promise((ok, fail) => {
    const timer = setTimeout(() => fail(new Error('本機伺服器 10 秒內沒有啟動')), 10000);
    server.stdout.on('data', (d) => { if (String(d).includes(`:${port}`)) { clearTimeout(timer); ok(); } });
    server.on('exit', (c) => fail(new Error(`本機伺服器結束（${c}）`)));
  });
  browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext()).newPage();
  await page.goto(`http://127.0.0.1:${port}/taiwan-3d-map/#cam=121,23.7,7,0,0`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__tw3d && window.__tw3d.elevationAt, null, { timeout: 90000 });
  const elev = (pts, z) => page.evaluate(async ({ pts, z }) => {
    const out = new Array(pts.length);
    for (let i = 0; i < pts.length; i += 64) {
      const chunk = pts.slice(i, i + 64);
      const vals = await Promise.all(chunk.map(([x, y]) => window.__tw3d.elevationAt(x, y, z).catch(() => null)));
      vals.forEach((v, k) => (out[i + k] = v == null ? null : Math.round(v * 10) / 10));
    }
    return out;
  }, { pts, z });

  // 1. 環島：z13（z14–z15 偶有資料空洞）
  const cyc = readJson(cached('cycling-raw.json'));
  let t0 = Date.now();
  const ce = [];
  for (let i = 0; i < cyc.line.length; i += 1000) ce.push(...(await elev(cyc.line.slice(i, i + 1000), 13)));
  writeJson(cached('cycling-elev.json'), ce);
  console.log('cycling', ce.length, 'null', ce.filter((v) => v == null).length, `${((Date.now() - t0) / 1000).toFixed(0)} s`);

  // 2. 步道：各線段分開，每 25 m 取樣，z14（尖刺在 bake-travel.mjs 濾除）
  t0 = Date.now();
  const te = {};
  for (const t of readJson(cached('trails-raw.json'))) {
    if (!t.lines.length) continue;
    te[t.id] = [];
    for (const l of t.lines) {
      const pts = resample(l, 0.025);
      te[t.id].push({ pts: pts.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]), e: await elev(pts, 14) });
    }
  }
  writeJson(cached('trails-elev.json'), te);
  console.log('trails', Object.keys(te).length, `${((Date.now() - t0) / 1000).toFixed(0)} s`);

  // 3. 百岳：每個候選點周圍 ±120 m、間距 30 m 取最高點，作為「實測山頂」
  const pe = [];
  for (const p of readJson(cached('peaks-raw.json'))) {
    const cands = [];
    if (p.lon != null) cands.push({ src: 'wikidata', ll: [p.lon, p.lat] });
    if (p.osm) cands.push({ src: 'osm', ll: [p.osm[0], p.osm[1]] });
    for (const c of cands) {
      const grid = [];
      for (let dx = -4; dx <= 4; dx++) for (let dy = -4; dy <= 4; dy++) grid.push([c.ll[0] + (dx * 0.03) / (111.32 * Math.cos(c.ll[1] * R)), c.ll[1] + (dy * 0.03) / 110.57]);
      const es = await elev(grid, 14);
      let bi = 0; es.forEach((v, i) => { if (v != null && v > es[bi]) bi = i; });
      c.at = es[40]; c.top = es[bi]; c.topLL = grid[bi].map((v) => +v.toFixed(5));
    }
    pe.push({ rank: p.rank, name: p.name, h: p.h, cands });
  }
  writeJson(cached('peaks-elev.json'), pe);
  console.log('peaks', pe.length);
} finally {
  await browser?.close();
  server.kill();
}
