import "dotenv/config";

// ── 環境變數 ──────────────────────────────────────────
export const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
export const ALLOWED_USER_ID = process.env.ALLOWED_USER_ID;

// ── 解析環境變數輔助函數 ───────────────────────────────
const parseInt = (val, defaultVal) => {
  const parsed = Number(val);
  return isNaN(parsed) ? defaultVal : parsed;
};

const parseArray = (val, defaultVal) => {
  if (!val) return defaultVal;
  return val.split(',').map(s => s.trim());
};

// ── 應用程式設定 ───────────────────────────────────────
export const CONFIG = {
  // Telegram Token（用於圖片下載 URL 組合）
  TELEGRAM_BOT_TOKEN: TELEGRAM_TOKEN,

  // Copilot 設定
  COPILOT_MODEL: process.env.COPILOT_MODEL || "gpt-4o",
  COPILOT_TIMEOUT_MS: parseInt(process.env.COPILOT_TIMEOUT_MS, 180000), // 3 分鐘

  // 思考中訊息
  THINKING_UPDATE_INTERVAL_MS: parseInt(process.env.THINKING_UPDATE_INTERVAL_MS, 30000), // 30 秒
  THINKING_EMOJIS: parseArray(process.env.THINKING_EMOJIS, ["🤔", "💭", "⏳", "🔍", "💡", "🧠", "⚙️", "🔄"]),

  // Telegram 設定
  TELEGRAM_MESSAGE_MAX_LENGTH: parseInt(process.env.TELEGRAM_MESSAGE_MAX_LENGTH, 4096),

  // 速率限制
  RATE_LIMIT_MAX_MESSAGES: parseInt(process.env.RATE_LIMIT_MAX_MESSAGES, 5),
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 60000), // 1 分鐘

  // 記憶系統
  MEMORY_RETENTION_DAYS: parseInt(process.env.MEMORY_RETENTION_DAYS, 30),
  MEMORY_RECENT_DAYS: parseInt(process.env.MEMORY_RECENT_DAYS, 3),
  MEMORY_CLEANUP_INTERVAL_MS: parseInt(process.env.MEMORY_CLEANUP_INTERVAL_MS, 300000), // 5 分鐘

  // 記憶分類排程
  SCHEDULER_CRON: process.env.SCHEDULER_CRON || "*/5 * * * *", // 預設每 5 分鐘

  // 日誌設定
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  LOG_PATH: process.env.LOG_PATH || "./logs",

  // 環境
  NODE_ENV: process.env.NODE_ENV || "development",
};

// ── 驗證必要環境變數 ───────────────────────────────────
export function validateConfig(logger) {
  if (!TELEGRAM_TOKEN) {
    logger.error("請在 .env 檔案中設定 TELEGRAM_BOT_TOKEN");
    process.exit(1);
  }
  logger.info("環境變數載入完成");
}
