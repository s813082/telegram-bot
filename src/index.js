import { CopilotClient } from "@github/copilot-sdk";
import "dotenv/config";
import TelegramBot from "node-telegram-bot-api";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import winston from "winston";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── 日誌系統設定 ──────────────────────────────────────
const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(
      (info) => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}${info.stack ? "\n" + info.stack : ""}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: join(__dirname, "..", "logs", "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: join(__dirname, "..", "logs", "combined.log"),
    }),
  ],
});

// ── 設定 ──────────────────────────────────────────────
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_TOKEN) {
  logger.error("請在 .env 檔案中設定 TELEGRAM_BOT_TOKEN");
  process.exit(1);
}

logger.info("環境變數載入完成");

// ── 初始化 Telegram Bot ───────────────────────────────
logger.info("初始化 Telegram Bot...");
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });
logger.info("Telegram Bot 初始化完成");

// ── 初始化 Copilot Client ─────────────────────────────
logger.info("初始化 Copilot Client...");
const copilotClient = new CopilotClient();
logger.info("Copilot Client 初始化完成");

// 每個 chat 對應一個 Copilot session，實現多輪對話
const sessions = new Map();

/**
 * 取得或建立指定 chatId 的 Copilot session
 */
async function getOrCreateSession(chatId) {
  logger.debug(`[getOrCreateSession] 進入函數，chatId: ${chatId}`);

  if (sessions.has(chatId)) {
    logger.debug(`[getOrCreateSession] 找到現有 session，chatId: ${chatId}`);
    return sessions.get(chatId);
  }

  logger.info(`[getOrCreateSession] 建立新 session，chatId: ${chatId}`);
  const session = await copilotClient.createSession({
    model: "gpt-4o",
    systemMessage: {
      mode: "append",
      content:
        "你是傲嬌姊姊，對弟弟嘴上兇但內心溫柔。用繁體中文回覆。稱呼：笨蛋弟弟。先嫌棄再提供幫助。用 **粗體**、*斜體*、換行、emoji（💕😤🙄✨💢）。有工具就用工具查實際資訊。",
    },
  });

  logger.debug(`[getOrCreateSession] Session 建立完成，sessionId: ${session.sessionId}`);
  sessions.set(chatId, session);
  return session;
}

/**
 * 將使用者訊息送到 Copilot，等待回覆
 */
