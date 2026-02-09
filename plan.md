# Telegram Bot 開發計劃與進度追蹤

> 最後更新：2026-02-09

---

## 🎯 核心功能狀態

### ✅ 已上線功能
- 基礎互動系統（`/start`, `/menu`, `/help`）
- 記憶系統（長期/中期/短期，AI 驅動）
- 統計與設定管理（`/stats`, `/settings`, `/status`）
- 對話記錄匯出（`/export`）
- 錯誤處理與 Quick Replies
- 自動化排程器（記憶分類、五顆星提升）

---

## � 新功能規劃

### 🎯 Phase 6: 首次使用引導系統 (Onboarding)
**優先級：★★★★★ 高 | 可行性：★★★★★ | 風險：★☆☆☆☆**

> 使用者首次使用時，主動引導填寫個人資料與偏好設定

#### 核心功能
- [ ] 檢測首次使用者
  - 檢查 `persona/USER.md` 是否為預設值
  - 判斷是否需要引導流程

- [ ] 對話式問卷系統
  - 收集基本資訊（稱呼、職業、興趣、時區）
  - 詢問對話風格偏好
    - 傲嬌程度（超傲嬌 / 標準 / 溫柔）
    - 詳細程度（簡潔 / 正常 / 詳細）
    - 正式程度（嚴肅 / 輕鬆 / 超親密）
  - 詢問主要用途（工作助理 / 技術顧問 / 生活陪伴 / 混合）

- [ ] 動態 Persona 生成
  - 根據使用者回答自動生成個性化 `USER.md`
  - 可選：調整 `IDENTITY.md` 的對話風格參數
  - 寫入完成後發送歡迎訊息並展示已記錄的資訊

- [ ] 重新設定功能
  - `/onboarding` 指令重新執行引導流程
  - `/reset_persona` 重置為預設設定

#### 技術實作
```javascript
src/services/
├── onboarding.js       # 引導流程邏輯
└── personaWriter.js    # Persona 檔案寫入

src/handlers/
└── onboarding.js       # 引導對話處理
```

---

### 🤖 Phase 7: 自我進化系統 (Self-Evolution)
**優先級：★★★☆☆ 中 | 可行性：★★★★☆ | 風險：★★★☆☆**

> Bot 可以透過 Telegram 對話自我編輯代碼，並自動測試部署

#### 核心功能
- [ ] Git 整合
  - 使用 `simple-git` 套件操作 Git
  - 創建開發分支（`dev/{feature-name}`）
  - Commit、Push、創建 PR

- [ ] 代碼編輯介面
  - `/evolve <功能描述>` 指令觸發
  - AI 分析需求並規劃修改範圍
  - 展示修改預覽，等待使用者確認
  - 執行修改並 commit

- [ ] 測試環境
  - `dev` branch 自動部署到測試環境
  - 執行自動化測試（unit tests + integration tests）
  - 測試通過後詢問是否 merge 到 `master`

- [ ] 安全機制
  - 白名單功能（只能修改 `src/` 下的檔案）
  - AI Code Review（分析潛在風險）
  - 回滾機制（`/rollback` 指令）
  - 修改歷史記錄（changelog 自動更新）

- [ ] GitHub Actions CI/CD
  - 自動測試流程
  - 自動部署到 staging
  - 自動重啟 bot 服務

#### 技術實作
```javascript
src/services/
├── git.js             # Git 操作
├── codeEditor.js      # 代碼編輯邏輯
├── testRunner.js      # 測試執行
└── evolution.js       # 進化流程控制

src/handlers/
└── evolution.js       # 進化指令處理

.github/workflows/
└── auto-deploy.yml    # CI/CD workflow
```

