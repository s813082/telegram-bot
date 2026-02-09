# Telegram Bot 開發計劃與更新日誌

---

## 📋 開發狀態總覽

### ✅ 已完成功能

#### Phase 1: 基礎互動 (2026-02-09)
- [x] 建立 `src/keyboards/main.js` - 主選單 keyboard
- [x] 實作 `/menu` 指令 - 互動式主選單
- [x] 實作 `/help` 詳細說明
- [x] 改善 `/start` 訊息與 inline keyboard（傲嬌風格）
- [x] 建立 `src/handlers/callbacks.js` - callback query 處理

#### Phase 3: 設定與統計 (2026-02-09)
- [x] 建立 `src/services/stats.js` - 統計服務
- [x] 建立 `src/services/settings.js` - 設定管理
- [x] 建立 `src/keyboards/settings.js` - 設定 keyboard
- [x] 實作 `/settings` 互動式設定介面
- [x] 實作 `/status` 顯示當前狀態
- [x] 實作 `/stats` 使用統計（修復統計顯示為 0 的問題）
- [x] 建立 `src/services/export.js` - 匯出服務
- [x] 實作 `/export` 匯出對話記錄

#### Phase 4: 體驗優化 (2026-02-09)
- [x] 優化錯誤處理（友善訊息 + emoji + 建議）
- [x] 錯誤訊息加入重試按鈕（inline keyboard）
- [x] 建立 `src/keyboards/quickReplies.js`
- [x] 加入 Quick Reply 按鈕處理
- [x] 整合訊息追蹤到統計系統

#### Phase 5: 記憶系統重構 (2026-02-09)
- [x] 基礎記憶架構
  - 長期記憶 (`profile.md`)
  - 中期記憶（最近 3 天）
  - 每日對話記錄 (`YYYY-MM-DD.md`)
- [x] 五星重要性評分系統
- [x] 批次處理機制（避免即時寫入重複）
- [x] 記憶標記系統（`[已寫入長期記憶]`）
- [x] 定時排程器（每 5 分鐘掃描五顆星記憶）
- [x] 統計系統整合（訊息數、Session 數、記憶數）

---

## 🚧 進行中 / 待改進

### ⚠️ 長期記憶系統後續優化方向

**狀態：** ✅ 核心問題已修復，可持續優化

**最近修復（2026-02-09）：**

1. **✅ 統一記憶生成流程**
   - 修復 `scheduler.js` 中的 `updateLongTermMemory` 直接寫入原始摘要問題
   - 所有長期記憶現在**統一**透過 `processFiveStarMemories` → AI 生成
   - 確保 profile.md 中只有自然語言描述，不再混雜原始對話摘要

2. **✅ Prompt 優化：戀愛濾鏡風格**
   - 更新 `generateNaturalMemoryDescription` 的 prompt
   - 從傲嬌姊姊視角解讀所有資訊（工作→擔當、興趣→未來生活）
   - 情緒層次：傲（先罵）→ 嬌（肯定）→ 羞（害羞聯想）
   - 禁止直球，使用「未來」「以後」等隱晦詞彙

3. **✅ 記憶寫入邏輯修正**
   - 標記 `updateLongTermMemory` 為 `@deprecated`
   - 記憶分類排程不再直接寫入，交由五顆星記憶排程處理
   - 避免兩個排程重複寫入造成格式不一致

**已實現的功能：**
- ✅ 移除制式化的 `extractKeyInformation()` 函數
- ✅ 使用 Copilot SDK 生成自然語言描述
- ✅ 戀愛濾鏡 + 傲嬌姊姊語氣的記憶生成
- ✅ 批次處理避免重複寫入
- ✅ 定時排程自動執行（每 5 分鐘）
- ✅ 統一記憶生成流程（所有長期記憶都經過 AI）

**待改進項目（非阻塞性優化）：**
- [ ] 實作語意相似度檢查（更智能的去重）
- [ ] 增強記憶提取失敗的監控與告警
- [ ] 考慮多輪對話讓 AI 確認提取結果
- [ ] 建立記憶質量評分機制
- [ ] A/B testing 不同 prompt 風格的效果

