// 旅遊專項的前處理（尚無高程）：環島路線取樣與補給點、步道軌跡、百岳名單與候選座標
// 輸出到快取目錄的 cycling-raw.json、trails-raw.json、peaks-raw.json，下一步由 elevate.mjs 取高程
// 用法：node taiwan-3d-map/tools/prepare-travel.mjs [--cache=<目錄>]
import fs from 'node:fs';
import { cached, km, parsePeakTable, readJson, unzip, writeJson } from './lib.mjs';

const R = Math.PI / 180;

// ---------- 環島：OSM 關係 5752808 的鏈接成環 → 自台北車站起算、每 100 m 取樣 → 沿線補給點與地名的里程
{
  const relId = 5752808;
  const j = readJson(cached('osm-route.json'));
  const nodes = new Map(), ways = new Map();
  for (const e of j.elements) {
    if (e.type === 'node') nodes.set(e.id, [e.lon, e.lat]);
    else if (e.type === 'way') ways.set(e.id, e);
  }
  const rel = j.elements.find((e) => e.type === 'relation' && e.id === relId);
  const len = (ids) => { let t = 0; for (let i = 1; i < ids.length; i++) t += km(nodes.get(ids[i - 1]), nodes.get(ids[i])); return t; };

  // 1. 鏈：相鄰成員共用端點就接上（必要時翻轉）
  // 每段路的類型：2 隧道、1 橋樑、0 一般（隧道與橋的高程不能用地形面）
  const flagOf = (ref) => { const t = ways.get(ref).tags || {}; return t.tunnel && t.tunnel !== 'no' ? 2 : t.bridge && t.bridge !== 'no' ? 1 : 0; };
  const members = rel.members.filter((m) => m.type === 'way' && ways.has(m.ref)).map((m) => ({ ref: m.ref, ids: ways.get(m.ref).nodes, f: flagOf(m.ref) }));
  const chains = [];
  let cur = null;
  // seg[k]：ids[k] 到 ids[k+1] 這一小段的類型
  const start = (m) => ({ ids: [...m.ids], refs: [m.ref], seg: new Array(m.ids.length - 1).fill(m.f) });
  for (const m of members) {
    if (!cur) { cur = start(m); continue; }
    const a = cur.ids[0], s = m.ids;
    if (cur.refs.length === 1 && (s[0] === a || s.at(-1) === a)) { cur.ids.reverse(); cur.seg.reverse(); }
    const end = cur.ids.at(-1);
    const add = new Array(s.length - 1).fill(m.f);
    if (s[0] === end) { cur.ids.push(...s.slice(1)); cur.seg.push(...add); cur.refs.push(m.ref); }
    else if (s.at(-1) === end) { cur.ids.push(...[...s].reverse().slice(1)); cur.seg.push(...add); cur.refs.push(m.ref); }
    else { chains.push(cur); cur = start(m); }
  }
  chains.push(cur);
  chains.forEach((c, i) => { c.i = i; c.km = len(c.ids); c.coords = c.ids.map((id) => nodes.get(id)); });
  console.log('chains', chains.length);

  // 2. 鏈接成環：從最長的鏈出發，每次接上端點最近（2 km 內）的未用鏈
  const used = new Set();
  const first = chains.reduce((a, b) => (b.km > a.km ? b : a));
  let line = [...first.coords];
  // seg[k]：line[k]→line[k+1] 的類型（0 一般、1 橋、2 隧道）；鏈與鏈之間的接縫算一般
  let seg = [...first.seg];
  used.add(first.i);
  for (;;) {
    const end = line.at(-1);
    let best = null;
    for (const c of chains) {
      if (used.has(c.i)) continue;
      const dS = km(end, c.coords[0]), dE = km(end, c.coords.at(-1));
      const d = Math.min(dS, dE);
      if (!best || d < best.d) best = { c, d, rev: dE < dS };
    }
    if (!best || best.d > 2) break;
    used.add(best.c.i);
    line.push(...(best.rev ? [...best.c.coords].reverse() : best.c.coords));
    seg.push(0, ...(best.rev ? [...best.c.seg].reverse() : best.c.seg));
  }
  if (seg.length !== line.length - 1) throw new Error(`seg ${seg.length} vs line ${line.length}`);
  const left = chains.filter((c) => !used.has(c.i));
  console.log('joined', used.size, 'left', left.map((c) => `${c.i}:${c.km.toFixed(2)}km`).join(' ') || '-', 'closure km', km(line.at(-1), line[0]).toFixed(3));

  // 3. 以台北車站最近點為起點，旋轉成環；原本最後一點接回 line[0]（接縫算一般路段）
  const TPE = [121.5170, 25.0478];
  let k0 = 0;
  line.forEach((p, i) => { if (km(p, TPE) < km(line[k0], TPE)) k0 = i; });
  seg = [...seg.slice(k0), 0, ...seg.slice(0, k0)];
  line = [...line.slice(k0), ...line.slice(0, k0), line[k0]];
  if (seg.length !== line.length - 1) throw new Error('seg rotate');

  // 4. 每 100 m 取樣；每個取樣點記下所在小段的類型
  const STEP = 0.1;
  const samples = [line[0]];
  const flags = [seg[0]];
  let carry = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], L = km(a, b);
    let t = STEP - carry;
    while (t <= L) { const f = t / L; samples.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); flags.push(seg[i - 1]); t += STEP; }
    carry = L - (t - STEP);
  }
  samples.push(line.at(-1));
  flags.push(0);
  const total = (samples.length - 2) * STEP + km(samples.at(-2), samples.at(-1));
  const flagKm = (v) => (flags.filter((f) => f === v).length * STEP).toFixed(1);
  console.log('samples', samples.length, 'total km', total.toFixed(1), 'bridge km', flagKm(1), 'tunnel km', flagKm(2));

  // 5. 沿線興趣點：以 0.02° 格網加速找最近取樣點
  const G = 0.02, grid = new Map();
  samples.forEach((p, i) => { const key = `${Math.floor(p[0] / G)},${Math.floor(p[1] / G)}`; (grid.get(key) || grid.set(key, []).get(key)).push(i); });
  const nearest = (p, maxKm) => {
    const gx = Math.floor(p[0] / G), gy = Math.floor(p[1] / G), r = Math.ceil(maxKm / (G * 100)) + 1;
    let best = null;
    for (let x = gx - r; x <= gx + r; x++) for (let y = gy - r; y <= gy + r; y++) {
      for (const i of grid.get(`${x},${y}`) || []) { const d = km(p, samples[i]); if (d <= maxKm && (!best || d < best.d)) best = { i, d }; }
    }
    return best;
  };
  const KIND = (t) => t.shop === 'convenience' ? ['store', 0.2]
    : t.shop === 'bicycle' ? ['bike', 0.3]
    : t.amenity === 'bicycle_repair_station' ? ['repair', 0.3]
    : t.amenity === 'police' ? ['police', 0.2]
    // 只收臺鐵車站（休息、住宿與搭車接駁的參考點），不含高鐵、捷運、糖鐵與林鐵
    : t.railway === 'station' && /臺灣鐵路|台灣鐵路|臺鐵|台鐵/.test(`${t.operator || ''} ${t.network || ''}`) ? ['station', 1.5]
    : t.place && /^(city|town|village)$/.test(t.place) ? ['place', t.place === 'village' ? 1.5 : 3]
    : null;
  const pois = { store: [], bike: [], repair: [], police: [], station: [], place: [] };
  for (const e of readJson(cached('pois.json')).elements) {
    const t = e.tags || {};
    const k = KIND(t);
    if (!k) continue;
    const p = e.type === 'node' ? [e.lon, e.lat] : e.center ? [e.center.lon, e.center.lat] : null;
    if (!p) continue;
    const n = nearest(p, k[1]);
    if (!n) continue;
    pois[k[0]].push({ d: +(n.i * STEP).toFixed(1), off: Math.round(n.d * 1000), name: t['name:zh'] || t.name || '', brand: t.brand || '', lon: +p[0].toFixed(5), lat: +p[1].toFixed(5), place: t.place || '', operator: t.operator || '' });
  }
  for (const k of Object.keys(pois)) pois[k].sort((a, b) => a.d - b.d);
  console.log(Object.entries(pois).map(([k, v]) => `${k} ${v.length}`).join(' | '));
  writeJson(cached('cycling-raw.json'), { total: +total.toFixed(2), step: STEP, line: samples.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)]), flags, pois });
}

