// 下載子站資料的原始來源到快取目錄，並在 meta.json 記下擷取日期與版本
// 用法：node taiwan-3d-map/tools/fetch.mjs [quakes] [cycling] [trails] [peaks] [--cache=<目錄>]（不指定就全部）
import fs from 'node:fs';
import { UA, CACHE, cached, positional, readJson, writeJson, parsePeakTable } from './lib.mjs';

const USGS_QUERY = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=csv&minlatitude=20.5&maxlatitude=26.5&minlongitude=118.5&maxlongitude=124.5&minmagnitude=4&starttime=1973-01-01&orderby=time-asc&eventtype=earthquake';
const PB2002 = 'https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json';
const ROUTE = 5752808; // 環島1號線（順時針）
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const POIS = '[out:json][timeout:240][bbox:21.85,119.95,25.35,122.05];(nwr["shop"="convenience"];nwr["shop"="bicycle"];nwr["amenity"="police"];nwr["amenity"="bicycle_repair_station"];node["railway"="station"];node["place"~"^(city|town|village)$"];);out tags center qt;';
const OSM_PEAKS = '[out:json][timeout:120][bbox:22.2,120.6,24.8,121.6];node["natural"="peak"]["ele"](if:t["ele"]>=2800);out;';
const TRAILS_BASIC = 'https://data.moa.gov.tw/Service/OpenData/ForestRtBasic.aspx?IsTransData=1&UnitId=D51';

const today = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
const sleep = (ms) => new Promise((s) => setTimeout(s, ms));

// 每個請求（含讀取內容）都有逾時；失敗重試，最後一次仍失敗就丟出錯誤。as：text、json 或 buffer
async function get(url, { tries = 3, timeout = 120000, as = 'text', ...init } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { ...init, headers: { ...UA, ...init.headers }, signal: AbortSignal.timeout(timeout) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = as === 'json' ? await r.json() : as === 'buffer' ? Buffer.from(await r.arrayBuffer()) : await r.text();
      return { body, url: r.url };
    } catch (e) {
      last = e;
      if (i < tries - 1) await sleep(3000 * (i + 1));
    }
  }
  throw new Error(`${String(url).slice(0, 120)}：${last.message}`);
}
// Overpass 常滿載：依序換端點；回應中的 remark 代表查詢中途失敗
async function overpass(query) {
  for (const ep of OVERPASS) {
    try {
      const j = (await get(ep, { method: 'POST', body: new URLSearchParams({ data: query }), timeout: 300000, tries: 2, as: 'json' })).body;
      if (j.remark) throw new Error(j.remark);
      return j;
    } catch (e) {
      console.warn(`Overpass ${ep} 失敗：${e.message}`);
    }
  }
  throw new Error('所有 Overpass 端點都失敗');
}
const save = (name, text) => { fs.mkdirSync(CACHE, { recursive: true }); fs.writeFileSync(cached(name), text); };

