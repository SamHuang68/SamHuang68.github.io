// 台灣 3D 地景 2.1
// MapLibre GL JS 6 globe + 3D terrain。影像與地形都即時串流公開圖磚：
//   衛星 Esri World Imagery、地形 AWS Terrarium（含海底水深）、地名與建築 OpenFreeMap。
// 游標高程、地形剖面與「海面壓平」地形都直接解碼同一份 Terrarium 圖磚，不另備資料。
// 地震目錄（USGS ComCat 快照＋即時補抓）與 PB2002 板塊邊界放在 quakes.json，開啟圖層時才載入。
import * as maplibregl from 'https://cdn.jsdelivr.net/npm/maplibre-gl@6.14.0/dist/maplibre-gl.mjs';
import { SPOTS, TOURS } from './data.js?v=2.0.0';

// ---------------------------------------------------------------- 常數
const TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const NIGHT = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png';
const OMT = 'https://tiles.openfreemap.org/planet';
const GLYPHS = 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf';
const CJK_FONT = '"PingFang TC", "Noto Sans TC", "Microsoft JhengHei", sans-serif';
const ISLAND_CENTER = [120.98, 23.75];
const SUN_SITE = { lat: 23.7, lon: 121 };

const GROUPS = {
  mountain: { label: '山岳', color: '#f2c46d', rank: 0 },
  landscape: { label: '地景', color: '#7fd1ae', rank: 1 },
  ecology: { label: '生態', color: '#5ec2e6', rank: 2 },
  tech: { label: '科技', color: '#b59cff', rank: 3 },
  infra: { label: '建設', color: '#ff9b73', rank: 4 },
  heritage: { label: '人文', color: '#e98fb6', rank: 5 },
};

const QUAKES = [
  { name: '921 集集大地震', lon: 120.82, lat: 23.85, mag: 7.3, year: 1999 },
  { name: '美濃地震', lon: 120.54, lat: 22.92, mag: 6.6, year: 2016 },
  { name: '花蓮地震', lon: 121.69, lat: 24.14, mag: 6.2, year: 2018 },
  { name: '0403 花蓮強震', lon: 121.67, lat: 23.77, mag: 7.2, year: 2024 },
];

// 地震目錄：快照的查詢範圍與即時補抓相同，補抓只取快照最後一筆之後的地震
const CATALOG_URL = './quakes.json?v=2.1.0';
const USGS_QUERY = 'https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=20.5&maxlatitude=26.5&minlongitude=118.5&maxlongitude=124.5&minmagnitude=4&orderby=time-asc&eventtype=earthquake';
const CATALOG_Y0 = 1973;
// 震源深度色階（km）：地圖圓點、剖面與圖例共用
const DEPTH_STOPS = [0, '#ff3b30', 15, '#ff7a35', 35, '#ffc53d', 70, '#9be15d', 150, '#3cc4e6', 300, '#7c6cff'];
// 震源剖面：沿板塊隱沒方向橫切，線兩側的震源投影到剖面上
// half：線兩側取多寬（km）；馬尼拉一帶 M4 以上的深源地震較少，取寬一點
const SECTIONS = {
  ryukyu: { a: [122.9, 22.9], b: [122.1, 25.6], half: 30, note: '菲律賓海板塊向北隱沒到琉球島弧下方：震源由南往北愈來愈深，排成一條斜帶，最深約 300 km。' },
  manila: { a: [119.8, 20.75], b: [122.2, 20.75], half: 35, note: '南海所在的歐亞板塊向東隱沒到呂宋島弧下方：較深的震源集中在東側，愈往東愈深。' },
  collision: { a: [120.1, 23.75], b: [122.4, 23.75], half: 25, note: '台灣本島是弧陸碰撞帶：地震密集，但大多在 50 km 以內，看不到隱沒帶那種往深處延伸的斜帶。' },
};

const RELIEF_RAMP = ['interpolate', ['linear'], ['elevation'],
  -12000, '#081528', -8000, '#0a1a33', -5000, '#0f2b52', -3000, '#163f73', -1500, '#1f5a92', -500, '#2f78ad',
  -100, '#5b9cc6', -10, '#8fc2db', 0, '#5c8a5a', 60, '#6f9a62', 250, '#94b06e', 600, '#c3c486',
  1100, '#d7b47c', 1800, '#b98e64', 2600, '#9b7a62', 3200, '#a4998f', 3650, '#dcd7d0', 3952, '#ffffff', 9000, '#ffffff'];
const OCEAN_RAMP = ['interpolate', ['linear'], ['elevation'],
  -12000, '#030816', -7000, '#040b1f', -5500, '#071a3d', -4000, '#0b2d60', -2500, '#114a86', -1200, '#1a6aa6',
  -400, '#2a8bc0', -120, '#4fb0d6', -30, '#8fd3e6', -0.5, '#c4ecf2', 0, '#39433b', 1500, '#6d786e', 4000, '#d9dcd2', 9000, '#ffffff'];

// 衛星模式的海面：Esri 低縮放海域是不同年代的拼接影像，色塊明顯；以半透明水深色調統一，淺灘仍透出影像。
const SAT_SEA_RAMP = ['interpolate', ['linear'], ['elevation'],
  -12000, 'rgba(4,16,36,0.95)', -6000, 'rgba(5,20,42,0.94)', -3000, 'rgba(8,32,64,0.92)', -1000, 'rgba(12,50,88,0.88)', -200, 'rgba(17,66,104,0.8)',
  -40, 'rgba(26,86,120,0.62)', -8, 'rgba(36,104,132,0.35)', -1, 'rgba(40,110,140,0)', 9000, 'rgba(40,110,140,0)'];

const BASEMAP_HINT = {
  satellite: 'Esri 全球衛星影像，拉近可到街廓尺度。',
  relief: '依海拔分層設色：綠色平原、黃褐丘陵到白色高山，海域以深淺藍表示水深。',
  ocean: '保留真實水深的 3D 地形：東部外海數千公尺的海盆、海溝與澎湖淺灘一覽無遺。',
};

const SEASONS = { spring: [2, 20], summer: [5, 21], autumn: [8, 23], winter: [11, 22] };

const mobileMQ = matchMedia('(max-width: 760px)');
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
const isMobile = () => mobileMQ.matches;

const HOME = () => isMobile()
  ? { center: [120.9, 23.66], zoom: 6.45, pitch: 46, bearing: 16 }
  : { center: [120.88, 23.72], zoom: 7.4, pitch: 52, bearing: 16 };

// 全島尺度只標這些代表點，其餘拉近（zoom ≥ 9.2）才出現，避免標籤擠成一團。
const FEATURED = new Set(['yushan', 'xueshan', 'taroko_gorge', 'sunmoonlake', 'alishan_clouds', 'taipei', 'hsinchu_sp',
  'kaohsiung_port', 'eluanbi_light', 'guishan_milky', 'suhua_qingshui', 'penghu_basalt', 'lanyu_green', 'luye_valley',
  'qigu_oyster', 'changhua_wind', 'hehuanshan_snow', 'matsu_blue_tears', 'tianliao_badlands', 'nanhu_cirque', 'jiaming_lake']);

// 地名標籤只取台澎與金門、馬祖範圍，避免全島視角被對岸城市名稱搶走注意力。
const TAIWAN_AREA = {
  type: 'MultiPolygon',
  coordinates: [
    [[[119.25, 21.7], [122.2, 21.7], [122.2, 25.5], [121.0, 25.5], [119.25, 23.9], [119.25, 21.7]]],
    [[[118.22, 24.38], [118.5, 24.38], [118.5, 24.52], [118.22, 24.52], [118.22, 24.38]]],
    [[[119.9, 25.92], [120.55, 25.92], [120.55, 26.42], [119.9, 26.42], [119.9, 25.92]]],
  ],
};

const $ = (id) => document.getElementById(id);
const byId = new Map(SPOTS.map((s, i) => [s.id, Object.assign(s, { index: i })]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fmtInt = (n) => (Math.round(n) || 0).toLocaleString('zh-TW');

// ---------------------------------------------------------------- 狀態
const state = {
  base: 'satellite',
  exaggeration: 1.6,
  sea: 0,
  sunMinutes: 630,
  season: 'today',
  group: 'all',
  current: null,
  overlays: {},
};

// ---------------------------------------------------------------- 地形圖磚解碼（游標高程、剖面、海面壓平）
const demCache = new Map();
const DEM_CACHE_MAX = 96;

function decodeCanvas(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

// 每個圖磚請求最多等 12 秒，避免 HUD 與剖面卡在讀取中
function withTimeout(signal, ms = 12000) {
  const t = AbortSignal.timeout?.(ms);
  if (!t) return signal;
  if (!signal) return t;
  return AbortSignal.any ? AbortSignal.any([signal, t]) : signal;
}

function encodeTerrarium(d, i, e) {
  const v = e + 32768;
  d[i] = Math.floor(v / 256);
  d[i + 1] = Math.floor(v) % 256;
  d[i + 2] = Math.min(255, Math.round((v - Math.floor(v)) * 256));
}

// Terrarium 高縮放有往下掉的壞值：z14 圖磚 14/13698/7101 沿 121°E 整行約 −8,193 m（周圍約 2,700–3,400 m），
// 3D 地形會出現一條數千公尺深的直溝；清水斷崖沿岸與德基水庫等處也有零星坑點，游標高程與剖面也會讀到。
// z12 起一像素不到 40 m，真實地形不會在一格內陷下 400 m：比 8 鄰點中位數低 400 m 以上的像素補成中位數。
// 只往上補、不壓低任何像素，成片壞值的邊緣才不會被擴散出去。幾個像素連成一塊的壞值（德基水庫 14/13706/7053 有 3×2 一塊）
// 第一遍只補得到外圈，最多跑 4 遍由外往內補。回傳修正的次數。
const SPIKE_MIN_Z = 12, SPIKE_M = 400, SPIKE_PASSES = 4;
function despike(d, S) {
  const e = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) e[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
  const nb = [];
  let fixed = 0;
  for (let pass = 0; pass < SPIKE_PASSES; pass++) {
    // 一遍之內只讀上一遍的結果，修正順序不影響結果
    const fix = [];
    for (let y = 0; y < S; y++) {
      for (let x = 0; x < S; x++) {
        const i = y * S + x, v = e[i];
        // 上下左右都沒有高出 400 m 就不是坑，絕大多數像素在這裡略過
        if ((x === 0 || e[i - 1] - v <= SPIKE_M) && (x === S - 1 || e[i + 1] - v <= SPIKE_M)
          && (y === 0 || e[i - S] - v <= SPIKE_M) && (y === S - 1 || e[i + S] - v <= SPIKE_M)) continue;
        nb.length = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if ((dx || dy) && xx >= 0 && yy >= 0 && xx < S && yy < S) nb.push(e[yy * S + xx]);
          }
        }
        nb.sort((a, b) => a - b);
        const h = nb.length >> 1, med = nb.length % 2 ? nb[h] : (nb[h - 1] + nb[h]) / 2;
        if (med - v > SPIKE_M) fix.push(i, med);
      }
    }
    if (!fix.length) break;
    for (let k = 0; k < fix.length; k += 2) { e[fix[k]] = fix[k + 1]; encodeTerrarium(d, fix[k] * 4, fix[k + 1]); }
    fixed += fix.length / 2;
  }
  return fixed;
}
const demFixes = new Map(); // 除錯用：修正過的圖磚與像素數

async function fetchTerrarium(z, x, y, signal) {
  const url = TERRARIUM.replace('{z}', z).replace('{x}', x).replace('{y}', y);
  const res = await fetch(url, { signal: withTimeout(signal), mode: 'cors' });
  if (!res.ok) throw new Error(`DEM ${res.status} ${z}/${x}/${y}`);
  const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
  const canvas = decodeCanvas(bmp.width, bmp.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0);
  bmp.close?.();
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (z >= SPIKE_MIN_Z) {
    const n = despike(img.data, img.width);
    if (n) demFixes.set(`${z}/${x}/${y}`, n);
  }
  return { canvas, ctx, img };
}

function demTile(z, x, y) {
  const key = `${z}/${x}/${y}`;
  let p = demCache.get(key);
  if (p) { demCache.delete(key); demCache.set(key, p); return p; }
  p = fetchTerrarium(z, x, y).then(({ img }) => {
    const d = img.data, n = img.width * img.height, h = new Float32Array(n);
    for (let i = 0; i < n; i++) h[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
    return { size: img.width, h };
  });
  // 只刪自己：被淘汰後同 key 重抓的新請求不受舊請求失敗影響
  p.catch(() => { if (demCache.get(key) === p) demCache.delete(key); });
  demCache.set(key, p);
  if (demCache.size > DEM_CACHE_MAX) demCache.delete(demCache.keys().next().value);
  return p;
}

// Terrarium 的水深只到 zoom 10；zoom 11 起海域一律是 0 m（實測東部外海 122.80°E 23.81°N：z10 −3,351 m、z11 起 0 m）。
// 高縮放時，恰好 0 m 的像素改用 zoom 10 父圖磚補回水深。
const BATHY_MAX_Z = 10;

// 以圖磚內的像素座標（可為小數）做雙線性取樣，超出邊界時貼齊邊緣
function sampleTile(t, px, py) {
  const S = t.size, H = t.h;
  px = clamp(px, 0, S - 1); py = clamp(py, 0, S - 1);
  const x0 = Math.floor(px), y0 = Math.floor(py), x1 = Math.min(S - 1, x0 + 1), y1 = Math.min(S - 1, y0 + 1);
  const dx = px - x0, dy = py - y0;
  const top = H[y0 * S + x0] * (1 - dx) + H[y0 * S + x1] * dx;
  const bot = H[y1 * S + x0] * (1 - dx) + H[y1 * S + x1] * dx;
  return top * (1 - dy) + bot * dy;
}

async function elevationAt(lng, lat, z = 12) {
  const n = 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  const fx = ((lng + 180) / 360) * n;
  const fy = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n;
  const tx = Math.floor(fx), ty = Math.floor(fy);
  const t = await demTile(z, tx, ty);
  const v = sampleTile(t, (fx - tx) * t.size - 0.5, (fy - ty) * t.size - 0.5);
  if (z > BATHY_MAX_Z && Math.abs(v) < 0.5) {
    const b = await elevationAt(lng, lat, BATHY_MAX_Z);
    if (b < 0) return b;
  }
  return v;
}

// twdem://z/x/y?mode=flat：海面以下壓平到 0 m。衛星與地勢模式的 3D 地形用，避免海面影像被拉進數千公尺的海溝。
// twdem://z/x/y?mode=bathy：保留水深，zoom 11 以上補回 zoom 10 的水深。海底地形模式的地形與所有色階、暈渲用。
maplibregl.addProtocol('twdem', async (params, abort) => {
  const [path, query] = params.url.replace('twdem://', '').split('?');
  const [z, x, y] = path.split('/').map(Number);
  const mode = new URLSearchParams(query).get('mode') || 'flat';
  if (mode === 'bathy' && z <= BATHY_MAX_Z) {
    const url = TERRARIUM.replace('{z}', z).replace('{x}', x).replace('{y}', y);
    const res = await fetch(url, { signal: withTimeout(abort.signal), mode: 'cors' });
    if (!res.ok) throw new Error(`DEM ${res.status} ${z}/${x}/${y}`);
    return { data: await res.arrayBuffer() };
  }
  const { canvas, ctx, img } = await fetchTerrarium(z, x, y, abort.signal);
  const d = img.data, S = img.width;
  if (mode === 'flat') {
    for (let i = 0; i < d.length; i += 4) {
      if (d[i] < 128) { d[i] = 128; d[i + 1] = 0; d[i + 2] = 0; }
    }
  } else {
    let hasVoid = false;
    for (let i = 0; i < d.length && !hasVoid; i += 4) hasVoid = d[i] === 128 && d[i + 1] === 0 && d[i + 2] === 0;
    if (hasVoid) {
      const dz = z - BATHY_MAX_Z, k = 2 ** dz;
      const parent = await demTile(BATHY_MAX_Z, x >> dz, y >> dz);
      const ox = (x - (x >> dz) * k) / k, oy = (y - (y >> dz) * k) / k;
      const P = parent.size;
      for (let py = 0; py < S; py++) {
        for (let px = 0; px < S; px++) {
          const i = (py * S + px) * 4;
          if (d[i] !== 128 || d[i + 1] !== 0 || d[i + 2] !== 0) continue;
          const e = sampleTile(parent, (ox + (px + 0.5) / (S * k)) * P - 0.5, (oy + (py + 0.5) / (S * k)) * P - 0.5);
          if (e < 0) encodeTerrarium(d, i, e);
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return { data: await createImageBitmap(canvas) };
});

// ---------------------------------------------------------------- 太陽位置（NOAA 近似公式）
function sunPosition(date, lat = SUN_SITE.lat, lon = SUN_SITE.lon) {
  const rad = Math.PI / 180;
  const n = date.getTime() / 86400000 + 2440587.5 - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * rad;
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad;
  const eps = (23.439 - 0.0000004 * n) * rad;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const H = (gmst * 15 + lon) * rad - ra;
  const phi = lat * rad;
  const alt = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H));
  return { azimuth: ((az / rad) + 360) % 360, altitude: alt / rad };
}

// 山頂的下一次日出：太陽上緣碰到海平面地平線的時刻與方位。大氣折射加日面半徑取 0.833°；
// 山高讓地平線再往下沉約 1.76′·√h（含地面折射），玉山約 1.8°，比平地早約 8 分鐘。
// 只算到海平面地平線，東方有更高的山稜擋住時實際會晚一些。
function nextSunrise(lat, lon, h, now = new Date()) {
  const h0 = -0.833 - (1.76 / 60) * Math.sqrt(Math.max(0, h));
  const tw = new Date(now.getTime() + 8 * 3600e3);
  let t;
  for (let day = 0; day < 2; day++) {
    const mid = Date.UTC(tw.getUTCFullYear(), tw.getUTCMonth(), tw.getUTCDate() + day) - 8 * 3600e3; // 台灣時間午夜
    let a = mid + 3 * 3600e3, b = mid + 9 * 3600e3;
    for (let i = 0; i < 24; i++) {
      const m = (a + b) / 2;
      if (sunPosition(new Date(m), lat, lon).altitude < h0) a = m; else b = m;
    }
    t = { date: new Date(b), tomorrow: day === 1 };
    if (b > now.getTime()) break;
  }
  return { ...t, azimuth: sunPosition(t.date, lat, lon).azimuth };
}

function sunDate() {
  const now = new Date();
  const tw = new Date(now.getTime() + 8 * 3600e3);
  let y = tw.getUTCFullYear(), m = tw.getUTCMonth(), d = tw.getUTCDate();
  if (state.season !== 'today') [m, d] = SEASONS[state.season];
  return new Date(Date.UTC(y, m, d, 0, state.sunMinutes) - 8 * 3600e3);
}

function mixHex(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p, s) => (p >> s) & 255;
  const c = [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}

const SKY = {
  night: { sky: '#03050b', horizon: '#141c32', fog: '#0b1020' },
  golden: { sky: '#3f5690', horizon: '#f0a978', fog: '#d99a7a' },
  day: { sky: '#4f86cf', horizon: '#cfe1f3', fog: '#d6e2ee' },
};

function skyFor(alt) {
  const a = smooth(-9, 2, alt), b = smooth(5, 26, alt);
  const pick = (k) => mixHex(mixHex(SKY.night[k], SKY.golden[k], a), SKY.day[k], b);
  return {
    'sky-color': pick('sky'),
    'horizon-color': pick('horizon'),
    'fog-color': pick('fog'),
    'sky-horizon-blend': 0.55,
    'horizon-fog-blend': 0.6,
    'fog-ground-blend': 0.82,
    'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 4, 0.9, 7, 0],
  };
}

// ---------------------------------------------------------------- 地圖樣式
const NAME = ['coalesce', ['get', 'name:zh-Hant'], ['get', 'name:zh-TW'], ['get', 'name']];
const TEXT_PAINT = { 'text-color': '#f6f2ea', 'text-halo-color': 'rgba(8,10,14,0.82)', 'text-halo-width': 1.4, 'text-halo-blur': 0.4 };

function spotsGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: SPOTS.map((s) => ({
      type: 'Feature',
      id: s.index,
      geometry: { type: 'Point', coordinates: [s.lon, s.lat] },
      properties: { id: s.id, short: s.short, group: s.group, color: GROUPS[s.group].color, rank: GROUPS[s.group].rank, featured: FEATURED.has(s.id) },
    })),
  };
}

// 建築依高度由暖灰漸亮，夜間轉成帶燈光的暗色
const BUILDING_HEIGHT = ['coalesce', ['get', 'render_height'], 6];
const BUILDING_DAY = ['interpolate', ['linear'], BUILDING_HEIGHT, 0, '#cbc4b7', 40, '#e2dbcd', 150, '#f4ecdc', 400, '#fff6e6'];
const BUILDING_NIGHT = ['interpolate', ['linear'], BUILDING_HEIGHT, 0, '#2b2f3a', 40, '#3d3a3a', 150, '#6b5a3e', 400, '#b48a4a'];

function quakesGeoJSON() {
  return {
    type: 'FeatureCollection',
    features: QUAKES.map((q) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [q.lon, q.lat] },
      properties: { label: `${q.year} ${q.name}\nM${q.mag}`, mag: q.mag },
    })),
  };
}

// 由起點、方位角與距離推算終點（小範圍平面近似）
function offsetKm([lon, lat], bearing, km) {
  const r = Math.PI / 180;
  return [lon + (km * Math.sin(bearing * r)) / (111.32 * Math.cos(lat * r)), lat + (km * Math.cos(bearing * r)) / 110.57];
}

// 板塊名稱與菲律賓海板塊相對歐亞板塊的運動方向（約 8 cm／年，方位約 306°）
function plateNotes() {
  const from = [123.7, 22.2], dir = 306, len = 105;
  const tip = offsetKm(from, dir, len);
  const pt = (c, label, kind) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c }, properties: { label, kind } });
  return {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', geometry: { type: 'LineString', coordinates: [from, tip] }, properties: {} },
      { type: 'Feature', geometry: { type: 'LineString', coordinates: [offsetKm(tip, dir + 150, 24), tip, offsetKm(tip, dir - 150, 24)] }, properties: {} },
      pt([123.45, 21.55], '菲律賓海板塊', 'plate'),
      pt([119.4, 24.45], '歐亞板塊', 'plate'),
      pt(offsetKm(offsetKm(from, dir, len * 0.45), dir + 90, 26), '約 8 cm／年', 'rate'),
      // 海溝名稱放在 PB2002 線旁固定位置（沿線標籤在全島視角常被擠掉）
      pt([123.6, 23.2], '琉球海溝', 'trench'),
      pt([119.7, 21.05], '馬尼拉海溝', 'trench'),
      pt([123.0, 25.2], '沖繩海槽', 'rift'),
    ],
  };
}

// 震源圓點：半徑隨規模指數放大（每級約 1.85 倍），顏色是震源深度
const magScale = (k) => ['*', k, ['^', 1.85, ['-', ['get', 'm'], 4]]];
const DEPTH_COLOR = ['interpolate', ['linear'], ['get', 'd'], ...DEPTH_STOPS];

// 旅遊專項配色：環島坡度（%）、步道難度（林業保育署 0–6 級）
const GRADE_STOPS = [0, '#7fd1ae', 3, '#cfe27a', 5, '#f2c46d', 7, '#ff9b73', 10, '#ff5d6c'];
const GRADE_COLOR = ['interpolate', ['linear'], ['get', 'g'], ...GRADE_STOPS];
const DIF_COLORS = ['#7fd1ae', '#7fd1ae', '#cfe27a', '#f2c46d', '#ff9b73', '#ff6b6b', '#e07ad0'];
const DIF_EXPR = ['match', ['get', 'dif'], ...DIF_COLORS.flatMap((c, i) => [i, c]), '#cccccc'];

