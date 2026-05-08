# Agent 回饋追蹤系統

公司內部 AI Agent 產品的使用回饋追蹤平台。顧問提交回饋、技術人員管理排序與處理進度。

> ⚠️ 本檔為**專案索引地圖**（事實的單一來源）。任何結構/欄位/設定變更，務必同步更新此檔並在「更新紀錄」加一筆。

---

## 部署架構

| 層 | 技術 | 部署位置 |
|----|------|---------|
| 前端 | 純靜態（HTML + CSS + ES Modules） | GitHub Pages：`https://[USER].github.io/agent-feedback-tracker/` |
| 後端 | Google Apps Script Web App（doPost JSON API） | `https://script.google.com/macros/s/[DEPLOYMENT_ID]/exec` |
| 資料庫 | Google Sheets | 試算表 ID 由 PropertiesService 管理 |
| 檔案儲存 | Google Drive | Drive 資料夾 ID 由 PropertiesService 管理 |

通訊規範：前端 fetch + `Content-Type: text/plain` → 後端 `JSON.parse(e.postData.contents)`，避開 GAS 不支援的 CORS preflight。

---

## 使用者角色

| 角色 | 識別方式 | 可做的操作 |
|------|---------|----------|
| 顧問 (consultant) | Email 登記在「選項設定」第 D 欄；密碼留空 | 提交、編輯、刪除自己的回饋；可互相編輯彼此的回饋內容（co-edit） |
| 技術人員 (tech) | Email 登記在「選項設定」第 C 欄 + 輸入正確 TECH_PASSWORD | 顧問所有權限 + 新增/編輯回覆、變更狀態、拖曳排序、編輯公告 |

---

## 檔案結構

```
Agent回饋網頁/
├── README.md                  ← 本檔（專案索引地圖）
├── CLAUDE.md                  ← 給 AI 看的開發指引（架構決策、命名慣例、修改流程）
├── 網頁使用說明.txt             ← 給使用者看的操作說明
│
├── backend/                   ← GAS Web App（JSON API）
│   ├── appsscript.json        ← Manifest（V8、webapp、OAuth scopes）
│   ├── .clasp.json            ← { scriptId, rootDir }（推送目標）
│   ├── .claspignore           ← 反向白名單，只推 .gs + manifest
│   ├── 00_Config.gs           ← 工作表名稱、PROP_KEYS、CACHE_KEYS
│   ├── 01_Router.gs           ← doGet 健康檢查 / doPost 路由 dispatcher
│   ├── 02_Auth.gs             ← validateRole、isTechEmail_
│   ├── 03_Agents.gs           ← getAllAgentsGrouped、getAgentInfo
│   ├── 04_Dashboard.gs        ← getDashboardStats
│   ├── 05_Announcement.gs     ← getAnnouncement、saveAnnouncement
│   ├── 06_Options.gs          ← getOptions（含 5 分鐘快取）、addConsultantEmail_
│   ├── 07_Feedbacks.gs        ← getFeedbacks、searchFeedbacks、addFeedback、updateFeedback、deleteFeedback
│   ├── 08_Reply.gs            ← updateReply
│   ├── 09_Ordering.gs         ← updateFeedbackOrder、moveFeedbackToZone
│   ├── 10_Upload.gs           ← uploadImage（Base64 → Drive）
│   ├── 11_Utils.gs            ← getSheet_、generateId_、formatDate_、sanitizeHtml、Property getters
│   └── 12_Admin.gs            ← onOpen、initProperties、initializeSheets、generateSampleData、updateAllUrls、authorizeDrive、clearSystemCache
│
└── frontend/                  ← GitHub Pages（純靜態）
    ├── index.html             ← HTML 結構
    ├── .nojekyll              ← 避免 Pages 對檔名做 Jekyll 處理
    └── assets/
        ├── css/
        │   ├── main.css           ← 入口（@import 串接）
        │   ├── variables.css      ← :root variables、reset、body、bgShift
        │   ├── layout.css         ← Navbar、Sidebar、Resizer、Main、響應式、捲軸
        │   ├── components.css     ← 按鈕、表單、Modal、Toast、Skeleton、Spinner
        │   ├── search.css         ← 搜尋列、Tag、高亮
        │   ├── dashboard.css      ← Dashboard、Announcement、Agent Info Card
        │   ├── feedback.css      ← 回饋摺疊清單、詳情、狀態 badge
        │   └── editor.css         ← 富文字編輯器、圖片控制
        └── js/                    ← 17 個 ES Modules
            ├── config.js          ← API_URL（必填）、STORAGE_KEYS、ZONE 常數
            ├── api.js             ← apiCall(action, payload) 封裝
            ├── state.js           ← 全域共享狀態
            ├── storage.js         ← SafeStorage（容錯封裝）
            ├── utils.js           ← 通用工具函式
            ├── deeplink.js        ← URL_PARAMS、handleDeepLink、getShareUrl、copyShareLink
            ├── auth.js            ← 身份/角色
            ├── sidebar.js         ← 側邊欄收合/拖曳
            ├── agents.js          ← Agent 清單與詳情
            ├── dashboard.js       ← 儀表板與選項載入
            ├── announcement.js    ← 公告渲染與編輯
            ├── search.js          ← 全域搜尋
            ├── editor.js          ← 富文字編輯器、圖片上傳、圖片控制
            ├── feedback.js        ← 回饋 CRUD 與摺疊
            ├── reply.js           ← 技術部回覆
            ├── dragsort.js        ← 拖曳排序
            └── app.js             ← 入口（DOMContentLoaded + window 暴露）
```

