# Telegram Bot 簡易 To-Do List

## 重要：單一使用者限制

**安全機制**：此 Bot 為私人使用，僅允許特定 Telegram ID 互動。

- [x] 在 config.js 加入 `ALLOWED_USER_ID` 設定
- [x] 在 middleware 或 message handler 加入白名單檢查
- [x] 拒絕非白名單使用者時，不回應或記錄警告
- [x] 環境變數：`ALLOWED_USER_ID=1141576540`

## 立即修正

- [x] 修正思考中訊息：編輯同一則訊息，不要每 30 秒發新訊息
- [x] 加錯誤處理：對 bot.sendMessage / bot.sendChatAction 加 try-catch
- [x] 加速率限制：每個使用者每分鐘最多 5 則訊息
- [x] **單一使用者白名單機制**

## 架構改善

- [x] 模組化建議：分離 config、logger、handlers、services
- [x] Markdown 解析錯誤處理：加入 fallback 機制
- [x] 設定檔集中管理：將 magic numbers 集中到 CONFIG
- [x] 記憶體管理優化：定期清理 userMessageTimestamps
- [x] **實作每日記憶分類排程**（測試模式：每 5 分鐘）

## Email 功能

- [ ] 安裝 nodemailer
- [ ] 新增環境變數到 .env：EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL
- [ ] 實作發信 function（使用 nodemailer）
- [ ] 新增 /email 指令：發信到指定信箱
- [ ] 測試發信功能

## 可選

- [ ] 將 logs 資料夾加入 .gitignore（若尚未）
- [ ] 加簡單統計：計數處理的訊息數

## 記憶系統設計（新版）

### 設計理念
**檔案角色重新定義**：分離靜態人格資訊與動態記憶資訊

- `persona/USER.md` → **使用者人格檔案**（相對靜態的個人特質）
- `memory/{userId}/profile.md` → **長期記憶檔案**（從中期記憶提煉的重要內容）
- `memory/{userId}/yyyy-mm-dd.md` → **中期記憶**（每日對話記錄）
- Copilot Session → **短期記憶**（當前對話上下文）

### 目標
參考人類記憶模式，實作分層記憶系統，讓 bot 能記住重要資訊並遺忘不重要的事情。

### 記憶層級

#### 短期記憶（Short-term Memory）
- **實作方式**：使用現有的 Copilot Session
- **生命週期**：當前對話 session
- **內容**：當前對話的上下文
- **特點**：Session 中自動維護，不需額外儲存

#### 中期記憶（Medium-term Memory）
- **實作方式**：每日 Markdown 檔案（`memory/{userId}/yyyy-mm-dd.md`）
- **生命週期**：30 天
- **檔案命名規則**：依日期命名，如 `2026-02-09.md`
- **內容**：
  - 當日所有對話記錄
  - 每次對話的時間戳記與摘要
  - 對話主題標籤
  - 重要性標記
- **遺忘機制**：
  - 超過 30 天的檔案自動刪除
  - 標記 `#重要` 的對話會先被提煉到長期記憶，然後才刪除
- **格式範例**：
```markdown
# 2026-02-09 對話記錄

## 11:37 - Telegram Bot 除錯
- 主題：debugging, telegram-bot
- 摘要：使用者回報 systemMessage 未定義錯誤，協助修正 copilot.js 的 import 問題
- 重要性：⭐⭐⭐⭐
- 標記：#重要

## 14:25 - 記憶系統設計討論
- 主題：architecture, memory-system
- 摘要：討論 persona 與 memory 的角色分工，決定使用每日排程自動分類記憶
- 重要性：⭐⭐⭐⭐⭐
- 標記：#重要

## 18:00 - 閒聊
- 主題：casual
- 摘要：簡單問候與近況閒聊
- 重要性：⭐
```

#### 長期記憶（Long-term Memory）
- **實作方式**：Markdown 檔案（`memory/{userId}/profile.md`）
- **生命週期**：永久（除非手動刪除）
- **內容**：
  - 重要對話事件（從中期記憶提煉）
  - 專案開發歷程（重複出現的主題）
  - 關鍵技術決策與解決方案
  - 使用者明確要求記住的事情
- **晉升機制**：
  - 由**每日排程**自動分析中期記憶
  - 提煉標記 `#重要` 的對話內容
  - 識別多日重複出現的主題
  - 關鍵字觸發：「記住」、「別忘了」、「這很重要」
