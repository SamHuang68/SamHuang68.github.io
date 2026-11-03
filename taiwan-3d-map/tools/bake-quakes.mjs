// 把 USGS 地震目錄與 PB2002 板塊邊界烘成子站延遲載入的 quakes.json（欄位式陣列，省空間）
// 用法：node taiwan-3d-map/tools/bake-quakes.mjs [--cache=<目錄>] [--out=<目錄>]
import fs from 'node:fs';
import path from 'node:path';
import { OUT, cached, meta, readJson, retrieved, writeJson } from './lib.mjs';

const lines = fs.readFileSync(cached('usgs.csv'), 'utf8').trim().split('\n');
const head = lines[0].split(',');
const col = (n) => head.indexOf(n);
const rows = lines.slice(1).map((l) => {
  const c = l.match(/("[^"]*"|[^,]*)(,|$)/g).map((s) => s.replace(/,$/, '').replace(/^"|"$/g, ''));
  const dep = +c[col('depth')], de = c[col('depthError')];
  // 定值深度：定位時把深度固定（depthError 為 0，或空白且剛好是 ComCat 慣用的 10／33／35 km）
  const fixed = de !== '' ? +de === 0 : [10, 33, 35].includes(dep);
  return { t: Date.parse(c[col('time')]), lat: +c[col('latitude')], lon: +c[col('longitude')], dep, fixed, mag: +c[col('mag')], id: c[col('id')], type: c[col('type')] };
}).filter((r) => r.type === 'earthquake' && Number.isFinite(r.lat + r.lon + r.dep + r.mag + r.t));
rows.sort((a, b) => a.t - b.t);
if (new Set(rows.map((r) => r.id)).size !== rows.length) throw new Error('duplicate ids');

const r3 = (v) => Math.round(v * 1000) / 1000;
const data = {
  source: 'USGS ANSS Comprehensive Earthquake Catalog (ComCat)',
  query: meta().quakes.query,
  retrieved: retrieved('quakes'),
  count: rows.length,
  // time：UTC epoch 分鐘
  lon: rows.map((r) => r3(r.lon)),
  lat: rows.map((r) => r3(r.lat)),
  depth: rows.map((r) => Math.round(r.dep * 10) / 10),
  mag: rows.map((r) => Math.round(r.mag * 10) / 10),
  time: rows.map((r) => Math.round(r.t / 60000)),
  id: rows.map((r) => r.id),
  // 定值深度事件的索引
  fixed: rows.flatMap((r, i) => (r.fixed ? [i] : [])),
};

// PB2002：只取台灣周邊的隱沒帶與沖繩海槽，保留原座標，裁到顯示範圍
const pb = readJson(cached('pb2002.json'));
const BOX = [116.5, 19, 127, 28.5];
const inBox = ([x, y]) => x >= BOX[0] && x <= BOX[2] && y >= BOX[1] && y <= BOX[3];
const WANT = { 'ON-PS': ['ryukyu', '琉球海溝'], 'ON/PS': ['ryukyu', '琉球海溝'], 'PS/SU': ['manila', '馬尼拉海溝'], 'YA-ON': ['okinawa', '沖繩海槽'] };
const parts = {};
for (const f of pb.features) {
  const w = WANT[f.properties.Name];
  if (!w || !f.geometry.coordinates.some(inBox)) continue;
  const cs = f.geometry.coordinates.map(([x, y]) => [r3(x), r3(y)]);
  // 連續段落內的點，外加一點讓線延伸到邊界外
  const keep = [];
  cs.forEach((c, i) => { if (inBox(c) || (cs[i - 1] && inBox(cs[i - 1])) || (cs[i + 1] && inBox(cs[i + 1]))) keep.push(c); });
  (parts[w[0]] ||= { name: w[1], coords: [] }).coords.push(...keep);
}
// ON-PS 與 ON/PS 在 125.55°E 首尾相接，去掉重複點
for (const p of Object.values(parts)) p.coords = p.coords.filter((c, i, a) => i === 0 || c[0] !== a[i - 1][0] || c[1] !== a[i - 1][1]);
data.plates = {
  source: 'Bird (2003) PB2002, via github.com/fraxen/tectonicplates (ODC-BY 1.0)',
  features: Object.entries(parts).map(([kind, p]) => ({ type: 'Feature', properties: { kind, name: p.name }, geometry: { type: 'LineString', coordinates: p.coords } })),
};

const size = writeJson(path.join(OUT, 'quakes.json'), data);
console.log('events', rows.length, 'fixed-depth', data.fixed.length, 'first', new Date(rows[0].t).toISOString(), 'last', new Date(rows.at(-1).t).toISOString(), 'bytes', size);
for (const f of data.plates.features) console.log(f.properties.kind, f.geometry.coordinates.length);
