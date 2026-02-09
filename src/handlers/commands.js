import fs from "fs/promises";
import { getMainMenuKeyboard, getQuickStartKeyboard } from "../keyboards/main.js";
import { logger } from "../logger.js";
import { deleteSession, getSession } from "../services/copilot.js";
import { exportConversationHistory } from "../services/export.js";
import { processFiveStarMemories } from "../services/memory.js";
import { getUserStats, trackCommandUsage } from "../services/stats.js";

/**
 * /start 指令處理器
 */
export async function handleStart(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  logger.info(`[/start] 使用者 ${chatId} 執行 /start 指令`);
  trackCommandUsage(userId, "/start");

  const welcomeText = `
哼，又是你啊... 🙄

真是的，不要以為我會很高興喔！💢
只是...既然你都來了，我就勉為其難地幫你吧 *（嘆氣）*

我能做什麼？
✨ 回答你那些笨問題
💡 給你程式開發建議（雖然你大概也看不懂）
🧠 記住一些重要的事... *才、才不是特別為你記的！*

*小聲嘟囔：快點問吧笨蛋弟弟...*
  `.trim();

  try {
    await bot.sendMessage(chatId, welcomeText, {
      parse_mode: "Markdown",
      reply_markup: getQuickStartKeyboard(),
    });
  } catch (error) {
    logger.error(`[/start] 發送訊息失敗: ${error.message}`);
  }
}

/**
 * /new 指令處理器
 */