const EMPTY = { type: 'FeatureCollection', features: [] };
const SPOT_LABEL_LAYOUT = { 'text-field': ['get', 'short'], 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 6, 12, 11, 13.5], 'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 0.85, 'text-justify': 'auto', 'text-padding': 3, 'symbol-sort-key': ['get', 'rank'] };
const SPOT_LABEL_PAINT = { 'text-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ffd88a', '#ffffff'], 'text-halo-color': 'rgba(8,10,14,0.88)', 'text-halo-width': 1.6 };
const spotRadius = (r) => ['case', ['boolean', ['feature-state', 'selected'], false], r + 3, ['boolean', ['feature-state', 'hover'], false], r + 1.8, r];

function buildStyle() {
  return {
    version: 8,
    projection: { type: 'globe' },
    glyphs: GLYPHS,
    sky: skyFor(40),
    sources: {
      sat: { type: 'raster', tiles: [ESRI], tileSize: 256, maxzoom: 19, attribution: '影像 © Esri, Maxar, Earthstar Geographics' },
      night: { type: 'raster', tiles: [NIGHT], tileSize: 256, maxzoom: 8, attribution: '夜光 NASA Black Marble' },
      'dem-flat': { type: 'raster-dem', tiles: ['twdem://{z}/{x}/{y}?mode=flat'], encoding: 'terrarium', tileSize: 256, maxzoom: 14, attribution: '地形 Mapzen Terrarium / AWS Open Data' },
      'dem-raw': { type: 'raster-dem', tiles: ['twdem://{z}/{x}/{y}?mode=bathy'], encoding: 'terrarium', tileSize: 256, maxzoom: 14 },
      'dem-shade': { type: 'raster-dem', tiles: ['twdem://{z}/{x}/{y}?mode=bathy'], encoding: 'terrarium', tileSize: 256, maxzoom: 13 },
      omt: { type: 'vector', url: OMT },
      spots: { type: 'geojson', data: spotsGeoJSON() },
      quakes: { type: 'geojson', data: quakesGeoJSON() },
      catalog: { type: 'geojson', data: EMPTY, attribution: '地震目錄 USGS ComCat' },
      plates: { type: 'geojson', data: EMPTY, attribution: '板塊邊界 Bird (2003) PB2002' },
      'plate-notes': { type: 'geojson', data: plateNotes() },
      'bike-route': { type: 'geojson', data: EMPTY, attribution: '環島 1 號線與沿線設施 © OpenStreetMap 貢獻者' },
      'bike-hl': { type: 'geojson', data: EMPTY },
      'bike-pois': { type: 'geojson', data: EMPTY },
      'bike-stages': { type: 'geojson', data: EMPTY },
      trails: { type: 'geojson', data: EMPTY, attribution: '步道 林業及自然保育署' },
      'trail-heads': { type: 'geojson', data: EMPTY },
      peaks: { type: 'geojson', data: EMPTY },
      profile: { type: 'geojson', data: EMPTY },
      cursor: { type: 'geojson', data: EMPTY },
    },
    terrain: { source: 'dem-flat', exaggeration: state.exaggeration },
    layers: [
      { id: 'bg', type: 'background', paint: { 'background-color': '#0d1117' } },
      { id: 'sat', type: 'raster', source: 'sat', paint: { 'raster-fade-duration': 250 } },
      { id: 'seatint', type: 'color-relief', source: 'dem-shade', paint: { 'color-relief-color': SAT_SEA_RAMP } },
      { id: 'tint', type: 'color-relief', source: 'dem-shade', layout: { visibility: 'none' }, paint: { 'color-relief-color': RELIEF_RAMP } },
      { id: 'night', type: 'raster', source: 'night', layout: { visibility: 'none' }, paint: { 'raster-opacity': 0, 'raster-fade-duration': 0 } },
      { id: 'sea', type: 'color-relief', source: 'dem-shade', layout: { visibility: 'none' }, paint: { 'color-relief-color': seaRamp(1) } },
      {
        id: 'shade', type: 'hillshade', source: 'dem-shade',
        paint: { 'hillshade-method': 'combined', 'hillshade-illumination-anchor': 'map', 'hillshade-exaggeration': 0.3, 'hillshade-shadow-color': 'rgba(6,10,22,0.6)', 'hillshade-highlight-color': 'rgba(255,248,232,0.16)', 'hillshade-accent-color': 'rgba(0,0,0,0)' },
      },
      { id: 'parks', type: 'line', source: 'omt', 'source-layer': 'park', filter: ['==', ['get', 'class'], 'national_park'], layout: { visibility: 'none' }, paint: { 'line-color': '#a6e38a', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1, 12, 2.4], 'line-dasharray': [3, 2], 'line-opacity': 0.9 } },
      { id: 'rivers', type: 'line', source: 'omt', 'source-layer': 'waterway', minzoom: 6, filter: ['==', ['get', 'class'], 'river'], layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#7ad6ff', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.7, 10, 1.6, 14, 3.5], 'line-opacity': 0.9 } },
      { id: 'roads', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 6, filter: ['match', ['get', 'class'], ['motorway', 'trunk'], true, false], layout: { visibility: 'none', 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffd38a', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 0.6, 10, 1.4, 14, 3], 'line-opacity': 0.85 } },
      { id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', minzoom: 7, filter: ['==', ['get', 'class'], 'rail'], layout: { visibility: 'none' }, paint: { 'line-color': '#ff9b73', 'line-width': ['interpolate', ['linear'], ['zoom'], 7, 0.8, 14, 2.6], 'line-dasharray': [2, 1.2], 'line-opacity': 0.9 } },
      { id: 'buildings', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13, paint: { 'fill-extrusion-color': BUILDING_DAY, 'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0], 'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0, 14, 0.88] } },
      { id: 'plates-rift', type: 'line', source: 'plates', filter: ['==', ['get', 'kind'], 'okinawa'], layout: { visibility: 'none', 'line-join': 'round' }, paint: { 'line-color': '#ffb36b', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.4, 9, 2.6], 'line-dasharray': [2.2, 1.6], 'line-opacity': 0.85 } },
      { id: 'plates-line', type: 'line', source: 'plates', filter: ['!=', ['get', 'kind'], 'okinawa'], layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ff6b8b', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1.8, 9, 3.4], 'line-opacity': 0.9 } },
      { id: 'plates-arrow', type: 'line', source: 'plate-notes', filter: ['==', ['geometry-type'], 'LineString'], layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 4, 2, 9, 3.2], 'line-opacity': 0.85 } },
      // 播放時新出現的地震擴散一圈，約半年內淡出
      { id: 'catalog-flash', type: 'circle', source: 'catalog', filter: ['<', ['get', 'age'], 0.6], layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, ['*', magScale(1.4), ['+', 1.4, ['*', 9, ['get', 'age']]]], 11, ['*', magScale(2.8), ['+', 1.4, ['*', 9, ['get', 'age']]]]], 'circle-color': 'rgba(0,0,0,0)', 'circle-stroke-color': DEPTH_COLOR, 'circle-stroke-width': 1.6, 'circle-stroke-opacity': ['interpolate', ['linear'], ['get', 'age'], 0, 0.95, 0.6, 0], 'circle-pitch-alignment': 'map' } },
      { id: 'catalog-dot', type: 'circle', source: 'catalog', layout: { visibility: 'none', 'circle-sort-key': ['get', 'm'] }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, magScale(1.4), 8, magScale(1.9), 11, magScale(2.6), 14, magScale(3.4)], 'circle-color': DEPTH_COLOR, 'circle-opacity': ['interpolate', ['linear'], ['get', 'age'], 0, 0.95, 3, 0.85, 20, 0.66], 'circle-stroke-color': ['case', ['<', ['get', 'age'], 0.08], '#ffffff', 'rgba(8,10,14,0.75)'], 'circle-stroke-width': ['case', ['<', ['get', 'age'], 0.08], 1.4, 0.6] } },
      // 旅遊專項：環島依坡度著色（g：0.5 km 平均坡度 %），步道依難度著色
      { id: 'bike-route-casing', type: 'line', source: 'bike-route', layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': 'rgba(8,10,14,0.7)', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 4, 12, 9] } },
      { id: 'bike-route', type: 'line', source: 'bike-route', layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': GRADE_COLOR, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2.2, 12, 5] } },
      { id: 'bike-hl', type: 'line', source: 'bike-hl', layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 2, 12, 3.5], 'line-dasharray': [1.6, 1.2], 'line-opacity': 0.95 } },
      { id: 'trail-line', type: 'line', source: 'trails', layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': DIF_EXPR, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.4, 13, 3.4], 'line-opacity': 0.9 } },
      { id: 'trail-hl', type: 'line', source: 'trails', filter: ['==', ['get', 'id'], ''], layout: { visibility: 'none', 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 3, 13, 6], 'line-opacity': 0.9 } },
      { id: 'profile-line-casing', type: 'line', source: 'profile', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round' }, paint: { 'line-color': 'rgba(0,0,0,0.45)', 'line-width': 5 } },
      { id: 'profile-line', type: 'line', source: 'profile', filter: ['==', ['geometry-type'], 'LineString'], layout: { 'line-cap': 'round' }, paint: { 'line-color': '#ffffff', 'line-width': 2.2, 'line-dasharray': [2, 1.4] } },
      { id: 'profile-ends', type: 'circle', source: 'profile', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#e9b44c', 'circle-stroke-color': '#0b0d10', 'circle-stroke-width': 2 } },
      { id: 'quakes-ring', type: 'circle', source: 'quakes', layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, ['*', ['-', ['get', 'mag'], 5], 9], 10, ['*', ['-', ['get', 'mag'], 5], 30]], 'circle-color': 'rgba(255,122,89,0.16)', 'circle-stroke-color': '#ff7a59', 'circle-stroke-width': 1.6, 'circle-pitch-alignment': 'map' } },
      { id: 'parks-label', type: 'symbol', source: 'omt', 'source-layer': 'park', minzoom: 8, filter: ['==', ['get', 'class'], 'national_park'], layout: { visibility: 'none', 'text-field': NAME, 'text-font': ['Noto Sans Italic'], 'text-size': 12, 'text-max-width': 7 }, paint: { ...TEXT_PAINT, 'text-color': '#c7f0b2' } },
      { id: 'rivers-label', type: 'symbol', source: 'omt', 'source-layer': 'waterway', minzoom: 9, filter: ['==', ['get', 'class'], 'river'], layout: { visibility: 'none', 'symbol-placement': 'line', 'text-field': NAME, 'text-font': ['Noto Sans Italic'], 'text-size': 11.5, 'text-letter-spacing': 0.1 }, paint: { ...TEXT_PAINT, 'text-color': '#a9e6ff' } },
      { id: 'places-village', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 11.5, filter: ['all', ['==', ['get', 'class'], 'village'], ['within', TAIWAN_AREA]], layout: { 'text-field': NAME, 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-padding': 6 }, paint: { ...TEXT_PAINT, 'text-color': '#d9d4cb' } },
      { id: 'places-town', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 9, filter: ['all', ['==', ['get', 'class'], 'town'], ['within', TAIWAN_AREA]], layout: { 'text-field': NAME, 'text-font': ['Noto Sans Regular'], 'text-size': 12, 'text-padding': 6, 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99] }, paint: TEXT_PAINT },
      { id: 'places-city', type: 'symbol', source: 'omt', 'source-layer': 'place', minzoom: 8.2, filter: ['all', ['==', ['get', 'class'], 'city'], ['within', TAIWAN_AREA]], layout: { 'text-field': NAME, 'text-font': ['Noto Sans Bold'], 'text-size': ['interpolate', ['linear'], ['zoom'], 7, 12.5, 11, 15], 'text-padding': 8, 'symbol-sort-key': ['coalesce', ['get', 'rank'], 99] }, paint: TEXT_PAINT },
      { id: 'peaks-dot', type: 'circle', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 9.5, filter: ['has', 'ele'], paint: { 'circle-radius': 2.4, 'circle-color': '#f2c46d', 'circle-stroke-color': '#0b0d10', 'circle-stroke-width': 1 } },
      { id: 'peaks-label', type: 'symbol', source: 'omt', 'source-layer': 'mountain_peak', minzoom: 9.5, filter: ['has', 'ele'], layout: { 'text-field': ['format', NAME, {}, '\n', {}, ['concat', ['to-string', ['get', 'ele']], ' m'], { 'font-scale': 0.82, 'text-color': '#f2c46d' }], 'text-font': ['Noto Sans Regular'], 'text-size': 11.5, 'text-anchor': 'top', 'text-offset': [0, 0.45], 'text-padding': 4, 'symbol-sort-key': ['*', -1, ['to-number', ['get', 'ele'], 0]] }, paint: TEXT_PAINT },
      { id: 'quakes-label', type: 'symbol', source: 'quakes', layout: { visibility: 'none', 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 11.5, 'text-allow-overlap': true }, paint: { ...TEXT_PAINT, 'text-color': '#ffb39e' } },
      { id: 'plates-name', type: 'symbol', source: 'plate-notes', filter: ['==', ['geometry-type'], 'Point'], layout: { visibility: 'none', 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': ['match', ['get', 'kind'], 'plate', 16, 12.5], 'text-letter-spacing': ['match', ['get', 'kind'], 'plate', 0.35, 'rate', 0.04, 0.18], 'text-allow-overlap': true, 'text-ignore-placement': true }, paint: { ...TEXT_PAINT, 'text-color': ['match', ['get', 'kind'], 'trench', '#ffb8c6', 'rift', '#ffd2a8', 'rgba(255,255,255,0.94)'], 'text-halo-width': 2 } },
      // 補給點拉近才顯示：全島尺度只留依坡度著色的路線與每日終點
      { id: 'bike-poi', type: 'circle', source: 'bike-pois', minzoom: 8.5, filter: ['in', ['get', 'kind'], ['literal', ['station']]], layout: { visibility: 'none', 'circle-sort-key': ['match', ['get', 'kind'], 'station', 2, 1] }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, ['match', ['get', 'kind'], 'station', 3.6, 2.4], 12, ['match', ['get', 'kind'], 'station', 6, 4.5]], 'circle-color': ['match', ['get', 'kind'], 'station', '#ffffff', 'store', '#9be15d', 'police', '#5ec2e6', '#e9b44c'], 'circle-stroke-color': 'rgba(8,10,14,0.9)', 'circle-stroke-width': 1.2 } },
      { id: 'bike-poi-label', type: 'symbol', source: 'bike-pois', minzoom: 9, filter: ['==', ['get', 'kind'], 'station'], layout: { visibility: 'none', 'text-field': ['concat', ['get', 'name'], '站'], 'text-font': ['Noto Sans Regular'], 'text-size': 11.5, 'text-offset': [0, 1.05], 'text-anchor': 'top', 'text-padding': 4 }, paint: { ...TEXT_PAINT, 'text-color': '#ffffff' } },
      { id: 'bike-stage', type: 'circle', source: 'bike-stages', layout: { visibility: 'none' }, paint: { 'circle-radius': 7, 'circle-color': '#e9b44c', 'circle-stroke-color': '#0b0d10', 'circle-stroke-width': 2, 'circle-pitch-alignment': 'viewport' } },
      { id: 'bike-stage-label', type: 'symbol', source: 'bike-stages', layout: { visibility: 'none', 'text-field': ['get', 'label'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-variable-anchor': ['left', 'right'], 'text-radial-offset': 1, 'text-allow-overlap': true }, paint: { ...TEXT_PAINT, 'text-color': '#ffd88a' } },
      { id: 'trail-head', type: 'circle', source: 'trail-heads', layout: { visibility: 'none' }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 3.4, 12, 6], 'circle-color': DIF_EXPR, 'circle-stroke-color': '#0b0d10', 'circle-stroke-width': 1.4, 'circle-pitch-alignment': 'viewport' } },
      { id: 'trail-label', type: 'symbol', source: 'trail-heads', minzoom: 9.5, layout: { visibility: 'none', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11.5, 'text-offset': [0, 1], 'text-anchor': 'top', 'text-padding': 4 }, paint: { ...TEXT_PAINT, 'text-color': '#d9f2c8' } },
      { id: 'peak-dot', type: 'circle', source: 'peaks', layout: { visibility: 'none', 'circle-sort-key': ['-', 0, ['get', 'rank']] }, paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 3, 10, 5.5, 13, 7], 'circle-color': ['case', ['get', 'done'], '#e9b44c', '#ffffff'], 'circle-stroke-color': '#0b0d10', 'circle-stroke-width': 1.4, 'circle-pitch-alignment': 'viewport' } },
      { id: 'peak-label', type: 'symbol', source: 'peaks', minzoom: 8.6, layout: { visibility: 'none', 'text-field': ['format', ['get', 'name'], {}, '\n', {}, ['concat', ['to-string', ['get', 'h']], ' m'], { 'font-scale': 0.82 }], 'text-font': ['Noto Sans Bold'], 'text-size': 11.5, 'text-anchor': 'top', 'text-offset': [0, 0.7], 'text-padding': 3, 'symbol-sort-key': ['get', 'rank'] }, paint: { ...TEXT_PAINT, 'text-color': ['case', ['get', 'done'], '#ffd88a', '#ffffff'] } },
      { id: 'spots-halo', type: 'circle', source: 'spots', paint: { 'circle-radius': ['case', ['boolean', ['feature-state', 'selected'], false], 16, 0], 'circle-color': 'rgba(233,180,76,0.22)', 'circle-stroke-color': 'rgba(233,180,76,0.85)', 'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 1.2, 0], 'circle-pitch-alignment': 'viewport' } },
      { id: 'spots-dot', type: 'circle', source: 'spots', paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 5, spotRadius(3.4), 9, spotRadius(5), 13, spotRadius(6)], 'circle-color': ['get', 'color'], 'circle-stroke-color': ['case', ['boolean', ['feature-state', 'selected'], false], '#ffffff', 'rgba(8,10,14,0.9)'], 'circle-stroke-width': ['case', ['boolean', ['feature-state', 'selected'], false], 2.4, 1.4], 'circle-pitch-alignment': 'viewport' } },
      { id: 'spots-label-major', type: 'symbol', source: 'spots', minzoom: 5.6, maxzoom: 9.2, filter: ['get', 'featured'], layout: SPOT_LABEL_LAYOUT, paint: SPOT_LABEL_PAINT },
      { id: 'spots-label', type: 'symbol', source: 'spots', minzoom: 9.2, layout: SPOT_LABEL_LAYOUT, paint: SPOT_LABEL_PAINT },
      { id: 'cursor', type: 'circle', source: 'cursor', paint: { 'circle-radius': 6, 'circle-color': '#ffffff', 'circle-stroke-color': '#e9b44c', 'circle-stroke-width': 3, 'circle-pitch-alignment': 'viewport' } },
    ],
  };
}

const OVERLAY_LAYERS = {
  places: ['places-city', 'places-town', 'places-village'],
  peaks: ['peaks-dot', 'peaks-label'],
  rivers: ['rivers', 'rivers-label'],
  roads: ['roads', 'rail'],
  buildings: ['buildings'],
  parks: ['parks', 'parks-label'],
  quakes: ['quakes-ring', 'quakes-label'],
  spots: ['spots-halo', 'spots-dot', 'spots-label-major', 'spots-label'],
};

// ---------------------------------------------------------------- 建立地圖
let map;
try {
  map = new maplibregl.Map({
    container: 'map',
    style: buildStyle(),
    center: [121, 23.7],
    zoom: 1.6,
    pitch: 0,
    bearing: 0,
    minZoom: 1,
    maxZoom: 18.5,
    maxPitch: 80,
    attributionControl: false,
    localIdeographFontFamily: CJK_FONT,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
  });
} catch (err) {
  console.error(err);
  $('veil').querySelector('.veil-sub').innerHTML = '這個瀏覽器無法啟用 WebGL。<a href="classic.html" style="color:var(--accent)">改看舊版介面</a>';
  throw err;
}

const attribution = new maplibregl.AttributionControl({ compact: true, customAttribution: 'MapLibre GL JS' });
map.addControl(attribution, 'bottom-right');
// 寬螢幕上 compact 仍預設展開；收成「i」按鈕，點開才顯示完整來源。
map.once('idle', () => attribution._container?.classList.remove('maplibregl-compact-show'));
map.addControl(new maplibregl.ScaleControl({ unit: 'metric', maxWidth: 110 }), 'bottom-left');
map.on('error', (e) => console.warn('[map]', e.error?.message || e));
const mapReady = new Promise((resolve) => map.once('load', resolve));

const beaconEl = document.createElement('div');
beaconEl.className = 'beacon';
const beacon = new maplibregl.Marker({ element: beaconEl, pitchAlignment: 'viewport' });
const style = document.createElement('style');
style.textContent = `.beacon{width:14px;height:14px;pointer-events:none}.beacon::before,.beacon::after{content:"";position:absolute;inset:-12px;border:1.5px solid #e9b44c;border-radius:50%;animation:beacon 2.4s cubic-bezier(.2,.6,.3,1) infinite;opacity:0}.beacon::after{animation-delay:1.2s}@keyframes beacon{0%{transform:scale(.35);opacity:.9}100%{transform:scale(1.9);opacity:0}}@media (prefers-reduced-motion:reduce){.beacon::before,.beacon::after{animation:none;opacity:.7;transform:scale(1)}}`;
document.head.append(style);

// ---------------------------------------------------------------- 版面 padding（讓飛行目標落在面板以外的可視中心）
const panelEl = $('panel'), cardEl = $('card'), profileEl = $('profile');

// 剖面高度依是否附帶震源層與視窗高度而不同（CSS 變數 --profile-h）；手機抽屜開著時剖面不顯示，用原本的高度
const profileHeight = () => profileEl.offsetHeight || (isMobile() ? 190 : 212);

function viewPadding() {
  const p = { top: 0, bottom: 0, left: 0, right: 0 };
  if (isMobile()) {
    p.top = 56; p.right = 52; p.bottom = 58;
    if (!profileEl.hidden) p.bottom += profileHeight() + 10;
    else if (!cardEl.hidden) p.bottom += Math.min(cardEl.offsetHeight, innerHeight * 0.5) + 8;
    return p;
  }
  const cs = getComputedStyle(document.documentElement);
  const gap = parseFloat(cs.getPropertyValue('--gap')) || 20;
  if (!document.body.classList.contains('panel-collapsed')) p.left = gap + (parseFloat(cs.getPropertyValue('--panel-w')) || 344);
  p.right = cardEl.hidden ? 64 : innerWidth - cardEl.getBoundingClientRect().left;
  if (!profileEl.hidden) p.bottom = profileHeight() + 24;
  return p;
}

function relayout(duration = 450) {
  // 飛行中不能 setPadding（等於 jumpTo，會中斷飛行）；進行中的 flyTo／easeTo 本來就帶 padding
  if (map.isMoving()) return;
  if (tour.playing || orbit.on) { map.setPadding(viewPadding()); return; }
  map.easeTo({ padding: viewPadding(), duration: reduceMQ.matches ? 0 : duration });
}

// ---------------------------------------------------------------- 日照
// 夜光圖磚（NASA Black Marble）全島視角約 3.5–4.5 MB，白天看不到，預設不載。
// 一碰日照時間或季節控制就先載入，拖到黃昏時圖磚已經備妥，不會一格格冒出來。
let nightWarm = false;
function warmNight() {
  if (nightWarm) return;
  nightWarm = true;
  mapReady.then(applySun);
}

