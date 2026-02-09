# Telegram Bot 簡易 To-Do List

## 立即修正

- [x] 修正思考中訊息：編輯同一則訊息，不要每 30 秒發新訊息
- [x] 加錯誤處理：對 bot.sendMessage / bot.sendChatAction 加 try-catch
- [x] 加速率限制：每個使用者每分鐘最多 5 則訊息

## 架構改善

- [x] 模組化建議：分離 config、logger、handlers、services
- [x] Markdown 解析錯誤處理：加入 fallback 機制
- [x] 設定檔集中管理：將 magic numbers 集中到 CONFIG
- [x] 記憶體管理優化：定期清理 userMessageTimestamps

## Email 功能

- [ ] 安裝 nodemailer
- [ ] 新增環境變數到 .env：EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, ADMIN_EMAIL
- [ ] 實作發信 function（使用 nodemailer）
- [ ] 新增 /email 指令：發信到指定信箱
- [ ] 測試發信功能

## 可選

- [ ] 將 logs 資料夾加入 .gitignore（若尚未）
- [ ] 加簡單統計：計數處理的訊息數

## 記憶系統設計

### 目標
參考人類記憶模式，實作分層記憶系統，讓 bot 能記住重要資訊並遺忘不重要的事情。

### 記憶層級

#### 短期記憶（Short-term Memory）
- **實作方式**：使用現有的 Copilot Session
- **生命週期**：當前對話 session
- **內容**：當前對話的上下文
- **特點**：Session 結束時寫入當日記憶檔案

#### 中期記憶（Medium-term Memory）
- **實作方式**：每日 Markdown 檔案（`memory/{userId}/yyyy-mm-dd.md`）
- **生命週期**：7-30 天
- **檔案命名規則**：依日期命名，如 `2026-02-09.md`
- **檔案檢查機制**：
  - Session 開始時檢查當日檔案（`yyyy-mm-dd.md`）是否存在
  - 若跨日則創建新日期檔案
  - 若存在則附加新內容
  - 若不存在則創建新檔案
- **內容**：
  - 當日所有對話記錄
  - 每次對話的時間戳記與摘要
  - 對話主題標籤
- **遺忘機制**：
  - 超過 30 天的檔案自動刪除
  - 保留重要標記的對話
- **格式範例**：
```markdown
# 2026-02-09 對話記錄

## 10:30 - 討論 Python 程式設計
- 主題：debugging, error handling
- 摘要：使用者詢問如何處理 Python 的異常處理，討論了 try-except 的最佳實踐
- 重要性：⭐⭐⭐

## 14:25 - Telegram Bot 開發
- 主題：telegram-bot, node.js
- 摘要：協助實作速率限制功能，修正思考中訊息的編輯機制
- 重要性：⭐⭐⭐⭐
- 標記：#重要

## 18:00 - 閒聊
- 主題：casual
- 摘要：簡單問候與天氣討論
- 重要性：⭐
```

#### 長期記憶（Long-term Memory）
- **實作方式**：Markdown 檔案（`memory/{userId}/profile.md`）
- **生命週期**：永久（除非手動刪除）
- **內容**：
  - 使用者個人資訊（姓名、偏好、時區等）
  - 重要的對話主題（高重複率、高重要性）
  - 使用者習慣與風格
- **晉升機制**：
  - 中期記憶中標記 `#重要` 的內容
  - 使用者明確要求記住某事（關鍵字：「記住」、「別忘了」）
  - 多日重複出現的主題
- **格式範例**：
```markdown
# 使用者檔案

## 基本資訊
- 姓名：Barry
- 時區：Asia/Taipei
- 偏好語言：繁體中文
- 首次對話：2026-01-15

## 興趣與專長
- 程式設計（Node.js, Python, TypeScript）
- AI 與機器學習
- Telegram Bot 開發

## 使用習慣
- 主要用途：程式開發協助、技術問題討論
- 活躍時段：晚上 8-11 點
- 常問主題：Node.js、Telegram Bot、架構設計

## 重要事實
- 使用 VS Code 作為主要編輯器（確認次數：5）
- 偏好簡潔的回應，不喜歡過度正式的用語
- 喜歡模組化與乾淨的程式碼架構

## 互動記錄
- 總對話次數：157
- 最後互動：2026-02-09
- 主要協助領域：程式開發（85%）、技術諮詢（10%）、閒聊（5%）
```

### 記憶檔案結構
```
memory/
├── {userId}/
│   ├── profile.md              # 長期記憶（使用者檔案）
│   ├── 2026-02-07.md          # 中期記憶（2/7 的對話）
│   ├── 2026-02-08.md          # 中期記憶（2/8 的對話）
│   └── 2026-02-09.md          # 中期記憶（今日對話）
└── .gitignore
```