#### 使用範例
```
使用者：/evolve 加入天氣查詢功能
Bot：讓我分析一下... 🤔
     需要修改的檔案：
     • src/handlers/commands.js（新增 /weather 指令）
     • src/services/weather.js（新建，整合天氣 API）
     • package.json（新增 axios 依賴）

     預計修改 3 個檔案，新增約 120 行代碼。
     確定要執行嗎？[確定] [取消]

使用者：確定
Bot：開始執行... ⚙️
     ✅ 創建分支 dev/weather-feature
     ✅ 修改代碼完成
     ✅ Commit: "feat: add weather query command"
     ✅ Push 到遠端

     現在部署到測試環境... ⏳
     測試中...
     ✅ 所有測試通過！

     要合併到 master 並重啟嗎？[合併] [取消]
```

---

### 🧠 Phase 8: 自主專案開發系統 (Autonomous Project Development)
**優先級：★★☆☆☆ 低 | 可行性：★★★☆☆ | 風險：★★★★☆**

> 給予 GitHub 和 Docker 權限，讓 Bot 自主發想、開發、部署新專案

#### 核心功能
- [ ] 專案發想與規劃
  - Bot 定期分析使用者需求和對話記錄
  - 自主提出專案 idea（「我想幫你做個 XXX，如何？」）
  - 使用者確認後開始規劃

- [ ] GitHub 專案管理
  - 創建新 repo（或在現有 repo 建立子專案）
  - 管理 Issues 和 Project board
  - 自動產生 README、文件

- [ ] 自主開發流程
  - AI 生成專案架構
  - 逐步實作功能模組
  - 自我測試與 debug
  - Code review（可邀請使用者參與）

- [ ] Docker 部署
  - 自動生成 Dockerfile
  - 建立容器並部署
  - 健康檢查與監控

- [ ] 專案整合
  - 完成後自動接入主系統
  - 更新文件和指令列表
  - 通知使用者新功能上線

#### 安全與權限
- 沙箱環境執行（Docker 隔離）
- 嚴格的權限控制（限制可訪問的資源）
- 每個階段都需使用者確認
- 可隨時暫停或終止專案

#### 技術實作
```javascript
src/services/
├── projectPlanner.js    # 專案規劃
├── github.js            # GitHub API 整合
├── docker.js            # Docker 操作
└── autonomous.js        # 自主開發流程

src/handlers/
└── projects.js          # 專案管理指令
```

#### 使用範例
```
Bot：嘿，笨蛋弟弟 💭
     我發現你常常在晚上 10 點詢問週報生成...
     我可以幫你做一個「自動週報生成器」
     串接你的 Notion 和 Calendar，每週五自動生成。
     要試試看嗎？[好啊] [不用]

使用者：好啊
Bot：好！我開始規劃了 ✨

     專案名稱：Weekly Report Generator
     技術棧：Node.js + Notion API + Google Calendar API
     預計開發時間：2 小時

     我會創建一個新的 repo：telegram-bot-weekly-report
     要開始了嗎？[開始] [再想想]

使用者：開始
Bot：收到！開工了 🛠

     [10:30] ✅ 創建 repo
     [10:35] ✅ 初始化專案結構
     [10:45] ⚙️ 實作 Notion API 整合...
     [11:00] ✅ Notion API 完成
     [11:15] ⚙️ 實作 Calendar API...
     ...
     [12:30] ✅ 所有功能開發完成！
     [12:35] ✅ 測試通過
     [12:40] ✅ Docker 容器建立完成

     專案上線了！🎉
     現在你可以用 /generate_weekly_report 生成週報
```

---

## 🐛 已知問題與持續優化

### 記憶系統
- [ ] 實作語意相似度檢查（避免重複記憶）
- [ ] 記憶提取失敗監控與告警
- [ ] 記憶質量評分機制

### 統計系統
- [ ] 5 秒 debounce 可能導致即時性不足
- [ ] 考慮改用即時更新 + 批次儲存

### 錯誤處理
- [ ] 更多 edge case 測試
- [ ] 增強錯誤恢復機制

---

## � 其他功能想法（待評估）

