import { CopilotClient } from "@github/copilot-sdk";
import { CONFIG } from "../config.js";
import { logger } from "../logger.js";
import { loadAllMemories, loadTodayConversations } from "./memory.js";
import { getPersonaSystemMessage } from "./persona.js";

// ── 初始化 Copilot Client ─────────────────────────────
logger.info("初始化 Copilot Client...");
export const copilotClient = new CopilotClient();
logger.info("Copilot Client 初始化完成");

// 每個 chat 對應一個 Copilot session，實現多輪對話
const sessions = new Map();

/**
 * 取得或建立指定 chatId 的 Copilot session
 * @param {number} chatId - 使用者的 chatId
 */
export async function getOrCreateSession(chatId) {
  logger.debug(`[getOrCreateSession] 進入函數，chatId: ${chatId}`);

  if (sessions.has(chatId)) {
    logger.debug(`[getOrCreateSession] 找到現有 session，chatId: ${chatId}`);
    return sessions.get(chatId);
  }

  logger.info(`[getOrCreateSession] 建立新 session，chatId: ${chatId}`);

  // 載入使用者記憶
  const memories = loadAllMemories(chatId);

  // 生成包含記憶的系統訊息
  const systemMessage = getPersonaSystemMessage(memories);

  const session = await copilotClient.createSession({
    model: CONFIG.COPILOT_MODEL,
    systemMessage: {
      mode: "append",
      content: systemMessage,
    },
  });

  logger.debug(`[getOrCreateSession] Session 建立完成，sessionId: ${session.sessionId}`);
  sessions.set(chatId, session);
  return session;
}

/**
 * 檢查錯誤是否為 session 失效相關錯誤
 */
function isSessionInvalidError(error) {
  const message = error.message || "";
  return (
    message.includes("Session not found") ||
    message.includes("connection got disposed") ||
    message.includes("Pending response rejected")
  );
}

/**
 * 將使用者訊息送到 Copilot，等待回覆
 * 支援 session 自動重建與重試
 */