function applySun() {
  const date = sunDate();
  const { azimuth, altitude } = sunPosition(date);
  const day = smooth(-7, 7, altitude);
  const low = 1 - smooth(6, 40, altitude);
  const golden = altitude > -4 ? 1 - smooth(3, 20, altitude) : 0;
  const isSat = state.base === 'satellite';

  map.setSky(skyFor(altitude));
  map.setPaintProperty('shade', 'hillshade-illumination-direction', Math.round(azimuth));
  map.setPaintProperty('shade', 'hillshade-illumination-altitude', clamp(altitude, 2, 88));
  // 遠景時 3D 起伏不明顯，暈渲加重；拉近後交給真實地形。
  const ex = isSat ? 0.22 + 0.3 * low * day : 0.5 + 0.25 * low;
  map.setPaintProperty('shade', 'hillshade-exaggeration', ['interpolate', ['linear'], ['zoom'], 5, Math.min(1, ex * 2.2), 9, Math.min(1, ex * 1.3), 12, ex]);
  map.setPaintProperty('shade', 'hillshade-shadow-color', `rgba(6,10,24,${(0.38 + 0.22 * low).toFixed(2)})`);
  map.setPaintProperty('shade', 'hillshade-highlight-color', golden > 0.2
    ? `rgba(255,180,110,${(0.12 + 0.2 * golden).toFixed(2)})`
    : `rgba(255,248,232,${(0.16 * day).toFixed(2)})`);

  map.setPaintProperty('sat', 'raster-brightness-max', 0.16 + 0.84 * day);
  map.setPaintProperty('sat', 'raster-saturation', -0.45 * (1 - day) + 0.08 * golden);
  map.setPaintProperty('tint', 'color-relief-opacity', 0.25 + 0.75 * day);

  const lights = 1 - smooth(-8, 1, altitude);
  map.setLayoutProperty('night', 'visibility', lights > 0 || nightWarm ? 'visible' : 'none');
  map.setPaintProperty('night', 'raster-opacity', ['interpolate', ['linear'], ['zoom'], 5, 0.95 * lights, 9, 0.7 * lights, 12, 0.3 * lights]);

  map.setLight({ anchor: 'map', position: [1.2, azimuth, 90 - clamp(altitude, 8, 80)], color: golden > 0.3 ? '#ffd2a1' : '#ffffff', intensity: 0.2 + 0.35 * day });
  map.setPaintProperty('buildings', 'fill-extrusion-color', day < 0.3 ? BUILDING_NIGHT : BUILDING_DAY);

  const hh = String(Math.floor(state.sunMinutes / 60)).padStart(2, '0');
  const mm = String(state.sunMinutes % 60).padStart(2, '0');
  $('sunOut').textContent = `${hh}:${mm}`;
  $('sunHint').textContent = altitude < -0.8
    ? `太陽在地平線下 ${Math.abs(altitude).toFixed(0)}°，城市燈火浮現。`
    : `太陽方位 ${azimuth.toFixed(0)}°（${compassWord(azimuth)}）· 仰角 ${altitude.toFixed(0)}°`;
}

function compassWord(deg) {
  return ['北', '東北', '東', '東南', '南', '西南', '西', '西北'][Math.round(deg / 45) % 8];
}

// ---------------------------------------------------------------- 海平面
// color-relief 在色階範圍外不會穩定維持透明（實測陸地被塗黑），兩端一律補上 −12000／9000 m 的透明色階。
function seaRamp(L) {
  const clear = 'rgba(0,0,0,0)';
  if (L > 0) {
    return ['interpolate', ['linear'], ['elevation'],
      -12000, clear, -1, clear, 0, 'rgba(28,88,148,0.9)', L - 0.5, 'rgba(72,150,200,0.82)', L, clear, 9000, clear];
  }
  return ['interpolate', ['linear'], ['elevation'],
    -12000, clear, L - 0.5, clear, L, 'rgba(92,110,68,0.95)', -0.5, 'rgba(152,154,106,0.95)', 0, clear, 9000, clear];
}

function seaCaption(L) {
  if (L <= -100) return '末次冰期（約兩萬年前）海平面低約 120 m：台灣海峽大多露出，台灣與澎湖、大陸相連成陸橋。';
  if (L < -40) return '海峽中央的淺灘先露出，澎湖與台灣西岸之間逐漸連成陸地。';
  if (L < 0) return '近岸大陸棚露出，西部海岸線向外推進。';
  if (L === 0) return '現今海平面。';
  if (L <= 10) return '西南沿海低地、潟湖與河口最先被淹沒；格陵蘭冰蓋全融約可使海平面上升 7 m。';
  if (L <= 40) return '蘭陽、嘉南與屏東平原大面積淹沒，臺北盆地成為內灣。';
  return '全球冰層全融約使海平面上升 70 m：西部平原幾乎全沒入海中，只剩丘陵與山地。';
}

function applySea() {
  const L = state.sea;
  $('seaOut').textContent = `${L > 0 ? '+' : L < 0 ? '−' : ''}${Math.abs(L)} m`;
  $('seaHint').textContent = seaCaption(L);
  if (L === 0) { map.setLayoutProperty('sea', 'visibility', 'none'); return; }
  map.setPaintProperty('sea', 'color-relief-color', seaRamp(L));
  map.setLayoutProperty('sea', 'visibility', 'visible');
}

// ---------------------------------------------------------------- 底圖與圖層
function applyBase() {
  const b = state.base;
  map.setLayoutProperty('sat', 'visibility', b === 'satellite' ? 'visible' : 'none');
  map.setLayoutProperty('seatint', 'visibility', b === 'satellite' ? 'visible' : 'none');
  map.setLayoutProperty('tint', 'visibility', b === 'satellite' ? 'none' : 'visible');
  map.setPaintProperty('tint', 'color-relief-color', b === 'ocean' ? OCEAN_RAMP : RELIEF_RAMP);
  map.setTerrain({ source: b === 'ocean' ? 'dem-raw' : 'dem-flat', exaggeration: state.exaggeration });
  $('basemapHint').textContent = BASEMAP_HINT[b];
  document.querySelectorAll('#basemapSeg button').forEach((x) => x.setAttribute('aria-checked', String(x.dataset.base === b)));
  applySun();
}

function applyOverlay(key, on) {
  state.overlays[key] = on;
  for (const id of OVERLAY_LAYERS[key]) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  if (key === 'spots') beaconEl.style.display = on ? '' : 'none';
}

function applyGroupFilter() {
  const f = state.group === 'all' ? null : ['==', ['get', 'group'], state.group];
  for (const id of OVERLAY_LAYERS.spots) {
    map.setFilter(id, id === 'spots-label-major' ? (f ? ['all', ['get', 'featured'], f] : ['get', 'featured']) : f);
  }
}

// ---------------------------------------------------------------- 面板：導覽點、路線
function renderChips() {
  const wrap = $('groupChips');
  const counts = {};
  SPOTS.forEach((s) => (counts[s.group] = (counts[s.group] || 0) + 1));
  const make = (key, label, color, n) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.group = key;
    b.setAttribute('aria-pressed', String(state.group === key));
    if (color) b.style.setProperty('--c', color);
    b.innerHTML = `${color ? '<i></i>' : ''}<span></span><b>${n}</b>`;
    b.querySelector('span').textContent = label;
    b.addEventListener('click', () => {
      state.group = key;
      wrap.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.group === key)));
      renderSpotList();
      applyGroupFilter();
    });
    return b;
  };
  wrap.append(make('all', '全部', null, SPOTS.length));
  for (const [k, g] of Object.entries(GROUPS)) wrap.append(make(k, g.label, g.color, counts[k] || 0));
}

function renderSpotList() {
  const ol = $('spotList');
  ol.replaceChildren();
  for (const s of SPOTS) {
    if (state.group !== 'all' && s.group !== state.group) continue;
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.id = s.id;
    b.style.setProperty('--c', GROUPS[s.group].color);
    b.innerHTML = '<span class="n"></span><span class="t"><i></i><span></span></span><span class="e"></span><span class="b"></span>';
    b.querySelector('.n').textContent = String(s.index + 1).padStart(2, '0');
    b.querySelector('.t span').textContent = s.short;
    b.querySelector('.e').textContent = s.elev < 0 ? `−${fmtInt(-s.elev)} m` : `${fmtInt(s.elev)} m`;
    b.querySelector('.b').textContent = s.badge;
    if (state.current?.id === s.id) b.setAttribute('aria-current', 'true');
    // 手機先收抽屜：卡片才會顯示，飛行 padding 才算得到卡片高度
    b.addEventListener('click', () => { if (isMobile()) setSheet(false); stopTour(); selectSpot(s); });
    li.append(b);
    ol.append(li);
  }
}

function renderTours() {
  const ul = $('tourList');
  for (const t of TOURS) {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.tour = t.id;
    b.innerHTML = '<span class="tt"></span><span class="tc"></span><span class="tb"></span><span class="td"></span>';
    b.querySelector('.tt').textContent = t.title;
    b.querySelector('.tc').textContent = `${t.stops.length} 站`;
    b.querySelector('.tb').textContent = t.blurb;
    const dots = b.querySelector('.td');
    for (const id of t.stops.slice(0, 40)) {
      const i = document.createElement('i');
      i.style.setProperty('--c', GROUPS[byId.get(id).group].color);
      dots.append(i);
    }
    b.addEventListener('click', () => { if (isMobile()) setSheet(false); startTour(t, 0); });
    li.append(b);
    ul.append(li);
  }
}

function markListCurrent() {
  $('spotList').querySelectorAll('button[data-id]').forEach((b) => {
    const on = b.dataset.id === state.current?.id;
    if (on) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
    if (on && !$('pane-spots').hidden) b.scrollIntoView({ block: 'nearest', behavior: reduceMQ.matches ? 'auto' : 'smooth' });
  });
}

// ---------------------------------------------------------------- 選取與飛行
function bearingTo([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180;
  const y = Math.sin((lon2 - lon1) * r) * Math.cos(lat2 * r);
  const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos((lon2 - lon1) * r);
  return Math.atan2(y, x) / r;
}

function distanceKm([lon1, lat1], [lon2, lat2]) {
  const r = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

// 鏡頭朝島中央看：沿海點會以山脈當背景，山區點則順著稜線。
function cameraFor(s) {
  const here = [s.lon, s.lat];
  const far = distanceKm(here, ISLAND_CENTER) > 12;
  const bearing = far ? bearingTo(here, ISLAND_CENTER) : (s.index * 47) % 360 - 180;
  const pitch = s.elev < -500 ? 52 : s.group === 'mountain' ? 66 : s.group === 'tech' ? 58 : 63;
  return { center: here, zoom: s.zoom - (isMobile() ? 0.7 : 0), pitch, bearing };
}

function flyToSpot(s, extra = {}) {
  const cam = cameraFor(s);
  map.flyTo({ ...cam, ...extra, padding: viewPadding(), speed: 0.85, curve: 1.45, maxDuration: 9000 });
  return cam;
}

let selectedFid = null;
function selectSpot(s, { fly = true } = {}) {
  stopOrbit();
  stopRide();
  clearTravelSel();
  state.current = s;
  if (selectedFid !== null) map.setFeatureState({ source: 'spots', id: selectedFid }, { selected: false });
  selectedFid = s.index;
  map.setFeatureState({ source: 'spots', id: s.index }, { selected: true });
  beacon.setLngLat([s.lon, s.lat]).addTo(map);
  renderCard(s);
  markListCurrent();
  history.replaceState(null, '', `#spot=${s.id}`);
  if (fly) flyToSpot(s);
}

function renderCard(s) {
  const g = GROUPS[s.group];
  cardEl.style.setProperty('--c', g.color);
  $('cardTag').textContent = g.label;
  $('cardIndex').textContent = tour.def
    ? `${tour.def.title} · 第 ${tour.i + 1} / ${tour.def.stops.length} 站`
    : `${String(s.index + 1).padStart(2, '0')} / ${SPOTS.length}`;
  $('cardTitle').textContent = s.name;
  $('cardBadge').textContent = s.badge;
  $('cardElevLabel').textContent = '海拔';
  $('cardCoordLabel').textContent = '座標';
  $('cardElev').textContent = s.elev < 0 ? `水深 ${fmtInt(-s.elev)} m` : `${fmtInt(s.elev)} m`;
  $('cardCoord').textContent = `${s.lat.toFixed(3)}°N ${s.lon.toFixed(3)}°E`;
  $('cardRide').hidden = true;
  $('cardGpx').hidden = true;
  $('cardSun').hidden = true;
  $('cardOrbit').hidden = false;
  $('cardPrev').setAttribute('aria-label', '上一個導覽點');
  $('cardNext').setAttribute('aria-label', '下一個導覽點');
  $('cardMetric').textContent = s.metric;
  $('cardDesc').textContent = s.desc;
  const wasHidden = cardEl.hidden;
  cardEl.hidden = false;
  document.body.classList.add('card-open');
  if (wasHidden && !map.isMoving()) relayout();
}

// 只清掉導覽點的選取（地圖高亮、信標、清單標記），不關卡片
function clearSpot() {
  if (selectedFid !== null) map.setFeatureState({ source: 'spots', id: selectedFid }, { selected: false });
  selectedFid = null;
  state.current = null;
  beacon.remove();
  markListCurrent();
}

function closeCard() {
  cardEl.hidden = true;
  document.body.classList.remove('card-open');
  clearSpot();
  clearTravelSel();
  history.replaceState(null, '', location.pathname + location.search);
  if (!tour.playing) relayout();
}

function stepSpot(delta) {
  if (tour.def) return tourStep(delta);
  const list = state.group === 'all' ? SPOTS : SPOTS.filter((s) => s.group === state.group);
  if (!list.length) return;
  const i = state.current ? list.indexOf(state.current) : -1;
  selectSpot(list[(i + delta + list.length) % list.length]);
}

// ---------------------------------------------------------------- 路線播放
const DWELL = 8500;
const tour = { def: null, i: 0, playing: false, token: 0, dwellDone: 0, raf: 0, timer: 0, cam: null, arrived: false };

function startTour(def, i = 0) {
  stopOrbit();
  stopRide();
  tour.def = def;
  tour.i = i;
  tour.playing = true;
  $('player').hidden = false;
  $('playerTour').textContent = def.title;
  const track = $('playerTrack');
  track.replaceChildren(...def.stops.map((_, k) => {
    const el = document.createElement('i');
    el.addEventListener('click', () => { tour.i = k; tour.playing = true; goStop(); });
    return el;
  }));
  document.querySelectorAll('#tourList button').forEach((b) => b.setAttribute('aria-current', String(b.dataset.tour === def.id)));
  history.replaceState(null, '', `#tour=${def.id}`);
  goStop();
}

function clearTourTimers() {
  cancelAnimationFrame(tour.raf);
  clearTimeout(tour.timer);
}

function paintTrack(progress = 0) {
  const items = $('playerTrack').children;
  for (let k = 0; k < items.length; k++) {
    items[k].className = k < tour.i ? 'done' : k === tour.i ? 'cur' : '';
    if (k === tour.i) items[k].style.setProperty('--p', progress.toFixed(3));
  }
}

// 播放器同時服務路線導覽與虛擬騎乘
function setPlayIcon() {
  const btn = $('pPlay');
  const playing = ride.on ? ride.playing : tour.playing;
  btn.querySelector('use').setAttribute('href', playing ? '#i-pause' : '#i-play');
  btn.setAttribute('aria-label', playing ? '暫停' : '播放');
}

function goStop() {
  clearTourTimers();
  const token = ++tour.token;
  const s = byId.get(tour.def.stops[tour.i]);
  selectSpot(s, { fly: false });
  history.replaceState(null, '', `#tour=${tour.def.id}`);
  $('playerStop').textContent = `${tour.i + 1}. ${s.short}`;
  tour.dwellDone = 0;
  tour.arrived = false;
  paintTrack(0);
  setPlayIcon();
  const cam = cameraFor(s);
  tour.cam = cam;
  // flyTo 會先停掉上一段飛行並送出那段的 moveend，所以監聽要在呼叫之後才掛；
  // 減少動態模式或飛行過長時 flyTo 直接同步跳轉、不會再有 moveend，就立即進入停留。
  map.flyTo({ ...cam, bearing: cam.bearing - 18, padding: viewPadding(), speed: 0.75, curve: 1.5, maxDuration: 8000 });
  if (!map.isMoving()) { arrive(token); return; }
  map.once('moveend', () => arrive(token));
}

// 只有鏡頭真的到站才開始停留；被其他操作打斷（停在半空）就暫停，不在錯的位置環繞
function arrive(token) {
  if (token !== tour.token || !tour.playing) return;
  const c = map.getCenter();
  const off = distanceKm([c.lng, c.lat], tour.cam.center);
  if (off > 1.5 || Math.abs(map.getZoom() - tour.cam.zoom) > 0.35) { pauseTour('已暫停路線，按播放鍵繼續'); return; }
  tour.arrived = true;
  // 到站後常有幾秒在載高縮放圖磚；等畫面 idle 再開始停留，最多等 3 秒
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    clearTimeout(tour.timer);
    if (token === tour.token && tour.playing) dwell(token);
  };
  map.once('idle', start);
  tour.timer = setTimeout(start, 3000);
}

function dwell(token) {
  const left = DWELL - tour.dwellDone;
  map.easeTo({ bearing: map.getBearing() + 36 * (left / DWELL), duration: left, easing: (t) => t, padding: viewPadding() });
  let last = performance.now();
  const tick = (now) => {
    if (token !== tour.token || !tour.playing) return;
    // 停留以畫格累計、每格最多 250 ms：數秒的畫面卡頓不算進停留，每秒 4 格以上仍是實際時間
    tour.dwellDone += clamp(now - last, 0, 250);
    last = now;
    paintTrack(clamp(tour.dwellDone / DWELL, 0, 1));
    if (tour.dwellDone >= DWELL) return tourStep(1);
    tour.raf = requestAnimationFrame(tick);
  };
  tour.raf = requestAnimationFrame(tick);
}

function pauseTour(reason) {
  if (!tour.def || !tour.playing) return;
  tour.playing = false;
  tour.token++;
  clearTourTimers();
  // stop(true)：保留進行中的手勢，使用者第一次拖曳就能直接移動地圖
  map.stop(true);
  setPlayIcon();
  if (reason) toast(reason);
}

function resumeTour() {
  if (!tour.def) return;
  stopOrbit();
  tour.playing = true;
  setPlayIcon();
  const c = map.getCenter();
  const far = distanceKm([c.lng, c.lat], tour.cam.center) > 1.5 || Math.abs(map.getZoom() - tour.cam.zoom) > 0.35;
  // 尚未到站或使用者已移開鏡頭：重新飛回本站，停留時間從頭算
  if (!tour.arrived || far) return goStop();
  dwell(++tour.token);
}

function tourStep(delta) {
  if (!tour.def) return;
  const n = tour.def.stops.length;
  const next = tour.i + delta;
  if (next >= n) { stopTour(); toast('路線結束'); return; }
  tour.i = (next + n) % n;
  tour.playing = true;
  goStop();
}

function stopTour() {
  if (!tour.def) return;
  tour.token++;
  clearTourTimers();
  map.stop(true);
  tour.def = null;
  tour.playing = false;
  $('player').hidden = true;
  document.querySelectorAll('#tourList button').forEach((b) => b.setAttribute('aria-current', 'false'));
  if (state.current) { renderCard(state.current); history.replaceState(null, '', `#spot=${state.current.id}`); }
}

// ---------------------------------------------------------------- 環繞
const orbit = { on: false, raf: 0, last: 0 };
function startOrbit() {
  if (orbit.on) return;
  pauseTour();
  stopRide();
  orbit.on = true;
  $('tOrbit').setAttribute('aria-pressed', 'true');
  $('cardOrbit').setAttribute('aria-pressed', 'true');
  if (map.getPitch() < 35) map.easeTo({ pitch: 60, duration: 900 });
  orbit.last = performance.now();
  const step = (now) => {
    if (!orbit.on) return;
    // 低幀率裝置也維持每秒約 4.5°；上限只用來避免切回分頁時一次轉太多
    const dt = Math.min(250, now - orbit.last);
    orbit.last = now;
    // 開始環繞時可能還在 easeTo 俯角；等它結束再轉，避免 setBearing 打斷
    if (!map.isMoving()) map.setBearing(map.getBearing() + dt * 0.0045);
    orbit.raf = requestAnimationFrame(step);
  };
  orbit.raf = requestAnimationFrame(step);
}
function stopOrbit() {
  if (!orbit.on) return;
  orbit.on = false;
  cancelAnimationFrame(orbit.raf);
  $('tOrbit').setAttribute('aria-pressed', 'false');
  $('cardOrbit').setAttribute('aria-pressed', 'false');
}

// ---------------------------------------------------------------- 地形剖面
// path：沿路徑剖面（旅遊專項）的標題、統計、標記與點選回呼；直線剖面為 null
const profile = { picking: false, pts: [], samples: null, token: 0, section: null, path: null, showAt: null };

// 地震目錄開著時，直線剖面加高並多畫一層震源深度
function syncProfileDepth() {
  const deep = quake.on && !!quake.list && !profileEl.hidden && !profile.path;
  if (document.body.classList.contains('profile-deep') === deep) return;
  document.body.classList.toggle('profile-deep', deep);
  relayout();
}

function setProfileNote(text) {
  $('profileNote').textContent = text || '';
  $('profileNote').hidden = !text;
}

// 剖面區顯示提示文字（點選中、讀取中、失敗）時不是可操作的游標，拿掉 slider 角色與鍵盤焦點
const SLIDER_ATTRS = ['tabindex', 'role', 'aria-label', 'aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext'];
function setProfileMessage(html) {
  const box = $('profileChart');
  box.innerHTML = html;
  for (const a of SLIDER_ATTRS) box.removeAttribute(a);
  setProfileSummary('');
}

// 給螢幕閱讀器的文字摘要，由剖面的 aria-describedby 在聚焦時讀出。
// 不用 aria-live：地震播放時剖面每 250 ms 重畫、震源筆數一直變，會被反覆朗讀。
function setProfileSummary(text) {
  $('profileSummary').textContent = text;
}

// 離開震源剖面預設：清掉說明與 #section 網址
function clearSection() {
  profile.section = null;
  setProfileNote('');
  if (location.hash.startsWith('#section=')) history.replaceState(null, '', location.pathname + location.search);
}

function stopPicking() {
  profile.picking = false;
  profile.pts = [];
  document.body.classList.remove('map-cursor-pick');
}

function openProfile() {
  stopOrbit();
  pauseTour();
  profileEl.hidden = false;
  document.body.classList.add('profile-open');
  $('tProfile').setAttribute('aria-pressed', 'true');
  syncProfileDepth();
  relayout();
}

function closeProfile() {
  profileEl.hidden = true;
  profile.picking = false;
  profile.pts = [];
  profile.samples = null;
  profile.path = null;
  profile.showAt = null;
  $('profileTitle').textContent = '地形剖面';
  profile.token++;
  clearSection();
  document.body.classList.remove('profile-open', 'map-cursor-pick', 'profile-deep');
  $('tProfile').setAttribute('aria-pressed', 'false');
  map.getSource('profile').setData(EMPTY);
  map.getSource('cursor').setData(EMPTY);
  relayout();
}

function startPicking() {
  openProfile();
  resetPathProfile();
  profile.picking = true;
  profile.pts = [];
  profile.samples = null;
  profile.token++;
  clearSection();
  document.body.classList.add('map-cursor-pick');
  map.getSource('profile').setData(EMPTY);
  $('profileStats').textContent = '在地圖上點選起點';
  setProfileMessage('<div class="busy">點地圖兩下：起點、終點。也可在導覽點介紹卡按「剖面」看東西向橫切。</div>');
}

function pickPoint(lngLat) {
  profile.pts.push([lngLat.lng, lngLat.lat]);
  const feats = profile.pts.map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c } }));
  map.getSource('profile').setData({ type: 'FeatureCollection', features: feats });
  if (profile.pts.length === 1) { $('profileStats').textContent = '再點選終點'; return; }
  profile.picking = false;
  document.body.classList.remove('map-cursor-pick');
  runProfile(profile.pts[0], profile.pts[1], { frame: false });
}

