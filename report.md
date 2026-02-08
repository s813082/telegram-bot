# Telegram Copilot Bot 優化報告與方向

## 摘要

這個專案是把 Telegram 訊息轉發給 GitHub Copilot SDK 建多輪 session 的中介型 bot，首要目標是提升可靠性、回應速度、可維運性與工具觸發正確性（優先使用 telegram-bot-builder 與 copilot-sdk 指南）。

## 優化方向（重點）

1. 架構重整
   - 把 monolithic 的 src/index.js 拆成模組：bot, commands, handlers, services, utils
   - 考慮改用更成熟的中介層框架（例如 telegraf 或 grammY）以利 middleware、callback query 與複雜對話流程

2. Copilot SDK 最佳化
   - 啟用 streaming 回傳改善使用者等待 UX（逐步回傳回覆）
   - 把常用能力封裝為 tools（weather, file_analyzer, repo_search 等），並在 session 創建時註冊
   - 設定合適的 timeout、重試與並發限制

3. 可觀察性與健壯性
   - 加強日誌：結構化 (JSON) 日誌、log level 與 correlation id（sessionId, chatId）
   - 錯誤分類與警示（Sentry / Prometheus + Alertmanager）
   - 加入 rate-limiter、防止惡意或高頻濫用

4. 可用性
   - 訊息去重／合併長回覆
   - 更精準的 typing / 進度回報（使用 streaming 即時回傳）
   - Session persistence（選擇 memory + TTL 或簡單 DB e.g., Redis）與自動清理策略
   - Markdown / Telegram 限制處理（escape 特殊字元、分段）

5. 運營性 & 擴充
   - 改用 webhook 模式以利水平擴充（NGINX / Cloud Run / K8s）
   - 監控儀表板（錯誤率、延遲、使用量）與 SLO
   - 多租戶或配額策略（付費/免費節流）

## 立刻可執行的三步（短期里程）

A) 拆模組與 middleware：把 index.js 拆為 bot, handlers, services 並加入錯誤中介

B) 啟用 Copilot streaming + 範例 tools：在創建 session 時開啟 streaming 並註冊 get_weather & file_analyzer 範例，實作逐步推送到 Telegram 的流程

C) 日誌與 SLO：把 winston 設為 JSON 日誌並輸出 correlation id，配置 basic Prometheus metrics（錯誤率、平均延遲、active sessions）

## 建議優先順序

1. Copilot streaming + tools（提升 UX，立刻可見）
2. 拆模組與 middleware（改善可維運性與測試性）
3. 切換 webhook + 擴充（運營與穩定性）
4. 可觀察性、監控與配額

## 風險與注意事項

- Streaming 需要在 client 端實作逐步回傳邏輯，並處理部分回覆的中斷/錯誤
- 若使用第三方 services（Sentry, Redis, Prometheus），需評估成本與資安
- webhook 模式需暴露 public endpoint，請注意 TLS / auth / rate limits

## 下一步

請選擇要我開始實作的項目：
- A) 在現有程式加入 Copilot streaming 與範例 tools（推薦）
- B) 把專案重構為 telegraf/grammY 架構
- C) 設定 webhook 與容器化部署範例

選項：