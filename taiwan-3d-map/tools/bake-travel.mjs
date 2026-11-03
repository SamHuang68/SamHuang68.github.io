// 組裝子站用的旅遊資料：cycling.json、trails.json、peaks.json
// 需要 prepare-travel.mjs 與 elevate.mjs 的輸出
// 用法：node taiwan-3d-map/tools/bake-travel.mjs [--cache=<目錄>] [--out=<目錄>] [--allow-missing]
import fs from 'node:fs';
import path from 'node:path';
import { OUT, args, cached, km, meta, readJson, retrieved } from './lib.mjs';

const read = (f) => readJson(cached(f));
const r5 = (v) => Math.round(v * 1e5) / 1e5;
fs.mkdirSync(OUT, { recursive: true });

// 部分來源失敗時不默默少資料：與輸出目錄現有的檔案比對，數量減少就停下；確認是預期的變化再加 --allow-missing
{
  const problems = [];
  const failed = meta().trails?.failed || [];
  if (failed.length) problems.push(`軌跡下載失敗：${failed.join(' ')}（可重跑 fetch.mjs trails）`);
  const old = (f) => (fs.existsSync(path.join(OUT, f)) ? readJson(path.join(OUT, f)) : null);
  const trails = read('trails-raw.json'), cyc = read('cycling-raw.json'), oldT = old('trails.json'), oldC = old('cycling.json');
  if (oldT) {
    const was = oldT.trails.filter((t) => t.track).length, now = trails.filter((t) => t.lines.length).length;
    if (trails.length < oldT.trails.length) problems.push(`步道 ${oldT.trails.length} → ${trails.length} 條`);
    if (now < was) problems.push(`有軌跡的步道 ${was} → ${now} 條`);
  }
  if (oldC) for (const [k, list] of Object.entries(oldC.pois)) if ((cyc.pois[k]?.length || 0) < list.length * 0.9) problems.push(`環島補給點 ${k} ${list.length} → ${cyc.pois[k]?.length || 0}`);
  const noTop = read('peaks-elev.json').filter((p) => !p.cands.some((c) => c.top != null)).map((p) => p.name);
  if (noTop.length) problems.push(`百岳缺座標或高程：${noTop.join('、')}`);
  const elev = [...read('cycling-elev.json'), ...Object.values(read('trails-elev.json')).flatMap((ss) => ss.flatMap((s) => s.e))];
  const nulls = elev.filter((v) => v == null).length;
  if (nulls > elev.length * 0.01) problems.push(`高程缺值 ${nulls} / ${elev.length}（重跑 elevate.mjs）`);
  if (problems.length) {
    console.error(`與 ${OUT} 現有資料相比：\n- ${problems.join('\n- ')}`);
    if (!('allow-missing' in args)) { console.error('未寫入任何檔案。確認是預期的變化再加 --allow-missing。'); process.exit(1); }
  }
}

// 高程平滑：移動平均（DEM 在橋樑、邊坡與隧道會有雜訊）
function smooth(e, half) {
  const out = new Array(e.length);
  for (let i = 0; i < e.length; i++) {
    let s = 0, n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(e.length - 1, i + half); k++) { s += e[k]; n++; }
    out[i] = s / n;
  }
  return out;
}
// 去尖刺：與前後各 3 點中位數相差超過 60 m 的取樣改用中位數。
// Terrarium 在 z14–z15 偶有資料空洞（例如 121°E 線上一點掉到 −1,998 m），z12–z13 正常。
function despike(e, half = 3, th = 60) {
  const out = [...e];
  let n = 0;
  for (let i = 0; i < e.length; i++) {
    const w = e.slice(Math.max(0, i - half), i + half + 1).sort((a, b) => a - b);
    const med = w[w.length >> 1];
    if (Math.abs(e[i] - med) > th) { out[i] = med; n++; }
  }
  despike.count = (despike.count || 0) + n;
  return out;
}

// 遲滯累計爬升／下降：變化超過門檻才算，避免小起伏灌水
function gainLoss(e, th = 3) {
  let up = 0, down = 0, ref = e[0];
  for (const v of e) {
    if (v - ref >= th) { up += v - ref; ref = v; } else if (ref - v >= th) { down += ref - v; ref = v; }
  }
  return [up, down];
}