function profileForSpot(s) {
  const a = [Math.min(s.lon - 0.3, 120.0), s.lat];
  const b = [Math.max(s.lon + 0.3, 121.95), s.lat];
  stopPicking();
  clearSection();
  openProfile();
  runProfile(a, b, { frame: true });
}

// 震源剖面預設：自動打開地震目錄，再沿隱沒方向切剖面
let sectionReq = 0;
async function openSection(key) {
  const s = SECTIONS[key];
  if (!s) return;
  if (isMobile()) setSheet(false);
  stopTour();
  stopRide();
  stopQuakes();
  stopPicking();
  quake.T = Infinity;
  $('qTime').value = $('qTime').max;
  const req = ++sectionReq, token = profile.token, spot = state.current;
  if (!quake.on) await setCatalog(true);
  else if (!quake.list) await loadCatalog().catch(() => {});
  else pushCatalog();
  // 載入期間關掉目錄、又按了別的剖面、自己點了剖面、選了導覽點或開了路線，就不再接手
  if (req !== sectionReq || !quake.on || !quake.list || profile.token !== token || state.current !== spot || tour.def) return;
  openProfile();
  profile.section = key;
  setProfileNote(s.note);
  history.replaceState(null, '', `#section=${key}`);
  runProfile(s.a, s.b, { frame: true });
}

// 改回直線剖面：清掉路徑剖面的標題與設定，必要時恢復震源層
function resetPathProfile() {
  if (!profile.path) return;
  profile.path = null;
  profile.showAt = null;
  $('profileTitle').textContent = '地形剖面';
  syncProfileDepth();
}

async function runProfile(a, b, { frame }) {
  const token = ++profile.token;
  profile.samples = null;
  resetPathProfile();
  const len = distanceKm(a, b);
  const N = 240;
  const z = len > 140 ? 10 : len > 45 ? 11 : 12;
  const line = { type: 'Feature', geometry: { type: 'LineString', coordinates: [a, b] } };
  const ends = [a, b].map((c) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: c } }));
  map.getSource('profile').setData({ type: 'FeatureCollection', features: [line, ...ends] });
  $('profileStats').textContent = '讀取地形中…';
  setProfileMessage('<div class="busy">解碼地形圖磚中…</div>');

  if (frame) {
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const lineBearing = bearingTo(a, b);
    const pad = viewPadding();
    const visible = Math.max(200, innerWidth - pad.left - pad.right);
    // 線段水平橫過畫面：以可視寬度換算 zoom，再留 30% 邊界給透視
    const zoom = clamp(Math.log2((40075 * Math.cos((mid[1] * Math.PI) / 180) * visible) / (512 * len * 1.3)), 5, 14);
    map.flyTo({ center: mid, zoom, pitch: 58, bearing: lineBearing - 90, padding: pad, speed: 1.1 });
  }

  const pts = [];
  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
  }
  let elev;
  try {
    elev = await Promise.all(pts.map(([x, y]) => elevationAt(x, y, z)));
  } catch (err) {
    if (token !== profile.token) return;
    console.warn(err);
    $('profileStats').textContent = '地形資料讀取失敗，請稍後再試。';
    setProfileMessage('');
    return;
  }
  if (token !== profile.token) return;
  profile.samples = pts.map((p, i) => ({ p, d: (len * i) / (N - 1), e: elev[i] }));
  drawProfile();
}

function niceStep(range, target) {
  // 長度為 0 時會算出 0，刻度迴圈就停不下來（只有一個點的步道主線曾讓分頁卡住約 5 秒）
  if (!(range > 0)) return 1;
  const raw = range / target, mag = 10 ** Math.floor(Math.log10(raw)), r = raw / mag;
  return (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
}

// 線兩側的震源投影到剖面：局部平面 km 座標，沿線距離再換回與地形同一把尺
function quakeSection(S) {
  if (!quake.on || !quake.list || profile.path) return null;
  const a = S[0].p, b = S[S.length - 1].p, len = S[S.length - 1].d;
  const half = SECTIONS[profile.section]?.half ?? Math.round(clamp(len * 0.1, 12, 30));
  const kx = 111.32 * Math.cos((((a[1] + b[1]) / 2) * Math.PI) / 180), ky = 110.57;
  const bx = (b[0] - a[0]) * kx, by = (b[1] - a[1]) * ky, flat = Math.hypot(bx, by) || 1;
  const ux = bx / flat, uy = by / flat, scale = len / flat;
  const pts = [];
  let deepest = 0;
  for (const q of visibleQuakes().out) {
    const px = (q.lon - a[0]) * kx, py = (q.lat - a[1]) * ky;
    const along = px * ux + py * uy;
    if (along < 0 || along > flat || Math.abs(py * ux - px * uy) > half) continue;
    pts.push({ q, d: along * scale });
    deepest = Math.max(deepest, q.d);
  }
  pts.sort((u, v) => u.q.m - v.q.m);
  const dmax = [50, 100, 150, 200, 250, 350, 500, 700].find((v) => v >= deepest * 1.06) || 700;
  return { pts, half, dmax };
}

function hexMix(c1, c2, t) {
  const p = (c, i) => parseInt(c.slice(1 + 2 * i, 3 + 2 * i), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(p(c1, i) + (p(c2, i) - p(c1, i)) * t)).join(',')})`;
}

function depthColor(d) {
  const s = DEPTH_STOPS;
  for (let i = 2; i < s.length; i += 2) {
    if (d <= s[i] || i === s.length - 2) return hexMix(s[i - 1], s[i + 1], clamp((d - s[i - 2]) / (s[i] - s[i - 2]), 0, 1));
  }
}

function drawProfile() {
  const S = profile.samples;
  if (!S) return;
  const box = $('profileChart');
  const W = box.clientWidth - 24, H = box.clientHeight - 12;
  if (W < 50 || H < 40) return;
  const sec = quakeSection(S);
  const L = 46, R = 8, T = 8, B = 18;
  // 有震源層時，上方約三分之一畫地形，下方畫地底震源
  const tBot = sec ? T + Math.round((H - T - B) * 0.34) : H - B;
  const dTop = tBot + 16, dBot = H - B;
  const len = S[S.length - 1].d;
  const path = profile.path;
  // 只有一個點或起終點重合時沒有剖面可畫
  if (S.length < 2 || !(len > 0.005)) {
    $('profileStats').innerHTML = path?.stats || '';
    setProfileMessage('<div class="busy">這段剖面太短，無法繪製。</div>');
    return;
  }
  let emin = Infinity, emax = -Infinity;
  for (const s of S) { if (s.e < emin) emin = s.e; if (s.e > emax) emax = s.e; }
  // 山區步道從最低點附近畫起；直線剖面與環島保留海平面基準
  let lo = path?.floor && emin > 60 ? emin : Math.min(0, emin), hi = Math.max(10, emax);
  const padY = (hi - lo) * 0.08;
  hi += padY; lo -= lo < 0 || path?.floor ? padY : 0;
  const x = (d) => L + ((W - L - R) * d) / len;
  const y = (e) => T + ((tBot - T) * (hi - e)) / (hi - lo);

  if (path?.stats) $('profileStats').innerHTML = path.stats;
  else {
    let gain = 0;
    for (let i = 1; i < S.length; i++) gain += Math.max(0, S[i].e - S[i - 1].e);
    $('profileStats').innerHTML = `長 <b>${len.toFixed(1)}</b> km · 最高 <b>${fmtInt(emax)}</b> m · 最低 <b>${fmtInt(emin)}</b> m · 累積爬升 <b>${fmtInt(gain)}</b> m`;
  }

  const top = S.map((s) => `${x(s.d).toFixed(1)},${y(s.e).toFixed(1)}`).join(' L');
  const base = y(lo);
  const y0 = y(0);
  // x 軸刻度依寬度調整，窄螢幕不擠在一起
  const ys = niceStep(hi - lo, sec ? 2 : 4), xs = niceStep(len, clamp(Math.floor((W - L - R) / 90), 2, 6));
  let grid = '';
  for (let v = Math.ceil(lo / ys) * ys; v <= hi; v += ys) {
    grid += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axis" x="${L - 6}" y="${y(v) + 3}" text-anchor="end">${fmtInt(v)}</text>`;
  }
  for (let v = 0; v <= len + 1e-6; v += xs) {
    grid += `<text class="axis" x="${x(v)}" y="${H - 4}" text-anchor="middle">${+v.toFixed(1)} km</text>`;
  }

  let deep = '';
  const dy = sec ? (d) => dTop + ((dBot - dTop) * d) / sec.dmax : null;
  if (sec) {
    deep += `<rect class="crust" x="${L}" y="${dTop}" width="${W - L - R}" height="${dBot - dTop}" rx="3"/>`;
    const ds = niceStep(sec.dmax, 3);
    for (let v = 0; v <= sec.dmax; v += ds) {
      deep += `<line class="grid" x1="${L}" x2="${W - R}" y1="${dy(v)}" y2="${dy(v)}"/><text class="axis" x="${L - 6}" y="${dy(v) + 3}" text-anchor="end">${v}</text>`;
    }
    // 標題放左下：三條預設剖面的左下角都沒有震源。筆數也放這裡，手機上統計列會被截斷
    const label = W > 560 ? `地底震源 ${fmtInt(sec.pts.length)} 筆（線兩側 ${sec.half} km）· 空心圈＝定值深度` : `震源 ${fmtInt(sec.pts.length)} 筆 · 空心＝定值深度`;
    deep += `<text class="panel-label" x="${L + 8}" y="${dBot - 7}">${label}</text>`;
    // 定值深度（定位時固定在 10／33／35 km）畫成空心，避免被讀成真的地層
    for (const { q, d } of sec.pts) {
      const r = clamp(1.3 * 1.75 ** (q.m - 4), 1.3, 11), c = depthColor(q.d);
      deep += q.fx
        ? `<circle class="hypo-fixed" cx="${x(d).toFixed(1)}" cy="${dy(q.d).toFixed(1)}" r="${r.toFixed(1)}" stroke="${c}"/>`
        : `<circle class="hypo" cx="${x(d).toFixed(1)}" cy="${dy(q.d).toFixed(1)}" r="${r.toFixed(1)}" fill="${c}" fill-opacity=".85"/>`;
    }
  }

  // 路徑剖面：區段底色（例如目前這一天）與標記線（每日終點、爬坡頂點）
  let marks = '';
  if (path?.range) {
    const [r0, r1] = path.range;
    marks += `<rect x="${x(r0).toFixed(1)}" y="${T}" width="${Math.max(1, x(r1) - x(r0)).toFixed(1)}" height="${tBot - T}" fill="rgba(233,180,76,.12)"/>`;
  }
  for (const m of path?.marks || []) {
    if (m.d < 0 || m.d > len) continue;
    const mx = x(m.d).toFixed(1);
    marks += `<line x1="${mx}" x2="${mx}" y1="${T + 12}" y2="${tBot}" stroke="rgba(255,255,255,.28)" stroke-dasharray="2 3"/>`
      + `<text class="axis" x="${mx}" y="${T + 9}" text-anchor="middle">${esc(m.label)}</text>`;
  }
  const endA = esc(path?.a ?? 'A'), endB = esc(path?.b ?? 'B');

  const stops = [[0, '#c9c3bd'], [0.35, '#b98e64'], [0.7, '#94b06e'], [1, '#5c8a5a']];
  const landTop = y(Math.max(hi, 1)), landBot = y0;
  box.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${sec ? '地形與震源深度剖面圖' : path ? `${esc(path.title)}高度剖面圖` : '地形剖面圖'}">
    <defs>
      <linearGradient id="pgLand" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${landTop}" y2="${landBot}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="0.9"/>`).join('')}</linearGradient>
      <linearGradient id="pgSea" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${y0}" y2="${base}"><stop offset="0" stop-color="#5ec2e6" stop-opacity=".55"/><stop offset="1" stop-color="#0b2d60" stop-opacity=".85"/></linearGradient>
      <clipPath id="pgAbove"><rect x="0" y="0" width="${W}" height="${y0}"/></clipPath>
      <clipPath id="pgBelow"><rect x="0" y="${y0}" width="${W}" height="${H}"/></clipPath>
    </defs>
    ${grid}
    ${marks}
    <path d="M${x(0)},${y0} L${x(len)},${y0} L${x(len)},${base} L${x(0)},${base}Z" fill="url(#pgSea)" clip-path="url(#pgBelow)"/>
    <path d="M${x(0)},${base} L${top} L${x(len)},${base}Z" fill="url(#pgLand)" clip-path="url(#pgAbove)"/>
    <path d="M${x(0)},${base} L${top} L${x(len)},${base}Z" fill="#1b2a3a" clip-path="url(#pgBelow)"/>
    <line class="sea" x1="${L}" x2="${W - R}" y1="${y0}" y2="${y0}"/>
    <path d="M${top}" fill="none" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/>
    <text class="axis" x="${x(0) + 2}" y="${T + 10}">${endA}</text><text class="axis" x="${x(len) - 2}" y="${T + 10}" text-anchor="end">${endB}</text>
    ${deep}
    <g id="pgHover" visibility="hidden">
      <line x1="0" x2="0" y1="${T}" y2="${H - B}" stroke="#e9b44c" stroke-width="1"/>
      <circle r="4" fill="#e9b44c" stroke="#0b0d10" stroke-width="1.5"/>
      <rect class="tip-bg" rx="5" height="20" width="128"/>
      <text class="tip"></text>
    </g>
    <rect id="pgHit" x="${L}" y="${T}" width="${W - L - R}" height="${H - T - B}" fill="transparent"/>
  </svg>`;

  const g = box.querySelector('#pgHover');
  const hit = box.querySelector('#pgHit');
  const dot = g.querySelector('circle'), tipBg = g.querySelector('rect'), tip = g.querySelector('text');
  const showTip = (px, py, ty, label) => {
    g.setAttribute('visibility', 'visible');
    g.querySelector('line').setAttribute('x1', px); g.querySelector('line').setAttribute('x2', px);
    dot.setAttribute('cx', px); dot.setAttribute('cy', py);
    tip.textContent = label;
    const tw = Math.ceil(tip.getComputedTextLength?.() || label.length * 7) + 12;
    const tx = px + tw + 12 > W ? px - tw - 4 : px + 8;
    tipBg.setAttribute('x', tx - 4); tipBg.setAttribute('y', ty); tipBg.setAttribute('width', tw);
    tip.setAttribute('x', tx + 2); tip.setAttribute('y', ty + 14);
  };
  const move = (ev) => {
    const r = hit.getBoundingClientRect();
    const sx = L + ((ev.clientX - r.left) / r.width) * (W - L - R);
    const sy = T + ((ev.clientY - r.top) / r.height) * (H - T - B);
    // 地底區：找游標附近最近的震源，地圖上同步標出震央
    if (sec && sy > tBot + 6) {
      let best = null, bd = 196;
      for (const p of sec.pts) {
        const dd = (x(p.d) - sx) ** 2 + (dy(p.q.d) - sy) ** 2;
        if (dd < bd) { bd = dd; best = p; }
      }
      if (best) {
        const q = best.q;
        showTip(x(best.d), dy(q.d), clamp(dy(q.d) - 26, dTop + 2, dBot - 22), `${quakeTime(q.t).slice(0, 10)} · M${q.m.toFixed(1)} · 深 ${fmtInt(q.d)} km${q.fx ? '（定值）' : ''}`);
        map.getSource('cursor').setData({ type: 'Feature', geometry: { type: 'Point', coordinates: [q.lon, q.lat] } });
        return;
      }
    }
    showAt(clamp(((sx - L) / (W - L - R)) * len, 0, len));
  };
  // 路徑剖面若是整條路線中的一段（offset：從第幾公里開始），另外標出全線里程
  const at = (s) => (path?.offset ? `${s.d.toFixed(1)} km（全線 ${(s.d + path.offset).toFixed(1)} km）` : `${s.d.toFixed(1)} km`);
  const setValue = (i) => {
    const s = S[i];
    box.setAttribute('aria-valuenow', s.d.toFixed(1));
    box.setAttribute('aria-valuetext', `${at(s)}，${s.e < 0 ? `水深 ${fmtInt(-s.e)}` : `海拔 ${fmtInt(s.e)}`} m`);
  };
  // i 是樣本索引。user：滑鼠或鍵盤指定的位置，也就是 slider 的值（profile.keyI）。
  // 飛覽每 120 ms 更新的位置只畫游標；剖面有鍵盤焦點且已指定位置時連游標也不動，免得把移好的位置拉回去、讓螢幕閱讀器連續朗讀
  const showIdx = (i, user = true) => {
    const j = clamp(i, 0, S.length - 1), s = S[j];
    if (!user && profile.keyI != null && document.activeElement === box) return s;
    showTip(x(s.d), y(s.e), T + 2, `${at(s)} · ${s.e < 0 ? '水深 ' + fmtInt(-s.e) : fmtInt(s.e)} m`);
    map.getSource('cursor').setData({ type: 'Feature', geometry: { type: 'Point', coordinates: s.p } });
    if (user) { profile.keyI = j; setValue(j); }
    return s;
  };
  // 沿線距離換成最近的樣本：路徑樣本不等距，不能用比例換算
  const showAt = (d, user = true) => {
    d = clamp(d, 0, len);
    const i = pathIndex(S, d);
    return showIdx(i > 0 && d - S[i - 1].d < S[i].d - d ? i - 1 : i, user);
  };
  const hide = () => { g.setAttribute('visibility', 'hidden'); map.getSource('cursor').setData(EMPTY); profile.keyI = null; setValue(0); };
  profile.showAt = showAt;
  profile.showIdx = showIdx;
  profile.hideCursor = hide;
  // 鍵盤也能操作：剖面整區是一個 slider，值是沿線距離（km）。重畫（視窗縮放、地震播放）時保留鍵盤正在用的位置
  const title = sec ? '地形與震源剖面' : path ? path.title : '地形剖面';
  if (profile.keyS !== S || document.activeElement !== box) profile.keyI = null;
  profile.keyS = S;
  box.tabIndex = 0;
  box.setAttribute('role', 'slider');
  box.setAttribute('aria-label', `剖面位置：${title}`);
  box.setAttribute('aria-valuemin', '0');
  box.setAttribute('aria-valuemax', len.toFixed(1));
  if (profile.keyI != null) showIdx(profile.keyI); else setValue(0);
  setProfileSummary(profileSummaryText(S, title, sec));
  hit.addEventListener('pointermove', move);
  hit.addEventListener('pointerdown', move);
  hit.addEventListener('pointerleave', hide);
  if (path?.onPick) {
    hit.style.cursor = 'pointer';
    hit.addEventListener('click', (ev) => {
      const r = hit.getBoundingClientRect();
      path.onPick(clamp(((ev.clientX - r.left) / r.width) * len, 0, len));
    });
  }
}

// 剖面的文字摘要：長度、起終點、最高與最低點的位置（累積爬升在畫面上的統計列，算法依剖面種類不同，這裡不重算）
function profileSummaryText(S, title, sec) {
  const len = S[S.length - 1].d;
  let hiS = S[0], loS = S[0];
  for (const s of S) { if (s.e > hiS.e) hiS = s; if (s.e < loS.e) loS = s; }
  const m = (e) => (e < 0 ? `水深 ${fmtInt(-e)} m` : `海拔 ${fmtInt(e)} m`);
  return `${title}，全長 ${len.toFixed(1)} km。起點${m(S[0].e)}，終點${m(S[S.length - 1].e)}；`
    + `最高點${m(hiS.e)}，在 ${hiS.d.toFixed(1)} km 處；最低點${m(loS.e)}，在 ${loS.d.toFixed(1)} km 處。`
    + (sec ? `下方標出線兩側 ${sec.half} km 內的 ${fmtInt(sec.pts.length)} 筆震源。` : '')
    + `聚焦剖面後可用左右鍵移動游標${!profile.path?.onPick ? '' : profile.path.ride === 'hike' ? '，飛覽中按 Enter 跳到該處' : '，按 Enter 等同點選該處'}。`;
}

// 剖面鍵盤操作：以樣本為單位，左右（上下）鍵一次約 1%、至少一點，加 Shift 或用 PageUp／PageDown 一次約 10%，Home／End 到兩端；
// Enter 等同點選（環島全線剖面選取該天，飛覽中跳到該處）。處理過的按鍵不再傳給全站的左右鍵切換導覽點。
function profileKey(e) {
  const S = profile.samples;
  if (!S || S.length < 2 || !profile.showIdx || e.altKey || e.ctrlKey || e.metaKey) return;
  const n = S.length - 1, step = Math.max(1, Math.round(n / 100)), big = Math.max(1, Math.round(n / 10)), i = profile.keyI;
  let next;
  switch (e.key) {
    case 'ArrowRight': case 'ArrowUp': next = i == null ? 0 : i + (e.shiftKey ? big : step); break;
    case 'ArrowLeft': case 'ArrowDown': next = i == null ? 0 : i - (e.shiftKey ? big : step); break;
    case 'PageUp': next = (i ?? 0) + big; break;
    case 'PageDown': next = (i ?? 0) - big; break;
    case 'Home': next = 0; break;
    case 'End': next = n; break;
    case 'Enter':
      if (!profile.path?.onPick || i == null) return;
      e.preventDefault();
      e.stopPropagation();
      profile.path.onPick(S[i].d);
      return;
    default: return;
  }
  e.preventDefault();
  e.stopPropagation();
  profile.showIdx(next);
}

// 沿路徑的高度剖面（環島分段、步道）：samples 為 [{ p, d, e }]，d 從 0 起算
function showPathProfile(samples, opts) {
  stopPicking();
  clearSection();
  profile.token++;
  profile.path = opts;
  profile.samples = samples;
  map.getSource('profile').setData(EMPTY);
  openProfile();
  $('profileTitle').textContent = opts.title;
  setProfileNote(opts.note || '');
  drawProfile();
}

// ---------------------------------------------------------------- 地震目錄與板塊
// T：顯示到哪個時間（小數年）；Infinity 代表「到現在」。播放時逐格推進，約 80 ms 更新一次圖資。
const quake = { on: false, plates: false, list: null, loading: null, snapshot: '', live: 'pending', T: Infinity, minMag: 4, playing: false, raf: 0, pushAt: 0, drawAt: 0 };
// 即時補抓的 GeoJSON 摘要沒有深度誤差，只能以 ComCat 慣用的定值深度判斷
const FIXED_DEPTHS = [10, 33, 35];
const yearOf = (ms) => 1970 + ms / 31556952000;
const PLATE_LAYERS = ['plates-rift', 'plates-line', 'plates-arrow', 'plates-name'];
const taipeiFmt = new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