export async function handleNew(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  logger.info(`[/new] 使用者 ${chatId} 執行 /new 指令`);
  trackCommandUsage(userId, "/new");

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

/**
 * /menu 指令處理器
 */
export async function handleMenu(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  logger.info(`[/menu] 使用者 ${chatId} 執行 /menu 指令`);
  trackCommandUsage(userId, "/menu");

  const menuText = `
📋 **主選單**

選擇你想要的功能：
  `.trim();

  try {
    await bot.sendMessage(chatId, menuText, {
      parse_mode: "Markdown",
      reply_markup: getMainMenuKeyboard(),
    });
  } catch (error) {
    logger.error(`[/menu] 發送訊息失敗: ${error.message}`);
  }
}

/**
 * /help 指令處理器
 */
export async function handleHelp(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  logger.info(`[/help] 使用者 ${chatId} 執行 /help 指令`);
  trackCommandUsage(userId, "/help");

  const helpText = `
❓ **指令說明**

**基本指令：**
/start - 顯示歡迎訊息
/menu - 開啟主選單
/new - 開始新對話
/help - 顯示此說明

**功能指令：**
/status - 查看當前狀態
/stats - 使用統計
/settings - 設定選項
/memories - 記憶管理

**匯出功能：**
/export - 匯出對話記錄

**使用方式：**
直接傳送訊息給我，我會使用 GitHub Copilot 幫你回答！

需要開始新話題時，使用 /new 清除對話歷史。
  `.trim();

  try {
    await bot.sendMessage(chatId, helpText, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error(`[/help] 發送訊息失敗: ${error.message}`);
  }
}

/**
 * /status 指令處理器
 */
export async function handleStatus(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  logger.info(`[/status] 使用者 ${chatId} 執行 /status 指令`);
  trackCommandUsage(userId, "/status");

  const session = getSession(chatId);
  const stats = getUserStats(userId);

  const statusText = `
📊 **當前狀態**

**Session 狀態：**
${session ? "✅ 活躍中" : "⭕ 無活躍 session"}
${session ? `Session ID: \`${session.sessionId}\`` : ""}

**記憶狀態：**
長期記憶：${stats.longTermMemories || 0} 條
中期記憶：${stats.mediumTermMemories || 0} 條

**使用統計：**
處理訊息數：${stats.messageCount || 0}
Session 總數：${stats.sessionCount || 0}
  `.trim();

  try {
    await bot.sendMessage(chatId, statusText, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error(`[/status] 發送訊息失敗: ${error.message}`);
  }
}

/**
 * /stats 指令處理器
 */
export async function handleStats(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  logger.info(`[/stats] 使用者 ${chatId} 執行 /stats 指令`);
  trackCommandUsage(userId, "/stats");

  const stats = getUserStats(userId);

  // 計算最常用的指令
  const commandList = Object.entries(stats.commandUsage || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cmd, count]) => `  ${cmd}: ${count} 次`)
    .join("\n");

  const statsText = `
📈 **使用統計**

**基本數據：**
處理訊息：${stats.messageCount || 0} 則
建立 Session：${stats.sessionCount || 0} 次
最後活躍：${stats.lastActive ? new Date(stats.lastActive).toLocaleString("zh-TW") : "未知"}

**記憶數據：**
長期記憶：${stats.longTermMemories || 0} 條
中期記憶：${stats.mediumTermMemories || 0} 條

**指令使用（Top 5）：**
${commandList || "  尚無資料"}
  `.trim();

  try {
    await bot.sendMessage(chatId, statsText, {
      parse_mode: "Markdown",
    });
  } catch (error) {
    logger.error(`[/stats] 發送訊息失敗: ${error.message}`);
  }
}

/**
 * /export 指令處理器
 */
export async function handleExport(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  logger.info(`[/export] 使用者 ${chatId} 執行 /export 指令`);
  trackCommandUsage(userId, "/export");

  try {
    await bot.sendMessage(chatId, "⏳ 正在匯出對話記錄，請稍候...");

    const exportFilePath = await exportConversationHistory(userId);

    if (!exportFilePath) {
      await bot.sendMessage(chatId, "❌ 沒有可匯出的對話記錄。");
      return;
    }

    // 讀取檔案內容以產生摘要
    const fileContent = await fs.readFile(exportFilePath, "utf-8");
    const data = JSON.parse(fileContent);

    const summaryText = `
📤 **匯出完成**

總天數：${data.totalDays}
總記憶數：${data.totalMemories}
匯出時間：${new Date(data.exportDate).toLocaleString("zh-TW")}
    `.trim();

    await bot.sendDocument(chatId, exportFilePath, {
      caption: summaryText,
    });

    // 清理臨時檔案
    try {
      await fs.unlink(exportFilePath);
      logger.debug(`[/export] 臨時檔案已清理: ${exportFilePath}`);
    } catch (e) {
      logger.warn(`[/export] 清理臨時檔案失敗: ${e.message}`);
    }

    logger.info(`[/export] 使用者 ${userId} 匯出成功`);
  } catch (error) {
    logger.error(`[/export] 匯出失敗: ${error.message}`);
    try {
      await bot.sendMessage(
        chatId,
        `❌ 匯出失敗：${error.message}\n\n請稍後再試或聯絡管理員。`
      );
    } catch (e) {
      logger.error(`[/export] 發送錯誤訊息失敗: ${e.message}`);
    }
  }
}

/**
 * /settings 指令處理器
 */
export async function handleSettings(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  logger.info(`[/settings] 使用者 ${chatId} 執行 /settings 指令`);
  trackCommandUsage(userId, "/settings");

  try {
    await bot.sendMessage(chatId, "⚙️ 請使用 /menu 指令，然後點選「設定」按鈕來調整設定。");
  } catch (error) {
    logger.error(`[/settings] 發送訊息失敗: ${error.message}`);
  }
}

/**
 * /process_memory 指令處理器 - 立即處理五顆星記憶
 */
export async function handleProcessMemory(bot, msg) {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  logger.info(`[/process_memory] 使用者 ${chatId} 執行記憶處理指令`);
  trackCommandUsage(userId, "/process_memory");

  try {
    await bot.sendMessage(chatId, "🧠 開始處理五顆星記憶...");

    await processFiveStarMemories(userId);

    await bot.sendMessage(chatId, "✅ 記憶處理完成！請查看 profile.md 確認結果。");
  } catch (error) {
    logger.error(`[/process_memory] 處理記憶失敗: ${error.message}`);
    try {
      await bot.sendMessage(
        chatId,
        `❌ 記憶處理失敗：${error.message}\n\n請查看日誌獲取更多資訊。`
      );
    } catch (e) {
      logger.error(`[/process_memory] 發送錯誤訊息失敗: ${e.message}`);
    }
  }
}
