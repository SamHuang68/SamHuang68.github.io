// 台灣 3D 地景 · 旅遊專項：自行車環島、健行步道、百岳、GPX 匯出與虛擬騎乘／沿線飛覽
// app.js 第一次用到時才以 import() 載入（開啟旅遊分頁、#bike／#trail=／#peak= 網址、全站搜尋），首屏不必下載這段程式。
// 共用的地圖、狀態物件與工具函式由 init() 一次傳入，名稱與 app.js 相同，區段內的程式原樣沿用。
// travel、ride 兩個狀態物件留在 app.js：模組載入前，導覽、鍵盤與播放器也要能判斷有沒有選取、是否正在騎乘。
let maplibregl, map, $, travel, ride, profile, beacon, cardEl, esc, pathIndex, clamp, fmtInt, isMobile, withTimeout,
  mapReady, viewPadding, relayout, distanceKm, bearingTo, compassWord, nextSunrise, clearSpot, closeCard, setPlayIcon, stopTour, stopOrbit,
  stopQuakes, closeProfile, profileForSpot, showPathProfile, setSheet, toast, GRADE_STOPS, DIF_COLORS, EMPTY;

export function init(api) {
  ({ maplibregl, map, $, travel, ride, profile, beacon, cardEl, esc, pathIndex, clamp, fmtInt, isMobile, withTimeout,
    mapReady, viewPadding, relayout, distanceKm, bearingTo, compassWord, nextSunrise, clearSpot, closeCard, setPlayIcon, stopTour, stopOrbit,
    stopQuakes, closeProfile, profileForSpot, showPathProfile, setSheet, toast, GRADE_STOPS, DIF_COLORS, EMPTY } = api);
  bindTravelUI();
}

// 三份資料都在開啟該專項時才載入。環島取樣自台北起算、順時針排列，逆時針時整條反轉。
const TRAVEL_URL = { bike: './cycling.json?v=2.2.0', hike: './trails.json?v=2.3.0', peaks: './peaks.json?v=2.2.0' };
const TRAVEL_LAYERS = {
  bike: ['bike-route-casing', 'bike-route', 'bike-hl', 'bike-poi', 'bike-poi-label', 'bike-stage', 'bike-stage-label'],
  hike: ['trail-line', 'trail-hl', 'trail-head', 'trail-label'],
  peaks: ['peak-dot', 'peak-label'],
};
const PEAK_DONE_KEY = 'tw3d-peaks-done-v1';

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

// 模式、分段鈕與子面板由 app.js 的 setTravelMode 先切換（不等模組），這裡接著載資料
async function setTravelMode(mode) {
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

// 百岳卡片的日出一行。卡片開著跨過日出（今天的改成明天的）或台灣時間午夜（「明天」改成「今天」）時要改字：
// 每分鐘重算一次、有變才更新。不排定到日出那一刻的計時器，電腦休眠或改系統時間後也跟得上
let sunTimer = 0;
function peakSunText(p) {
  const sr = nextSunrise(p.lat, p.lon, p.h);
  const t = new Date(Math.round(sr.date.getTime() / 60000) * 60000 + 8 * 3600e3);
  return `${sr.tomorrow ? '明天' : '今天'}（${t.getUTCMonth() + 1}/${t.getUTCDate()}）日出 `
    + `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')} · 方位 ${Math.round(sr.azimuth)}°（${compassWord(sr.azimuth)}）`;
}

function renderPeakSun(p) {
  $('cardSun').textContent = peakSunText(p);
  $('cardSun').hidden = false;
  clearInterval(sunTimer);
  sunTimer = setInterval(() => {
    if (travel.sel?.kind !== 'peak' || travel.sel.rank !== p.rank || cardEl.hidden) { clearInterval(sunTimer); return; }
    const s = peakSunText(p);
    if ($('cardSun').textContent !== s) $('cardSun').textContent = s;
  }, 60000);
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
  renderPeakSun(p);
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

// ---------- 旅遊分頁的控制項（模組載入時綁定一次）
function bindTravelUI() {
  // 模組載入前使用者可能已動過控制項（分頁已顯示、程式還在下載），先以畫面上的值為準
  travel.days = +$('bikeDays').value;
  travel.dir = document.querySelector('#bikeDirSeg [aria-checked="true"]')?.dataset.dir || travel.dir;
  travel.poi = new Set([...document.querySelectorAll('#bikePoiToggles input')].filter((x) => x.checked).map((x) => x.dataset.poi));
  travel.hikeQ = $('hikeFilter').value;
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
}

// 地圖點擊：百岳、步道、每日終點、沿線設施。點到旅遊圖層回傳 true
function mapClick(box) {
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
    return true;
  }
  return false;
}

export { loadTravel, setTravelMode, syncTravelLayers, clearTravelSel, travelStep, travelProfile, travelHash, selectPeak, selectTrail, peakByRank,
  stopRide, pauseRide, resumeRide, rideStep, setRideSpeed, RIDE_SPEEDS, mapClick };
