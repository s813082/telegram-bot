import { ALLOWED_USER_ID, CONFIG } from "../config.js";
import { logger } from "../logger.js";
import { checkRateLimit } from "../middleware/rateLimit.js";
import { askCopilot, deleteSession, getOrCreateSession, getSession } from "../services/copilot.js";
import { appendTodayMemory } from "../services/memory.js";

/**
 * 檢查使用者是否在白名單中
 */
function isAllowedUser(userId) {
  return String(userId) === String(ALLOWED_USER_ID);
}

/**
 * 安全發送 Telegram 訊息，支援 Markdown 格式並有 fallback
 */
async function safeSendMessage(bot, chatId, text) {
  try {
    // 先嘗試使用 Markdown 格式
    await bot.sendMessage(chatId, text, { parse_mode: "Markdown" });
    logger.debug(`[safeSendMessage] 成功發送 Markdown 訊息`);
  } catch (error) {
    logger.warn(`[safeSendMessage] Markdown 解析失敗，改用純文字: ${error.message}`);
    try {
      // Markdown 解析失敗，改用純文字
      await bot.sendMessage(chatId, text);
      logger.debug(`[safeSendMessage] 成功發送純文字訊息`);
    } catch (plainTextError) {
      logger.error(`[safeSendMessage] 發送純文字訊息也失敗: ${plainTextError.message}`);
      throw plainTextError;
    }
  }
}

/**
 * 處理一般訊息
 */
export async function handleMessage(bot, msg) {
  // 跳過指令訊息
  if (!msg.text || msg.text.startsWith("/")) {
    logger.debug(`[message] 跳過指令訊息或空訊息`);
    return;
  }

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const userText = msg.text;

  // 白名單檢查
  if (!isAllowedUser(userId)) {
    logger.warn(`[message] 拒絕非白名單使用者 | User ${userId} (${msg.from.first_name || "Unknown"})`);
    return; // 不回應，直接忽略
  }

  logger.info(`[message] ═══════════════════════════════════════`);
  logger.info(`[message] 收到訊息 | User ${chatId}: ${userText}`);
  logger.debug(`[message] 訊息詳細資訊: ${JSON.stringify(msg, null, 2)}`);

  // 檢查速率限制
  if (!checkRateLimit(chatId)) {
    logger.warn(`[message] 使用者 ${chatId} 超過速率限制，拒絕處理`);
    try {
      await bot.sendMessage(
        chatId,
        "⚠️ 訊息發送過於頻繁，請稍後再試。(每分鐘最多 5 則訊息)"
      );
    } catch (error) {
      logger.error(`[message] 發送速率限制訊息失敗: ${error.message}`);
    }
    return;
  }

  // 傳送「正在輸入」狀態
  logger.debug(`[message] 發送 typing 狀態`);
  try {
    await bot.sendChatAction(chatId, "typing");
  } catch (error) {
    logger.error(`[message] 發送 typing 狀態失敗: ${error.message}`);
  }

  try {
    logger.debug(`[message] 呼叫 getOrCreateSession`);
    const session = await getOrCreateSession(chatId);
    logger.debug(`[message] getOrCreateSession 完成，取得 sessionId: ${session.sessionId}`);

    logger.debug(`[message] 呼叫 askCopilot`);
    const reply = await askCopilot(bot, session, userText, chatId);
    logger.debug(`[message] askCopilot 完成，收到回應長度: ${reply.length}`);

    logger.info(`[message] Copilot 回應 | User ${chatId}: ${reply.substring(0, 100)}...`);

    // Telegram 每則訊息上限 4096 字元，超過就分段傳送
    logger.debug(`[message] 準備發送訊息到 Telegram`);
    if (reply.length <= CONFIG.TELEGRAM_MESSAGE_MAX_LENGTH) {
      logger.debug(`[message] 直接發送單則訊息`);
      await safeSendMessage(bot, chatId, reply);
      logger.debug(`[message] 訊息發送完成`);
    } else {
      const chunks = reply.match(/[\s\S]{1,4096}/g) || [reply];
      logger.debug(`[message] 訊息過長，分成 ${chunks.length} 段發送`);
      for (let i = 0; i < chunks.length; i++) {
        logger.debug(`[message] 發送第 ${i + 1}/${chunks.length} 段`);
        await safeSendMessage(bot, chatId, chunks[i]);
      }
      logger.debug(`[message] 所有分段發送完成`);
    }

    // 儲存對話記憶
    try {
      const now = new Date();
      const timestamp = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      // 簡單摘要（取前 100 字元）
      const summary = `使用者: ${userText.substring(0, 50)}${userText.length > 50 ? "..." : ""} | 回應: ${reply.substring(0, 50)}${reply.length > 50 ? "..." : ""}`;

      // 檢測關鍵字來判斷重要性
      const isImportant = userText.includes("記住") || userText.includes("重要") || userText.includes("別忘了");
      const importance = isImportant ? 5 : 3;

      appendTodayMemory(chatId, timestamp, summary, [], importance, isImportant);
      logger.debug(`[message] 對話記憶已儲存`);
    } catch (memoryError) {
      logger.error(`[message] 儲存記憶失敗: ${memoryError.message}`);
      // 不影響主流程，繼續執行
    }

    logger.info(`[message] 訊息處理完成`);
  } catch (error) {
    logger.error(`[message] 錯誤發生 | User ${chatId}: ${error.message}`);
    logger.error(`[message] 錯誤堆疊:`, { stack: error.stack });

    // 如果 session 出錯，清掉舊的，下次重建
    const session = getSession(chatId);
    if (session) {
      try {
        logger.debug(`[message] [錯誤處理] 銷毀 session: ${session.sessionId}`);
        await session.destroy();
      } catch (destroyError) {
        logger.error(`[message] [錯誤處理] 銷毀 session 失敗: ${destroyError.message}`);
      }
      deleteSession(chatId);
      logger.info(`[message] [錯誤處理] Session 已清除`);
    }

    try {
      await bot.sendMessage(
        chatId,
        "❌ 處理訊息時發生錯誤，請稍後再試，或輸入 /new 開啟新對話。"
      );
    } catch (sendError) {
      logger.error(`[message] [錯誤處理] 發送錯誤訊息失敗: ${sendError.message}`);
    }
  }
}