// ---------- 步道：林業保育署自然步道基本資料＋軌跡 KML
{
  // TWD97 二度分帶（TM2，中央經線 121°E，k0 0.9999，東偏 250 km）→ WGS84（GRS80 與 WGS84 差異可忽略）
  const tm2ToWgs = (x, y) => {
    const a = 6378137, f = 1 / 298.257222101, k0 = 0.9999, lon0 = 121 * R, dx = 250000;
    const e2 = f * (2 - f), e1 = (1 - Math.sqrt(1 - e2)) / (1 + Math.sqrt(1 - e2)), ep2 = e2 / (1 - e2);
    const M = y / k0, mu = M / (a * (1 - e2 / 4 - (3 * e2 ** 2) / 64 - (5 * e2 ** 3) / 256));
    const phi1 = mu + (3 * e1 / 2 - 27 * e1 ** 3 / 32) * Math.sin(2 * mu) + (21 * e1 ** 2 / 16 - 55 * e1 ** 4 / 32) * Math.sin(4 * mu) + (151 * e1 ** 3 / 96) * Math.sin(6 * mu) + (1097 * e1 ** 4 / 512) * Math.sin(8 * mu);
    const C1 = ep2 * Math.cos(phi1) ** 2, T1 = Math.tan(phi1) ** 2, N1 = a / Math.sqrt(1 - e2 * Math.sin(phi1) ** 2);
    const R1 = (a * (1 - e2)) / (1 - e2 * Math.sin(phi1) ** 2) ** 1.5, D = (x - dx) / (N1 * k0);
    const lat = phi1 - ((N1 * Math.tan(phi1)) / R1) * (D ** 2 / 2 - ((5 + 3 * T1 + 10 * C1 - 4 * C1 ** 2 - 9 * ep2) * D ** 4) / 24 + ((61 + 90 * T1 + 298 * C1 + 45 * T1 ** 2 - 252 * ep2 - 3 * C1 ** 2) * D ** 6) / 720);
    const lon = lon0 + (D - ((1 + 2 * T1 + C1) * D ** 3) / 6 + ((5 - 2 * C1 + 28 * T1 - 3 * C1 ** 2 + 8 * ep2 + 24 * T1 ** 2) * D ** 5) / 120) / Math.cos(phi1);
    return [lon / R, lat / R];
  };
  // KML：所有 LineString 的座標（lon,lat[,alt]）
  const kmlLines = (text) => {
    const lines = [];
    for (const m of text.matchAll(/<LineString[^>]*>[\s\S]*?<coordinates>([\s\S]*?)<\/coordinates>/g)) {
      const pts = m[1].trim().split(/\s+/).map((t) => t.split(',').map(Number)).filter((p) => p.length >= 2 && p.every(Number.isFinite)).map(([x, y]) => [x, y]);
      if (pts.length > 1) lines.push(pts);
    }
    return lines;
  };
  // Douglas–Peucker（約 8 m）
  const simplify = (pts, tolKm = 0.008) => {
    if (pts.length < 3) return pts;
    const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
    const kx = 111.32 * Math.cos(pts[0][1] * R), ky = 110.57;
    const stack = [[0, pts.length - 1]];
    while (stack.length) {
      const [s, e] = stack.pop();
      const ax = pts[s][0] * kx, ay = pts[s][1] * ky, bx = pts[e][0] * kx, by = pts[e][1] * ky;
      const L = Math.hypot(bx - ax, by - ay) || 1e-9;
      let md = 0, mi = -1;
      for (let i = s + 1; i < e; i++) {
        const px = pts[i][0] * kx, py = pts[i][1] * ky;
        const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / L;
        if (d > md) { md = d; mi = i; }
      }
      if (md > tolKm && mi > 0) { keep[mi] = 1; stack.push([s, mi], [mi, e]); }
    }
    return pts.filter((_, i) => keep[i]);
  };
  // KMZ 取第一個頂層 .kml；少數檔案不是壓縮檔，直接當 KML 讀
  const kmlText = (buf) => {
    try {
      const kml = unzip(buf).filter((f) => !f.name.includes('/') && f.name.endsWith('.kml')).sort((a, b) => (a.name < b.name ? -1 : 1))[0];
      if (kml) return kml.data.toString('utf8');
    } catch {}
    const head = buf.subarray(0, 200).toString('utf8');
    return /<kml|<\?xml/.test(head) ? buf.toString('utf8') : null;
  };

  const tracks = new Map();
  const failed = [];
  for (const rec of readJson(cached('tracks', 'index.json'))) {
    for (const f of rec.files || []) {
      const text = kmlText(fs.readFileSync(cached('tracks', f.file)));
      const lines = text ? kmlLines(text) : [];
      if (!lines.length) { failed.push(`${rec.code}${rec.name}`); continue; }
      // 一個資料集有多個檔案時，線段累加
      if (tracks.has(rec.code)) tracks.get(rec.code).lines.push(...lines);
      else tracks.set(rec.code, { name: rec.name, lines });
    }
  }
  console.log('tracks', tracks.size, 'unreadable', failed.length, failed.join(' '));

  const num = (s) => { const m = String(s || '').replace(/,/g, '').match(/[\d.]+/); return m ? +m[0] : null; };
  const trails = [];
  for (const b of readJson(cached('trails-basic.json'))) {
    let entrances = [];
    try { entrances = JSON.parse(b.TR_ENTRANCE || '[]').map((e) => ({ h: e.height, ll: tm2ToWgs(e.x, e.y).map((v) => +v.toFixed(5)) })); } catch {}
    const t = tracks.get(b.TRAILID);
    const lines = t ? t.lines.map((l) => simplify(l)) : [];
    let trackKm = 0;
    for (const l of lines) for (let i = 1; i < l.length; i++) trackKm += km(l[i - 1], l[i]);
    trails.push({
      id: b.TRAILID, name: b.TR_CNAME, sys: b.TR_MAIN_SYS || '', sub: b.TR_SUB_SYS || '', admin: b.TR_ADMIN, pos: b.TR_POSITION,
      len: num(b.TR_LENGTH), lenText: b.TR_LENGTH, alt: b.TR_ALT, pave: b.TR_PAVE, dif: num(b.TR_DIF_CLASS), tour: b.TR_TOUR, season: b.TR_BEST_SEASON, special: b.TR_SPECIAL,
      entrances, trackKm: +trackKm.toFixed(2), lines: lines.map((l) => l.map(([x, y]) => [+x.toFixed(5), +y.toFixed(5)])),
    });
  }
  console.log('trails', trails.length, 'with track', trails.filter((t) => t.lines.length).length, 'no entrance', trails.filter((t) => !t.entrances.length).length);
  writeJson(cached('trails-raw.json'), trails);
}

