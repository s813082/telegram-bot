import { getMainMenuKeyboard } from "../keyboards/main.js";
import { getLanguageKeyboard, getResponseStyleKeyboard, getSettingsKeyboard } from "../keyboards/settings.js";
import { logger } from "../logger.js";
import { deleteSession, getSession } from "../services/copilot.js";
import { getUserSettings, updateSetting } from "../services/settings.js";
import { getUserStats } from "../services/stats.js";

/**
 * 處理所有 callback queries
 */
export async function handleCallbackQuery(bot, query) {
  const chatId = query.message.chat.id;
  const messageId = query.message.message_id;
  const data = query.data;
  const userId = query.from.id;

  logger.info(`[Callback] 使用者 ${userId} 觸發: ${data}`);

  try {
    // 立即回應 callback（避免 Telegram 顯示 loading）
    await bot.answerCallbackQuery(query.id);

    // 處理設定相關的 callback
    if (data.startsWith("setting_")) {
      await handleSettingCallback(bot, chatId, messageId, userId, data);
      return;
    }

    // 處理 quick reply
    if (data.startsWith("quick_")) {
      await handleQuickReply(bot, chatId, messageId, userId, data, query.message.reply_to_message);
      return;
    }

    // 處理錯誤重試
    if (data === "error_retry") {
      await bot.editMessageText("✨ 請重新輸入你的問題，我會重新嘗試回答。", {
        chat_id: chatId,
        message_id: messageId,
      });
      return;
    }

    switch (data) {
      case "show_menu":
      case "menu_back":
        await showMainMenu(bot, chatId, messageId);
        break;

      case "menu_new":
        await handleNewConversation(bot, chatId, messageId);
        break;

      case "menu_help":
        await showHelp(bot, chatId, messageId);
        break;

      case "menu_status":
        await showStatus(bot, chatId, messageId, userId);
        break;

      case "menu_settings":
        await showSettings(bot, chatId, messageId, userId);
        break;

      case "menu_memories":
        await showMemories(bot, chatId, messageId);
        break;

      case "menu_stats":
        await showStats(bot, chatId, messageId, userId);
        break;

      case "quick_start":
        await bot.editMessageText("✨ 請直接輸入你的問題，我會盡力幫你解答！", {
          chat_id: chatId,
          message_id: messageId,
        });
        break;

      default:
        logger.warn(`[Callback] 未知的 callback data: ${data}`);
    }
  } catch (error) {
    logger.error(`[Callback] 處理失敗: ${error.message}`);
    try {
      await bot.answerCallbackQuery(query.id, {
        text: "❌ 操作失敗，請重試",
        show_alert: true,
      });
    } catch (e) {
      logger.error(`[Callback] 回應錯誤失敗: ${e.message}`);
    }
  }
}

/**
 * 顯示主選單
 */
async function showMainMenu(bot, chatId, messageId) {
  const menuText = `
📋 **主選單**

選擇你想要的功能：
  `.trim();

  await bot.editMessageText(menuText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown",
    reply_markup: getMainMenuKeyboard(),
  });
}

/**
 * 開始新對話
 */
async function handleNewConversation(bot, chatId, messageId) {
  const session = getSession(chatId);
  if (session) {
    try {
      await session.destroy();
      deleteSession(chatId);
    } catch (error) {
      logger.error(`[Callback/New] 銷毀 session 失敗: ${error.message}`);
    }
  }

  await bot.editMessageText("🔄 已開啟新的對話！\n\n請直接輸入你的問題。", {
    chat_id: chatId,
    message_id: messageId,
  });
}

/**
 * 顯示幫助訊息
 */
async function showHelp(bot, chatId, messageId) {
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

  const backButton = {
    inline_keyboard: [[{ text: "⬅️ 返回主選單", callback_data: "menu_back" }]],
  };

  await bot.editMessageText(helpText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown",
    reply_markup: backButton,
  });
}

/**
 * 顯示狀態
 */
async function showStatus(bot, chatId, messageId, userId) {
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

  const backButton = {
    inline_keyboard: [[{ text: "⬅️ 返回主選單", callback_data: "menu_back" }]],
  };

  await bot.editMessageText(statusText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown",
    reply_markup: backButton,
  });
}

/**
 * 顯示設定
 */
async function showSettings(bot, chatId, messageId, userId) {
  const settings = await getUserSettings(userId);
  const keyboard = await getSettingsKeyboard(userId);

  const settingsText = `
⚙️ **設定**

調整你的偏好設定：
  `.trim();

  await bot.editMessageText(settingsText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown",
    reply_markup: keyboard,
  });
}

