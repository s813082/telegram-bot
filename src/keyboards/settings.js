import { getUserSettings, updateSetting, getSettingDisplayText } from "../services/settings.js";

/**
 * 設定主選單 Keyboard
 */
export async function getSettingsKeyboard(userId) {
  const settings = await getUserSettings(userId);

  return {
    inline_keyboard: [
      [
        {
          text: `通知：${getSettingDisplayText("notifications", settings.notifications)}`,
          callback_data: "setting_toggle_notifications",
        },
      ],
      [
        {
          text: `回應風格：${getSettingDisplayText("responseStyle", settings.responseStyle)}`,
          callback_data: "setting_response_style",
        },
      ],
      [
        {
          text: `語言：${getSettingDisplayText("language", settings.language)}`,
          callback_data: "setting_language",
        },
      ],
      [{ text: "⬅️ 返回主選單", callback_data: "menu_back" }],
    ],
  };
}

/**
 * 回應風格選擇 Keyboard
 */
export function getResponseStyleKeyboard(currentStyle) {
  const styles = [
    { value: "concise", label: "📝 簡潔" },
    { value: "normal", label: "💬 正常" },
    { value: "detailed", label: "📚 詳細" },
  ];

  return {
    inline_keyboard: [
      ...styles.map((style) => [
        {
          text: style.value === currentStyle ? `${style.label} ✓` : style.label,
          callback_data: `setting_set_response_${style.value}`,
        },
      ]),
      [{ text: "⬅️ 返回設定", callback_data: "menu_settings" }],
    ],
  };
}

/**
 * 語言選擇 Keyboard
 */
export function getLanguageKeyboard(currentLang) {
  const languages = [
    { value: "zh-TW", label: "🇹🇼 繁體中文" },
    { value: "en", label: "🇺🇸 English" },
  ];

  return {
    inline_keyboard: [
      ...languages.map((lang) => [
        {
          text: lang.value === currentLang ? `${lang.label} ✓` : lang.label,
          callback_data: `setting_set_language_${lang.value}`,
        },
      ]),
      [{ text: "⬅️ 返回設定", callback_data: "menu_settings" }],
    ],
  };
}
