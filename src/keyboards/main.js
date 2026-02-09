/**
 * 主選單 Inline Keyboard
 */

export function getMainMenuKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "🔄 新對話", callback_data: "menu_new" },
        { text: "❓ 幫助", callback_data: "menu_help" },
      ],
      [
        { text: "📊 狀態", callback_data: "menu_status" },
        { text: "⚙️ 設定", callback_data: "menu_settings" },
      ],
      [
        { text: "🧠 記憶", callback_data: "menu_memories" },
        { text: "📈 統計", callback_data: "menu_stats" },
      ],
    ],
  };
}

/**
 * 快速操作 Keyboard (用於 /start)
 */
export function getQuickStartKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: "💬 開始對話", callback_data: "quick_start" },
        { text: "❓ 查看指令", callback_data: "menu_help" },
      ],
      [{ text: "📋 主選單", callback_data: "show_menu" }],
    ],
  };
}
