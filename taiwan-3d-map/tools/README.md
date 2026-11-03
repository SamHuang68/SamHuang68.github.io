# 台灣 3D 地景：資料烘製工具

子站延遲載入的四份資料都由這裡的腳本產生：

| 檔案 | 內容 | 來源與授權 |
| --- | --- | --- |
| `quakes.json` | 1973 年起規模 4 以上地震、PB2002 板塊邊界 | USGS ComCat（公有領域）；PB2002（ODC-BY 1.0） |
| `cycling.json` | 環島 1 號線每 100 m 取樣、高程、補給點 | OpenStreetMap 關係 5752808 與 Overpass（ODbL 1.0）；Terrarium 高程 |
| `trails.json` | 林業保育署 117 條自然步道與軌跡 | data.moa.gov.tw 步道基本資料、data.gov.tw「自然步道軌跡圖」KMZ（政府資料開放授權條款第 1 版） |
| `peaks.json` | 百岳名單、測高、座標 | 中文維基百科「台灣百岳」（CC BY-SA 4.0）、Wikidata（CC0）、OSM（ODbL） |

## 重建步驟

在 repo 根目錄執行。需要 Node.js 20 以上；`elevate.mjs` 另需 Playwright 與 Chromium（`npm install` 後 `npx playwright install chromium`，或以 `--playwright=<playwright 套件目錄>` 指定既有安裝）。

```bash
node taiwan-3d-map/tools/fetch.mjs
node taiwan-3d-map/tools/bake-quakes.mjs --out=.cache/out
node taiwan-3d-map/tools/prepare-travel.mjs
node taiwan-3d-map/tools/elevate.mjs
node taiwan-3d-map/tools/bake-travel.mjs --out=.cache/out
```

- `fetch.mjs` 可只更新部分來源，例如 `node taiwan-3d-map/tools/fetch.mjs quakes`。每個來源的擷取日期與版本（OSM 關係版本、維基 revid）記在快取的 `meta.json`，烘製時寫進輸出檔的 `retrieved` 欄位。
- 快取預設在 `.cache/taiwan-3d-map/`（不納入版本控制），可用 `--cache=<目錄>` 改位置。
- 不加 `--out` 時直接覆寫 `taiwan-3d-map/` 的上線資料。建議先輸出到暫存目錄，比對筆數與統計後再覆寫，並同步更新子站「關於」的資料說明與 `修訂紀錄.md`。
- `bake-travel.mjs` 寫檔前會和輸出目錄現有的檔案比對。以下情況一律停下、不寫任何檔案：軌跡下載失敗、步道或有軌跡的步道變少、補給點少一成以上、百岳缺座標、高程缺值超過 1%。確認是預期的變化（例如官方下架步道）後，再加 `--allow-missing` 重跑。

## 已知的資料處理

- **Overpass 常滿載**：`fetch.mjs` 依序換三個端點（overpass-api.de、maps.mail.ru 鏡像、private.coffee），查詢回應帶 `remark` 也視為失敗。各來源互不影響：某個來源失敗時，它的快取檔與 `meta.json` 紀錄維持舊的，其餘照常下載，最後以結束碼 1 列出未完成的來源。
- **隧道與橋樑**：地形面量到的是山頂與谷底，環島路線改以兩端路面內插；隧道錨點取洞口外 1 km 內最低點。不處理會多算約 1,500 m 爬升。
- **Terrarium 資料空洞**：z14–z15 偶有單點掉到 −1,998 m，環島取 z13；步道取 z14 後以前後 3 點中位數去尖刺（門檻 60 m）。
- **步道主線**：軌跡分段端點相距 80 m 內視為同一節點，取最長簡單路徑為主線，自海拔最低的入口出發。
- **百岳座標**：Wikidata 與 OSM 兩個候選點各在 ±120 m 內找地形最高點；都在公告測高 ±40 m 內時採 OSM 山頂節點，否則選最接近公告測高者。
- **軌跡下載失敗**：個別資料集偶爾連線失敗（例如 2.2.0 擷取時的 023）。`meta.json` 的 `trails.failed` 會列出代碼，`bake-travel.mjs` 也會因此停下；重跑 `fetch.mjs trails` 即可。
- **步道入口沒有高度**：主線方向取「最低的入口」，入口高度空白時比較結果不可靠（例如 067、152），沿用 2.2.0 的作法，尚未修正。
