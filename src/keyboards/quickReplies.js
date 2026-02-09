/**
 * Quick Replies - 快速回應按鈕
 */

/**
 * 對話後的快速操作按鈕
 */
export function getConversationQuickReplies() {
  return {
    inline_keyboard: [
      [
        { text: "🔄 繼續", callback_data: "quick_continue" },
        { text: "♻️ 重新生成", callback_data: "quick_regenerate" },
      ],
      [
        { text: "📝 更詳細說明", callback_data: "quick_more_detail" },
      ],
    ],
  };
}

/**
 * 錯誤時的重試按鈕
 */
export function getErrorRetryButton() {
  return {
    inline_keyboard: [
      [
        { text: "🔄 重試", callback_data: "error_retry" },
        { text: "📋 主選單", callback_data: "show_menu" },
      ],
    ],
  };
}