// ---------- 環島
{
  const raw = read('cycling-raw.json');
  const e0 = read('cycling-elev.json');
  // 海上或缺值（橋樑、DEM 洞）以前後值補；負值視為 0（路面不會在海平面下）
  if (e0.length !== raw.line.length || raw.flags.length !== raw.line.length) throw new Error('elevation/flags length mismatch');
  const e = e0.map((v) => (v == null ? null : Math.max(0, v)));
  for (let i = 0; i < e.length; i++) if (e[i] == null) e[i] = e[i - 1] ?? e.find((v) => v != null);
  // 隧道與橋樑：地形面不是路面（隧道量到山頂、橋量到谷底），改以兩端路面高程線性內插
  // 隧道洞口外常是削出來的邊坡，地形面偏高（例如清水斷崖洞口前 800 m 由 82 m「升」到 217 m）：
  // 錨點改取洞口兩側各 1 km 內的最低點（道路從下方接近洞口，地形面只會高估）
  let fixed = 0;
  const lowest = (from, to) => { let k = from; for (let m = from; m <= to; m++) if (e[m] < e[k]) k = m; return k; };
  for (let i = 0; i < e.length; i++) {
    if (!raw.flags[i]) continue;
    let j = i;
    while (j + 1 < e.length && raw.flags[j + 1]) j++;
    const tunnel = raw.flags.slice(i, j + 1).includes(2);
    const a = tunnel ? lowest(Math.max(0, i - 10), Math.max(0, i - 1)) : Math.max(0, i - 1);
    const b = tunnel ? lowest(Math.min(e.length - 1, j + 1), Math.min(e.length - 1, j + 10)) : Math.min(e.length - 1, j + 1);
    for (let k = a + 1; k < b; k++) e[k] = e[a] + ((e[b] - e[a]) * (k - a)) / Math.max(1, b - a);
    fixed += b - a - 1;
    i = j;
  }
  console.log('bridge/tunnel samples interpolated', fixed);
  despike.count = 0;
  const es = smooth(despike(e), 2);
  console.log('cycling despiked', despike.count);
  const [up, down] = gainLoss(es);
  const pois = raw.pois;
  const data = {
    source: 'OpenStreetMap 關係 5752808「環島1號線（順時針）」、補給點與地名（© OpenStreetMap 貢獻者，ODbL）；高程為 Mapzen Terrarium（AWS Open Data）',
    license: '本檔為 OpenStreetMap 衍生資料庫，依 ODbL 1.0 提供',
    retrieved: retrieved('cycling'),
    start: '臺北車站附近',
    step: raw.step,
    total: raw.total,
    // 順時針（自台北往東）方向的取樣；高程已做 ±200 m 平滑
    lon: raw.line.map((p) => p[0]),
    lat: raw.line.map((p) => p[1]),
    elev: es.map((v) => Math.round(v)),
    pois: {
      store: pois.store.map((p) => [p.d, p.lon, p.lat, p.brand || p.name]),
      station: pois.station.map((p) => [p.d, p.lon, p.lat, p.name]),
      bike: pois.bike.map((p) => [p.d, p.lon, p.lat, p.name]),
      repair: pois.repair.map((p) => [p.d, p.lon, p.lat, p.name]),
      police: pois.police.map((p) => [p.d, p.lon, p.lat, p.name]),
    },
    // 爬坡段命名用：沿線 1.5–3 km 內的鄉鎮村里
    places: pois.place.filter((p) => p.name).map((p) => [p.d, p.name, p.place]),
  };
  fs.writeFileSync(path.join(OUT, 'cycling.json'), JSON.stringify(data));
  console.log('cycling km', raw.total, 'up', Math.round(up), 'down', Math.round(down), 'max', Math.max(...es).toFixed(0), 'bytes', fs.statSync(path.join(OUT, 'cycling.json')).size);
}