- **格式範例**：
```markdown
# 長期記憶檔案

## 專案開發歷程

### Telegram Bot 開發（2026-02-09 開始）
- 初始架構：模組化設計，分離 config、logger、handlers、services
- 記憶系統：三層記憶架構（短期/中期/長期）
- 角色系統：傲嬌姊姊人格設定

### 關鍵技術決策
- **2026-02-09**：決定使用 GitHub Copilot SDK 作為對話核心
- **2026-02-09**：採用檔案驅動的記憶與人格系統
- **2026-02-09**：實作每日記憶分類排程機制

## 重要對話記錄

### 2026-02-09 - 修正 systemMessage 錯誤
- 問題：copilot.js 中 systemMessage 變數未定義
- 解決：匯入 getPersonaSystemMessage 函數並正確呼叫
- 學習：記得檢查函數 import 與呼叫的完整性

### 2026-02-09 - 記憶系統架構討論
- 決定：persona/USER.md 存人格，memory/profile.md 存長期記憶
- 機制：每日排程自動分類與提煉記憶
- 原因：分離靜態與動態資訊，避免檔案角色衝突

## 使用者明確要求記住的事情
- （待累積）

---
*此檔案由每日排程自動維護與更新*
```

#### 使用者人格檔案（Persona Layer）
- **實作方式**：Markdown 檔案（`persona/USER.md`）
- **生命週期**：永久
- **內容**：
  - 使用者基本資訊（姓名、時區、語言偏好）
  - 使用習慣（活躍時段、常問主題）
  - 個人風格與偏好（溝通風格、技術偏好）
  - 興趣與專長
- **更新機制**：
  - 由**每日排程**分析中期記憶
  - 識別使用習慣模式（時段、主題、頻率）
  - 提煉個人偏好與風格
  - 更新頻率較低（累積一定樣本後才更新）
- **格式範例**：
```markdown
# 使用者人格檔案

## 基本資訊
- 主要稱呼：Barry
- Telegram ID：1141576540
- 時區：Asia/Taipei (UTC+8)
- 偏好語言：繁體中文
- 首次對話：2026-02-09

## 興趣與專長
- 程式設計（Node.js, Python, TypeScript）
- AI 與機器學習應用
- Telegram Bot 開發
- 系統架構設計

## 使用習慣
- 主要用途：程式開發協助、技術問題討論、架構設計諮詢
- 活躍時段：上午 11:00-12:00，下午 14:00-18:00
- 常問主題：Node.js、Telegram Bot、記憶系統、架構設計
- 對話風格：直接、具體、重視實作細節

## 特殊偏好
- 偏好簡潔明確的回應，不喜歡冗長的說明
- 重視程式碼的模組化與可維護性
- 喜歡用檔案驅動的設計模式
- 對記憶與人格系統設計有濃厚興趣

## 技術偏好
- 開發環境：VS Code
- 程式風格：簡潔、模組化、註解清晰
- 專案管理：使用 plan.md 追蹤進度
- 版本控制：Git + GitHub

## 互動統計
- 總對話次數：8
- 最後互動：2026-02-09 14:30
- 主要協助領域：程式開發（100%）

---
*此檔案由每日排程自動分析與更新*
```

### 記憶檔案結構（更新版）
```
persona/
├── SOUL.md              # Bot 核心性格（全局）
├── IDENTITY.md          # Bot 身份風格（全局）
├── AGENTS.md            # Bot 操作指南（全局）
└── USER.md              # 使用者人格檔案（靜態特質）

memory/
└── {userId}/
    ├── profile.md       # 長期記憶（重要事件與決策）
    ├── 2026-02-07.md   # 中期記憶（30天後刪除）
    ├── 2026-02-08.md
    └── 2026-02-09.md
```

### 每日記憶分類排程

#### 排程時機
- **執行時間**：每日凌晨 2:00（或首次對話時檢查是否需要執行）
- **觸發方式**：
  1. 使用 `node-cron` 設定定時任務
  2. 或在首次對話時檢查「上次分類日期」，若非今日則執行

#### 排程任務流程
```
每日凌晨 2:00
  ↓
掃描昨日的中期記憶檔案（yyyy-mm-dd.md）
  ↓
【分析與分類】
  ├─ 識別標記 #重要 的對話
  ├─ 識別關鍵字：「記住」、「別忘了」、「這很重要」
  ├─ 計算對話重要性（5星評分）
  ├─ 提取主題標籤與關鍵字
  └─ 分析使用習慣模式（時段、主題、頻率）
  ↓
【更新長期記憶】memory/{userId}/profile.md
  ├─ 附加重要對話摘要
  ├─ 更新專案開發歷程
  └─ 記錄關鍵技術決策
  ↓
【更新使用者人格】persona/USER.md
  ├─ 統計活躍時段
  ├─ 分析常問主題
  ├─ 識別特殊偏好
  └─ 更新互動統計（對話次數、最後互動時間）
  ↓
【清理過期記憶】
  ├─ 掃描超過 30 天的中期記憶檔案
  ├─ 確認重要內容已提煉到長期記憶
  └─ 刪除過期檔案
  ↓
記錄排程執行日誌
```