export async function askCopilot(bot, session, prompt, chatId, retryCount = 0) {
  logger.debug(`[askCopilot] 進入函數，sessionId: ${session.sessionId}, prompt 長度: ${prompt.length}, 重試次數: ${retryCount}`);
  logger.debug(`[askCopilot] Prompt 內容: ${prompt}`);

  let thinkingIntervalId;
  let thinkingCounter = 0;
  let thinkingMessageId = null;

  try {
    // 發送初始「思考中」訊息
    logger.debug(`[askCopilot] 發送初始思考中訊息`);
    try {
      const sentMessage = await bot.sendMessage(chatId, "🤔 正在思考中...");
      thinkingMessageId = sentMessage.message_id;
      logger.debug(`[askCopilot] 思考中訊息已發送，messageId: ${thinkingMessageId}`);
    } catch (err) {
      logger.error(`[askCopilot] 發送初始思考中訊息失敗: ${err.message}`);
    }

    // 啟動「思考中」訊息定時器 - 編輯同一則訊息
    logger.debug(`[askCopilot] 啟動思考中訊息定時器`);
    thinkingIntervalId = setInterval(async () => {
      if (thinkingMessageId) {
        thinkingCounter++;
        const emoji = CONFIG.THINKING_EMOJIS[thinkingCounter % CONFIG.THINKING_EMOJIS.length];
        const message = `${emoji} 正在思考中... (${thinkingCounter * (CONFIG.THINKING_UPDATE_INTERVAL_MS / 1000)}秒)`;
        logger.debug(`[askCopilot] 更新思考中訊息: ${message}`);
        try {
          await bot.editMessageText(message, {
            chat_id: chatId,
            message_id: thinkingMessageId,
          });
        } catch (err) {
          logger.error(`[askCopilot] 更新思考中訊息失敗: ${err.message}`);
        }
      }
    }, CONFIG.THINKING_UPDATE_INTERVAL_MS);

    logger.info(`[askCopilot] 開始呼叫 session.sendAndWait，sessionId: ${session.sessionId}, timeout: ${CONFIG.COPILOT_TIMEOUT_MS / 1000}秒`);
    const response = await session.sendAndWait({ prompt }, CONFIG.COPILOT_TIMEOUT_MS);
    logger.debug(`[askCopilot] session.sendAndWait 完成`);

    // 清除定時器並刪除思考中訊息
    if (thinkingIntervalId) {
      logger.debug(`[askCopilot] 清除思考中訊息定時器`);
      clearInterval(thinkingIntervalId);
    }
    if (thinkingMessageId) {
      try {
        await bot.deleteMessage(chatId, thinkingMessageId);
        logger.debug(`[askCopilot] 已刪除思考中訊息`);
      } catch (err) {
        logger.error(`[askCopilot] 刪除思考中訊息失敗: ${err.message}`);
      }
    }

    if (response && response.data && response.data.content) {
      logger.info(`[askCopilot] 收到回應，長度: ${response.data.content.length}`);
      logger.debug(`[askCopilot] 回應內容: ${response.data.content.substring(0, 200)}...`);
      return response.data.content;
    }

    logger.warn(`[askCopilot] Copilot 沒有回應`);
    return "（Copilot 沒有回應，請稍後再試）";
  } catch (error) {
    // 清除定時器並刪除思考中訊息
    if (thinkingIntervalId) {
      logger.debug(`[askCopilot] [錯誤處理] 清除思考中訊息定時器`);
      clearInterval(thinkingIntervalId);
    }
    if (thinkingMessageId) {
      try {
        await bot.deleteMessage(chatId, thinkingMessageId);
        logger.debug(`[askCopilot] [錯誤處理] 已刪除思考中訊息`);
      } catch (err) {
        logger.error(`[askCopilot] [錯誤處理] 刪除思考中訊息失敗: ${err.message}`);
      }
    }

    // 檢查是否為 session 失效錯誤且未達重試上限
    if (isSessionInvalidError(error) && retryCount === 0) {
      logger.warn(`[askCopilot] 偵測到 session 失效錯誤，嘗試重建 session 並重試`);
      logger.warn(`[askCopilot] 錯誤訊息: ${error.message}`);

      // 從 Map 移除失效的 session
      logger.info(`[askCopilot] 移除失效的 session，chatId: ${chatId}`);
      deleteSession(chatId);

      try {
        // 重新建立 session
        logger.info(`[askCopilot] 重新建立 session，chatId: ${chatId}`);
        const newSession = await getOrCreateSession(chatId);
        logger.info(`[askCopilot] Session 重建完成，新 sessionId: ${newSession.sessionId}`);

        // 注入今日對話上下文（讓新 session 知道今天稍早發生的事）
        const todayConversations = loadTodayConversations(chatId);
        if (todayConversations) {
          logger.info(`[askCopilot] 注入今日對話上下文到新 session`);
          const contextPrompt = `[系統訊息] 由於 session 重建，這是你與使用者今天稍早的對話記錄：\n\n${todayConversations}\n\n請根據以上內容，接續對話。不要重複問候，直接回應使用者的最新訊息。`;

          try {
            // 先發送上下文（不等待回應）
            await newSession.send({ prompt: contextPrompt });
            logger.debug(`[askCopilot] 今日對話上下文已注入`);
          } catch (contextError) {
            logger.warn(`[askCopilot] 注入上下文失敗（繼續執行）: ${contextError.message}`);
          }
        } else {
          logger.debug(`[askCopilot] 今日尚無對話記錄，跳過上下文注入`);
        }

        // 重試請求（retryCount + 1 防止無限重試）
        logger.info(`[askCopilot] 使用新 session 重試請求`);
        return await askCopilot(bot, newSession, prompt, chatId, retryCount + 1);
      } catch (retryError) {
        logger.error(`[askCopilot] Session 重建或重試失敗: ${retryError.message}`);
        throw retryError;
      }
    }

    logger.error(`[askCopilot] 錯誤: ${error.message}`, { stack: error.stack });
    throw error;
  }
}

/**
 * 刪除指定 chatId 的 session
 * 安全地 dispose session 並從 Map 移除
 */
export async function deleteSession(chatId) {
  const session = sessions.get(chatId);
  if (session) {
    logger.info(`[deleteSession] 準備銷毀 session，chatId: ${chatId}, sessionId: ${session.sessionId}`);
    try {
      // 嘗試安全地 dispose session
      if (typeof session.dispose === 'function') {
        await session.dispose();
        logger.debug(`[deleteSession] Session dispose 完成`);
      }
    } catch (error) {
      logger.warn(`[deleteSession] 銷毀 session 時發生錯誤: ${error.message}`);
      // 即使 dispose 失敗也要從 Map 移除，避免持續使用失效 session
    }
  }
  sessions.delete(chatId);
  logger.info(`[deleteSession] Session 已從 Map 移除，chatId: ${chatId}`);
}

/**
 * 取得指定 chatId 的 session
 */
export function getSession(chatId) {
  return sessions.get(chatId);
}

/**
 * 取得所有 sessions
 */
export function getAllSessions() {
  return sessions;
}

/**
 * 清除所有 sessions
 */
export function clearAllSessions() {
  sessions.clear();
}
