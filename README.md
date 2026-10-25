# Sam Huang 個人首頁

版本 **3.1.0（本機審查候選）**。公開首頁：<https://samhuang68.github.io/>。

首頁以「半導體知識 × 工程實作 × 互動創作」為主題，依序提供半導體與安全儲存、工程工具與學習、互動創作與遊戲三個內容區。七個公開網站保留原網址；三個私人入口位於頁尾「私人工作區」，存取權限由各目的服務管理。

純靜態 HTML、CSS 與 JavaScript，不含資料庫或建置步驟。字型與作品預覽 JPEG 均在本機資產中，首頁不依賴第三方字型請求。中英雙語共用 `app.js` 詞典，快速導覽直接從卡片與同一詞典取得名稱和說明，支援跨語言搜尋。

3.1.0 以精簡作者介紹、大型 NVM 專題、工程索引及創作展示重建閱讀節奏；作品畫面來自指定公開首頁，來源與原站語系限制見 [作品畫面來源](assets/作品畫面來源.md)。不是即時嵌入，未登入私人專案。

## 本機預覽

使用已安裝的 Node.js，在此工作樹執行 `node scripts/serve-local.mjs`，再開啟 <http://127.0.0.1:4176/>。可用 `PORT` 環境變數選擇不衝突的連接埠。

`Ctrl+K`／`⌘K` 或頁首搜尋圖示開啟快速導覽；方向鍵選擇，Enter 執行，Escape 關閉並返回原焦點。可切換語言、操作音效與NVM 作品畫面的單色圖層檢視；音效預設關閉。語系沿用 `sh_portal_lang`，儲存不可用仍能切換。停用 JavaScript 時保留繁中內容、所有連結與原生私人區收合。

本次審查使用 NucBox 本機 `http://127.0.0.1:4198/`；只有該機器可存取，不是公開站或跨環境附件。

## 首頁限定驗證

先依全域 `verification_gate.py` 規範明列實際命令、輸入與影響，不直接擴大執行 `npm run qa`。實際案例入口：

- `node scripts/check-home.mjs`：HTML 結構、腳本語法、十個目的網址、雙語鍵、資產與版本一致性。
- `node scripts/qa-home.mjs`：只在 localhost 載入首頁，涵蓋五個視窗尺寸的 ZH／EN、私人區、導覽、鍵盤、快速導覽、語系記憶、reduced motion、200% 文字縮放及無腳本／儲存不可用情境。不導覽子站。

既有 `qa:accessibility` 命令保留為同一份 Chromium 首頁案例的相容入口；不是舊版三引擎批次套件，不應與 `qa:render` 重複執行。

渲染案例預設使用專案 Playwright，`PLAYWRIGHT_MODULE` 可指定既有 Playwright 模組的 `file:///` URL；不自動下載瀏覽器或安裝套件。`PORTAL_EVIDENCE_DIR` 可指定證據目錄，預設 `qa/home-renders`。本次使用 NucBox 既有 Playwright core 1.58.0／Chromium 145.0.7632.6；未安裝 package-lock 所列依賴，未測其他引擎或真機讀屏。

3.0.0 按已批准方案移除訪客可見的 Node 編號、統計儀表與全頁動態裝飾，因此舊版霓虹背景與單一畫面容納所有卡片的斷言不適用。舊版 revision history 完整保留。首頁不修改 ST、D2R 或其他目的站。

## 候選與發布

3.1.0 為本機候選，未推送、未開 PR、未合併、未部署。已發布基準為 3.0.0／bf4a1f4002c0ffbc104e798b39c8fe46dcbaa74c；本次新視覺仍待使用者審查。推送 `main` 會觸發 `.github/workflows/deploy-pages.yml`；本次不觸發。變更與限制見 [修訂紀錄](修訂紀錄.md)，完整 SHA 與本機證據見交付紀錄。
