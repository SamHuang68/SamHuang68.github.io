# 技術作品集

版本 **3.2.0**。正式目的地：<https://samhuang68.github.io/>。

以 Executive Editorial 呈現技術命題、NVM 主案例、E-Learning 與光汐精選成果，以及工程／創作延伸索引。姓名與公開 GitHub 個人入口只在 Contact；七個公開作品、三個私人入口保留原網址，私人存取權限仍由目的服務管理。

純靜態 HTML、CSS、JavaScript，不含資料庫或建置步驟。沿用本機字型、公開作品 JPEG 與原創概念 SVG；首頁不呼叫外部資料 API，也不即時嵌入子站。圖片來源與限制見 [作品畫面來源](assets/作品畫面來源.md)。

## 英文預設與手動選擇

基礎 HTML、title、description、lang、導覽、案例、圖說與 Contact 皆為英文，停用 JavaScript 亦可閱讀英文內容、開啟作品與操作原生私人區收合。瀏覽器語言不決定初始語系。

JavaScript 啟用時的優先序為：有效 `?lang=en|zh` → `portal_language_choice_v1` 中有效的 `{language, source:"explicit"}` → EN。初始化與 query 不寫入偏好；只有語言按鈕或快速導覽語言指令會保存明確選擇。手動切換會移除舊 `lang` query，使重新載入遵循選擇。儲存遭封鎖時仍可當次切換，重新進入回到英文。

3.1.0 的 `sh_portal_lang` 在初始化時也會自動寫入，無法證明是否為手動選擇，因此不作為新版偏好的依據；原值不刪除。沒有登入、跨裝置同步或修改子站語系。

## 首頁操作

`Ctrl+K`／`⌘K` 或頁首搜尋圖示開啟快速導覽。可搜尋十個作品的中英名稱、描述與既有搜尋別名；私人結果仍有權限提示及完整 TW Pulse 模擬資料警語。方向鍵選擇、Enter 執行、Escape 關閉並復原焦點。

原有語言、操作音效與 NVM 單色圖層指令保留；音效預設靜音。作品畫面可放大查看。既有 `#hero`、`#projects`、`#knowledge`、`#engineering`、`#creative`、`#about` 與 `#philosophy` 錨點保留。

## 本機預覽與限定驗證

在工作樹執行 `node scripts/serve-local.mjs`，開啟 <http://127.0.0.1:4176/>；可用 `PORT` 指定不同連接埠。這是該機器的 loopback 預覽，沒有公開 tunnel。

依既有 `verification_gate.py` 先明列變更、輸入與案例，再執行：

- `node scripts/check-home.mjs`：結構、十個原 URL、雙語鍵、資產、語法與版本。
- `node scripts/qa-home.mjs`：首頁桌面／手機兩語、英文初始化邊界、私人區、快速導覽、圖片模態、焦點、窄螢幕與文字放大。只使用本機伺服器，攔截所有外部請求。

`qa:accessibility` 仍是同一份 Chromium 案例的相容入口，不需重複執行。`--remaining` 為本次已取得前段證據後的續驗選項，不代表完整通過；必須與對應的前段結果一併引用。

可用 `PLAYWRIGHT_MODULE` 指定既有模組、`PORTAL_EVIDENCE_DIR` 指定本機證據目錄；不自動安裝套件或下載瀏覽器。本輪使用 NucBox Chromium 145／Playwright 1.58。手機畫面是 viewport 模擬，沒有 Firefox／WebKit、真機或讀屏聽讀驗收。

## 版本與發布

修訂內容見 [修訂紀錄](修訂紀錄.md)。本機候選、精確提交、PR、CI、部署與 live 結果分開記錄於 `C:/Users/Sam/AI-Workspace/docs/portal/homepage-editorial-release/發布紀錄.md`；GitHub 部署狀態須以該版本實際 run 與 deployment 為準，不以來源檔版本號代替發布證明。

既有 `.github/workflows/deploy-pages.yml` 僅在 main push／手動觸發時將靜態來源發布至 GitHub Pages，沒有執行全站測試。此輪不變更部署流程、子站或私人權限。
