import { logger } from "../logger.js";
import { deleteSession, getSession } from "../services/copilot.js";

/**
 * /start 指令處理器
 */
export async function handleStart(bot, msg) {
  logger.info(`[/start] 使用者 ${msg.chat.id} 執行 /start 指令`);
  try {
    await bot.sendMessage(
      msg.chat.id,
      "👋 你好！我是 Copilot Bot。\n直接傳訊息給我，我會用 GitHub Copilot 幫你回答！\n\n指令：\n/new - 開啟新的對話\n/start - 顯示歡迎訊息"
    );
  } catch (error) {
    logger.error(`[/start] 發送訊息失敗: ${error.message}`);
  }
}

/**
 * /new 指令處理器
 */
export async function handleNew(bot, msg) {
  const chatId = msg.chat.id;
  logger.info(`[/new] 使用者 ${chatId} 執行 /new 指令`);
  const session = getSession(chatId);
  if (session) {
    try {
      logger.debug(`[/new] 銷毀現有 session，sessionId: ${session.sessionId}`);
      await session.destroy();
    } catch (error) {
      logger.error(`[/new] 銷毀 session 失敗: ${error.message}`);
    }
    deleteSession(chatId);
    logger.info(`[/new] Session 已清除`);
  }
  try {
    await bot.sendMessage(chatId, "🔄 已開啟新的對話！請直接輸入你的問題。");
  } catch (error) {
    logger.error(`[/new] 發送訊息失敗: ${error.message}`);
  }
}
