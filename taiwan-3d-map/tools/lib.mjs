// 資料烘製工具的共用函式：參數、快取路徑、距離、解壓縮與百岳表格解析
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const UA = { 'User-Agent': 'taiwan-3d-map data bake (samhuang68.github.io)' };

// --cache=<目錄>：原始資料與中間檔；--out=<目錄>：子站資料輸出位置
export const args = Object.fromEntries(process.argv.slice(2).filter((s) => s.startsWith('--')).map((s) => s.slice(2).split(/=(.*)/s).slice(0, 2)));
export const positional = process.argv.slice(2).filter((s) => !s.startsWith('--'));
export const CACHE = path.resolve(args.cache || path.join(ROOT, '.cache/taiwan-3d-map'));
export const OUT = path.resolve(args.out || path.join(ROOT, 'taiwan-3d-map'));
export const cached = (...p) => path.join(CACHE, ...p);
export const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^﻿/, ''));
export const meta = () => (fs.existsSync(cached('meta.json')) ? readJson(cached('meta.json')) : {});
export const retrieved = (key) => {
  const d = meta()[key]?.retrieved;
  if (!d) throw new Error(`meta.json 沒有 ${key} 的擷取日期；請先執行 fetch.mjs ${key}`);
  return d;
};

const R = Math.PI / 180;
export const km = ([lo1, la1], [lo2, la2]) => { const a = Math.sin(((la2 - la1) * R) / 2) ** 2 + Math.cos(la1 * R) * Math.cos(la2 * R) * Math.sin(((lo2 - lo1) * R) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(a)); };

// 沿折線每 step 公里取一點（保留起點；終點與最後一點相距 2 m 以上才補上）
export function resample(line, step) {
  const out = [line[0]];
  let carry = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], seg = km(a, b);
    let t = step - carry;
    while (t <= seg) { const f = t / seg; out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]); t += step; }
    carry = seg - (t - step);
  }
  if (km(out.at(-1), line.at(-1)) > 0.002) out.push(line.at(-1));
  return out;
}

// KMZ（ZIP）解壓：讀中央目錄，回傳 [{ name, data }]；只支援無壓縮與 deflate
export function unzip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('不是 ZIP 檔');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = [];
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('ZIP 中央目錄損壞');
    const method = buf.readUInt16LE(p + 10), size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + nameLen).toString('utf8');
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    if (method === 0 || method === 8) files.push({ name, data: method === 0 ? raw : zlib.inflateRawSync(raw) });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

// 中文維基「台灣百岳」條目的表格：排名、名稱、測高、行政區、山脈、路線、國家公園、分級、別名
export function parsePeakTable(text) {
  const tb = text.slice(text.indexOf('{|'), text.indexOf('|}', text.indexOf('{|')));
  const rows = tb.split(/\n\|-[^\n]*\n/).slice(2);
  // 去掉註腳與模板，把 [[a|b]] 變 b
  const strip = (s) => s
    .replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '')
    .replace(/\{\{r\|[^}]*\}\}/g, '').replace(/\{\{efn\|[\s\S]*?\}\}/g, '')
    .replace(/\{\{small\|([^}]*)\}\}/g, '$1').replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[File:[^\]]*\]\]/g, '')
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, '$2').replace(/\[\[([^\]]*)\]\]/g, '$1')
    .replace(/<br\s*\/?\s*>/gi, '、').replace(/align\s*=\s*"[^"]*"\s*\|/g, '').replace(/'''?/g, '').trim();
  const link = (s) => (s.match(/\[\[([^\]|]+)/) || [])[1];
  const peaks = [];
  for (const r of rows) {
    const cells = r.replace(/\n\|/g, '||').replace(/^\|/, '').split('||');
    if (cells.length < 10) continue;
    const grade = strip(cells[8]);
    peaks.push({
      rank: +strip(cells[0]), name: strip(cells[1]), title: link(cells[1]), h: parseFloat(strip(cells[2])), hOld: parseFloat(strip(cells[3])),
      admin: strip(cells[4]).replace(/（最高）/g, '').split('、').filter(Boolean),
      range: strip(cells[5]).split('、').filter(Boolean),
      routes: strip(cells[6]).split('、').filter(Boolean),
      park: strip(cells[7]),
      grade: grade === '' ? null : +grade,
      alias: strip(cells[9] || '').split('、').filter(Boolean),
    });
  }
  if (peaks.length !== 100 || !peaks.every((p, i) => p.rank === i + 1)) throw new Error(`百岳表格解析結果不是 1–100（${peaks.length} 筆）`);
  return peaks;
}

export const writeJson = (f, data) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(data)); return fs.statSync(f).size; };