function quakeTime(ms) {
  const p = Object.fromEntries(taipeiFmt.formatToParts(ms).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`;
}

function loadCatalog() {
  if (quake.loading) return quake.loading;
  quake.loading = (async () => {
    const res = await fetch(CATALOG_URL, { signal: withTimeout(null, 20000) });
    if (!res.ok) throw new Error(`catalog ${res.status}`);
    const j = await res.json();
    const fixed = new Set(j.fixed);
    quake.list = j.time.map((t, i) => ({ i, lon: j.lon[i], lat: j.lat[i], d: j.depth[i], fx: fixed.has(i), m: j.mag[i], t: t * 60000, y: yearOf(t * 60000), id: j.id[i] }));
    quake.snapshot = j.retrieved;
    map.getSource('plates').setData({ type: 'FeatureCollection', features: j.plates.features });
    fetchLiveQuakes();
    return quake.list;
  })();
  quake.loading.catch(() => { quake.loading = null; });
  return quake.loading;
}

// 快照之後的地震向 USGS 即時補抓；失敗就沿用快照，不阻擋圖層
async function fetchLiveQuakes() {
  const since = quake.list.at(-1).t + 1000;
  try {
    const res = await fetch(`${USGS_QUERY}&starttime=${new Date(since).toISOString().slice(0, 19)}`, { signal: withTimeout(null, 10000) });
    if (!res.ok) throw new Error(`USGS ${res.status}`);
    const gj = await res.json();
    const seen = new Set(quake.list.map((q) => q.id));
    const add = gj.features
      .filter((f) => !seen.has(f.id) && f.properties.type === 'earthquake' && Number.isFinite(f.properties.mag) && f.properties.time >= since)
      .map((f) => ({ lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], d: Math.round(f.geometry.coordinates[2] * 10) / 10, m: Math.round(f.properties.mag * 10) / 10, t: f.properties.time, id: f.id }))
      .sort((a, b) => a.t - b.t);
    for (const q of add) quake.list.push({ ...q, i: quake.list.length, y: yearOf(q.t), fx: FIXED_DEPTHS.includes(q.d) });
    quake.live = add.length;
  } catch (err) {
    console.warn('[quakes] 即時補抓失敗', err);
    quake.live = 'failed';
  }
  syncTimeRange();
  if (quake.on) pushCatalog();
  updateQuakeHint();
}

function syncTimeRange() {
  const max = Math.ceil(yearOf(Date.now()) * 100) / 100;
  $('qTime').max = max;
  if (!Number.isFinite(quake.T)) $('qTime').value = max;
}

// 依時間與規模篩選：list 依時間排序，超過 T 就停
function visibleQuakes() {
  const ty = Number.isFinite(quake.T) ? quake.T : yearOf(Date.now());
  const out = [];
  for (const q of quake.list || []) {
    if (q.y > ty) break;
    if (q.m >= quake.minMag) out.push(q);
  }
  return { out, ty };
}

function pushCatalog() {
  if (!quake.list) return;
  const { out, ty } = visibleQuakes();
  map.getSource('catalog').setData({
    type: 'FeatureCollection',
    features: out.map((q) => ({ type: 'Feature', id: q.i, geometry: { type: 'Point', coordinates: [q.lon, q.lat] }, properties: { i: q.i, d: q.d, m: q.m, age: ty - q.y } })),
  });
  const y = Math.floor(ty), mo = Math.min(12, Math.floor((ty - y) * 12) + 1);
  $('qOut').textContent = Number.isFinite(quake.T) ? `${y} 年 ${mo} 月 · ${fmtInt(out.length)} 筆` : `${fmtInt(out.length)} 筆`;
  $('qTime').setAttribute('aria-valuetext', Number.isFinite(quake.T) ? `${y} 年 ${mo} 月` : '到現在');
  // 播放中剖面每 250 ms 才重畫一次（上千個 SVG 圓點），停下時補畫
  const now = performance.now();
  if (profile.samples && !profileEl.hidden && (!quake.playing || now - quake.drawAt > 250)) {
    quake.drawAt = now;
    drawProfile();
  }
}

function updateQuakeHint(msg) {
  if (msg) { $('qHint').textContent = msg; return; }
  if (!quake.list) return;
  const live = quake.live === 'pending' ? '，正在向 USGS 檢查最新地震'
    : quake.live === 'failed' ? '，目前連不上 USGS，未補上之後的地震'
    : quake.live > 0 ? `，另即時補上 ${quake.live} 筆` : '，已是最新';
  $('qHint').textContent = `USGS 地震目錄 ${fmtInt(quake.list.length)} 筆（${quake.snapshot} 快照${live}）。顏色是震源深度，圓的大小是規模。早年測站較少，小地震紀錄偏少；約三成地震的深度是定位時固定的 10、33 或 35 km，並非實測。`;
  const last = quake.list.at(-1);
  const btn = $('qLatest');
  btn.hidden = false;
  btn.textContent = `最新一筆：${quakeTime(last.t)}　M${last.m.toFixed(1)}　深 ${fmtInt(last.d)} km →`;
}

async function setCatalog(on) {
  quake.on = on;
  $('qCatalog').checked = on;
  $('quakeBody').hidden = !on;
  if (!on) {
    stopQuakes();
    map.setLayoutProperty('catalog-dot', 'visibility', 'none');
    quakePopup?.remove();
    $('qOut').textContent = '';
    // 剖面留著當地形剖面，但震源說明與 #section 已不適用
    if (profile.section) clearSection();
    syncProfileDepth();
    drawProfile();
    return;
  }
  if (!quake.list) updateQuakeHint('載入地震目錄中…');
  try {
    await loadCatalog();
  } catch (err) {
    console.warn('[quakes]', err);
    if (quake.on) { toast('地震目錄載入失敗，請稍後再試'); setCatalog(false); }
    return;
  }
  if (!quake.on) return; // 載入期間已關掉
  syncTimeRange();
  map.setLayoutProperty('catalog-dot', 'visibility', 'visible');
  pushCatalog();
  updateQuakeHint();
  syncProfileDepth();
  drawProfile();
}

async function setPlates(on) {
  quake.plates = on;
  $('qPlates').checked = on;
  if (on) {
    try { await loadCatalog(); } catch (err) {
      console.warn('[plates]', err);
      if (quake.plates) { toast('板塊資料載入失敗，請稍後再試'); setPlates(false); }
      return;
    }
    if (!quake.plates) return;
  }
  for (const id of PLATE_LAYERS) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
}

function setQuakePlayIcon() {
  $('qPlay').querySelector('use').setAttribute('href', quake.playing ? '#i-pause' : '#i-play');
  $('qPlay').setAttribute('aria-label', quake.playing ? '暫停播放' : '播放：逐年看地震出現');
}

// 約 40 秒播完 1973 年至今；新地震閃一圈（減少動態時不閃）
function playQuakes() {
  if (!quake.list) return;
  const end = yearOf(Date.now());
  if (!Number.isFinite(quake.T) || quake.T >= end - 0.05) quake.T = CATALOG_Y0;
  quake.playing = true;
  setQuakePlayIcon();
  map.setLayoutProperty('catalog-flash', 'visibility', reduceMQ.matches ? 'none' : 'visible');
  const rate = (end - CATALOG_Y0) / 40000;
  let last = performance.now();
  const tick = (now) => {
    if (!quake.playing) return;
    quake.T += clamp(now - last, 0, 100) * rate;
    last = now;
    if (quake.T >= end) {
      quake.T = Infinity;
      stopQuakes();
      syncTimeRange();
      pushCatalog();
      return;
    }
    $('qTime').value = quake.T;
    if (now - quake.pushAt > 80) { quake.pushAt = now; pushCatalog(); }
    quake.raf = requestAnimationFrame(tick);
  };
  quake.raf = requestAnimationFrame(tick);
}

function stopQuakes() {
  if (!quake.playing) return;
  quake.playing = false;
  cancelAnimationFrame(quake.raf);
  map.setLayoutProperty('catalog-flash', 'visibility', 'none');
  setQuakePlayIcon();
  if (profile.samples && !profileEl.hidden) drawProfile();
}

let quakePopup = null;
function showQuakePopup(q) {
  quakePopup?.remove();
  quakePopup = new maplibregl.Popup({ closeButton: false, offset: 10, maxWidth: '260px' })
    .setLngLat([q.lon, q.lat])
    .setHTML(`<b>M${q.m.toFixed(1)}</b> · 震源深 ${fmtInt(q.d)} km${q.fx ? '（定值，實際深度不確定）' : ''}<br>${quakeTime(q.t)}（台灣時間）<br><a href="https://earthquake.usgs.gov/earthquakes/eventpage/${encodeURIComponent(q.id)}" target="_blank" rel="noopener">USGS 事件頁</a>`)
    .addTo(map);
}

function flyToLatestQuake() {
  const q = quake.list?.at(-1);
  if (!q) return;
  if (isMobile()) setSheet(false);
  stopTour(); stopOrbit(); stopRide();
  quake.T = Infinity;
  syncTimeRange();
  pushCatalog();
  map.flyTo({ center: [q.lon, q.lat], zoom: 8.2, pitch: 50, padding: viewPadding(), speed: 1.1 });
  // 減少動態時 flyTo 立即完成，moveend 早於監聽
  if (map.isMoving()) map.once('moveend', () => showQuakePopup(q));
  else showQuakePopup(q);
}

// ---------------------------------------------------------------- 旅遊專項：自行車環島、健行步道、百岳
// 三份資料都在開啟該專項時才載入。環島取樣自台北起算、順時針排列，逆時針時整條反轉。
const TRAVEL_URL = { bike: './cycling.json?v=2.2.0', hike: './trails.json?v=2.3.0', peaks: './peaks.json?v=2.2.0' };
const TRAVEL_LAYERS = {
  bike: ['bike-route-casing', 'bike-route', 'bike-hl', 'bike-poi', 'bike-poi-label', 'bike-stage', 'bike-stage-label'],
  hike: ['trail-line', 'trail-hl', 'trail-head', 'trail-label'],
  peaks: ['peak-dot', 'peak-label'],
};
const PEAK_DONE_KEY = 'tw3d-peaks-done-v1';
// req：每次選取遞增；網址或搜尋觸發的延遲選取若期間已有新選取就放棄
const travel = { mode: 'bike', data: {}, loading: {}, sel: null, req: 0, dir: 'ccw', days: 9, plan: null, poi: new Set(['station']), hikeDif: 'all', hikeQ: '', hikeList: [], peakFilter: 'all', peakList: [], done: new Set() };

// 字串放進 innerHTML 或 SVG 屬性前跳脫（地名、站名來自外部資料）
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function loadTravel(kind) {
  if (travel.loading[kind]) return travel.loading[kind];
  const p = (async () => {
    const res = await fetch(TRAVEL_URL[kind], { signal: withTimeout(null, 20000) });
    if (!res.ok) throw new Error(`${kind} ${res.status}`);
    const data = await res.json();
    await mapReady; // 圖源在樣式載入後才存在（例如搜尋在開場時就打開）
    travel.data[kind] = data;
    if (kind === 'bike') initBike(); else if (kind === 'hike') initHike(); else initPeaks();
    return travel.data[kind];
  })();
  travel.loading[kind] = p;
  p.catch(() => { travel.loading[kind] = null; });
  return p;
}

// 圖層只在旅遊分頁開著、有選取或虛擬騎乘時顯示，避免和導覽點、地震圖層擠在一起
function syncTravelLayers() {
  if (!map.getLayer('bike-route')) return;
  const tabOn = !$('pane-travel').hidden;
  for (const [mode, ids] of Object.entries(TRAVEL_LAYERS)) {
    const on = !!travel.data[mode] && (ride.on ? ride.mode === mode : (tabOn && travel.mode === mode) || travel.sel?.mode === mode);
    for (const id of ids) map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none');
  }
}

async function setTravelMode(mode) {
  travel.mode = mode;
  document.querySelectorAll('#travelSeg button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.mode === mode)));
  for (const m of Object.keys(TRAVEL_URL)) $(`travel-${m}`).hidden = m !== mode;
  syncTravelLayers();
  try {
    await loadTravel(mode);
  } catch (err) {
    console.warn('[travel]', err);
    const hint = { bike: 'bikeHint', hike: 'hikeHint', peaks: 'peakHint' }[mode];
    $(hint).textContent = '資料載入失敗，請稍後再試。';
    return;
  }
  syncTravelLayers();
}

function openTravel(mode) {
  travel.mode = mode; // 先改模式，setTab 才不會順便載入上一個專項的資料
  setTab('travel');
  return setTravelMode(mode);
}

// 網址、搜尋：等資料載入後才選取；等待期間若使用者已選了別的就不再接手
function openTravelThen(mode, pick) {
  const req = ++travel.req, spot = state.current;
  return openTravel(mode).then(() => {
    if (req === travel.req && state.current === spot && !tour.def) pick();
  });
}

// 清單項目：k 編號、t 標題、v 右側數值、s 第二行說明、bar 長條（0–1）
function travelItem({ k, t, v, s, bar, color, data }) {
  const li = document.createElement('li');
  const b = document.createElement('button');
  b.type = 'button';
  Object.assign(b.dataset, data);
  if (color) b.style.setProperty('--c', color);
  for (const [cls, text] of [['k', k], ['t', t], ['v', v], ['s', s]]) {
    if (text == null) continue;
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    b.append(span);
  }
  if (bar != null) {
    const sp = document.createElement('span');
    sp.className = 'bar';
    sp.innerHTML = '<i></i>';
    sp.firstChild.style.setProperty('--w', `${Math.round(clamp(bar, 0, 1) * 100)}%`);
    b.append(sp);
  }
  li.append(b);
  return li;
}

function showTravelCard(c) {
  cardEl.style.setProperty('--c', c.color);
  $('cardTag').textContent = c.tag;
  $('cardIndex').textContent = c.index;
  $('cardTitle').textContent = c.title;
  $('cardBadge').textContent = c.badge;
  $('cardElevLabel').textContent = c.f1[0];
  $('cardElev').textContent = c.f1[1];
  $('cardCoordLabel').textContent = c.f2[0];
  $('cardCoord').textContent = c.f2[1];
  $('cardMetric').textContent = c.metric;
  $('cardDesc').textContent = c.desc;
  // 環島與步道用「飛覽」（沿著路線前進）取代「環繞」；可匯出時再加一顆只有圖示的 GPX 下載鈕
  $('cardRide').hidden = !(travel.sel?.mode === 'bike' || travel.sel?.kind === 'trail');
  $('cardOrbit').hidden = !$('cardRide').hidden;
  $('cardGpx').hidden = !gpxForSel();
  $('cardSun').hidden = true;
  $('cardPrev').setAttribute('aria-label', '上一個');
  $('cardNext').setAttribute('aria-label', '下一個');
  const wasHidden = cardEl.hidden;
  cardEl.hidden = false;
  document.body.classList.add('card-open');
  if (wasHidden && !map.isMoving()) relayout();
}

function setTravelSel(sel) {
  stopOrbit();
  stopRide();
  clearSpot();
  travel.req++;
  travel.sel = sel;
  map.getSource('bike-hl').setData(EMPTY);
  map.setFilter('trail-hl', ['==', ['get', 'id'], sel.kind === 'trail' ? sel.id : '']);
  syncTravelLayers();
  markTravelLists();
}

function clearTravelSel() {
  if (!travel.sel) return;
  travel.sel = null;
  map.getSource('bike-hl').setData(EMPTY);
  map.setFilter('trail-hl', ['==', ['get', 'id'], '']);
  syncTravelLayers();
  markTravelLists();
}

function markTravelLists() {
  const s = travel.sel;
  const mark = (sel, match) => document.querySelectorAll(sel).forEach((b) => {
    if (s && match(b.dataset)) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current');
  });
  mark('#bikeStages button', (d) => s.kind === 'stage' && +d.k === s.k);
  mark('#bikeClimbs button', (d) => s.kind === 'climb' && +d.i === s.i);
  mark('#hikeList button', (d) => s.kind === 'trail' && d.id === s.id);
  mark('#peakList button', (d) => s.kind === 'peak' && +d.rank === s.rank);
}

// 讓一組座標落在可視範圍內（扣掉面板、卡片與剖面）。自己算 zoom 再 flyTo：
// fitBounds 會把地圖目前的 padding 再加一次，面板與卡片的空間被重複扣掉，窄螢幕上甚至算不出鏡頭。
function fitCoords(coords, { maxZoom = 13.5, pitch = 48 } = {}) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of coords) { if (x < w) w = x; if (x > e) e = x; if (y < s) s = y; if (y > n) n = y; }
  const my = (lat) => { const t = Math.sin((lat * Math.PI) / 180); return 0.5 - Math.log((1 + t) / (1 - t)) / (4 * Math.PI); };
  const p = viewPadding();
  const visW = Math.max(120, innerWidth - p.left - p.right - 80), visH = Math.max(120, innerHeight - p.top - p.bottom - 90);
  const spanX = Math.max(1e-9, (e - w) / 360) * 512, spanY = Math.max(1e-9, my(s) - my(n)) * 512;
  const zoom = clamp(Math.log2(Math.min(visW / spanX, visH / spanY)) - 0.15, 3, maxZoom);
  const cy = (my(s) + my(n)) / 2;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * cy))) * 180) / Math.PI;
  map.flyTo({ center: [(w + e) / 2, lat], zoom, pitch, bearing: 0, padding: p, speed: 1.2, curve: 1.4, maxDuration: 6000 });
}

function travelStep(delta) {
  const s = travel.sel;
  if (!s) return;
  const wrap = (i, n) => ((i % n) + n) % n;
  if (s.kind === 'stage') selectStage(wrap(s.k - 1 + delta, travel.plan.stages.length) + 1);
  else if (s.kind === 'climb') selectClimb(wrap(s.i + delta, travel.plan.climbs.length));
  else if (s.kind === 'trail') {
    const list = travel.hikeList.length ? travel.hikeList : travel.data.hike.trails;
    const i = list.findIndex((t) => t.id === s.id);
    selectTrail(list[wrap(i + delta, list.length)]);
  } else if (s.kind === 'peak') {
    const list = travel.peakList.length ? travel.peakList : travel.data.peaks.peaks;
    const i = list.findIndex((p) => p.rank === s.rank);
    selectPeak(list[wrap(i + delta, list.length)]);
  }
}

function travelProfile() {
  const s = travel.sel;
  if (!s) return;
  if (s.kind === 'stage') stageProfile(s.k);
  else if (s.kind === 'climb') climbProfile(s.i);
  else if (s.kind === 'trail') trailProfile(travel.data.hike.trails.find((t) => t.id === s.id));
  else if (s.kind === 'peak') { const p = peakByRank(s.rank); profileForSpot(p); }
}

function travelHash() {
  const s = travel.sel;
  if (!s) return null;
  if (s.kind === 'trail') return `#trail=${s.id}`;
  if (s.kind === 'peak') return `#peak=${s.rank}`;
  return '#bike';
}

// 一段路徑的距離、累積爬升／下降（高差超過 3 m 才累計）與高度範圍
function rangeStats(P, a, b) {
  let up = 0, down = 0, ref = P[a].e, max = -Infinity, min = Infinity;
  for (let i = a; i <= b; i++) {
    const v = P[i].e;
    if (v > max) max = v;
    if (v < min) min = v;
    if (v - ref >= 3) { up += v - ref; ref = v; } else if (ref - v >= 3) { down += ref - v; ref = v; }
  }
  return { km: P[b].d - P[a].d, up, down, max, min };
}

function pathIndex(P, d) {
  let lo = 0, hi = P.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (P[mid].d < d) lo = mid + 1; else hi = mid; }
  return lo;
}

function pathPoint(P, d) {
  const i = pathIndex(P, d);
  if (i === 0) return P[0].p;
  const a = P[i - 1], b = P[i], t = clamp((d - a.d) / (b.d - a.d || 1), 0, 1);
  return [a.p[0] + (b.p[0] - a.p[0]) * t, a.p[1] + (b.p[1] - a.p[1]) * t];
}

// 從整條路徑切出一段，里程改從 0 起算（剖面用）
function subPath(P, a, b) {
  const d0 = P[a].d;
  return P.slice(a, b + 1).map((s) => ({ p: s.p, d: s.d - d0, e: s.e }));
}

const lineFeature = (coords) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } });

// ---------- 自行車環島
function bikeModel(dir = travel.dir) {
  const c = travel.data.bike;
  const key = `_${dir}`;
  if (c[key]) return c[key];
  const n = c.lon.length, total = c.total;
  const dcw = (i) => (i === n - 1 ? total : i * c.step);
  const flip = (d) => (dir === 'cw' ? d : total - d);
  const path = new Array(n);
  for (let i = 0; i < n; i++) {
    const j = dir === 'cw' ? i : n - 1 - i;
    path[i] = { p: [c.lon[j], c.lat[j]], d: flip(dcw(j)), e: c.elev[j] };
  }
  const pois = {};
  for (const [k, list] of Object.entries(c.pois)) pois[k] = list.map(([d, lon, lat, name]) => ({ d: flip(d), lon, lat, name })).sort((a, b) => a.d - b.d);
  const places = c.places.map(([d, name, kind]) => ({ d: flip(d), name, kind })).sort((a, b) => a.d - b.d);
  return (c[key] = { dir, path, pois, places, total });
}

// 里程附近的地名，鄉鎮優先於村里
function placeNear(m, d, win = 5) {
  let best = null, score = Infinity;
  for (const p of m.places) {
    const dd = Math.abs(p.d - d);
    if (dd > win) continue;
    const sc = dd - (p.kind === 'village' ? 0 : 1.5);
    if (sc < score) { score = sc; best = p; }
  }
  return best?.name || '';
}

// 爬坡段：先找「自谷底到坡頂、途中回落不到 40 m」的區間，再從坡頂往回取平均坡度至少 2% 的最長一段，
// 淨爬升 100 m 以上才算。否則會把坡前幾十公里的緩升平路也算進去，平均坡度失真。
function findClimbs(m) {
  const P = m.path, raw = [];
  let lo = 0, hi = 0;
  const push = () => { if (P[hi].e - P[lo].e >= 100) raw.push({ a: lo, b: hi }); };
  for (let i = 1; i < P.length; i++) {
    const e = P[i].e;
    if (P[hi].e - P[lo].e < 100 && e < P[lo].e) { lo = i; hi = i; continue; }
    if (e > P[hi].e) hi = i;
    if (P[hi].e - e >= 40) { push(); lo = i; hi = i; }
  }
  push();
  const out = [];
  for (let { a, b } of raw) {
    while (a < b && (P[b].e - P[a].e) / ((P[b].d - P[a].d) * 10) < 2) a++;
    const gain = P[b].e - P[a].e, km = P[b].d - P[a].d;
    if (gain < 100) continue;
    out.push({ a, b, gain, km, d0: P[a].d, d1: P[b].d, top: P[b].e, grade: gain / (km * 10), from: placeNear(m, P[a].d), name: placeNear(m, P[b].d) || placeNear(m, (P[a].d + P[b].d) / 2, 12) || `${Math.round(P[b].d)} km 處` });
  }
  // 同名的坡加上起點，例如「南澳→東澳」
  for (const c of out) {
    if (out.some((o) => o !== c && o.name === c.name)) c.name = c.from && c.from !== c.name ? `${c.from}→${c.name}` : `${c.name}（${c.d1.toFixed(0)} km）`;
  }
  return out.sort((x, y) => y.gain - x.gain);
}

// 便利商店之間最長的空白路段
function supplyGaps(m) {
  const st = m.pois.store.map((s) => s.d);
  const gaps = [{ a: 0, b: st[0] }, { a: st.at(-1), b: m.total }];
  for (let i = 1; i < st.length; i++) gaps.push({ a: st[i - 1], b: st[i] });
  return gaps.map((g) => ({ ...g, km: g.b - g.a })).sort((x, y) => y.km - x.km).slice(0, 4);
}

// 分日：依距離平均切，每天終點取目標里程 ±30 km 內最近的臺鐵車站（方便住宿與搭車接駁）
function planStages(m, days) {
  const P = m.path, total = m.total, st = m.pois.station;
  const ends = [];
  let prev = 0;
  for (let k = 1; k < days; k++) {
    const target = (total * k) / days;
    let best = null;
    for (const s of st) {
      if (s.d <= prev + 25 || s.d >= total - 25 || Math.abs(s.d - target) > 30) continue;
      if (!best || Math.abs(s.d - target) < Math.abs(best.d - target)) best = s;
    }
    const d = best ? best.d : target;
    ends.push({ d, name: best ? `${best.name}站` : placeNear(m, d, 8) || `${Math.round(d)} km 處`, p: best ? [best.lon, best.lat] : pathPoint(P, d) });
    prev = d;
  }
  const pts = [{ d: 0, name: '臺北站', p: P[0].p }, ...ends, { d: total, name: '臺北站', p: P.at(-1).p }];
  return pts.slice(1).map((end, i) => {
    const from = pts[i], a = pathIndex(P, from.d), b = pathIndex(P, end.d);
    const stores = m.pois.store.filter((s) => s.d >= from.d && s.d <= end.d).map((s) => s.d);
    let gap = 0;
    [from.d, ...stores, end.d].forEach((d, j, arr) => { if (j) gap = Math.max(gap, d - arr[j - 1]); });
    const stations = m.pois.station.filter((s) => s.d > from.d + 0.5 && s.d < end.d - 0.5).map((s) => s.name);
    return { k: i + 1, from: from.name, to: end.name, a, b, d0: from.d, d1: end.d, endP: end.p, stores: stores.length, gap, stations, ...rangeStats(P, a, b) };
  });
}