---

## 資料庫結構（Google Sheets，3 張工作表）

### Agent清單（5 欄）
| 欄位 | 索引 | 說明 |
|------|------|------|
| agentId | A | 主鍵，格式 `A001`、`A002`... |
| 分類名稱 | B | 例：客服類、行銷類、研發類 |
| Agent名稱 | C | 顯示用 |
| Agent簡介 | D | 純文字描述（支援換行） |
| Agent文件網址 | E | 多筆換行，可用 `標籤：URL` 格式 |

### 回饋紀錄（16 欄）
| 欄位 | 索引 | 說明 |
|------|------|------|
| feedbackId | A | 主鍵，格式 `F` + 時間戳 + 亂數 |
| agentId | B | 對應 Agent清單.A |
| 順序編號 | C | 同 Agent + 同狀態區內的拖曳順序 |
| 回饋分類 | D | 取自選項設定.A |
| 回饋標題 | E | |
| 回饋內容 | F | HTML（含圖片 img 標籤） |
| 回饋人 | G | 顯示名 |
| 回饋人Email | H | 用於權限判定 |
| 回覆內容 | I | HTML，技術部填寫 |
| 回覆人 | J | |
| 回覆人Email | K | |
| 處理狀態 | L | 取自選項設定.B（如：待處理/處理中/測試中/已解決/暫緩） |
| 建立時間 | M | yyyy-MM-dd HH:mm:ss |
| 更新時間 | N | |
| 網址 | O | 分享連結，由 `updateAllUrls` 維護 |
| 嚴重程度 | P | 取自選項設定.F |

### 選項設定（6 欄）
| 欄位 | 索引 | 用途 |
|------|------|------|
| 回饋分類 | A | 新增/編輯回饋時的下拉選項 |
| 處理狀態 | B | 技術部回覆時的狀態下拉 |
| 技術部Email | C | 權限白名單（小寫比對） |
| 顧問Email | D | 自動由 addFeedback 填入（去重） |
| Agent分類 | E | 預留，目前未使用於 UI |
| 嚴重程度 | F | 新增/編輯回饋時的下拉選項 |

> 各欄獨立掃描，可橫向稀疏（例如 C 欄 3 筆、D 欄 7 筆）；空白格略過。

---

## 商業邏輯（關鍵流程）

### 顧問新增回饋
1. 前端 `submitNewFeedback` → 呼叫 `addFeedback` API
2. 後端：
   - 生成 feedbackId（`F` + 時間戳 + 亂數）
   - 計算該 Agent 的 maxOrder + 1 作為順序編號
   - 用 `FRONTEND_BASE_URL + ?agent=...&fb=...` 組分享網址
   - 寫入新列，狀態預設「待處理」
   - 自動把回饋人 Email 加入「選項設定」第 D 欄（去重）

### 技術部回覆 + 狀態變更
1. 前端 `submitReply` → `updateReply` API
2. 後端：
   - 守門：`isTechEmail_(data.email)`
   - 若狀態從「已解決」改為非「已解決」，重算順序編號（移到該區尾端）
   - 批次寫入 4 欄：回覆內容、回覆人、回覆人Email、處理狀態
   - 更新「更新時間」

### 拖曳排序（技術部限定）
- **同區排序**：`updateFeedbackOrder` — 收集區內所有卡片的新順序，批次寫回
- **跨區移動**：`moveFeedbackToZone` — 改狀態 + 同時批次更新「來源區」與「目標區」的順序