/**
 * 顯示記憶（暫時顯示佔位文字）
 */
async function showMemories(bot, chatId, messageId) {
  const memoriesText = `
🧠 **記憶管理**

（記憶管理介面將在 Phase 2 實作）

屆時你可以查看、編輯和刪除記憶。
  `.trim();

  const backButton = {
    inline_keyboard: [[{ text: "⬅️ 返回主選單", callback_data: "menu_back" }]],
  };

  await bot.editMessageText(memoriesText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown",
    reply_markup: backButton,
  });
}

/**
 * 顯示統計（暫時顯示佔位文字）
 */
async function showStats(bot, chatId, messageId, userId) {
  const stats = getUserStats(userId);

  const statsText = `
� **你的使用統計**

哼... 看看你用了多少次 🙄

💬 **對話記錄：**
訊息數：${stats.messageCount || 0} 條
Session 數：${stats.sessionCount || 0} 個

🧠 **記憶庫存：**
長期記憶：${stats.longTermMemories || 0} 條
中期記憶：${stats.mediumTermMemories || 0} 條

*小聲：看起來還挺常來找我的嘛... 💕*
  `.trim();

  const backButton = {
    inline_keyboard: [[{ text: "⬅️ 返回主選單", callback_data: "menu_back" }]],
  };

  await bot.editMessageText(statsText, {
    chat_id: chatId,
    message_id: messageId,
    parse_mode: "Markdown",
    reply_markup: backButton,
  });
}

/**
 * 處理設定相關的 callback
 */
async function handleSettingCallback(bot, chatId, messageId, userId, data) {
  const settings = await getUserSettings(userId);

  if (data === "setting_toggle_notifications") {
    // Toggle notifications
    await updateSetting(userId, "notifications", !settings.notifications);
    await showSettings(bot, chatId, messageId, userId);
  } else if (data === "setting_response_style") {
    // 顯示回應風格選擇
    const text = "💬 **選擇回應風格**\n\n請選擇你偏好的回應風格：";
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: getResponseStyleKeyboard(settings.responseStyle),
    });
  } else if (data.startsWith("setting_set_response_")) {
    // 設定回應風格
    const style = data.replace("setting_set_response_", "");
    await updateSetting(userId, "responseStyle", style);
    await showSettings(bot, chatId, messageId, userId);
  } else if (data === "setting_language") {
    // 顯示語言選擇
    const text = "🌐 **選擇語言**\n\n請選擇你偏好的語言：";
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: "Markdown",
      reply_markup: getLanguageKeyboard(settings.language),
    });
  } else if (data.startsWith("setting_set_language_")) {
    // 設定語言
    const lang = data.replace("setting_set_language_", "");
    await updateSetting(userId, "language", lang);
    await showSettings(bot, chatId, messageId, userId);
  }
}

/**
 * 處理 Quick Reply 按鈕
 */
async function handleQuickReply(bot, chatId, messageId, userId, data, replyToMessage) {
  logger.info(`[Callback/QuickReply] 使用者 ${userId} 觸發: ${data}`);

  try {
    if (data === "quick_continue") {
      await bot.editMessageText("💬 請繼續輸入你的問題或補充說明。", {
        chat_id: chatId,
        message_id: messageId,
      });
    } else if (data === "quick_regenerate") {
      await bot.editMessageText("♻️ 重新生成功能需要你重新輸入問題。\n\n請再次輸入你的問題，我會用不同的方式回答。", {
        chat_id: chatId,
        message_id: messageId,
      });
    } else if (data === "quick_more_detail") {
      if (replyToMessage && replyToMessage.text) {
        await bot.editMessageText("⏳ 正在產生更詳細的說明...", {
          chat_id: chatId,
          message_id: messageId,
        });

        // 模擬請求更詳細的回應（實際應該重新調用 Copilot）
        const moreDetailPrompt = `請針對剛才的回答提供更詳細的說明和範例。`;
        await bot.sendMessage(chatId, moreDetailPrompt);
      } else {
        await bot.editMessageText("❌ 無法找到原始訊息，請重新提問。", {
          chat_id: chatId,
          message_id: messageId,
        });
      }
    }
  } catch (error) {
    logger.error(`[Callback/QuickReply] 處理失敗: ${error.message}`);
  }
}