// ---------- 步道
// 軌跡檔常把一條步道拆成數段、方向也不一定，岔路與支線也混在一起。
// 端點相距 80 m 內視為同一節點建成圖，最長的一條簡單路徑當主線；其餘分段照樣畫在地圖上。
const lenOf = (s) => { let L = 0; for (let i = 1; i < s.pts.length; i++) L += km(s.pts[i - 1], s.pts[i]); return L; };
function mainLine(segs, tol = 0.08) {
  const nodes = [];
  const nodeOf = (p) => {
    let i = nodes.findIndex((q) => km(p, q) <= tol);
    if (i < 0) { nodes.push(p); i = nodes.length - 1; }
    return i;
  };
  const edges = segs.map((s, i) => ({ i, u: nodeOf(s.pts[0]), v: nodeOf(s.pts.at(-1)), len: lenOf(s) }));
  const adj = nodes.map(() => []);
  for (const e of edges) { adj[e.u].push(e); if (e.v !== e.u) adj[e.v].push(e); }
  // 小圖（單一步道通常不到 50 段）直接深度優先找最長路徑；不重複走同一段或同一節點
  let best = { len: 0, path: [] };
  let budget = 200000;
  const dfs = (n, used, seen, len, path) => {
    if (--budget < 0) return;
    if (len > best.len) best = { len, path: [...path] };
    for (const e of adj[n]) {
      if (used.has(e.i)) continue;
      const m = e.u === n ? e.v : e.u;
      if (seen.has(m)) continue;
      used.add(e.i); seen.add(m); path.push({ e, from: n });
      dfs(m, used, seen, len + e.len, path);
      path.pop(); seen.delete(m); used.delete(e.i);
    }
  };
  for (let n = 0; n < nodes.length; n++) dfs(n, new Set(), new Set([n]), 0, []);
  // 環狀步道（首尾同一節點）走不出簡單路徑：單一分段比路徑長時就以它為主線
  const longest = edges.reduce((a, b) => (b.len > a.len ? b : a));
  if (!best.path.length || longest.len > best.len) {
    return { main: { pts: [...segs[longest.i].pts], e: [...segs[longest.i].e] }, rest: segs.filter((_, i) => i !== longest.i) };
  }
  const main = { pts: [], e: [] };
  for (const { e, from } of best.path) {
    const s = segs[e.i], fwd = e.u === from;
    const pts = fwd ? s.pts : [...s.pts].reverse(), el = fwd ? s.e : [...s.e].reverse();
    const skip = main.pts.length ? 1 : 0; // 接點只留一次
    main.pts.push(...pts.slice(skip));
    main.e.push(...el.slice(skip));
  }
  const usedIdx = new Set(best.path.map((p) => p.e.i));
  return { main, rest: segs.filter((_, i) => !usedIdx.has(i)) };
}

{
  const trails = read('trails-raw.json');
  const te = read('trails-elev.json');
  const out = [];
  let pts = 0, reoriented = 0, joined = 0;
  for (const t of trails) {
    const raw = (te[t.id] || []).map((s) => {
      const e = [...s.e];
      for (let i = 0; i < e.length; i++) if (e[i] == null) e[i] = e[i - 1] ?? e.find((v) => v != null) ?? 0;
      return { pts: s.pts, e: despike(e) };
    });
    const { main, rest } = raw.length ? mainLine(raw) : { main: null, rest: [] };
    const chains = main ? [main, ...rest] : [];
    joined += raw.length - chains.length;
    // 主線從登山口出發：取海拔最低的入口（通常就是登山口）較近的一端；沒有入口資料就從較低的一端出發
    if (main) {
      const low = t.entrances.length ? t.entrances.reduce((a, b) => (b.h < a.h ? b : a)) : null;
      const flip = low ? km(low.ll, main.pts.at(-1)) < km(low.ll, main.pts[0]) : main.e.at(-1) < main.e[0];
      if (flip) { main.pts.reverse(); main.e.reverse(); reoriented++; }
    }
    const segs = chains.map((s) => {
      const e = s.e;
      const es = smooth(e, 1);
      const [up, down] = gainLoss(es, 2);
      let len = 0;
      for (let i = 1; i < s.pts.length; i++) len += km(s.pts[i - 1], s.pts[i]);
      // 剖面與地圖都用每 50 m 一點（隔一點取一點），保留終點
      const keep = s.pts.map((_, i) => i).filter((i) => i % 2 === 0 || i === s.pts.length - 1);
      pts += keep.length;
      return { len, up, down, min: Math.min(...es), max: Math.max(...es), lon: keep.map((i) => s.pts[i][0]), lat: keep.map((i) => s.pts[i][1]), elev: keep.map((i) => Math.round(es[i])) };
    });
    const sum = (k) => segs.reduce((a, s) => a + s[k], 0);
    out.push({
      id: t.id, name: t.name, sys: t.sys, sub: t.sub, admin: t.admin, pos: t.pos,
      len: t.len, lenText: t.lenText, alt: t.alt, pave: t.pave, dif: t.dif, tour: t.tour, season: t.season, special: t.special,
      entrances: t.entrances.map((e) => [e.ll[0], e.ll[1], e.h]),
      // main：主線（自登山口出發）的長度與爬升；km、min、max 為全部軌跡
      track: segs.length ? {
        km: +sum('len').toFixed(2), parts: segs.length, min: Math.round(Math.min(...segs.map((s) => s.min))), max: Math.round(Math.max(...segs.map((s) => s.max))),
        main: { km: +segs[0].len.toFixed(2), up: Math.round(segs[0].up), down: Math.round(segs[0].down), min: Math.round(segs[0].min), max: Math.round(segs[0].max) },
      } : null,
      segs: segs.map((s) => ({ lon: s.lon, lat: s.lat, elev: s.elev })),
    });
  }
  const data = {
    source: '農業部林業及自然保育署「林業保育署自然步道基本資料」與「林業保育署所轄自然步道軌跡圖」（政府資料開放授權條款－第1版）；高程為 Mapzen Terrarium（AWS Open Data）',
    license: '政府資料開放授權條款－第1版（須標示出處）',
    retrieved: retrieved('trails'),
    trails: out,
  };
  fs.writeFileSync(path.join(OUT, 'trails.json'), JSON.stringify(data));
  console.log('trails', out.length, 'with track', out.filter((t) => t.track).length, 'points', pts, 'joined segs', joined, 'reoriented', reoriented, 'bytes', fs.statSync(path.join(OUT, 'trails.json')).size);
  const j = out.find((t) => t.id === '139');
  console.log('嘉明湖', JSON.stringify(j.track), 'segs', j.segs.length, 'start', j.segs[0].lon[0], j.segs[0].lat[0], 'entrance', JSON.stringify(j.entrances));
}