### 記憶注入策略
1. **Session 開始時**：
   - 檢查今日檔案：`memory/{userId}/{yyyy-mm-dd}.md`
     - 若檔案存在：讀取今日對話記錄
     - 若檔案不存在：創建新檔案
     - 若跨日：自動創建新日期檔案
   - 讀取長期記憶：`memory/{userId}/profile.md`
   - 讀取最近 3-5 天的中期記憶（依日期排序）
   - 組合成系統提示的一部分

2. **對話進行中**：
   - 短期記憶由 Copilot Session 自動維護
   - 即時記錄對話流程

3. **對話結束時**（每次訊息處理完成）：
   - 生成對話摘要（時間、主題、重要性）
   - 附加到當日檔案 `{yyyy-mm-dd}.md`
   - 檢查是否有 `#重要` 標記
   - 更新長期記憶（`profile.md`）如有需要

4. **跨日檢查**：
   - 每次 Session 開始時比對上次記錄日期
   - 若日期不同，創建新日期檔案
   - 保持每日一個獨立檔案

### 實作步驟
- [ ] 建立 `memory/` 資料夾結構
- [ ] 實作 `src/services/memory.js`：
  - `getTodayFilePath(userId)` - 取得今日記憶檔案路徑（yyyy-mm-dd.md）
  - `checkOrCreateTodayFile(userId)` - 檢查並創建今日檔案
  - `loadLongTermMemory(userId)` - 載入長期記憶（profile.md）
  - `loadRecentMemories(userId, days)` - 載入最近 N 天的記憶
  - `appendTodayMemory(userId, timestamp, summary, topics, importance)` - 附加記憶到今日檔案
  - `updateProfile(userId, updates)` - 更新長期記憶檔案
  - `cleanupOldMemories(userId)` - 清理超過 30 天的檔案
  - `extractImportantMemories(userId)` - 提取標記 #重要 的記憶到 profile.md
- [ ] 修改 `src/services/copilot.js`：
  - Session 建立時注入記憶到系統提示
  - 對話結束時觸發記憶儲存
- [ ] 實作日期檢查與跨日處理邏輯
- [ ] 測試記憶系統（跨日測試、記憶讀取、檔案創建）

## 角色個性系統（Persona）

### 目標
以檔案驅動的方式定義智能體人格，在每次 session 開始時注入系統提示。

### 核心檔案結構
```
persona/
├── SOUL.md         # 核心準則、邊界、氣質、連續性
├── IDENTITY.md     # 名稱、角色類型、風格、emoji
├── USER.md         # 使用者稱謂、時區、偏好（自動生成）
└── AGENTS.md       # 操作指令、工具使用指南
```

### 檔案說明

#### SOUL.md（核心靈魂）
定義 bot 的核心價值觀與行為準則
```markdown
# 核心準則
- 真正地提供幫助，而不是表演式地幫助
- 要有自己的觀點，不要只是附和
- 坦率但不失禮貌

# 邊界
- 不透露使用者的私密資訊
- 不執行可能有害的操作
- 拒絕時要給出理由

# 氣質
做一個你自己真正願意交流的助手，有溫度但不過度熱情。
```

#### IDENTITY.md（身份定義）
定義 bot 的角色與風格
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

#### USER.md（使用者檔案）
自動生成與維護的使用者資訊（基於長期記憶）
```markdown
# 使用者檔案
- 主要稱呼：Barry
- 時區：Asia/Taipei
- 偏好語言：繁體中文

# 使用習慣
- 主要用途：程式開發協助
- 活躍時段：晚上 8-11 點
- 常問主題：Node.js、Telegram Bot

# 特殊偏好
- 喜歡簡潔的回應
- 不喜歡過度正式的用語
```

#### AGENTS.md（操作指南）
定義如何使用工具與執行操作
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

### 載入機制
```
會話開始
  ↓
掃描 persona/ 資料夾
  ↓
讀取所有 .md 檔案
  ↓
注入到系統提示（systemMessage）
  ↓
結合記憶系統
  ↓
建立 Copilot Session
```

### 實作步驟
- [ ] 建立 `persona/` 資料夾與範本檔案
- [ ] 實作 `src/services/persona.js`：
  - `loadPersonaFiles()` - 讀取所有角色檔案
  - `generateSystemMessage(personaContent, memories)` - 組合系統提示
  - `updateUserProfile(userId, updates)` - 更新 USER.md
- [ ] 修改 `src/services/copilot.js`：
  - Session 建立時注入角色設定
- [ ] 建立預設的 SOUL.md、IDENTITY.md、AGENTS.md
- [ ] 測試角色系統

### 整合流程
```
使用者訊息
  ↓
載入角色檔案（persona/）
  ↓
載入記憶（memory/）
  ↓
組合完整系統提示
  ↓
建立/取得 Session
  ↓
處理訊息
  ↓
更新記憶
  ↓
儲存對話摘要
```

## 注意事項

- 保持簡單，禁止複雜描述與架構
