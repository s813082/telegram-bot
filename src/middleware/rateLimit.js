import { CONFIG } from "../config.js";
import { logger } from "../logger.js";

// 速率限制：記錄每個使用者的訊息時間戳記
const userMessageTimestamps = new Map();

/**
 * 檢查使用者是否超過速率限制
 * @param {number} chatId - 使用者的 chatId
 * @returns {boolean} - 是否允許處理訊息
 */
export function checkRateLimit(chatId) {
  const now = Date.now();
  const timestamps = userMessageTimestamps.get(chatId) || [];
  
  // 移除超過時間窗口的時間戳記
  const validTimestamps = timestamps.filter(ts => now - ts < CONFIG.RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= CONFIG.RATE_LIMIT_MAX_MESSAGES) {
    logger.warn(`[checkRateLimit] 使用者 ${chatId} 超過速率限制`);
    return false;
  }
  
  // 新增當前時間戳記
  validTimestamps.push(now);
  userMessageTimestamps.set(chatId, validTimestamps);
  
  logger.debug(`[checkRateLimit] 使用者 ${chatId} 當前訊息數: ${validTimestamps.length}/${CONFIG.RATE_LIMIT_MAX_MESSAGES}`);
  return true;
}

/**
 * 定期清理過期的速率限制記錄
 */
export function startRateLimitCleanup() {
  setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [chatId, timestamps] of userMessageTimestamps.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < CONFIG.RATE_LIMIT_WINDOW_MS);
      if (validTimestamps.length === 0) {
        userMessageTimestamps.delete(chatId);
        cleanedCount++;
      } else {
        userMessageTimestamps.set(chatId, validTimestamps);
      }
    }
    
    if (cleanedCount > 0) {
      logger.debug(`[RateLimit] 清理了 ${cleanedCount} 個過期記錄`);
    }
  }, CONFIG.MEMORY_CLEANUP_INTERVAL_MS);
  
  logger.info("[RateLimit] 記憶體清理排程已啟動");
}