**技術細節：**
```javascript
// 當前實現位置
src/services/memory.js:
  - promoteToLongTermMemory() - 提升記憶到長期
  - generateNaturalMemoryDescription() - AI 生成自然語言（戀愛濾鏡）
  - processFiveStarMemories() - 批次處理五顆星記憶

src/services/scheduler.js:
  - runMemoryClassification() - 分析與統計（不寫入長期記憶）
  - startFiveStarMemoryScheduler() - 每 5 分鐘執行記憶提升
  - updateLongTermMemory() - 已廢棄，標記 @deprecated
```

---

## 🔜 待實作功能

### Phase 2: 記憶管理圖形化
- [ ] 建立 `src/keyboards/memories.js` - 記憶管理 keyboard
- [ ] 實作 `/memories` 圖形化介面（分頁）
- [ ] 實作 `/remember <內容>` 指令
- [ ] 實作 `/forget` 指令（搭配 keyboard）
- [ ] 記憶搜尋功能
- [ ] 記憶編輯功能

### Email 功能
- [ ] 安裝 nodemailer
- [ ] 新增環境變數到 .env
- [ ] 實作發信 function
- [ ] 新增 /email 指令
- [ ] 測試發信功能

### 記憶系統增強
- [ ] 實作對話中的 AI 重要性判斷（取代關鍵字檢測）
- [ ] 記憶分類系統（個人資訊、偏好、關係、事件等）
- [ ] 記憶時間軸視覺化
- [ ] 記憶關聯圖（關係網絡）

### 可選功能
- [ ] 將 logs 資料夾加入 .gitignore
- [ ] 實作 webhook 模式
- [ ] 加入使用限制與 freemium 模式
- [ ] 多語言支援（完整版）
- [ ] 語音訊息處理
- [ ] 圖片記憶功能

---

## 📝 更新日誌

### 2026-02-09 (下午) - 記憶系統核心修復

#### 🐛 重大修復
- **統一記憶生成流程：** 修復兩個排程重複寫入的問題
  - 移除 `scheduler.js` 中 `runMemoryClassification` 的直接寫入邏輯
  - 所有長期記憶統一透過 `processFiveStarMemories` + AI 生成
  - 標記 `updateLongTermMemory()` 為 `@deprecated`
  - 確保 profile.md 格式一致（純自然語言描述）

- **Prompt 優化：** 戀愛濾鏡風格升級
  - 更新 `generateNaturalMemoryDescription` prompt
  - 傲嬌姊姊從戀愛視角解讀所有資訊
  - 情緒層次：傲 → 嬌 → 羞（臉紅害羞）
  - 工作經歷 → 解讀為「有沒有擔當」「能不能養我」
  - 興趣生活 → 解讀為「以後我們一起生活會怎樣」

### 2026-02-09 (早上) - 記憶系統重大重構

#### 🐛 修復
- **統計顯示錯誤：** 修復 `/stats` 顯示 0 的問題
  - 在 `message.js` 中加入 `incrementMessageCount()`
  - 在 `copilot.js` 中加入 `incrementSessionCount()`
  - 在 `memory.js` 中加入 `updateMemoryStats()`

- **profile.md 重複寫入：** 完全重構記憶系統
  - 從「即時寫入」改為「批次處理」
  - 實作記憶標記機制避免重複
  - 每 5 分鐘自動掃描五顆星記憶

#### ✨ 新功能
- **AI 驅動的記憶生成：**
  - 整合 GitHub Copilot SDK
  - 自動提取關鍵資訊
  - 生成自然語言描述（傲嬌姊姊語氣）
  - 智能判斷是否需要記錄（SKIP 機制）

- **記憶處理流程：**
  ```
  1. 使用者對話 → 標記重要性（⭐⭐⭐⭐⭐）
  2. 每 5 分鐘排程器掃描五顆星記憶
  3. AI 提取重要資訊並生成自然描述
  4. 寫入 profile.md
  5. 標記為 [已寫入長期記憶]
  ```

