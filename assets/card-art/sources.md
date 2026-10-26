# 卡片圖片來源與界線

版本：3.4.2-preview.1，2026-10-26。本機候選；未推送或發布。所有新檔名使用英文。圖像只作入口的題材預覽，不代表本輪驗證目的網站功能。

| 卡片 | 實際素材／來源 | 取景與使用界線 |
|---|---|---|
| NVM Knowledge Hub | 既有 `assets/nvm-state-atlas.webp`；公開 NVM Hub 技術主視覺，https://hub.samhuang68.org/ | 記憶單元示意而非晶片實拍；CSS 放大右側器件。 |
| Semiconductor Knowledge Hub | `process-wafer.jpg`；Rob Bulmahn，Silicon Wafer 20200519 | 真實矽晶圓微距照片，CC BY 2.0；短幅顯示裁切，未改像素。照片、作者、來源、授權及裁切說明位於 Contact 的圖片來源收合區。未沿用來源未明的舊製程照片。 |
| E-Learning | 既有 `assets/learn-en.jpg`／`learn-zh.jpg`；https://learn.samhuang68.org/ | 2026-10-25 NucBox 擷取的公開首頁，依手動語言切換圖片；CSS 聚焦首頁概述。 |
| Hardware Profile | `hardware-rig.jpg`；既有公開專案 `C:/Users/Sam/AI-Workspace/projects/hardware/images/gmk_evo_t1.jpg`，data.json 實際引用；https://hardware.samhuang68.org/ | 原樣複用既有專案示意圖，非本輪實機攝影或硬體能力驗證。原站未附獨立素材授權文件，本輪不宣稱另獲商業再授權。 |
| Guangxi Studio | 既有 `assets/studio-en.jpg`；https://guangxi-studio.samhuang68.workers.dev/ | 2026-10-25 公開工作站實際畫面，CSS 聚焦合成器與琴鍵；原圖含雙語，圖說與 alt 明示，不假造英文介面。 |
| Interactive Game Arcade | `arcade-chess.webp`；公開專案 `C:/Users/Sam/AI-Workspace/projects/arcade/public/hall-thumb-chess.webp`；https://arcade.samhuang68.org/ | 既有原創西洋棋題材視覺，未啟動遊戲或讀取資料庫。 |
| D2R Sanctuary Codex | `d2r-key-art.jpg`、`d2r-logo.jpg`；Blizzard 官方 Diablo II: Resurrected Press Kit | 正式紅兜帽骷髏封面與火焰標誌，兩張均完整 contain，沒有裁切、濾鏡、改畫或去除通知。來源是官方自行提供的250px縮圖。 |
| Secure Storage OIP | 既有 `assets/secure-storage-key.webp` 公開安全儲存示意 | 圖說明示公開示意／需權限；未讀取私人repo或簡報。 |
| TW Pulse Terminal | `prototype-study.svg`，本輪原創中性介面圖 | 虛構折線，無行情數值；明示模擬資料；與目前 Stock Terminal 無關。 |
| Portrait Archive | `archive-study.svg`，本輪原創中性畫框剪影 | 不含真人肖像或私人典藏內容，圖說明示。 |

全部圖片由主控親眼檢視後選用。沒有 Sam 姓名、個人縮寫品牌或私人聯絡資訊。學習／音樂既有截圖的原始來源紀錄見 `../作品畫面來源.md`。沒有新的全站擷取、私人內容存取、付費圖片或產圖服務。

## 晶圓照片

- 作者與來源：https://commons.wikimedia.org/wiki/File:5C2A5953R_-_49913961083_%E2%80%93_Silicon_Wafer_20200519.jpg
- 原作者公開來源：https://www.flickr.com/photos/rbulmahn/49913961083/
- 授權：https://creativecommons.org/licenses/by/2.0/ （可分享與改作，須署名、附授權及修改說明，不暗示背書）。
- 下載官方提供的960px縮圖，375,755 bytes；CSS顯示局部，檔案像素未修改。

## D2R

- 官方 Press Kit：https://blizzard.gamespress.com/Kit/Details/Diablo-II-Resurrected-Press-Kit
- 官方素材使用規則：https://www.blizzard.com/en-us/legal/28d5ebbf-c245-4408-8ba9-043dd5f056bf/legal-faq
- 著作權通知：https://www.blizzard.com/legal/5515ca11-1c96-42a0-b853-e7876a0d19bf/copyright-notices
- 此規則適用個人非商業使用、保留通知、不可改作；不是一般開放素材授權，Blizzard 可撤銷許可。未暗示官方合作或背書。卡片及 Contact 保留版權／非官方玩家專案提示。
- Key Art：https://imguscdn.gamespress.com/cdn/files/BlizzardLive/2021/02/20000436-3099d95b-9043-4b2d-a1ad-7f12fb62e792/Diablo_II_Resurrected_KeyArt_With_Logo_png_jpgcopy.jpg?w=250&mode=max&otf=y&quality=90&format=jpg&bgcolor=black&sky=17ae100fe0df2a8dac5c573deb3b5d4e3784757b1c2bab5c8f012f1c8e77d51c
- Logo：https://imguscdn.gamespress.com/cdn/files/BlizzardLive/2021/02/20000403-a145ac75-2278-4be1-871f-2badbbd3a5aa/Diablo_II_Resurrected_Logo.jpg?w=250&mode=max&otf=y&quality=90&format=jpg&bgcolor=black&sky=8e384eaea5a7f7cb11ff88b9ac27f048c255a40673dad680dfda414094ddc3f4

## 載入成本與失敗狀態

沿用既有可用圖，不更動舊資產；新增7個圖檔合計556,971 bytes。12個圖檔（含兩語學習圖與3張私人圖）總計1,403,323 bytes，單張不超過400KB。初始只載入所選語系並使用原生 lazy loading；沒有執行期外連圖片、iframe或新增相依套件。

圖片區桌面126px、手機112px，保持2欄 Professional／3欄 Leisure原網格，手機仍單欄。標題、描述與CTA放在原淺色卡片，與圖片分離。主要圖片失敗時顯示雙語備援提示，保留文字、完整連結及焦點。D2R主圖失敗改淺底提示（實測6.53:1），副標誌單獨失敗時只隱藏副圖。