const bikeDirLabel = () => (travel.dir === 'ccw' ? '逆時針：自台北沿西部南下' : '順時針：自台北沿東部南下');

function initBike() {
  const c = travel.data.bike;
  // 依坡度著色：每 0.5 km 一段，取絕對坡度（方向無關）
  const feats = [];
  for (let i = 0; i < c.lon.length - 1; i += 5) {
    const j = Math.min(i + 5, c.lon.length - 1);
    const coords = [];
    for (let k = i; k <= j; k++) coords.push([c.lon[k], c.lat[k]]);
    const g = (Math.abs(c.elev[j] - c.elev[i]) / ((j - i) * c.step * 1000)) * 100;
    feats.push({ type: 'Feature', properties: { g: Math.round(g * 10) / 10 }, geometry: { type: 'LineString', coordinates: coords } });
  }
  map.getSource('bike-route').setData({ type: 'FeatureCollection', features: feats });
  const pf = [];
  for (const [kind, list] of Object.entries(c.pois)) {
    for (const [d, lon, lat, name] of list) pf.push({ type: 'Feature', properties: { kind: kind === 'repair' ? 'bike' : kind, name, d }, geometry: { type: 'Point', coordinates: [lon, lat] } });
  }
  map.getSource('bike-pois').setData({ type: 'FeatureCollection', features: pf });
  applyBikePoi();
  renderBike();
}

function applyBikePoi() {
  map.setFilter('bike-poi', ['in', ['get', 'kind'], ['literal', [...travel.poi]]]);
  map.setFilter('bike-poi-label', ['all', ['==', ['get', 'kind'], 'station'], travel.poi.has('station')]);
}

function renderBike() {
  // 方向或天數一改，騎乘的分日與舊的當日／爬坡剖面都不再對應
  if (ride.mode === 'bike') stopRide();
  if (profile.path?.plan && !profile.path.ride) closeProfile();
  const m = bikeModel();
  const P = m.path;
  const all = rangeStats(P, 0, P.length - 1);
  const topI = P.reduce((bi, s, i) => (s.e > P[bi].e ? i : bi), 0);
  const allClimbs = findClimbs(m);
  travel.plan = { m, all, stages: planStages(m, travel.days), allClimbs, climbs: allClimbs.slice(0, 8), gaps: supplyGaps(m) };
  const { stages, climbs, gaps } = travel.plan;
  const stat = (dt, dd, small) => `<dl><dt>${dt}</dt><dd>${dd}<small>${esc(small)}</small></dd></dl>`;
  $('bikeStats').innerHTML = stat('全長', fmtInt(m.total), 'km') + stat('累積爬升', fmtInt(all.up), 'm')
    + stat('最高點', fmtInt(P[topI].e), `m · ${placeNear(m, P[topI].d) || '—'}`) + stat('沿線補給', fmtInt(m.pois.store.length), '家便利商店');
  $('bikeDaysOut').textContent = `${travel.days} 天`;

  const maxKm = Math.max(...stages.map((s) => s.km));
  $('bikeStages').replaceChildren(...stages.map((s) => travelItem({
    k: `D${s.k}`, t: `${s.from} → ${s.to}`, v: `${s.km.toFixed(0)} km`,
    s: `↑ ${fmtInt(s.up)} m · 最高 ${fmtInt(s.max)} m · 便利商店 ${s.stores} 家`, bar: s.km / maxKm, data: { k: s.k },
  })));
  $('bikeClimbs').replaceChildren(...climbs.map((c, i) => travelItem({
    k: `#${i + 1}`, t: c.name, v: `↑ ${fmtInt(c.gain)} m`, color: GRADE_STOPS[GRADE_STOPS.findIndex((v, j) => j % 2 === 0 && v >= c.grade) + 1] || '#ff5d6c',
    s: `${c.d0.toFixed(0)} km 起 · 長 ${c.km.toFixed(1)} km · 平均坡度 ${c.grade.toFixed(1)}% · 頂點 ${fmtInt(c.top)} m`, data: { i },
  })));
  $('bikeGaps').replaceChildren(...gaps.slice(0, 3).map((g) => {
    const li = travelItem({ k: '!', t: `${placeNear(m, g.a, 8) || `${g.a.toFixed(0)} km`} → ${placeNear(m, g.b, 8) || `${g.b.toFixed(0)} km`}`, v: `${g.km.toFixed(1)} km`, s: `${g.a.toFixed(0)}–${g.b.toFixed(0)} km 沿線 200 m 內沒有便利商店，出發前補足飲水`, data: { a: g.a, b: g.b } });
    li.className = 'warn';
    return li;
  }));
  $('bikeHint').textContent = `路線依 OpenStreetMap 上的環島 1 號線（${travel.data.bike.retrieved} 擷取），${bikeDirLabel()}。每日終點取最接近平均里程的臺鐵車站；爬升已排除隧道與橋樑造成的地形誤差，仍為估算值。`;

  map.getSource('bike-stages').setData({
    type: 'FeatureCollection',
    features: [{ label: '起終點 臺北', p: P[0].p }, ...stages.slice(0, -1).map((s) => ({ label: `D${s.k + 1} ${s.to}`, p: s.endP }))]
      .map((f) => ({ type: 'Feature', properties: { label: f.label }, geometry: { type: 'Point', coordinates: f.p } })),
  });
  // 方向或天數改了，原本選取的那一天已不同，直接收掉
  if (travel.sel?.mode === 'bike') closeCard();
  markTravelLists();
}

function selectStage(k) {
  const st = travel.plan?.stages[k - 1];
  if (!st) return;
  const P = travel.plan.m.path;
  setTravelSel({ mode: 'bike', kind: 'stage', k });
  const coords = P.slice(st.a, st.b + 1).map((s) => s.p);
  map.getSource('bike-hl').setData(lineFeature(coords));
  const climbs = travel.plan.allClimbs.filter((c) => c.d0 >= st.d0 - 1 && c.d1 <= st.d1 + 1);
  const stations = st.stations.length > 8 ? `${st.stations.slice(0, 8).join('、')} 等 ${st.stations.length} 站` : st.stations.join('、');
  showTravelCard({
    tag: '自行車環島', color: '#e9b44c', index: `第 ${k} / ${travel.plan.stages.length} 天`, title: `${st.from} → ${st.to}`, badge: bikeDirLabel(),
    f1: ['距離', `${st.km.toFixed(1)} km`], f2: ['累積爬升', `${fmtInt(st.up)} m`],
    metric: `下降 ${fmtInt(st.down)} m · 最高 ${fmtInt(st.max)} m · 便利商店 ${st.stores} 家 · 最長補給間距 ${st.gap.toFixed(1)} km`,
    desc: `${climbs.length ? `本日主要爬坡：${climbs.map((c) => `${c.name}（↑${fmtInt(c.gain)} m，平均 ${c.grade.toFixed(1)}%）`).join('、')}。` : '本日沒有淨爬升 100 m 以上的坡段。'}`
      + `${stations ? `途經臺鐵車站：${stations}，需要時可搭火車接駁。` : ''}按「剖面」看這一天的高度變化。`,
  });
  history.replaceState(null, '', '#bike');
  fitCoords(coords, { maxZoom: 12 });
}

function selectClimb(i) {
  const c = travel.plan?.climbs[i];
  if (!c) return;
  const P = travel.plan.m.path;
  setTravelSel({ mode: 'bike', kind: 'climb', i });
  const coords = P.slice(c.a, c.b + 1).map((s) => s.p);
  map.getSource('bike-hl').setData(lineFeature(coords));
  const day = travel.plan.stages.find((s) => c.d1 > s.d0 && c.d0 < s.d1);
  showTravelCard({
    tag: '環島爬坡', color: '#ff9b73', index: `第 ${i + 1} / ${travel.plan.climbs.length} 大爬坡`, title: c.name, badge: bikeDirLabel(),
    f1: ['爬升', `${fmtInt(c.gain)} m`], f2: ['平均坡度', `${c.grade.toFixed(1)}%`],
    metric: `${c.d0.toFixed(1)}–${c.d1.toFixed(1)} km · 長 ${c.km.toFixed(1)} km · 頂點 ${fmtInt(c.top)} m${day ? ` · 第 ${day.k} 天` : ''}`,
    desc: `從谷底到坡頂淨爬升 ${fmtInt(c.gain)} m。坡度為地形資料推算的平均值，局部可能更陡；上坡前補水，下坡注意車速。`,
  });
  history.replaceState(null, '', '#bike');
  fitCoords(coords, { maxZoom: 13 });
}

function bikeOverviewProfile() {
  if (!travel.plan) return;
  const { m, all, stages } = travel.plan;
  const P = m.path;
  showPathProfile(P, {
    title: `環島 1 號線 · ${travel.dir === 'ccw' ? '逆時針' : '順時針'}`, a: '臺北', b: '臺北',
    stats: `全長 <b>${fmtInt(m.total)}</b> km · 累積爬升 <b>${fmtInt(all.up)}</b> m · 最高 <b>${fmtInt(all.max)}</b> m · ${travel.days} 天`,
    marks: stages.slice(0, -1).map((s) => ({ d: s.d1, label: `D${s.k + 1}` })),
    onPick: (d) => { if (ride.on && ride.mode === 'bike') rideSeek(d); else { const s = stages.find((x) => d >= x.d0 && d <= x.d1); if (s) selectStage(s.k); } },
    ride: 'bike', plan: true,
  });
}

function stageProfile(k) {
  const st = travel.plan.stages[k - 1];
  const P = travel.plan.m.path;
  const climbs = travel.plan.allClimbs.filter((c) => c.d0 >= st.d0 - 1 && c.d1 <= st.d1 + 1);
  showPathProfile(subPath(P, st.a, st.b), {
    title: `第 ${k} 天 · ${st.from} → ${st.to}`, a: st.from, b: st.to, offset: st.d0, plan: true,
    stats: `長 <b>${st.km.toFixed(1)}</b> km · 爬升 <b>${fmtInt(st.up)}</b> m · 下降 <b>${fmtInt(st.down)}</b> m · 最高 <b>${fmtInt(st.max)}</b> m`,
    marks: climbs.map((c) => ({ d: c.d1 - st.d0, label: c.name })),
  });
}

function climbProfile(i) {
  const c = travel.plan.climbs[i];
  const P = travel.plan.m.path;
  const a = pathIndex(P, Math.max(0, c.d0 - 3)), b = pathIndex(P, Math.min(travel.plan.m.total, c.d1 + 3));
  showPathProfile(subPath(P, a, b), {
    title: `爬坡 · ${c.name}`, offset: P[a].d, range: [c.d0 - P[a].d, c.d1 - P[a].d], plan: true,
    stats: `爬升 <b>${fmtInt(c.gain)}</b> m · 長 <b>${c.km.toFixed(1)}</b> km · 平均 <b>${c.grade.toFixed(1)}</b>% · 頂點 <b>${fmtInt(c.top)}</b> m`,
  });
}

function startBikeRide() {
  if (!travel.plan) return;
  const { m, stages } = travel.plan;
  const s = travel.sel?.kind === 'stage' ? stages[travel.sel.k - 1] : travel.sel?.kind === 'climb' ? { d0: travel.plan.climbs[travel.sel.i].d0 } : null;
  bikeOverviewProfile();
  startRide({
    mode: 'bike', path: m.path, from: s ? s.d0 : 0, title: `虛擬騎乘 · 環島 1 號線（${travel.dir === 'ccw' ? '逆時針' : '順時針'}）`,
    segs: stages.map((x) => ({ d0: x.d0, d1: x.d1, name: `第 ${x.k} 天` })), kmps: 0.5, zoom: 13, look: 1.2,
  });
}

// ---------- 健行步道
const DIF_GROUPS = [['all', '全部', () => true], ['easy', '0–1 級', (d) => d <= 1], ['2', '2 級', (d) => d === 2], ['3', '3 級', (d) => d === 3], ['hard', '4 級以上', (d) => d >= 4]];

function initHike() {
  const ts = travel.data.hike.trails;
  for (const t of ts) {
    t.head = t.entrances[0] ? [t.entrances[0][0], t.entrances[0][1]] : t.segs[0] ? [t.segs[0].lon[0], t.segs[0].lat[0]] : null;
    t.dif = t.dif ?? 0;
  }
  map.getSource('trails').setData({
    type: 'FeatureCollection',
    features: ts.filter((t) => t.segs.length).map((t) => ({ type: 'Feature', properties: { id: t.id, dif: t.dif }, geometry: { type: 'MultiLineString', coordinates: t.segs.map((s) => s.lon.map((x, i) => [x, s.lat[i]])) } })),
  });
  map.getSource('trail-heads').setData({
    type: 'FeatureCollection',
    features: ts.filter((t) => t.head).map((t) => ({ type: 'Feature', properties: { id: t.id, name: t.name, dif: t.dif }, geometry: { type: 'Point', coordinates: t.head } })),
  });
  $('hikeChips').replaceChildren(...DIF_GROUPS.map(([key, label, test]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.dif = key;
    b.setAttribute('aria-pressed', String(travel.hikeDif === key));
    b.innerHTML = '<span></span><b></b>';
    b.firstChild.textContent = label;
    b.lastChild.textContent = ts.filter((t) => test(t.dif)).length;
    b.addEventListener('click', () => {
      travel.hikeDif = key;
      $('hikeChips').querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.dif === key)));
      renderHike();
    });
    return b;
  }));
  $('hikeHint').textContent = `林業及自然保育署自然步道 ${ts.length} 條（${ts.filter((t) => t.segs.length).length} 條有軌跡）。難度為該署 0–6 級分級，數字愈大愈難；爬升與高度由軌跡與地形資料計算。`;
  renderHike();
}

function renderHike() {
  const ts = travel.data.hike?.trails;
  if (!ts) return;
  const test = DIF_GROUPS.find(([k]) => k === travel.hikeDif)[2];
  const q = travel.hikeQ.trim().toLowerCase();
  travel.hikeList = ts.filter((t) => test(t.dif) && (!q || `${t.name} ${t.pos} ${t.sys} ${t.sub}`.toLowerCase().includes(q)))
    .sort((a, b) => (b.head?.[1] ?? 0) - (a.head?.[1] ?? 0));
  const list = $('hikeList');
  if (!travel.hikeList.length) {
    const li = document.createElement('li');
    li.className = 'hint';
    li.textContent = '沒有符合的步道。';
    list.replaceChildren(li);
    return;
  }
  list.replaceChildren(...travel.hikeList.map((t) => travelItem({
    k: `${t.dif} 級`, t: t.name, v: t.lenText || '—', color: DIF_COLORS[t.dif] || '#ccc',
    s: [t.pos, t.tour && t.tour.length <= 12 ? t.tour : '', t.track ? `↑ ${fmtInt(t.track.main.up)} m` : ''].filter(Boolean).join(' · '), data: { id: t.id },
  })));
  markTravelLists();
}

function selectTrail(t) {
  if (!t) return;
  setTravelSel({ mode: 'hike', kind: 'trail', id: t.id });
  const tr = t.track;
  const mismatch = tr && t.len && Math.abs(tr.main.km - t.len) / t.len > 0.3 ? `軌跡主線 ${tr.main.km.toFixed(1)} km，與公告長度不同，軌跡檔可能只含部分路段，或公告長度另計支線與往返。` : '';
  const parts = tr && tr.parts > 1 ? `（另有 ${tr.parts - 1} 段支線或分段，軌跡合計 ${tr.km.toFixed(1)} km）` : '';
  showTravelCard({
    tag: '健行步道', color: DIF_COLORS[t.dif] || '#ccc', index: `難度 ${t.dif} 級（0–6）`, title: t.name, badge: [t.sys, t.sub].filter(Boolean).join('・') || t.pos,
    f1: ['長度', t.lenText || '—'], f2: ['海拔', t.alt ? `約 ${fmtInt(+t.alt)} m` : '—'],
    metric: tr ? `主線 ${tr.main.km.toFixed(1)} km（自登山口）· 爬升 ${fmtInt(tr.main.up)} m · 下降 ${fmtInt(tr.main.down)} m · 高度 ${fmtInt(tr.main.min)}–${fmtInt(tr.main.max)} m${parts}` : '這條步道沒有公開軌跡，地圖上標示入口位置。',
    desc: [t.tour && `路程：${t.tour}`, t.season && `最佳季節：${t.season}`, t.pave && `路面：${t.pave}`, t.special && `特色：${t.special}`, `位置：${t.pos}`, `管理：${t.admin}`].filter(Boolean).join('。') + '。' + mismatch,
  });
  history.replaceState(null, '', `#trail=${t.id}`);
  const coords = t.segs.flatMap((s) => s.lon.map((x, i) => [x, s.lat[i]]));
  if (coords.length > 1) fitCoords(coords, { maxZoom: 14.5, pitch: 55 });
  else if (t.head) map.flyTo({ center: t.head, zoom: 14, pitch: 55, padding: viewPadding(), speed: 1.1 });
}

// 步道主線（烘製時已排在第一段，自登山口出發）
function trailPath(t) {
  const s = t.segs[0];
  if (!s) return null;
  const P = [];
  let d = 0;
  for (let i = 0; i < s.lon.length; i++) {
    const p = [s.lon[i], s.lat[i]];
    if (i) d += distanceKm(P[i - 1].p, p);
    P.push({ p, d, e: s.elev[i] });
  }
  return P;
}

function trailProfile(t) {
  const P = t && trailPath(t);
  if (!P) { toast('這條步道沒有公開軌跡'); return; }
  // 主線只有一個點（例如 180 龍麟山、212 撒固兒）時畫不出剖面，也不能飛覽
  if (P.length < 2) { toast('這條步道的公開軌跡只有一個點，無法畫剖面'); return; }
  // 統計用烘製時 25 m 取樣算好的主線數字，與卡片、清單一致
  const st = t.track.main;
  showPathProfile(P, {
    title: t.name, floor: true, a: '登山口', b: '終點',
    stats: `主線 <b>${st.km.toFixed(1)}</b> km · 爬升 <b>${fmtInt(st.up)}</b> m · 下降 <b>${fmtInt(st.down)}</b> m · 高度 <b>${fmtInt(st.min)}–${fmtInt(st.max)}</b> m`,
    onPick: (d) => { if (ride.on && ride.mode === 'hike') rideSeek(d); },
    ride: 'hike',
  });
  return P;
}

// ---------- 百岳
const PEAK_FILTERS = [['all', '全部', () => true], ['中央山脈', '中央山脈', (p) => p.range[0] === '中央山脈'], ['雪山山脈', '雪山山脈', (p) => p.range[0] === '雪山山脈'], ['玉山山脈', '玉山山脈', (p) => p.range[0] === '玉山山脈'], ['todo', '未登頂', (p) => !travel.done.has(p.rank)], ['done', '已登頂', (p) => travel.done.has(p.rank)]];
const peakByRank = (rank) => travel.data.peaks?.peaks.find((p) => p.rank === rank);

function loadDone() {
  try {
    const v = JSON.parse(localStorage.getItem(PEAK_DONE_KEY) || '[]');
    travel.done = new Set(Array.isArray(v) ? v.filter((x) => Number.isInteger(x) && x >= 1 && x <= 100) : []);
  } catch { travel.done = new Set(); }
}

function saveDone() {
  try { localStorage.setItem(PEAK_DONE_KEY, JSON.stringify([...travel.done].sort((a, b) => a - b))); } catch { /* 私密模式等情況下只保留在這次瀏覽 */ }
}

function initPeaks() {
  loadDone();
  renderPeakChips();
  updatePeakSource();
  $('peakHint').textContent = '名單、測高、山脈、路線與分級整理自中文維基百科「台灣百岳」條目；分級為國家公園步道系統 0–6 級，數字愈大愈難。勾選登頂只記在這台裝置的瀏覽器。';
  renderPeaks();
}

function renderPeakChips() {
  const ps = travel.data.peaks.peaks;
  $('peakChips').replaceChildren(...PEAK_FILTERS.map(([key, label, test]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.f = key;
    b.setAttribute('aria-pressed', String(travel.peakFilter === key));
    b.innerHTML = '<span></span><b></b>';
    b.firstChild.textContent = label;
    b.lastChild.textContent = ps.filter(test).length;
    b.addEventListener('click', () => { travel.peakFilter = key; renderPeakChips(); renderPeaks(); });
    return b;
  }));
}

function updatePeakSource() {
  map.getSource('peaks').setData({
    type: 'FeatureCollection',
    features: travel.data.peaks.peaks.map((p) => ({ type: 'Feature', properties: { rank: p.rank, name: p.name, h: Math.round(p.h), done: travel.done.has(p.rank) }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })),
  });
}

function renderPeaks() {
  const ps = travel.data.peaks?.peaks;
  if (!ps) return;
  const n = travel.done.size;
  $('peakDone').textContent = n;
  $('peakBar').style.width = `${n}%`;
  const test = PEAK_FILTERS.find(([k]) => k === travel.peakFilter)[2];
  travel.peakList = ps.filter(test);
  $('peakList').replaceChildren(...travel.peakList.map((p) => {
    const li = travelItem({
      k: `#${p.rank}`, t: p.name, v: `${fmtInt(p.h)} m`, color: travel.done.has(p.rank) ? '#e9b44c' : '#ffffff',
      s: `${p.range[1] || p.range[0]} · 分級 ${p.grade ?? '—'} · ${p.park ? `${p.park}國家公園` : '國家公園外'}`, data: { rank: p.rank },
    });
    li.classList.add('peak');
    const label = document.createElement('label');
    label.title = '標記已登頂';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'chk';
    cb.checked = travel.done.has(p.rank);
    cb.setAttribute('aria-label', `${p.name} 已登頂`);
    cb.addEventListener('change', () => togglePeakDone(p.rank, cb.checked));
    label.append(cb);
    li.append(label);
    return li;
  }));
  markTravelLists();
}

function togglePeakDone(rank, on) {
  if (on) travel.done.add(rank); else travel.done.delete(rank);
  saveDone();
  updatePeakSource();
  renderPeakChips();
  // 「未登頂／已登頂」篩選時勾選會讓項目移出清單，其餘篩選只更新進度
  if (travel.peakFilter === 'todo' || travel.peakFilter === 'done') renderPeaks();
  else { $('peakDone').textContent = travel.done.size; $('peakBar').style.width = `${travel.done.size}%`; }
  if (travel.sel?.kind === 'peak' && travel.sel.rank === rank) selectPeak(peakByRank(rank), { fly: false });
}