// ---------- 百岳
{
  const peaks = read('peaks-raw.json');
  const pe = read('peaks-elev.json');
  const out = [];
  const notes = [];
  for (const p of peaks) {
    const v = pe.find((x) => x.rank === p.rank);
    // 兩個候選座標（Wikidata、OSM）各在 ±120 m 內找地形最高點：都在公告測高 ±40 m 內時採 OSM 山頂節點
    // （Wikidata 的合歡山座標實為合歡北峰，兩者地形高度只差數公尺），否則選最接近公告測高的一個
    const ok = v.cands.filter((c) => c.top != null);
    const near = ok.filter((c) => Math.abs(c.top - p.h) <= 40);
    const best = near.find((c) => c.src === 'osm') || ok.sort((a, b) => Math.abs(a.top - p.h) - Math.abs(b.top - p.h))[0];
    if (!best) { notes.push(`${p.rank}${p.name} 無座標`); continue; }
    if (v.cands.length > 1) {
      const [a, b] = v.cands;
      const d = km(a.ll, b.ll);
      if (d > 0.3) notes.push(`${p.rank}${p.name} 兩來源相距 ${d.toFixed(2)} km：wd 頂 ${a.top}、osm 頂 ${b.top}、公告 ${p.h} → 採 ${best.src}`);
    }
    if (Math.abs(best.top - p.h) > 80) notes.push(`${p.rank}${p.name} 地形頂 ${best.top} 與公告 ${p.h} 相差 ${Math.round(best.top - p.h)} m`);
    // 維基表格的殘留：<br / > 之類的換行標籤、「無」國家公園
    const clean = (list) => list.flatMap((s) => s.split(/<br\s*\/?\s*>/i)).map((s) => s.replace(/<[^>]*>/g, '').trim()).filter(Boolean);
    out.push({
      rank: p.rank, name: p.name, h: p.h, hOld: p.hOld, admin: clean(p.admin), range: clean(p.range), routes: clean(p.routes), park: p.park === '無' ? '' : p.park, grade: p.grade, alias: clean(p.alias),
      lon: r5(best.ll[0]), lat: r5(best.ll[1]), src: best.src, dem: Math.round(best.top),
    });
  }
  const data = {
    source: '百岳名單、測高、行政區、山脈、登山路線、國家公園與分級整理自中文維基百科「台灣百岳」條目（CC BY-SA 4.0）；座標取自 Wikidata（CC0）或 OpenStreetMap（ODbL），以地形高程擇一',
    license: '本檔依 CC BY-SA 4.0 提供（改作自中文維基百科「台灣百岳」）',
    retrieved: retrieved('peaks'),
    peaks: out,
  };
  fs.writeFileSync(path.join(OUT, 'peaks.json'), JSON.stringify(data));
  console.log('peaks', out.length, 'src', JSON.stringify(out.reduce((a, p) => ((a[p.src] = (a[p.src] || 0) + 1), a), {})), 'bytes', fs.statSync(path.join(OUT, 'peaks.json')).size);
  console.log(notes.join('\n'));
}