const steps = {
  async quakes() {
    // 每個來源的檔案都在全部下載成功後才寫入，失敗時快取不會混著新舊兩期
    const csv = (await get(USGS_QUERY, { timeout: 180000 })).body;
    const pb = (await get(PB2002)).body;
    save('usgs.csv', csv);
    save('pb2002.json', pb);
    return { query: USGS_QUERY, events: csv.trim().split('\n').length - 1 };
  },
  async cycling() {
    const route = (await get(`https://api.openstreetmap.org/api/0.6/relation/${ROUTE}/full.json`, { headers: { Accept: 'application/json' }, timeout: 240000, as: 'json' })).body;
    const pois = await overpass(POIS);
    save('osm-route.json', JSON.stringify(route));
    save('pois.json', JSON.stringify(pois));
    const rel = route.elements.find((e) => e.type === 'relation' && e.id === ROUTE);
    return { relation: ROUTE, version: rel.version, timestamp: rel.timestamp };
  },
  async trails() {
    const basic = (await get(TRAILS_BASIC)).body;
    // 「林業保育署所轄自然步道軌跡圖-xxx_名稱」每條步道一個資料集；檔案清單在 FileToJson
    const body = { bool: [{ fulltext: { value: '自然步道軌跡圖' } }], filter: [], page_num: 1, page_limit: 200, tids: [], sort: '_score_desc' };
    const found = (await get('https://data.gov.tw/api/front/dataset/list', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), as: 'json' })).body.payload;
    if (found.search_count > found.search_result.length) throw new Error(`搜尋結果 ${found.search_count} 筆超過單頁 ${found.search_result.length} 筆，需要分頁`);
    const list = found.search_result.filter((x) => /自然步道軌跡圖-\d{3}_/.test(x.title));
    // 先下載到 tracks.new/，全部跑完才換掉舊的 tracks/
    fs.rmSync(cached('tracks.new'), { recursive: true, force: true });
    fs.mkdirSync(cached('tracks.new'), { recursive: true });
    const index = [];
    for (const x of list) {
      const code = x.title.match(/-(\d{3})_/)[1];
      const api = (Array.isArray(x.all_url) ? x.all_url : [x.all_url]).flat().find((u) => /FileToJson/.test(u || ''));
      const rec = { nid: x.nid, code, name: x.title.split(/-\d{3}_/)[1], api, license: x.license_name, changed: x.changed?.date };
      try {
        rec.files = [];
        if (!api) throw new Error('找不到 FileToJson 網址');
        const files = (await get(api, { as: 'json' })).body;
        if (!files.length) throw new Error('FileToJson 沒有檔案');
        for (const f of files) {
          const { body: buf, url } = await get(f.FileUrl, { redirect: 'follow', as: 'buffer' });
          const file = `${code}-${rec.files.length}.kmz`;
          fs.writeFileSync(cached('tracks.new', file), buf);
          rec.files.push({ file, bytes: buf.length, url, created: f.CreateDate });
          await sleep(300);
        }
      } catch (e) { rec.error = String(e.message || e); }
      index.push(rec);
      process.stdout.write(`${code} `);
    }
    fs.writeFileSync(cached('tracks.new', 'index.json'), JSON.stringify(index, null, 1));
    fs.rmSync(cached('tracks'), { recursive: true, force: true });
    fs.renameSync(cached('tracks.new'), cached('tracks'));
    save('trails-basic.json', basic);
    const errors = index.filter((r) => r.error);
    console.log(`\n軌跡資料集 ${index.length}，失敗 ${errors.length} ${errors.map((r) => r.code).join(' ')}`);
    return { datasets: index.length, failed: errors.map((r) => r.code) };
  },
  async peaks() {
    const u = new URL('https://zh.wikipedia.org/w/api.php');
    Object.entries({ action: 'parse', page: '台灣百岳', prop: 'wikitext|revid', format: 'json', formatversion: '2', redirects: '1' }).forEach(([k, v]) => u.searchParams.set(k, v));
    const wp = (await get(u, { as: 'json' })).body.parse;
    // Wikidata：以 zhwiki 標題查座標（每次 50 筆）；重新導向與正規化的原標題也對應到實際條目
    const titles = parsePeakTable(wp.wikitext).map((p) => p.title);
    const byTitle = {};
    for (let i = 0; i < titles.length; i += 50) {
      const w = new URL('https://www.wikidata.org/w/api.php');
      Object.entries({ action: 'wbgetentities', sites: 'zhwiki', titles: titles.slice(i, i + 50).join('|'), props: 'claims|sitelinks', sitefilter: 'zhwiki', redirects: 'yes', format: 'json' }).forEach(([k, v]) => w.searchParams.set(k, v));
      const j = (await get(w, { as: 'json' })).body;
      for (const [qid, e] of Object.entries(j.entities || {})) {
        if (qid.startsWith('-')) continue;
        const c = e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
        byTitle[e.sitelinks?.zhwiki?.title] = { qid, lon: c?.longitude, lat: c?.latitude };
      }
      for (const n of [...(j.normalized || []), ...(j.redirects || [])]) byTitle[n.from] = byTitle[n.to] || byTitle[n.from];
    }
    const osm = await overpass(OSM_PEAKS);
    save('wp-peaks.txt', wp.wikitext);
    save('wikidata.json', JSON.stringify(byTitle));
    save('osm-peaks.json', JSON.stringify(osm));
    return { page: wp.title, revid: wp.revid };
  },
};

const want = positional.length ? positional : Object.keys(steps);
const unknown = want.filter((k) => !steps[k]);
if (unknown.length) throw new Error(`未知的來源：${unknown.join(', ')}（可用 ${Object.keys(steps).join(', ')}）`);
// 各來源互不影響：某個來源失敗時保留它在 meta.json 的舊紀錄，其餘照常下載，最後以結束碼 1 回報
const failures = [];
for (const k of want) {
  const t0 = Date.now();
  try {
    const info = await steps[k]();
    const meta = fs.existsSync(cached('meta.json')) ? readJson(cached('meta.json')) : {};
    meta[k] = { retrieved: today(), ...info };
    writeJson(cached('meta.json'), meta);
    console.log(`${k} 完成（${((Date.now() - t0) / 1000).toFixed(0)} s）`, JSON.stringify(info));
  } catch (e) {
    failures.push(k);
    console.error(`${k} 失敗（${((Date.now() - t0) / 1000).toFixed(0)} s）：${e.message}`);
  }
}
if (failures.length) {
  console.error(`未完成：${failures.join(' ')}；可稍後執行 node taiwan-3d-map/tools/fetch.mjs ${failures.join(' ')}`);
  process.exitCode = 1;
}