// ---------- 百岳：維基表格＋Wikidata 座標＋OSM 山頂節點（兩個候選座標，elevate.mjs 再以地形擇一）
{
  const peaks = parsePeakTable(fs.readFileSync(cached('wp-peaks.txt'), 'utf8'));
  const wd = readJson(cached('wikidata.json'));
  const miss = [];
  for (const p of peaks) {
    const w = wd[p.title] || wd[p.title.replace(/_/g, ' ')];
    if (w?.lon != null) { p.qid = w.qid; p.lon = +w.lon.toFixed(5); p.lat = +w.lat.toFixed(5); }
    else miss.push(`${p.rank}${p.name}`);
  }
  // OSM natural=peak：名稱或別名相符者，取標高最接近公告測高的節點
  const byName = new Map();
  for (const e of readJson(cached('osm-peaks.json')).elements) {
    for (const n of [e.tags.name, e.tags['name:zh'], e.tags['name:zh-Hant']].filter(Boolean)) (byName.get(n) || byName.set(n, []).get(n)).push(e);
  }
  let matched = 0;
  for (const pk of peaks) {
    const c = (byName.get(pk.name) || []).concat(...pk.alias.map((a) => byName.get(a) || []));
    if (!c.length) continue;
    matched++;
    const e = c.reduce((a, b) => (Math.abs(+b.tags.ele - pk.h) < Math.abs(+a.tags.ele - pk.h) ? b : a));
    pk.osm = [e.lon, e.lat, +e.tags.ele, e.id];
  }
  console.log('peaks', peaks.length, 'wikidata coords', peaks.length - miss.length, 'missing', miss.join(' ') || '-', 'osm matched', matched);
  writeJson(cached('peaks-raw.json'), peaks);
}