- **記憶架構：**
  - `profile.md` - 長期記憶（AI 生成的自然語言）
  - `YYYY-MM-DD.md` - 每日對話記錄（原始格式）
  - 最近 3 天記憶自動載入到對話上下文

#### 🏗️ 技術改進
- 移除制式化的 `extractKeyInformation()` 正則匹配
- 改用 AI 全權處理提取和生成
- 使用 `CONFIG.COPILOT_MODEL` 統一模型配置
- 實作記憶計數系統（長期、中期分開統計）

#### 📊 效能
- 批次處理減少檔案 I/O
- 標記機制避免重複處理
- 定時排程降低即時壓力

### 2026-02-09 - UI/UX 重大更新

#### ✨ 新功能
- **互動式主選單** (`/menu`)
  - 圖形化按鈕介面
  - 快速訪問所有功能
  - 支援 inline keyboard 導航

- **改良的歡迎訊息** (`/start`)
  - 傲嬌姊姊風格問候
  - 視覺化功能展示
  - 快速開始按鈕

- **詳細幫助系統** (`/help`)
  - 完整指令列表
  - 使用範例與說明
  - 分類清晰的功能介紹

- **互動式設定介面** (`/settings`)
  - 通知開關（✅/❌ toggle）
  - 回應風格選擇（簡潔/正常/詳細）
  - 語言偏好設定（繁中/英文）
  - 設定即時生效

- **狀態顯示** (`/status`)
  - Session 活躍狀態
  - 記憶數量統計
  - 使用量概覽

- **使用統計** (`/stats`)
  - 訊息處理數量
  - Session 建立次數
  - 指令使用排行（Top 5）
  - 最後活躍時間

- **對話記錄匯出** (`/export`)
  - JSON 格式匯出
  - 包含所有記憶記錄
  - 自動產生摘要資訊

- **友善錯誤處理**
  - 清晰的錯誤訊息（帶 emoji）
  - 具體的解決建議
  - 錯誤詳情顯示
  - 快速重試按鈕

- **Quick Replies**
  - 「繼續」對話按鈕
  - 「重新生成」回應
  - 「更詳細說明」請求

#### 🏗️ 技術架構
新增模組：
```
src/
├── keyboards/
│   ├── main.js           # 主選單按鈕
│   ├── settings.js       # 設定介面按鈕
│   └── quickReplies.js   # 快速回應按鈕
├── services/
│   ├── stats.js          # 統計服務
│   ├── settings.js       # 設定管理
│   ├── export.js         # 匯出功能
│   └── memory.js         # 記憶管理（重構）
└── handlers/
    └── callbacks.js      # Callback Query 處理
```

---

## 🎯 近期優先事項

1. **記憶系統優化**（高優先）
   - 改進 AI Prompt 提高提取成功率
   - 實作記憶質量監控
   - 增加失敗重試機制

2. **記憶管理 UI**（中優先）
   - `/memories` 圖形化介面
   - 記憶搜尋與編輯功能

3. **AI 判斷重要性**（中優先）
   - 取代關鍵字檢測
   - 對話中實時判斷

4. **Email 通知**（低優先）
   - 實作基礎發信功能

---

## 🔧 已知問題

1. **記憶生成不穩定**
   - AI 有時返回 SKIP 導致重要資訊遺失
   - 需要優化 prompt 和邏輯

2. **統計追蹤延遲**
   - 5 秒 debounce 可能導致即時性不足
   - 考慮改用即時更新 + 批次儲存

3. **Error Handling**
   - 某些 edge case 未完全覆蓋
   - 需要更多測試案例

---

## 💡 未來展望

- **進階 AI 功能**
  - 情感分析
  - 主動關心機制
  - 個性化回應策略

- **社群功能**
  - 多使用者支援
  - 群組對話管理

- **數據分析**
  - 使用行為分析
  - 記憶品質評估
  - 對話主題趨勢