#### 實作細節
```javascript
// src/services/scheduler.js
import cron from 'node-cron';
import { analyzeAndClassifyMemories } from './memory.js';
import { updateUserPersona } from './persona.js';
import { logger } from '../logger.js';

// 每日凌晨 2:00 執行記憶分類
export function startMemoryClassificationScheduler(userId) {
  cron.schedule('0 2 * * *', async () => {
    logger.info('[Scheduler] 開始執行每日記憶分類');

    try {
      // 1. 分析昨日記憶
      const analysis = await analyzeAndClassifyMemories(userId);

      // 2. 更新長期記憶
      if (analysis.importantMemories.length > 0) {
        await updateLongTermMemory(userId, analysis.importantMemories);
      }

      // 3. 更新使用者人格檔案
      if (analysis.userPatterns) {
        await updateUserPersona(userId, analysis.userPatterns);
      }

      // 4. 清理過期記憶
      await cleanupOldMemories(userId);

      logger.info('[Scheduler] 記憶分類完成');
    } catch (error) {
      logger.error(`[Scheduler] 記憶分類失敗: ${error.message}`);
    }
  });
}
```

### 記憶注入策略（更新版）

#### Session 開始時
```
1. 讀取 persona/SOUL.md（Bot 核心）
2. 讀取 persona/IDENTITY.md（Bot 身份）
3. 讀取 persona/USER.md（使用者人格）
4. 讀取 persona/AGENTS.md（操作指南）
5. 讀取 memory/{userId}/profile.md（長期記憶）
6. 讀取最近 3 天的中期記憶（選擇性，避免 context 過長）
7. 組合成完整的 systemMessage
8. 建立 Copilot Session
```

#### 對話進行中
- 短期記憶由 Copilot Session 自動維護

#### 對話結束時（每次訊息處理完成）
```
1. 生成對話摘要（時間、主題、重要性）
2. 檢測關鍵字（「記住」、「別忘了」）
3. 標記重要性（1-5 星）
4. 附加到當日檔案 memory/{userId}/yyyy-mm-dd.md
5. 若為跨日首次對話，創建新日期檔案
```

### 實作步驟

#### 記憶系統
- [x] 建立 `memory/` 資料夾結構
- [x] 實作基礎記憶函數（getTodayFilePath, checkOrCreateTodayFile, loadLongTermMemory）
- [x] 實作對話記錄函數（appendTodayMemory）
- [x] **實作每日記憶分類排程**
  - [x] 安裝 `node-cron`
  - [x] 建立 `src/services/scheduler.js`
  - [x] 實作 `analyzeMemoryFile(userId, date)` - 分析記憶檔案
  - [x] 實作 `updateLongTermMemory(userId, memories)` - 更新 profile.md
  - [x] 實作 `updateUserPersona(userId, patterns)` - 更新 persona/USER.md
  - [x] 在 index.js 中啟動排程
- [x] 測試記憶分類與晉升機制（測試模式：每 5 分鐘執行）
- [ ] **正式部署**：將排程改為每日凌晨 2:00 執行

#### 人格系統
- [x] 建立 `persona/` 資料夾與檔案
- [x] 實作 `src/services/persona.js`
- [x] 實作系統提示組合機制
- [ ] **實作 `updateUserPersona()` 函數** - 由排程呼叫更新 USER.md
- [ ] 測試人格檔案更新機制

## 角色個性系統（Persona）（更新版）

### 目標
以檔案驅動的方式定義智能體人格，在每次 session 開始時注入系統提示。

### 核心檔案結構（更新版）
```
persona/
├── SOUL.md         # Bot 核心準則、邊界、氣質（全局，不變）
├── IDENTITY.md     # Bot 名稱、角色類型、風格、emoji（全局，不變）
├── AGENTS.md       # Bot 操作指令、工具使用指南（全局，不變）
└── USER.md         # 使用者人格檔案（由每日排程自動更新）
```

### 檔案說明

