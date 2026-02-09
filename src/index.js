import TelegramBot from "node-telegram-bot-api";
import { TELEGRAM_TOKEN, validateConfig } from "./config.js";
import { handleNew, handleStart } from "./handlers/commands.js";
import { handleMessage } from "./handlers/message.js";
import { logger } from "./logger.js";
import { startRateLimitCleanup } from "./middleware/rateLimit.js";
import { copilotClient, getAllSessions } from "./services/copilot.js";

// ── 驗證設定 ──────────────────────────────────────────
validateConfig(logger);

// ── 初始化 Telegram Bot ───────────────────────────────
logger.info("初始化 Telegram Bot...");
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
logger.info("Telegram Bot 初始化完成");

// ── 啟動記憶體清理排程 ────────────────────────────────
startRateLimitCleanup();

// ── Telegram 指令處理 ─────────────────────────────────
bot.onText(/\/start/, (msg) => handleStart(bot, msg));
bot.onText(/\/new/, (msg) => handleNew(bot, msg));

// ── 處理一般訊息 ──────────────────────────────────────
bot.on("message", (msg) => handleMessage(bot, msg));

// ── 優雅關閉 ──────────────────────────────────────────
async function shutdown() {
  logger.info("\n收到關閉信號，開始清理資源...");
  bot.stopPolling();

  // 清理所有 session
  const sessions = getAllSessions();
  logger.info(`清理 ${sessions.size} 個 session...`);
  for (const [chatId, session] of sessions) {
    try {
      logger.debug(`銷毀 session: chatId=${chatId}, sessionId=${session.sessionId}`);
      await session.destroy();
    } catch (error) {
      logger.error(`銷毀 session 失敗: ${error.message}`);
    }
  }
  sessions.clear();

  try {
    logger.info("停止 Copilot Client...");
    await copilotClient.stop();
  } catch (error) {
    logger.error(`停止 Copilot Client 失敗: ${error.message}`);
  }

  logger.info("已關閉。");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

// ── 啟動 ─────────────────────────────────────────────
logger.info("═══════════════════════════════════════════════════");
logger.info("🤖 Telegram Copilot Bot 已啟動！等待訊息中...");
logger.info("═══════════════════════════════════════════════════");