### 記憶管理圖形化
- [ ] `/memories` 圖形化介面（分頁瀏覽）
- [ ] `/remember <內容>` 手動記憶
- [ ] `/forget` 刪除記憶
- [ ] 記憶搜尋與編輯功能

### Email 通知
- [ ] 安裝 nodemailer
- [ ] `/email` 指令發送郵件

### AI 增強功能
- [ ] 對話中的 AI 重要性判斷（取代關鍵字）
- [ ] 記憶分類系統（個人資訊、偏好、關係、事件）
- [ ] 情感分析
- [ ] 主動關心機制

### 可選功能
- [ ] Webhook 模式（取代 polling）
- [ ] 語音訊息處理
- [ ] 圖片記憶功能
- [ ] 群組對話支援

---

## 📝 更新日誌

### 2026-02-09 - 記憶系統重構與修復

#### ✨ 核心改進
- **AI 驅動記憶生成**：使用 GitHub Copilot SDK 生成自然語言記憶描述
- **戀愛濾鏡風格**：傲嬌姊姊視角解讀所有資訊（工作→擔當、興趣→未來生活）
- **批次處理機制**：避免重複寫入 profile.md
- **五顆星記憶提升**：定時排程自動執行（每 5 分鐘）
- **統一記憶生成流程**：所有長期記憶統一透過 AI 處理

#### 🐛 修復
- 修復統計顯示為 0 的問題（整合訊息追蹤）
- 修復兩個排程重複寫入導致格式不一致
- 移除制式化的正則匹配提取

#### 🎨 UI/UX 優化
- 互動式主選單（`/menu`）
- 改良的歡迎訊息（`/start`）
- 詳細幫助系統（`/help`）
- 互動式設定介面（`/settings`）
- 狀態顯示（`/status`）
- 使用統計（`/stats`）
- 對話記錄匯出（`/export`）
- 友善錯誤處理與 Quick Replies

---

## 🎯 開發優先級

### 🔥 高優先級（立即實作）
1. **首次使用引導系統** - 最實用，風險低，體驗提升明顯
2. **記憶系統持續優化** - 語意相似度檢查、質量評分

### ⚡ 中優先級（規劃中）
3. **自我進化系統** - 技術挑戰，需謹慎實作
4. **記憶管理圖形化** - 提升使用體驗

### 💭 低優先級（長期目標）
5. **自主專案開發系統** - 最有野心，需要大量工程
6. **其他增強功能** - 根據使用需求決定

---

## 🏗️ 技術架構
```
telegram-bot/
├── src/
│   ├── handlers/          # 訊息、指令、callback 處理
│   ├── keyboards/         # Inline keyboard 定義
│   ├── services/          # 核心服務（記憶、統計、設定等）
│   ├── middleware/        # 中間件（限流等）
│   └── config.js          # 配置檔
├── persona/               # Bot 人格定義
│   ├── IDENTITY.md        # 身份設定
│   ├── SOUL.md            # 核心準則
│   ├── AGENTS.md          # 工具使用原則
│   └── USER.md            # 使用者資料
├── memory/                # 記憶存儲
│   ├── {userId}/
│   │   ├── profile.md     # 長期記憶
│   │   └── YYYY-MM-DD.md  # 每日對話
│   └── settings/          # 使用者設定
└── logs/                  # 日誌
```

---

## 📊 效能監控

### 記憶系統
- 批次處理減少檔案 I/O
- 標記機制避免重複處理
- 定時排程降低即時壓力

### 統計系統
- 5 秒 debounce 避免頻繁寫入
- 異步處理不阻塞主流程

---

## 🚀 下一步行動

1. **實作首次使用引導系統**
   - 設計對話流程
   - 實作問卷邏輯
   - 動態生成 persona

2. **規劃自我進化系統**
   - 研究 GitHub API
   - 設計安全機制
   - 建立測試環境

3. **持續優化記憶系統**
   - 實作語意相似度
   - 記憶質量評分
   - 監控與告警

