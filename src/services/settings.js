import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_DIR = path.join(__dirname, "../../memory/settings");

// 預設設定
const DEFAULT_SETTINGS = {
  notifications: true,
  responseStyle: "normal", // "concise" | "normal" | "detailed"
  language: "zh-TW",
};

// 記憶體儲存
const userSettings = new Map();

/**
 * 初始化設定系統
 */
export async function initSettings() {
  try {
    await fs.mkdir(SETTINGS_DIR, { recursive: true });
    logger.info("[Settings] 設定系統已初始化");
  } catch (error) {
    logger.error(`[Settings] 初始化失敗: ${error.message}`);
  }
}

/**
 * 取得使用者設定
 */
export async function getUserSettings(userId) {
  if (userSettings.has(userId)) {
    return userSettings.get(userId);
  }

  const settingsFile = path.join(SETTINGS_DIR, `${userId}.json`);
  try {
    const data = await fs.readFile(settingsFile, "utf-8");
    const settings = JSON.parse(data);
    userSettings.set(userId, settings);
    return settings;
  } catch (error) {
    if (error.code === "ENOENT") {
      // 檔案不存在，使用預設值
      const defaultSettings = { ...DEFAULT_SETTINGS };
      userSettings.set(userId, defaultSettings);
      await saveUserSettings(userId, defaultSettings);
      return defaultSettings;
    }
    logger.error(`[Settings] 載入使用者 ${userId} 設定失敗: ${error.message}`);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * 儲存使用者設定
 */
export async function saveUserSettings(userId, settings) {
  const settingsFile = path.join(SETTINGS_DIR, `${userId}.json`);
  try {
    await fs.writeFile(settingsFile, JSON.stringify(settings, null, 2));
    userSettings.set(userId, settings);
    logger.debug(`[Settings] 使用者 ${userId} 設定已儲存`);
  } catch (error) {
    logger.error(`[Settings] 儲存使用者 ${userId} 設定失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 更新設定項目
 */
export async function updateSetting(userId, key, value) {
  const settings = await getUserSettings(userId);
  settings[key] = value;
  await saveUserSettings(userId, settings);
  logger.info(`[Settings] 使用者 ${userId} 更新設定: ${key} = ${value}`);
}

/**
 * 取得設定顯示文字
 */
export function getSettingDisplayText(key, value) {
  const displays = {
    notifications: value ? "✅ 開啟" : "❌ 關閉",
    responseStyle: {
      concise: "📝 簡潔",
      normal: "💬 正常",
      detailed: "📚 詳細",
    }[value] || value,
    language: {
      "zh-TW": "🇹🇼 繁體中文",
      "en": "🇺🇸 English",
    }[value] || value,
  };
  return displays[key] || value;
}

// 初始化
initSettings();