### 全域搜尋
- 前端按 Enter / `,` 加入關鍵字 Tag
- 多關鍵字 AND 邏輯（後端 `searchFeedbacks`）
- 搜尋範圍：標題 + 顧問內容 + 技術部回覆
- 命中後過濾 sidebar、回饋清單反白關鍵字

### 深連結
- URL `?agent=A001&fb=F123` → [deeplink.js](frontend/assets/js/deeplink.js) 解析後輪詢 sidebar，找到對應 Agent 自動點選 + 展開該筆回饋

---

## API 端點清單（doPost / `{action, payload}`）

| action | payload | 回傳 | 守門 |
|--------|---------|------|------|
| `getOptions` | — | { categories, statuses, techEmails, consultantEmails, agentCategories, severities } | — |
| `validateRole` | { email, password } | { role: 'tech' \| 'consultant' } | — |
| `getAllAgentsGrouped` | — | { categories[], agents{[cat]: [{agentId, name, activeFeedbackCount}]} } | — |
| `getDashboardStats` | — | { totalAgents, totalFeedbacks, statusCounts, recentCount } | — |
| `getAnnouncement` | — | { content, docs[] } | — |
| `saveAnnouncement` | { email, content, docs } | { success, message? } | 技術部 |
| `getAgentInfo` | { agentId } | { agentId, category, name, description, docUrls[] } \| null | — |
| `getFeedbacks` | { agentId } | feedback[] | — |
| `searchFeedbacks` | { keywords[] } | { agentIds[], feedbackMap{} } | — |
| `addFeedback` | { agentId, category, severity, title, content, author, email } | { success, feedbackId } | — |
| `updateFeedback` | { feedbackId, category, severity, title, content, email } | { success, feedbackId? \| message } | — |
| `deleteFeedback` | { feedbackId, email } | { success, message? } | 原作者 或 技術部 |
| `updateReply` | { feedbackId, replyContent, replyAuthor, email, status } | { success, feedbackId? \| message } | 技術部 |
| `updateFeedbackOrder` | { orders: [{feedbackId, orderNum}], email } | { success, message? } | 技術部 |
| `moveFeedbackToZone` | { feedbackId, targetStatus, targetZoneOrders[], sourceZoneOrders[], email } | { success, feedbackId? \| message } | 技術部 |
| `uploadImage` | { base64Data, fileName, mimeType, feedbackId } | { success, url? \| message } | — |

---

## 部署設定（Script Properties）

| Key | 由誰寫入 | 用途 |
|-----|---------|------|
| `SPREADSHEET_ID` | `initProperties` | 試算表 ID（由 [11_Utils.gs](backend/11_Utils.gs) 的 `getSpreadsheetId_` 讀取） |
| `DRIVE_FOLDER_ID` | `initProperties` | 圖片上傳目錄 ID |
| `TECH_PASSWORD` | `initProperties` | 技術部登入密碼（明文比對，請使用強密碼） |
| `FRONTEND_BASE_URL` | `initProperties` | GitHub Pages 網址（含結尾斜線），用於組分享連結與 `updateAllUrls` |
| `ANNOUNCEMENT_CONTENT` | `saveAnnouncement` | 公告 HTML |
| `ANNOUNCEMENT_DOCS` | `saveAnnouncement` | 公告相關文件清單（JSON） |

---

## 部署流程

詳見 [CLAUDE.md](CLAUDE.md) 的「初始化流程」一節。摘要：

1. **後端**：`cd backend && npx @google/clasp push --force && npx @google/clasp deploy --description "v1"`
2. 手動到 GAS UI 把 access 改「所有人」
3. 把 `.../exec` 寫入 [config.js](frontend/assets/js/config.js) 的 `API_URL`
4. **前端**：`cd ../frontend && git push` 到 GitHub repo（首次需 `gh repo create` 並啟用 Pages）

---

## 更新紀錄

| 日期 | 變更 |
|------|------|
| 2026-05-07 | 從架構 A（GAS 全包）轉為架構 B（GitHub Pages 前端 + GAS 後端 API）。後端 Code.gs 拆為 13 個 .gs 模組；前端 Index/Js/Style.html 拆為 1 HTML + 8 CSS + 17 ES Modules。SPREADSHEET_ID 改用 PropertiesService 管理。新增 `FRONTEND_BASE_URL` Property，`updateAllUrls` 改用此網址組分享連結。|
