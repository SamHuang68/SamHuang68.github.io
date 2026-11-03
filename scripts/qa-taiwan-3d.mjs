// 台灣 3D 地景子站的定向回歸：導覽與剖面、地震與板塊、旅遊專項、GPX 匯出（各次審查修正的情境）
// 不是首頁全套 QA；會在本機啟動 scripts/serve-local.mjs（除非指定 --base）
// 用法：node scripts/qa-taiwan-3d.mjs [--browser=chromium|webkit|firefox] [--only=regress,travel-smoke]
//       [--base=<子站網址>] [--playwright=<playwright 套件目錄>] [--out=<截圖與結果目錄>] [--port=4192]
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SUITES = ['regress', 'quake-smoke', 'quake-review', 'travel-smoke', 'travel-review', 'gpx'];
const args = Object.fromEntries(process.argv.slice(2).map((s) => s.replace(/^--/, '').split(/=(.*)/s).slice(0, 2)));
const engine = args.browser || 'chromium';
const only = args.only ? args.only.split(',') : SUITES;
const unknown = only.filter((s) => !SUITES.includes(s));
if (unknown.length) throw new Error(`未知的測試組：${unknown.join(', ')}（可用 ${SUITES.join(', ')}）`);
const out = path.resolve(args.out || path.join(ROOT, 'qa/taiwan-3d-map', engine));
fs.mkdirSync(out, { recursive: true });

const spec = args.playwright || process.env.PLAYWRIGHT_MODULE || 'playwright';
const pw = await import(fs.existsSync(spec) ? pathToFileURL(path.join(spec, 'index.mjs')).href : spec);
if (!pw[engine]) throw new Error(`不支援的瀏覽器：${engine}`);

let server = null, browser = null;
const results = [];
const report = { engine, version: null, base: args.base, started: new Date().toISOString(), results };
// 伺服器啟動與瀏覽器 launch 都在 try 內：任何一步失敗，finally 都會收掉已啟動的伺服器
try {
  if (!report.base) {
    const port = Number(args.port || 4192);
    server = spawn(process.execPath, ['scripts/serve-local.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'inherit'] });
    await new Promise((ok, fail) => {
      const timer = setTimeout(() => fail(new Error('本機伺服器 10 秒內沒有啟動')), 10000);
      server.stdout.on('data', (d) => { if (String(d).includes(`:${port}`)) { clearTimeout(timer); ok(); } });
      server.on('exit', (c) => fail(new Error(`本機伺服器結束（${c}）`)));
    });
    report.base = `http://127.0.0.1:${port}/taiwan-3d-map/`;
  }
  const base = report.base;

  // Chromium 在無 GPU 的環境以 SwiftShader 繪製 WebGL；Firefox 不支援 isMobile，改只保留觸控與視窗尺寸
  browser = await pw[engine].launch(engine === 'chromium' ? { args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] } : {});
  report.version = browser.version();
  if (engine === 'firefox') {
    const newContext = browser.newContext.bind(browser);
    browser.newContext = ({ isMobile, ...opts } = {}) => newContext(opts);
  }

  for (const suite of only) {
    const ok = (name, pass, detail = '') => {
      results.push({ suite, name, pass: !!pass, detail });
      console.log(pass ? 'PASS' : 'FAIL', `[${suite}]`, name, detail);
    };
    const t0 = Date.now();
    try {
      await (await import(`./qa-taiwan-3d/${suite}.mjs`)).default(browser, { base, out, ok });
    } catch (e) {
      ok('執行中斷', false, String(e.message || e).split('\n')[0]);
    }
    console.log(`[${suite}] ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
} catch (e) {
  results.push({ suite: '-', name: '啟動失敗', pass: false, detail: String(e.message || e).split('\n')[0] });
} finally {
  await browser?.close();
  server?.kill();
  const failed = results.filter((r) => !r.pass);
  report.finished = new Date().toISOString();
  report.status = failed.length ? 'failed' : 'pass';
  fs.writeFileSync(path.join(out, 'result.json'), JSON.stringify(report, null, 2));
  console.log(`\n${engine} ${report.version}：${results.length - failed.length}/${results.length} passed`);
  if (failed.length) console.log(failed.map((r) => `FAIL [${r.suite}] ${r.name} ${r.detail}`).join('\n'));
  process.exitCode = failed.length ? 1 : 0;
}
