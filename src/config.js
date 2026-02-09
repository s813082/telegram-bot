import "dotenv/config";

// ── 環境變數 ──────────────────────────────────────────
export const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID;

// ── 應用程式設定 ───────────────────────────────────────
export const CONFIG = {
  // Telegram Token（用於圖片下載 URL 組合）
  TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN,

  // 速率限制
  RATE_LIMIT_MAX_MESSAGES: 5,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 分鐘

  // Copilot 設定
  COPILOT_MODEL: "gpt-4o",
  COPILOT_TIMEOUT_MS: 180000, // 3 分鐘

  // 思考中訊息
  THINKING_UPDATE_INTERVAL_MS: 30000, // 30 秒
  THINKING_EMOJIS: ["🤔", "💭", "⏳", "🔍", "💡", "🧠", "⚙️", "🔄"],

  // Telegram 設定
  TELEGRAM_MESSAGE_MAX_LENGTH: 4096,

  // 記憶體清理
  MEMORY_CLEANUP_INTERVAL_MS: 300000, // 5 分鐘
};

// ── 驗證必要環境變數 ───────────────────────────────────
export function validateConfig(logger) {
  if (!TELEGRAM_TOKEN) {
    logger.error("請在 .env 檔案中設定 TELEGRAM_BOT_TOKEN");
    process.exit(1);
  }
  logger.info("環境變數載入完成");
}