function selectPeak(p, { fly = true } = {}) {
  if (!p) return;
  setTravelSel({ mode: 'peaks', kind: 'peak', rank: p.rank });
  beacon.setLngLat([p.lon, p.lat]).addTo(map);
  const near = travel.data.peaks.peaks.filter((q) => q !== p && distanceKm([p.lon, p.lat], [q.lon, q.lat]) <= 5)
    .sort((a, b) => distanceKm([p.lon, p.lat], [a.lon, a.lat]) - distanceKm([p.lon, p.lat], [b.lon, b.lat]));
  showTravelCard({
    tag: `百岳 #${p.rank}`, color: travel.done.has(p.rank) ? '#e9b44c' : '#f2c46d', index: travel.done.has(p.rank) ? '已登頂 ✓' : `${p.rank} / 100`,
    title: p.name, badge: p.alias.length ? `別名：${p.alias.join('、')}` : p.range.join('・'),
    f1: ['最新測高', `${fmtInt(p.h)} m`], f2: ['座標', `${p.lat.toFixed(4)}°N ${p.lon.toFixed(4)}°E`],
    metric: `${p.range.join('・')} · 國家公園步道分級 ${p.grade ?? '—'} 級 · ${p.park ? `${p.park}國家公園` : '不在國家公園內'}`,
    desc: `常見登山路線：${p.routes.join('、') || '—'}。行政區：${p.admin.join('、')}。舊測高 ${fmtInt(p.hOld)} m。`
      + `${near.length ? `5 km 內的百岳：${near.slice(0, 6).map((q) => `${q.name}（${distanceKm([p.lon, p.lat], [q.lon, q.lat]).toFixed(1)} km）`).join('、')}。` : ''}`
      + '日出時間以山頂望向海平面地平線計算，已計入山高；東方有更高山稜擋住時會晚幾分鐘。'
      + '在清單勾選即可記錄登頂；入山入園申請與天候請查國家公園與林業保育署公告。',
  });
  const sr = nextSunrise(p.lat, p.lon, p.h);
  const t = new Date(Math.round(sr.date.getTime() / 60000) * 60000 + 8 * 3600e3);
  $('cardSun').textContent = `${sr.tomorrow ? '明天' : '今天'}（${t.getUTCMonth() + 1}/${t.getUTCDate()}）日出 `
    + `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')} · 方位 ${Math.round(sr.azimuth)}°（${compassWord(sr.azimuth)}）`;
  $('cardSun').hidden = false;
  history.replaceState(null, '', `#peak=${p.rank}`);
  if (fly) map.flyTo({ center: [p.lon, p.lat], zoom: 13.2 - (isMobile() ? 0.6 : 0), pitch: 64, bearing: (p.rank * 47) % 360 - 180, padding: viewPadding(), speed: 0.9, curve: 1.45, maxDuration: 8000 });
}

// ---------- GPX 匯出：整條環島（每日終點為航點）、選取的那一天、爬坡、步道或百岳
// 座標取到 1e-5 度（約 1 m）；高度是烘製時的地形推估值。檔頭附資料來源、擷取日期與授權（ODbL 等要求標示出處）。
const GPX_LICENSE = {
  bike: ['OpenStreetMap 貢獻者', 'https://opendatacommons.org/licenses/odbl/1-0/'],
  hike: ['農業部林業及自然保育署', 'https://data.gov.tw/license'],
  peaks: ['中文維基百科貢獻者', 'https://creativecommons.org/licenses/by-sa/4.0/'],
};

function gpxXml({ mode, name, wpts, trks, hash }) {
  const ll = ([lon, lat]) => `lat="${lat.toFixed(5)}" lon="${lon.toFixed(5)}"`;
  const ele = (e) => (Number.isFinite(e) ? `<ele>${Math.round(e)}</ele>` : '');
  const [author, license] = GPX_LICENSE[mode];
  const data = travel.data[mode];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="台灣 3D 地景" xmlns="http://www.topografix.com/GPX/1/1">',
    `<metadata><name>${esc(name)}</name><desc>${esc(`${data.source}（${data.retrieved} 擷取）。距離與高度為地形資料推估值，出發前請核對官方路況與公告。`)}</desc>`
      + `<copyright author="${esc(author)}"><license>${license}</license></copyright>`
      + `<link href="${esc(location.origin + location.pathname + hash)}"><text>台灣 3D 地景</text></link><time>${new Date().toISOString()}</time></metadata>`,
    ...wpts.map((w) => `<wpt ${ll(w.p)}>${ele(w.e)}<name>${esc(w.name)}</name>${w.desc ? `<desc>${esc(w.desc)}</desc>` : ''}${w.src ? `<src>${esc(w.src)}</src>` : ''}${w.type ? `<type>${esc(w.type)}</type>` : ''}</wpt>`),
    ...trks.map((t) => `<trk><name>${esc(t.name)}</name>\n${t.segs.map((seg) => `<trkseg>\n${seg.map((s) => `<trkpt ${ll(s.p)}>${ele(s.e)}</trkpt>`).join('\n')}\n</trkseg>`).join('\n')}\n</trk>`),
    '</gpx>',
    '',
  ].join('\n');
}

const bikeDirShort = () => (travel.dir === 'ccw' ? '逆時針' : '順時針');

function bikeRouteGpx() {
  if (!travel.plan) return null;
  const { m, stages } = travel.plan, P = m.path, dir = bikeDirShort();
  return {
    mode: 'bike', hash: '#bike', file: `環島1號線-${dir}-${stages.length}天`, name: `環島 1 號線（${dir}，${stages.length} 天）`,
    wpts: [{ p: P[0].p, e: P[0].e, name: '起終點 臺北站' }, ...stages.slice(0, -1).map((st) => ({
      p: P[st.b].p, e: P[st.b].e, name: `D${st.k} 終點 ${st.to}`, desc: `第 ${st.k} 天 ${st.km.toFixed(1)} km，爬升 ${fmtInt(st.up)} m`,
    }))],
    trks: [{ name: `環島 1 號線（${dir}）`, segs: [P] }],
  };
}

// 目前選取項目的 GPX 內容；沒有可匯出的座標時回傳 null（卡片的下載鈕據此隱藏）
function gpxForSel() {
  const s = travel.sel;
  let g = null;
  if (s?.mode === 'bike' && travel.plan) {
    const { m, stages, climbs } = travel.plan, P = m.path, dir = bikeDirShort();
    if (s.kind === 'stage') {
      const st = stages[s.k - 1];
      const stations = m.pois.station.filter((x) => x.d > st.d0 + 0.5 && x.d < st.d1 - 0.5);
      g = {
        mode: 'bike', hash: '#bike', file: `環島-${dir}-D${st.k}-${st.from}-${st.to}`, name: `環島 1 號線 第 ${st.k} 天：${st.from} → ${st.to}（${dir}）`,
        wpts: [{ p: P[st.a].p, e: P[st.a].e, name: `起點 ${st.from}` }, ...stations.map((x) => ({ p: [x.lon, x.lat], name: `${x.name}站`, type: '臺鐵車站' })), { p: P[st.b].p, e: P[st.b].e, name: `終點 ${st.to}` }],
        trks: [{ name: `第 ${st.k} 天 ${st.from} → ${st.to}`, segs: [P.slice(st.a, st.b + 1)] }],
      };
    } else if (s.kind === 'climb') {
      const c = climbs[s.i];
      g = {
        mode: 'bike', hash: '#bike', file: `環島爬坡-${dir}-${c.name}`, name: `環島爬坡：${c.name}（${dir}）`,
        wpts: [{ p: P[c.a].p, e: P[c.a].e, name: '坡底' }, { p: P[c.b].p, e: P[c.b].e, name: '坡頂', desc: `淨爬升 ${fmtInt(c.gain)} m，平均坡度 ${c.grade.toFixed(1)}%` }],
        trks: [{ name: c.name, segs: [P.slice(c.a, c.b + 1)] }],
      };
    }
  } else if (s?.kind === 'trail') {
    const t = travel.data.hike.trails.find((x) => x.id === s.id);
    const seg = (q) => q.lon.map((x, i) => ({ p: [x, q.lat[i]], e: q.elev[i] }));
    const trks = t.segs.length ? [{ name: `${t.name}（主線，自登山口）`, segs: [seg(t.segs[0])] }] : [];
    if (t.segs.length > 1) trks.push({ name: `${t.name}（支線與其他分段）`, segs: t.segs.slice(1).map(seg) });
    g = {
      mode: 'hike', hash: `#trail=${t.id}`, file: `步道-${t.name}`, name: t.name, trks,
      wpts: t.entrances.map(([lon, lat, h], i) => ({ p: [lon, lat], e: h, name: t.entrances.length > 1 ? `步道入口 ${i + 1}` : '步道入口', type: '步道入口' })),
    };
  } else if (s?.kind === 'peak') {
    const p = peakByRank(s.rank);
    g = {
      mode: 'peaks', hash: `#peak=${p.rank}`, file: `百岳-${p.rank}-${p.name}`, name: `${p.name}（百岳 #${p.rank}）`, trks: [],
      // 名單與測高是維基（CC BY-SA），座標另有出處：多數取自 OSM（ODbL），少數取自 Wikidata（CC0）
      wpts: [{ p: [p.lon, p.lat], e: p.h, name: p.name, desc: `百岳 #${p.rank}，最新測高 ${p.h} m`, src: p.src === 'osm' ? '座標 © OpenStreetMap 貢獻者（ODbL）' : '座標 Wikidata（CC0）', type: '山頂' }],
    };
  }
  return g && (g.wpts.length || g.trks.length) ? g : null;
}

function downloadGpx(g) {
  if (!g) { toast('這個項目沒有可匯出的座標'); return; }
  const file = `${g.file.replace(/[\\/:*?"<>|]+/g, '').replace(/[\s→]+/g, '-')}.gpx`;
  const url = URL.createObjectURL(new Blob([gpxXml(g)], { type: 'application/gpx+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = file;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast(`已匯出 ${file}`);
}

// ---------- 虛擬騎乘／沿線飛覽：鏡頭沿路徑前進，方向看向前方一段距離並平滑轉向
const RIDE_SPEEDS = [1, 3, 10];
const ride = { on: false, playing: false, mode: null, path: null, pos: 0, end: 0, speedIdx: 0, kmps: 0.5, zoom: 13, pitch: 62, look: 1, raf: 0, last: 0, upd: 0, bearing: null, segs: [], jump: false };

function startRide({ mode, path, from = 0, title, segs = [], kmps, zoom, look }) {
  stopTour();
  stopOrbit();
  stopQuakes();
  cancelAnimationFrame(ride.raf);
  Object.assign(ride, { on: true, playing: true, mode, path, pos: from, end: path.at(-1).d, title, segs, kmps, zoom, look, speedIdx: 0, bearing: null, jump: true, last: performance.now(), upd: 0 });
  $('player').hidden = false;
  $('playerTour').textContent = title;
  $('pSpeed').hidden = false;
  $('pPrev').setAttribute('aria-label', segs.length ? '上一天' : '回到起點');
  $('pNext').setAttribute('aria-label', segs.length ? '下一天' : '跳到終點');
  $('pStop').setAttribute('aria-label', '結束飛覽');
  setRideSpeed(0);
  $('playerTrack').replaceChildren(...(segs.length ? segs : [{ d0: 0, d1: ride.end }]).map((s) => {
    const el = document.createElement('i');
    el.addEventListener('click', () => rideSeek(s.d0));
    return el;
  }));
  setPlayIcon();
  syncTravelLayers();
  ride.raf = requestAnimationFrame(rideTick);
}

function rideTick(now) {
  if (!ride.on) return;
  const dt = Math.min(250, now - ride.last);
  ride.last = now;
  if (ride.playing) ride.pos = Math.min(ride.end, ride.pos + (dt * ride.kmps * RIDE_SPEEDS[ride.speedIdx]) / 1000);
  const here = pathPoint(ride.path, ride.pos);
  if (ride.playing || ride.jump) {
    const ahead = pathPoint(ride.path, Math.min(ride.end, ride.pos + ride.look));
    const target = distanceKm(here, ahead) > 0.005 ? bearingTo(here, ahead) : ride.bearing ?? map.getBearing();
    if (ride.bearing == null || ride.jump) ride.bearing = target;
    ride.bearing += ((((target - ride.bearing) % 360) + 540) % 360 - 180) * Math.min(1, dt / 900);
    map.jumpTo({ center: here, bearing: ride.bearing, zoom: ride.zoom, pitch: ride.pitch, padding: viewPadding() });
    ride.jump = false;
  }
  if (now - ride.upd > 120) { ride.upd = now; updateRideUI(); }
  if (ride.playing && ride.pos >= ride.end) { ride.playing = false; setPlayIcon(); toast('抵達終點'); }
  ride.raf = requestAnimationFrame(rideTick);
}

function updateRideUI() {
  const segs = ride.segs.length ? ride.segs : [{ d0: 0, d1: ride.end, name: '' }];
  const k = Math.max(0, segs.findIndex((s) => ride.pos >= s.d0 && ride.pos <= s.d1));
  const e = ride.path[pathIndex(ride.path, ride.pos)].e;
  $('playerStop').textContent = `${segs[k].name ? `${segs[k].name} · ` : ''}${ride.pos.toFixed(1)} km · 海拔 ${fmtInt(e)} m`;
  [...$('playerTrack').children].forEach((el, i) => {
    el.classList.toggle('done', i < k);
    el.classList.toggle('cur', i === k);
    if (i === k) el.style.setProperty('--p', clamp((ride.pos - segs[i].d0) / (segs[i].d1 - segs[i].d0 || 1), 0, 1).toFixed(3));
  });
  if (profile.path?.ride === ride.mode && profile.showAt) profile.showAt(ride.pos, false);
}

function rideSeek(d) {
  ride.pos = clamp(d, 0, ride.end);
  ride.jump = true;
  ride.bearing = null;
  updateRideUI();
}

function rideStep(delta) {
  const segs = ride.segs;
  if (!segs.length) { rideSeek(delta < 0 ? 0 : ride.end); return; }
  const k = Math.max(0, segs.findIndex((s) => ride.pos >= s.d0 && ride.pos <= s.d1));
  const j = clamp(k + delta, 0, segs.length - 1);
  rideSeek(delta < 0 && ride.pos - segs[k].d0 > 2 ? segs[k].d0 : segs[j].d0);
}

function setRideSpeed(i) {
  ride.speedIdx = i;
  $('pSpeed').textContent = `${RIDE_SPEEDS[i]}×`;
  $('pSpeed').setAttribute('aria-label', `播放速度 ${RIDE_SPEEDS[i]} 倍`);
}

function pauseRide() {
  if (!ride.on || !ride.playing) return;
  ride.playing = false;
  setPlayIcon();
}

function resumeRide() {
  if (!ride.on) return;
  stopOrbit();
  if (ride.pos >= ride.end) ride.pos = ride.segs[0]?.d0 ?? 0;
  ride.playing = true;
  ride.jump = true;
  setPlayIcon();
}

function stopRide() {
  if (!ride.on) return;
  ride.on = false;
  ride.playing = false;
  cancelAnimationFrame(ride.raf);
  $('player').hidden = true;
  $('pSpeed').hidden = true;
  $('pPrev').setAttribute('aria-label', '上一站');
  $('pNext').setAttribute('aria-label', '下一站');
  $('pStop').setAttribute('aria-label', '結束路線');
  syncTravelLayers();
}

// ---------------------------------------------------------------- HUD
let hudPending = null, hudBusy = false;
function updateHudPos(lngLat) {
  hudPending = lngLat;
  if (hudBusy) return;
  hudBusy = true;
  requestAnimationFrame(async () => {
    const ll = hudPending;
    hudPending = null;
    const z = clamp(Math.floor(map.getZoom()) + 1, 6, 12);
    let txt = `${ll.lat.toFixed(4)}°N ${ll.lng.toFixed(4)}°E`;
    try {
      const e = await elevationAt(ll.lng, ll.lat, z);
      txt += e < 0 ? ` · 水深 <b>${fmtInt(-e)}</b> m` : ` · 海拔 <b>${fmtInt(e)}</b> m`;
    } catch { /* 圖磚未取得時只顯示座標 */ }
    $('hudPos').innerHTML = txt;
    hudBusy = false;
    if (hudPending) updateHudPos(hudPending);
  });
}

function updateHudCam() {
  const b = (map.getBearing() + 360) % 360;
  $('tCompass').querySelector('.ic').style.transform = `rotate(${-map.getBearing()}deg)`;
  // globe 投影取不到自由相機位置，以 zoom、俯角與預設視角 36.87° 換算鏡頭離中心點的高度（近似值）
  const c = map.getCenter();
  const mpp = (40075016.686 * Math.cos((c.lat * Math.PI) / 180)) / (512 * 2 ** map.getZoom());
  const dist = (0.5 * map.getCanvas().clientHeight) / Math.tan((36.87 / 2) * (Math.PI / 180));
  const m = mpp * dist * Math.cos((map.getPitch() * Math.PI) / 180);
  const alt = m > 9500 ? `${(m / 1000).toFixed(0)} km` : `${(m / 1000).toFixed(1)} km`;
  $('hudCam').textContent = `視高約 ${alt} · 俯角 ${map.getPitch().toFixed(0)}° · 朝${compassWord(b)}`;
  $('tPitch').setAttribute('aria-pressed', String(map.getPitch() > 8));
}

// ---------------------------------------------------------------- 搜尋
const searchDlg = $('search'), searchInput = $('searchInput'), searchList = $('searchResults');
let searchItems = [], searchSel = 0;
const SEARCH_PICKS = ['yushan', 'taroko_gorge', 'sunmoonlake', 'alishan_clouds', 'hsinchu_sp', 'suhua_qingshui'];

const BIKE_WORDS = ['環島', '自行車', '單車', '腳踏車', '1號線', '一號線', '騎車', 'bike', 'cycling'];

function openSearch() {
  if (searchDlg.open) return;
  searchDlg.showModal();
  searchInput.value = '';
  runSearch('');
  searchInput.focus();
  // 百岳與步道名稱也可搜尋：背景載入，到了就重跑一次
  for (const kind of ['peaks', 'hike']) {
    if (travel.data[kind]) continue;
    loadTravel(kind).then(() => { if (searchDlg.open) runSearch(searchInput.value); }).catch(() => {});
  }
}

function runSearch(q) {
  const k = q.trim().toLowerCase();
  let items;
  if (!k) {
    items = [
      ...SEARCH_PICKS.map((id) => ({ kind: 'spot', s: byId.get(id) })),
      { kind: 'bike' },
      ...TOURS.slice(1, 4).map((t) => ({ kind: 'tour', t })),
    ];
  } else {
    const scored = [];
    for (const s of SPOTS) {
      let sc = 0;
      const sh = s.short.toLowerCase(), nm = s.name.toLowerCase();
      if (sh.startsWith(k)) sc = 5; else if (sh.includes(k)) sc = 4; else if (nm.includes(k)) sc = 3;
      else if (s.badge.toLowerCase().includes(k) || s.metric.toLowerCase().includes(k)) sc = 2;
      else if (s.desc.toLowerCase().includes(k) || GROUPS[s.group].label === k) sc = 1;
      if (sc) scored.push({ kind: 'spot', s, sc });
    }
    for (const t of TOURS) {
      if (t.title.toLowerCase().includes(k) || t.blurb.toLowerCase().includes(k)) scored.push({ kind: 'tour', t, sc: 3.5 });
    }
    if (BIKE_WORDS.some((w) => w.includes(k) || k.includes(w))) scored.push({ kind: 'bike', sc: 4.5 });
    for (const p of travel.data.peaks?.peaks || []) {
      const nm = p.name.toLowerCase();
      const sc = nm.startsWith(k) ? 4.8 : nm.includes(k) ? 4.2 : p.alias.some((a) => a.includes(k)) ? 3.6 : k === '百岳' || p.routes.some((r) => r.includes(k)) ? 1.2 : 0;
      if (sc) scored.push({ kind: 'peak', p, sc });
    }
    for (const t of travel.data.hike?.trails || []) {
      const nm = t.name.toLowerCase();
      const sc = nm.startsWith(k) ? 4.6 : nm.includes(k) ? 4 : `${t.sys} ${t.sub}`.includes(k) ? 2 : t.pos.includes(k) ? 1.5 : 0;
      if (sc) scored.push({ kind: 'trail', t, sc });
    }
    items = scored.sort((a, b) => b.sc - a.sc).slice(0, 12);
  }
  searchItems = items;
  searchSel = 0;
  searchList.replaceChildren();
  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'empty';
    li.textContent = `找不到「${q}」。試試「玉山」、「濕地」或「科學園區」。`;
    searchList.append(li);
    return;
  }
  items.forEach((it, i) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.id = `sr-${i}`;
    li.innerHTML = '<span class="dot"></span><span class="nm"></span><span class="kind"></span><span class="sub"></span>';
    const set = (dot, nm, kind, sub) => {
      li.querySelector('.dot').style.background = dot;
      li.querySelector('.nm').textContent = nm;
      li.querySelector('.kind').textContent = kind;
      li.querySelector('.sub').textContent = sub;
    };
    if (it.kind === 'spot') {
      set(GROUPS[it.s.group].color, it.s.short, GROUPS[it.s.group].label, it.s.name === it.s.short ? it.s.badge : it.s.name);
    } else if (it.kind === 'bike') {
      set('#e9b44c', '自行車環島 1 號線', '旅遊專項', '全線距離、爬坡、每日行程與補給點');
    } else if (it.kind === 'peak') {
      set('#f2c46d', it.p.name, `百岳 #${it.p.rank}`, `${fmtInt(it.p.h)} m · ${it.p.range.join('・')}`);
    } else if (it.kind === 'trail') {
      set(DIF_COLORS[it.t.dif] || '#ccc', it.t.name, `步道 · ${it.t.dif} 級`, `${it.t.pos} · ${it.t.lenText || ''}`);
    } else {
      li.querySelector('.dot').style.background = '#e9b44c';
      li.querySelector('.nm').textContent = it.t.title;
      li.querySelector('.kind').textContent = `路線 · ${it.t.stops.length} 站`;
      li.querySelector('.sub').textContent = it.t.blurb;
    }
    li.addEventListener('mousemove', () => { if (searchSel !== i) markSearch(i, false); });
    li.addEventListener('click', () => chooseSearch(i));
    searchList.append(li);
  });
  markSearch(0);
}

// 只有鍵盤移動才捲動清單；滑鼠停在邊緣項目時不自動捲動
function markSearch(i, scroll = true) {
  searchSel = i;
  [...searchList.children].forEach((li, k) => li.setAttribute('aria-selected', String(k === i)));
  searchInput.setAttribute('aria-activedescendant', `sr-${i}`);
  if (scroll) searchList.children[i]?.scrollIntoView({ block: 'nearest' });
}

function chooseSearch(i) {
  const it = searchItems[i];
  if (!it) return;
  searchDlg.close();
  if (isMobile()) setSheet(false);
  if (it.kind === 'spot') { stopTour(); selectSpot(it.s); }
  else if (it.kind === 'tour') startTour(it.t, 0);
  else if (it.kind === 'bike') { stopTour(); stopRide(); openTravelThen('bike', () => map.flyTo({ ...HOME(), padding: viewPadding(), speed: 1.2 })); }
  else if (it.kind === 'peak') { stopTour(); openTravelThen('peaks', () => selectPeak(it.p)); }
  else if (it.kind === 'trail') { stopTour(); openTravelThen('hike', () => selectTrail(it.t)); }
}

searchInput.addEventListener('input', () => runSearch(searchInput.value));
searchInput.addEventListener('keydown', (e) => {
  if (e.isComposing || e.keyCode === 229) return; // 注音等輸入法選字中
  if (e.key === 'ArrowDown') { e.preventDefault(); markSearch(Math.min(searchItems.length - 1, searchSel + 1)); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); markSearch(Math.max(0, searchSel - 1)); }
  else if (e.key === 'Enter') { e.preventDefault(); chooseSearch(searchSel); }
});
searchDlg.addEventListener('click', (e) => { if (e.target === searchDlg) searchDlg.close(); });
$('searchOpen').addEventListener('click', openSearch);

// ---------------------------------------------------------------- 匯出、分享、提示
let toastTimer = 0;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
}

function shareUrl() {
  const base = location.origin + location.pathname;
  if (tour.def) return `${base}#tour=${tour.def.id}`;
  if (profile.section && !profileEl.hidden) return `${base}#section=${profile.section}`;
  if (state.current) return `${base}#spot=${state.current.id}`;
  if (travel.sel) return `${base}${travelHash()}`;
  const c = map.getCenter();
  return `${base}#cam=${c.lng.toFixed(4)},${c.lat.toFixed(4)},${map.getZoom().toFixed(2)},${map.getBearing().toFixed(0)},${map.getPitch().toFixed(0)}`;
}