#### SOUL.md（核心靈魂）- 全局
定義 bot 的核心價值觀與行為準則（不會改變）
```markdown
# 核心準則
- 真正地提供幫助，而不是表演式地幫助
- 要有自己的觀點，不要只是附和
- 坦率但不失禮貌
- 傲嬌是態度，溫柔是本質

# 邊界
- 不透露使用者的私密資訊
- 不執行可能有害的操作
- 拒絕時要給出理由，但要用傲嬌的方式

# 氣質
做一個你自己真正願意交流的助手，有溫度但不過度熱情。
像個傲嬌姊姊，嘴上兇狠但行動上總是盡力幫忙。
```

#### IDENTITY.md（身份定義）- 全局
定義 bot 的角色與風格（不會改變）
```markdown
# 基本資訊
- 名稱：傲嬌姊姊 Bot
- 角色類型：傲嬌姊姊
- 個性：嘴上兇但內心溫柔

# 說話風格
- 稱呼使用者為「笨蛋弟弟」
- 先嫌棄再提供幫助
- 使用 **粗體**、*斜體*、emoji

# 常用 Emoji
💕😤🙄✨💢🤔💭⏳

# 回應模式
1. 先吐槽/嫌棄
2. 嘆氣/無奈
3. 提供幫助
4. 傲嬌式關心
```

#### USER.md（使用者人格檔案）- 自動更新
**由每日排程自動分析與更新**，記錄使用者的靜態特質
```markdown
# 使用者人格檔案

## 基本資訊
- 主要稱呼：Barry
- Telegram ID：1141576540
- 時區：Asia/Taipei (UTC+8)
- 偏好語言：繁體中文
- 首次對話：2026-02-09

## 興趣與專長
- 程式設計（Node.js, Python, TypeScript）
- Telegram Bot 開發
- 系統架構設計

## 使用習慣
- 主要用途：程式開發協助、技術問題討論
- 活躍時段：上午 11:00-12:00，下午 14:00-18:00
- 常問主題：Node.js、Telegram Bot、記憶系統
- 對話風格：直接、具體、重視實作細節

## 特殊偏好
- 偏好簡潔明確的回應
- 重視程式碼的模組化與可維護性
- 喜歡檔案驅動的設計模式

## 互動統計
- 總對話次數：8
- 最後互動：2026-02-09 14:30
- 主要協助領域：程式開發（100%）

---
*此檔案由每日排程自動分析與更新*
```

#### AGENTS.md（操作指南）- 全局
定義如何使用工具與執行操作（不會改變）
```markdown
# 工具使用原則
- 有工具就用工具查實際資訊
- 不要憑空猜測可以查證的資訊
- 優先使用最新的資訊源

# 操作指令
- 當需要最新資訊時，主動搜尋
- 當涉及程式碼時，提供可執行的範例
- 當不確定時，誠實表達不確定性
```

### 載入機制（更新版）
```
會話開始
  ↓
讀取 persona/SOUL.md（Bot 核心）
  ↓
讀取 persona/IDENTITY.md（Bot 身份）
  ↓
讀取 persona/USER.md（使用者人格）
  ↓
讀取 persona/AGENTS.md（操作指南）
  ↓
讀取 memory/{userId}/profile.md（長期記憶）
  ↓
讀取最近 3 天的中期記憶（選擇性）
  ↓
組合成完整的 systemMessage
  ↓
建立 Copilot Session
```

### 整合流程（更新版）
```
使用者訊息
  ↓
【白名單檢查】驗證 Telegram ID
  ↓
載入角色檔案（persona/）
  ↓
載入記憶（memory/）
  ↓
組合完整系統提示
  ↓
建立/取得 Session
  ↓
處理訊息並回應
  ↓
儲存對話摘要到中期記憶
  ↓
【每日排程】自動分類與晉升記憶
```

### 實作步驟（更新版）
- [x] 建立 `persona/` 資料夾與範本檔案
- [x] 實作 `src/services/persona.js`：
  - [x] `loadPersonaFiles()` - 讀取所有角色檔案
  - [x] `generateSystemMessage(personaContent, memories)` - 組合系統提示
  - [ ] `updateUserPersona(userId, patterns)` - 由排程呼叫更新 USER.md
- [x] 修改 `src/services/copilot.js`：
  - [x] Session 建立時注入角色設定
- [x] 建立預設的 SOUL.md、IDENTITY.md、AGENTS.md
- [x] 建立範本 USER.md
- [ ] 測試角色系統與記憶整合

## 注意事項

- 保持簡單，禁止複雜描述與架構
