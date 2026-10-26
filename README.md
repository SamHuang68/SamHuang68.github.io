# 原作分類微調首頁

版本 **3.4.0**。正式目的地：https://samhuang68.github.io/ 。本輪已獲准發布 original-refined；實際推送、合併與部署狀態以同版本發布紀錄為準。

本候選直接從首次重整PR #10之前的原作 `c389121b424582c8a75f155cab95ef2d33003e55` 建立；其index.html blob為 `de539f3595f21dd3a1649c8dbe2b534396ac1bfc`，與最初核實來源一致。不是從Editorial、Studio或雙頁方案繼續改造。

保留原作晶圓背景、色彩token、緊湊首屏、頂部導覽、半透明圓角卡片、字型及互動。整份原styles.css保留，只追加同頁分組與少量對齊規則；背景JPEG、effects.js及audio-engine.js沒有修改。

## 分類與內容

- Professional：NVM、半導體製程、E-Learning、Hardware；桌面局部2×2。
- Leisure：光汐工作站、Arcade、D2R；沿用原三欄。
- 私人工作區：OIP、TW Pulse、武將典藏折疊保留，仍有權限提示；TW Pulse明示模擬資料、非目前Stock Terminal、沒有真實行情服務。

七個公開入口與三個私人目的URL完全保留。同頁原生導覽取代Node序號主導覽；內部data-node及舊Node搜尋別名保留。用途文字、較短描述與最多三個標籤改善閱讀，未替目的網站背書或重新驗證其功能。數字統計只表示本頁分類數量，不再顯示未核實的Engines等統計。

姓名及公開GitHub個人入口只在Contact，沿用原philosophy收合區的形狀。沒有增加品牌宣言、案例敘事、大型圖解或作品截圖。

## 語系與原互動

完整英文基礎HTML，包含title、description、lang、可及名稱及私人文字；無JavaScript也能使用原生導覽、Contact與私人收合。語言與搜尋控制在無JS時隱藏。

JS初始優先順序：有效`?lang=en|zh` → `portal_language_choice_v1`內有效的`{language,source:"explicit"}` → EN。不依瀏覽器中文、不採用舊版自動寫入的`sh_portal_lang`，初始化不保存偏好。只有手動選擇才保存，並更新當頁query；storage受阻仍能切換，沒有query的新進入仍為英文。

原搜尋dialog、Ctrl+K／⌘K、鍵盤選取、Escape與焦點返回保留；音效預設靜音，X-Ray圖層、canvas、卡片光澤、捲動行為沿用原作。所有Contact連結都能在同hash下重新展開收合內容。

## 本機預覽與驗證

一般預覽：工作樹執行`node scripts/serve-local.mjs`，預設<http://127.0.0.1:4176/>，可用PORT設定連接埠。本輪專用比較器在<http://127.0.0.1:4181/>，直接候選<http://127.0.0.1:4181/candidate/>、原作<http://127.0.0.1:4181/original/>。僅NucBox loopback，沒有公開預覽或tunnel。

驗證前使用既有verification_gate.py列出變更、案例與依賴：

- `node scripts/check-original-refined.mjs`：語法、雙語、版本、分類及10個原URL，預設不讀取歷史Git物件。
- 加`--baseline-proof`才比較指定原作的CSS／背景／互動引擎，需完整原作Git物件；本輪已實際執行通過。
- `node scripts/qa-original-refined.mjs`：預設使用套件playwright、4176本機預覽與相對qa-artifacts目錄。可用`--playwright`／PLAYWRIGHT_MODULE、`--base`／PORTAL_BASE_URL、`--out`／PORTAL_EVIDENCE_DIR配置。`--only=<名稱片段>`只執行指定案例。
- 本輪外部比較器測試只在明示`--comparison=http://127.0.0.1:4181/`時執行，不是一般checkout的必要服務。

main 的歷史QA腳本保留原位，標準npm入口指向新契約的限定檢查，不執行舊版中文預設／未分類的期望。本輪12個不同案例通過；Contact重複開啟補驗取代原同名案例，其餘成功證據沿用，沒有全站掃描或子站測試。

實際環境為NucBox Chromium145／Playwright1.58；原作與候選同樣載入原Google字型、同樣1440×1000／390×844及reduced motion，另測320px、200%文字。手機為viewport，非真機。未驗其他瀏覽器、讀屏聽讀、音效聽感或子站功能。

精確SHA、前後截圖、收據及限制見`C:/Users/Sam/AI-Workspace/docs/portal/homepage-original-refined/handoff.md`。既有歷史見[修訂紀錄](修訂紀錄.md)。發布分支從最新 main `75f82845e7fbe115d360739a751515b2c42766f4` 建立，僅整合核准候選 `8b97d2204ea6c74de73a8bd920b6fb7d3f8803d0` 的首頁檔案，保留 main 其餘檔案與完整修訂歷史。保留已發布的 #knowledge／#engineering／#creative／#about 書籤，對應現有區塊，沒有新增版面。精確來源、CI、部署與正式驗證見 `C:/Users/Sam/AI-Workspace/docs/portal/homepage-original-release/release.md`。