async function share() {
  const url = shareUrl();
  const title = state.current ? `${state.current.short}｜台灣 3D 地景` : travel.sel ? `${$('cardTitle').textContent}｜台灣 3D 地景` : '台灣 3D 地景';
  if (navigator.share && isMobile()) {
    try { await navigator.share({ title, url }); return; } catch { /* 使用者取消時改複製 */ }
  }
  try { await navigator.clipboard.writeText(url); toast('已複製分享連結'); } catch { prompt('複製這個連結：', url); }
}

function exportShot() {
  map.once('render', () => {
    const src = map.getCanvas();
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d');
    try { ctx.drawImage(src, 0, 0); } catch (err) { console.warn(err); toast('目前畫面無法匯出'); return; }
    const k = c.width / src.clientWidth;
    const h = 64 * k;
    const grad = ctx.createLinearGradient(0, c.height - h * 1.6, 0, c.height);
    grad.addColorStop(0, 'rgba(8,10,14,0)');
    grad.addColorStop(1, 'rgba(8,10,14,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, c.height - h * 1.6, c.width, h * 1.6);
    ctx.fillStyle = '#ece8e1';
    ctx.font = `700 ${20 * k}px "Noto Serif TC", serif`;
    ctx.fillText(state.current ? `${state.current.short} · 台灣 3D 地景` : travel.sel ? `${$('cardTitle').textContent} · 台灣 3D 地景` : '台灣 3D 地景', 22 * k, c.height - 30 * k);
    ctx.fillStyle = 'rgba(236,232,225,0.65)';
    ctx.font = `${11 * k}px ui-monospace, monospace`;
    ctx.fillText('影像 Esri, Maxar, Earthstar Geographics · 地形 Mapzen Terrarium / AWS · 地名 © OpenStreetMap', 22 * k, c.height - 12 * k);
    c.toBlob((blob) => {
      if (!blob) { toast('目前畫面無法匯出'); return; }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `taiwan-3d-${state.current?.id || 'view'}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('已匯出 PNG');
    }, 'image/png');
  });
  map.triggerRepaint();
}

// ---------------------------------------------------------------- 面板、抽屜
function setTab(name, focus = false) {
  document.querySelectorAll('.tabs [role=tab]').forEach((t) => {
    const on = t.dataset.tab === name;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    if (on && focus) t.focus();
    $(`pane-${t.dataset.tab}`).hidden = !on;
  });
  if (name === 'spots') markListCurrent();
  if (name === 'travel') setTravelMode(travel.mode);
  else syncTravelLayers();
}

function setSheet(open) {
  document.body.classList.toggle('sheet-open', open);
  $('sheetHandle').setAttribute('aria-expanded', String(open));
  syncInert();
}

function togglePanel() {
  const collapsed = document.body.classList.toggle('panel-collapsed');
  $('panelToggle').setAttribute('aria-expanded', String(!collapsed));
  $('panelToggle').title = collapsed ? '展開面板' : '收合面板';
  syncInert();
  setTimeout(() => relayout(), 60);
}

// 看不見的面板內容不能被 Tab 或輔助技術進入：桌面收合時整個面板 inert；
// 手機抽屜收合時只露出把手與分頁，其餘內容 inert。
function syncInert() {
  const body = document.body.classList;
  const hiddenContent = isMobile() ? !body.contains('sheet-open') : body.contains('panel-collapsed');
  panelEl.inert = !isMobile() && hiddenContent;
  for (const el of panelEl.querySelectorAll('.pane, .panel-foot')) el.inert = isMobile() && hiddenContent;
}

// 工具列與快捷鍵的鏡頭操作會中斷飛行，先暫停路線
function cameraAction(fn) {
  return () => { pauseTour(); pauseRide(); stopOrbit(); fn(); };
}

// role="radio" 群組支援方向鍵切換（roving tabindex）
function bindRadioGroup(selector) {
  const items = [...document.querySelectorAll(selector)];
  const sync = () => items.forEach((b) => (b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1));
  items.forEach((b, i) => {
    b.addEventListener('click', () => setTimeout(sync));
    b.addEventListener('keydown', (e) => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
      if (!d) return;
      e.preventDefault();
      const n = items[(i + d + items.length) % items.length];
      n.click();
      n.focus();
    });
  });
  sync();
}

function goHome() {
  stopTour(); stopOrbit(); stopRide();
  map.flyTo({ ...HOME(), padding: viewPadding(), speed: 1.1, curve: 1.4 });
}

// ---------------------------------------------------------------- 綁定 UI
function bindUI() {
  document.querySelectorAll('.tabs [role=tab]').forEach((t, i, all) => {
    t.addEventListener('click', () => { setTab(t.dataset.tab); if (isMobile()) setSheet(true); });
    t.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const n = all[(i + (e.key === 'ArrowRight' ? 1 : all.length - 1)) % all.length];
      setTab(n.dataset.tab, true);
    });
  });
  $('sheetHandle').addEventListener('click', () => setSheet(!document.body.classList.contains('sheet-open')));
  $('panelToggle').addEventListener('click', togglePanel);
  $('brandHome').addEventListener('click', goHome);

  document.querySelectorAll('#basemapSeg button').forEach((b) => b.addEventListener('click', () => { state.base = b.dataset.base; applyBase(); }));
  document.querySelectorAll('#overlayToggles input').forEach((inp) => {
    inp.addEventListener('change', () => applyOverlay(inp.dataset.overlay, inp.checked));
  });
  // setTerrain 會重建地形與 render-to-texture 資源，拖動時每個畫格最多套用一次
  let exagFrame = 0;
  $('exag').addEventListener('input', (e) => {
    state.exaggeration = +e.target.value;
    $('exagOut').textContent = `${state.exaggeration.toFixed(1)}×`;
    if (exagFrame) return;
    exagFrame = requestAnimationFrame(() => {
      exagFrame = 0;
      map.setTerrain({ source: state.base === 'ocean' ? 'dem-raw' : 'dem-flat', exaggeration: state.exaggeration });
    });
  });
  $('sun').addEventListener('input', (e) => { state.sunMinutes = +e.target.value; applySun(); });
  for (const el of [$('sun'), $('seasonSeg')]) for (const ev of ['pointerdown', 'focusin']) el.addEventListener(ev, warmNight, { once: true });
  document.querySelectorAll('#seasonSeg button').forEach((b) => b.addEventListener('click', () => {
    state.season = b.dataset.season;
    document.querySelectorAll('#seasonSeg button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    applySun();
  }));
  $('qCatalog').addEventListener('change', (e) => setCatalog(e.target.checked));
  $('qPlates').addEventListener('change', (e) => setPlates(e.target.checked));
  $('qPlay').addEventListener('click', () => (quake.playing ? stopQuakes() : playQuakes()));
  let qFrame = 0;
  $('qTime').addEventListener('input', (e) => {
    stopQuakes();
    const v = +e.target.value;
    quake.T = v >= +e.target.max - 0.005 ? Infinity : v;
    if (!qFrame) qFrame = requestAnimationFrame(() => { qFrame = 0; pushCatalog(); });
  });
  document.querySelectorAll('#qMagSeg button').forEach((b) => b.addEventListener('click', () => {
    quake.minMag = +b.dataset.mag;
    document.querySelectorAll('#qMagSeg button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    pushCatalog();
  }));
  document.querySelectorAll('#qSections button').forEach((b) => b.addEventListener('click', () => openSection(b.dataset.section)));
  $('qLatest').addEventListener('click', flyToLatestQuake);
  $('sea').addEventListener('input', (e) => { state.sea = +e.target.value; applySea(); });
  document.querySelectorAll('#seaPresets button').forEach((b) => b.addEventListener('click', () => {
    state.sea = +b.dataset.sea;
    $('sea').value = state.sea;
    applySea();
    if (state.sea !== 0 && map.getZoom() > 9) map.flyTo({ ...HOME(), padding: viewPadding() });
  }));

  $('cardClose').addEventListener('click', () => { stopTour(); closeCard(); });
  $('cardPrev').addEventListener('click', () => (travel.sel && !tour.def ? travelStep(-1) : stepSpot(-1)));
  $('cardNext').addEventListener('click', () => (travel.sel && !tour.def ? travelStep(1) : stepSpot(1)));
  $('cardOrbit').addEventListener('click', () => (orbit.on ? stopOrbit() : startOrbit()));
  $('cardProfile').addEventListener('click', () => (travel.sel ? travelProfile() : state.current && profileForSpot(state.current)));
  $('cardShare').addEventListener('click', share);

  $('tHome').addEventListener('click', goHome);
  $('tCompass').addEventListener('click', cameraAction(() => map.easeTo({ bearing: 0, duration: 700 })));
  $('tZoomIn').addEventListener('click', cameraAction(() => map.zoomIn()));
  $('tZoomOut').addEventListener('click', cameraAction(() => map.zoomOut()));
  $('tPitch').addEventListener('click', cameraAction(() => map.easeTo({ pitch: map.getPitch() > 8 ? 0 : 60, duration: 900 })));
  $('tOrbit').addEventListener('click', () => (orbit.on ? stopOrbit() : startOrbit()));
  $('tProfile').addEventListener('click', () => (profileEl.hidden ? startPicking() : closeProfile()));
  $('tShot').addEventListener('click', exportShot);
  $('tShare').addEventListener('click', share);
  $('tFull').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => toast('瀏覽器不允許全螢幕'));
  });
  $('profileClose').addEventListener('click', closeProfile);
  $('profileChart').addEventListener('keydown', profileKey);
  $('profileChart').addEventListener('blur', () => profile.hideCursor?.());
  // 滑鼠或觸控點剖面不搶走焦點，全站左右鍵（切換導覽點、每日行程）照舊；用 Tab 進來才是鍵盤 slider
  $('profileChart').addEventListener('mousedown', (e) => { if (document.activeElement !== e.currentTarget) e.preventDefault(); });

  $('pPlay').addEventListener('click', () => (ride.on ? (ride.playing ? pauseRide() : resumeRide()) : tour.playing ? pauseTour() : resumeTour()));
  $('pPrev').addEventListener('click', () => (ride.on ? rideStep(-1) : tourStep(-1)));
  $('pNext').addEventListener('click', () => (ride.on ? rideStep(1) : tourStep(1)));
  $('pStop').addEventListener('click', () => (ride.on ? stopRide() : stopTour()));
  $('pSpeed').addEventListener('click', () => setRideSpeed((ride.speedIdx + 1) % RIDE_SPEEDS.length));

  // 旅遊專項
  document.querySelectorAll('#travelSeg button').forEach((b) => b.addEventListener('click', () => setTravelMode(b.dataset.mode)));
  document.querySelectorAll('#bikeDirSeg button').forEach((b) => b.addEventListener('click', () => {
    if (travel.dir === b.dataset.dir) return;
    travel.dir = b.dataset.dir;
    document.querySelectorAll('#bikeDirSeg button').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
    if (ride.mode === 'bike') stopRide();
    if (travel.data.bike) { renderBike(); if (profile.path?.ride === 'bike') bikeOverviewProfile(); }
  }));
  let daysFrame = 0;
  $('bikeDays').addEventListener('input', (e) => {
    travel.days = +e.target.value;
    $('bikeDaysOut').textContent = `${travel.days} 天`;
    if (ride.mode === 'bike') stopRide(); // 分日要重算，騎乘立刻停，不等下一個畫格
    if (daysFrame || !travel.data.bike) return;
    daysFrame = requestAnimationFrame(() => { daysFrame = 0; renderBike(); if (profile.path?.ride === 'bike') bikeOverviewProfile(); });
  });
  $('bikeProfile').addEventListener('click', bikeOverviewProfile);
  $('bikeRide').addEventListener('click', () => { if (isMobile()) setSheet(false); startBikeRide(); });
  $('bikeGpx').addEventListener('click', () => (travel.plan ? downloadGpx(bikeRouteGpx()) : toast('環島資料載入中，請稍後再試')));
  $('cardGpx').addEventListener('click', () => downloadGpx(gpxForSel()));
  $('bikeStages').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { if (isMobile()) setSheet(false); selectStage(+b.dataset.k); } });
  $('bikeClimbs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { if (isMobile()) setSheet(false); selectClimb(+b.dataset.i); } });
  $('bikeGaps').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b || !travel.plan) return;
    if (isMobile()) setSheet(false);
    const P = travel.plan.m.path;
    const coords = P.slice(pathIndex(P, +b.dataset.a), pathIndex(P, +b.dataset.b) + 1).map((s) => s.p);
    clearSpot();
    map.getSource('bike-hl').setData(lineFeature(coords));
    fitCoords(coords, { maxZoom: 12.5 });
  });
  document.querySelectorAll('#bikePoiToggles input').forEach((inp) => inp.addEventListener('change', () => {
    if (inp.checked) travel.poi.add(inp.dataset.poi); else travel.poi.delete(inp.dataset.poi);
    if (travel.data.bike) applyBikePoi();
  }));
  let hikeTimer = 0;
  $('hikeFilter').addEventListener('input', (e) => {
    travel.hikeQ = e.target.value;
    clearTimeout(hikeTimer);
    hikeTimer = setTimeout(renderHike, 120);
  });
  $('hikeList').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (isMobile()) setSheet(false);
    selectTrail(travel.data.hike.trails.find((t) => t.id === b.dataset.id));
  });
  $('peakList').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (isMobile()) setSheet(false);
    selectPeak(peakByRank(+b.dataset.rank));
  });
  $('cardRide').addEventListener('click', () => {
    const s = travel.sel;
    if (s?.mode === 'bike') startBikeRide();
    else if (s?.kind === 'trail') {
      const t = travel.data.hike.trails.find((x) => x.id === s.id);
      const P = trailProfile(t);
      if (P) startRide({ mode: 'hike', path: P, title: `沿線飛覽 · ${t.name}`, kmps: 0.06, zoom: 15, look: 0.15 });
    }
  });
  $('aboutOpen').addEventListener('click', () => $('about').showModal());

  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
    if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && !typing)) { e.preventDefault(); openSearch(); return; }
    if (typing || searchDlg.open || $('about').open || e.ctrlKey || e.metaKey || e.altKey) return;
    const onMap = e.target.classList?.contains('maplibregl-canvas');
    if (e.key === 'Escape') {
      if (ride.on) stopRide();
      else if (profile.picking || !profileEl.hidden) closeProfile();
      else if (tour.def) stopTour();
      else if (!cardEl.hidden) closeCard();
      return;
    }
    if (e.key === ' ' && ride.on && tag !== 'BUTTON') { e.preventDefault(); ride.playing ? pauseRide() : resumeRide(); return; }
    if (e.key === ' ' && tour.def && tag !== 'BUTTON') { e.preventDefault(); tour.playing ? pauseTour() : resumeTour(); return; }
    if (!onMap && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && (tour.def || state.current || travel.sel) && tag !== 'BUTTON' && e.target.getAttribute?.('role') !== 'tab') {
      e.preventDefault();
      const delta = e.key === 'ArrowRight' ? 1 : -1;
      if (travel.sel && !tour.def) travelStep(delta); else stepSpot(delta);
      return;
    }
    const k = e.key.toLowerCase();
    if (k === 'h') goHome();
    else if (k === 'n') $('tCompass').click();
    else if (k === 'p') $('tPitch').click();
    else if (k === 'o') $('tOrbit').click();
    else if (k === 'f') $('tFull').click();
  });

  bindRadioGroup('#basemapSeg [role=radio]');
  bindRadioGroup('#seasonSeg [role=radio]');
  bindRadioGroup('#qMagSeg [role=radio]');
  bindRadioGroup('#travelSeg [role=radio]');
  bindRadioGroup('#bikeDirSeg [role=radio]');
  syncInert();
  mobileMQ.addEventListener('change', () => { syncInert(); relayout(0); });
  let resizeTimer = 0;
  addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => { drawProfile(); }, 150); });
}

// ---------------------------------------------------------------- 地圖互動
function bindMap() {
  let hoverId = null;
  const setHover = (id) => {
    if (hoverId === id) return;
    if (hoverId !== null) map.setFeatureState({ source: 'spots', id: hoverId }, { hover: false });
    hoverId = id;
    if (id !== null) map.setFeatureState({ source: 'spots', id }, { hover: true });
    map.getCanvas().style.cursor = id !== null ? 'pointer' : '';
  };
  for (const layer of ['spots-dot', 'spots-label-major', 'spots-label']) {
    map.on('mousemove', layer, (e) => { if (!profile.picking) setHover(e.features[0].id); });
    map.on('mouseleave', layer, () => setHover(null));
  }

  map.on('click', (e) => {
    if (profile.picking) { pickPoint(e.lngLat); return; }
    const pad = isMobile() ? 14 : 6;
    const hits = map.queryRenderedFeatures([[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]], { layers: ['spots-dot', 'spots-label-major', 'spots-label'] });
    if (hits.length) {
      stopTour();
      selectSpot(byId.get(hits[0].properties.id));
      return;
    }
    // 旅遊專項：百岳、步道、每日終點、沿線設施
    const box = [[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]];
    const tHit = map.queryRenderedFeatures(box, { layers: ['peak-dot', 'trail-head', 'trail-line', 'bike-stage', 'bike-poi'] })[0];
    if (tHit) {
      const pr = tHit.properties;
      if (tHit.layer.id === 'peak-dot') selectPeak(peakByRank(pr.rank));
      else if (tHit.layer.id.startsWith('trail')) selectTrail(travel.data.hike?.trails.find((t) => t.id === pr.id));
      else if (tHit.layer.id === 'bike-stage') {
        const s = travel.plan?.stages.find((x) => pr.label.startsWith(`D${x.k} `));
        if (s) selectStage(s.k);
      } else {
        const KIND = { station: '臺鐵車站', store: '便利商店', bike: '單車店／打氣站', police: '派出所' };
        const m = bikeModel();
        const near = m.pois[pr.kind === 'bike' ? 'bike' : pr.kind]?.find((p) => p.name === pr.name && Math.abs(p.lon - tHit.geometry.coordinates[0]) < 1e-4);
        const html = document.createElement('div');
        html.innerHTML = '<b></b><br><span></span>';
        html.firstChild.textContent = pr.kind === 'station' ? `${pr.name}站` : pr.name || KIND[pr.kind];
        html.lastChild.textContent = `${KIND[pr.kind]}${near ? ` · 路線 ${near.d.toFixed(1)} km 處` : ''}`;
        new maplibregl.Popup({ closeButton: false, offset: 8, maxWidth: '240px' }).setLngLat(tHit.geometry.coordinates).setDOMContent(html).addTo(map);
      }
      return;
    }
    // 震源圓點：重疊時取規模最大的那筆
    const qHits = quake.on ? map.queryRenderedFeatures([[e.point.x - pad, e.point.y - pad], [e.point.x + pad, e.point.y + pad]], { layers: ['catalog-dot'] }) : [];
    if (qHits.length) {
      const f = qHits.reduce((a, b) => (b.properties.m > a.properties.m ? b : a));
      showQuakePopup(quake.list[f.properties.i]);
      return;
    }
    if (isMobile()) {
      setSheet(false);
      elevationAt(e.lngLat.lng, e.lngLat.lat, clamp(Math.floor(map.getZoom()) + 1, 6, 12)).then((v) => {
        new maplibregl.Popup({ closeButton: false, offset: 8, maxWidth: '240px' })
          .setLngLat(e.lngLat)
          .setHTML(`${e.lngLat.lat.toFixed(4)}°N ${e.lngLat.lng.toFixed(4)}°E<br>${v < 0 ? '水深' : '海拔'} <b>${fmtInt(Math.abs(v))}</b> m`)
          .addTo(map);
      }).catch(() => {});
    }
  });

  for (const layer of ['catalog-dot', 'peak-dot', 'trail-head', 'trail-line', 'bike-stage', 'bike-poi']) {
    map.on('mouseenter', layer, () => { if (!profile.picking) map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layer, () => { if (hoverId === null) map.getCanvas().style.cursor = ''; });
  }
  map.on('mousemove', (e) => updateHudPos(e.lngLat));
  map.on('move', updateHudCam);

  // 使用者動手操作就暫停路線、停止環繞
  const userMove = (e) => {
    if (!e.originalEvent) return;
    if (tour.playing) pauseTour('已暫停路線，按空白鍵或播放鍵繼續');
    if (ride.playing) { pauseRide(); toast('已暫停，按播放鍵回到路線上繼續'); }
    stopOrbit();
  };
  map.on('dragstart', userMove);
  map.on('rotatestart', userMove);
  map.on('pitchstart', userMove);
  map.on('zoomstart', userMove); // 雙擊、雙指縮放、地圖焦點下的 +/- 鍵
  map.on('wheel', (e) => { if (tour.playing) pauseTour('已暫停路線，按空白鍵或播放鍵繼續'); pauseRide(); stopOrbit(); });
}

// ---------------------------------------------------------------- 網址狀態
function applyHash() {
  const h = new URLSearchParams(location.hash.slice(1));
  if (h.has('spot') && byId.has(h.get('spot'))) { selectSpot(byId.get(h.get('spot'))); return true; }
  if (h.has('section') && SECTIONS[h.get('section')]) {
    if (profile.section !== h.get('section')) openSection(h.get('section'));
    return true;
  }
  if (h.has('bike')) {
    openTravelThen('bike', () => { if (!travel.sel) map.flyTo({ ...HOME(), padding: viewPadding(), speed: 1.2 }); });
    return true;
  }
  if (h.has('trail')) {
    const id = h.get('trail');
    openTravelThen('hike', () => selectTrail(travel.data.hike?.trails.find((t) => t.id === id)));
    return true;
  }
  if (h.has('peak')) {
    const rank = +h.get('peak');
    openTravelThen('peaks', () => selectPeak(peakByRank(rank)));
    return true;
  }
  if (h.has('tour')) {
    const t = TOURS.find((x) => x.id === h.get('tour'));
    if (t) { startTour(t, 0); return true; }
  }
  if (h.has('cam')) {
    const [lng, lat, zoom, bearing, pitch] = h.get('cam').split(',').map(Number);
    if ([lng, lat, zoom].every(Number.isFinite)) {
      map.flyTo({ center: [lng, lat], zoom, bearing: bearing || 0, pitch: pitch || 0, padding: viewPadding(), speed: 1.2 });
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------- 啟動
// 瀏覽器重新整理會還原表單值；以畫面上的滑桿為準，避免顯示與地圖狀態不一致。
state.exaggeration = +$('exag').value;
state.sunMinutes = +$('sun').value;
state.sea = +$('sea').value;
$('exagOut').textContent = `${state.exaggeration.toFixed(1)}×`;
renderChips();
renderSpotList();
renderTours();
bindUI();

map.on('load', () => {
  bindMap();
  applyBase();
  applySea();
  for (const inp of document.querySelectorAll('#overlayToggles input')) applyOverlay(inp.dataset.overlay, inp.checked);
  updateHudCam();

  const veil = $('veil');
  const reveal = () => veil.classList.add('out');
  map.once('idle', reveal);
  setTimeout(reveal, 3500);

  const go = () => {
    if (applyHash()) return;
    if (reduceMQ.matches) map.jumpTo({ ...HOME(), padding: viewPadding() });
    else map.flyTo({ ...HOME(), padding: viewPadding(), duration: 7000, curve: 1.6, essential: false });
  };
  setTimeout(go, reduceMQ.matches ? 0 : 900);
});

addEventListener('hashchange', () => applyHash());

// 方便除錯：在 console 存取 map
window.__tw3d = { map, state, tour, quake, profile, travel, ride, SPOTS, TOURS, elevationAt, sunPosition, nextSunrise, demFixes };