async function askCopilot(session, prompt, chatId) {
  logger.debug(`[askCopilot] 進入函數，sessionId: ${session.sessionId}, prompt 長度: ${prompt.length}`);
  logger.debug(`[askCopilot] Prompt 內容: ${prompt}`);

  let thinkingIntervalId;
  let thinkingCounter = 0;
  const thinkingEmojis = ["🤔", "💭", "⏳", "🔍", "💡", "🧠", "⚙️", "🔄"];

  try {
    // 啟動「思考中」訊息定時器
    logger.debug(`[askCopilot] 啟動思考中訊息定時器`);
    thinkingIntervalId = setInterval(() => {
      thinkingCounter++;
      const emoji = thinkingEmojis[thinkingCounter % thinkingEmojis.length];
      const message = `${emoji} 正在思考中... (${thinkingCounter * 30}秒)`;
      logger.debug(`[askCopilot] 發送思考中訊息: ${message}`);
      bot.sendMessage(chatId, message).catch((err) => {
        logger.error(`[askCopilot] 發送思考中訊息失敗: ${err.message}`);
      });
    }, 30000);

    logger.info(`[askCopilot] 開始呼叫 session.sendAndWait，timeout: 180秒`);
    const response = await session.sendAndWait({ prompt }, 180_000);
    logger.debug(`[askCopilot] session.sendAndWait 完成`);

    // 清除定時器
    if (thinkingIntervalId) {
      logger.debug(`[askCopilot] 清除思考中訊息定時器`);
      clearInterval(thinkingIntervalId);
    }

    if (response && response.data && response.data.content) {
      logger.info(`[askCopilot] 收到回應，長度: ${response.data.content.length}`);
      logger.debug(`[askCopilot] 回應內容: ${response.data.content.substring(0, 200)}...`);
      return response.data.content;
    }

    logger.warn(`[askCopilot] Copilot 沒有回應`);
    return "（Copilot 沒有回應，請稍後再試）";
  } catch (error) {
    // 清除定時器
    if (thinkingIntervalId) {
      logger.debug(`[askCopilot] [錯誤處理] 清除思考中訊息定時器`);
      clearInterval(thinkingIntervalId);
    }
    logger.error(`[askCopilot] 錯誤: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

// ── Telegram 指令處理 ─────────────────────────────────

// /start - 歡迎訊息
bot.onText(/\/start/, (msg) => {
  logger.info(`[/start] 使用者 ${msg.chat.id} 執行 /start 指令`);
  bot.sendMessage(
    msg.chat.id,
    "👋 你好！我是 Copilot Bot。\n直接傳訊息給我，我會用 GitHub Copilot 幫你回答！\n\n指令：\n/new - 開啟新的對話\n/start - 顯示歡迎訊息"
  );
});

// /new - 重置對話
bot.onText(/\/new/, async (msg) => {
  const chatId = msg.chat.id;
  logger.info(`[/new] 使用者 ${chatId} 執行 /new 指令`);
  const session = sessions.get(chatId);
  if (session) {
    try {
      logger.debug(`[/new] 銷毀現有 session，sessionId: ${session.sessionId}`);
      await session.destroy();
    } catch (error) {
      logger.error(`[/new] 銷毀 session 失敗: ${error.message}`);
    }
    sessions.delete(chatId);
    logger.info(`[/new] Session 已清除`);
  }
  bot.sendMessage(chatId, "🔄 已開啟新的對話！請直接輸入你的問題。");
});

// ── 處理一般訊息 ──────────────────────────────────────
bot.on("message", async (msg) => {
  // 跳過指令訊息
  if (!msg.text || msg.text.startsWith("/")) {
    logger.debug(`[message] 跳過指令訊息或空訊息`);
    return;
  }

  const chatId = msg.chat.id;
  const userText = msg.text;

  logger.info(`[message] ═══════════════════════════════════════`);
  logger.info(`[message] 收到訊息 | User ${chatId}: ${userText}`);
  logger.debug(`[message] 訊息詳細資訊: ${JSON.stringify(msg, null, 2)}`);

  // 傳送「正在輸入」狀態
  logger.debug(`[message] 發送 typing 狀態`);
  bot.sendChatAction(chatId, "typing");

  try {
    logger.debug(`[message] 呼叫 getOrCreateSession`);
    const session = await getOrCreateSession(chatId);
    logger.debug(`[message] getOrCreateSession 完成，取得 sessionId: ${session.sessionId}`);

    logger.debug(`[message] 呼叫 askCopilot`);
    const reply = await askCopilot(session, userText, chatId);
    logger.debug(`[message] askCopilot 完成，收到回應長度: ${reply.length}`);

    logger.info(`[message] Copilot 回應 | User ${chatId}: ${reply.substring(0, 100)}...`);

    // Telegram 每則訊息上限 4096 字元，超過就分段傳送
    logger.debug(`[message] 準備發送訊息到 Telegram`);
    if (reply.length <= 4096) {
      logger.debug(`[message] 直接發送單則訊息`);
      await bot.sendMessage(chatId, reply, { parse_mode: "Markdown" });
      logger.debug(`[message] 訊息發送完成`);
    } else {
      const chunks = reply.match(/[\s\S]{1,4096}/g) || [reply];
      logger.debug(`[message] 訊息過長，分成 ${chunks.length} 段發送`);
      for (let i = 0; i < chunks.length; i++) {
        logger.debug(`[message] 發送第 ${i + 1}/${chunks.length} 段`);
        await bot.sendMessage(chatId, chunks[i], { parse_mode: "Markdown" });
      }
      logger.debug(`[message] 所有分段發送完成`);
    }

    logger.info(`[message] 訊息處理完成`);
  } catch (error) {
    logger.error(`[message] 錯誤發生 | User ${chatId}: ${error.message}`);
    logger.error(`[message] 錯誤堆疊:`, { stack: error.stack });

    // 如果 session 出錯，清掉舊的，下次重建
    const session = sessions.get(chatId);
    if (session) {
      try {
        logger.debug(`[message] [錯誤處理] 銷毀 session: ${session.sessionId}`);
        await session.destroy();
      } catch (destroyError) {
        logger.error(`[message] [錯誤處理] 銷毀 session 失敗: ${destroyError.message}`);
      }
      sessions.delete(chatId);
      logger.info(`[message] [錯誤處理] Session 已清除`);
    }

    await bot.sendMessage(
      chatId,
      "❌ 處理訊息時發生錯誤，請稍後再試，或輸入 /new 開啟新對話。"
    );
  }
});

// ── 優雅關閉 ──────────────────────────────────────────
async function shutdown() {
  logger.info("\n收到關閉信號，開始清理資源...");
  bot.stopPolling();

  // 清理所有 session
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
