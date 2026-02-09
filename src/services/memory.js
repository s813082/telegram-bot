import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { logger } from "../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Memory 資料夾路徑
const MEMORY_DIR = join(__dirname, "..", "..", "memory");

// 記憶保留天數
const MEMORY_RETENTION_DAYS = 30;

/**
 * 取得今日日期字串 (yyyy-mm-dd)
 * @returns {string} 今日日期
 */
function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 取得使用者資料夾路徑
 * @param {number} userId - 使用者 ID
 * @returns {string} 使用者資料夾路徑
 */
export function getUserDir(userId) {
  return join(MEMORY_DIR, String(userId));
}

/**
 * 取得今日記憶檔案路徑
 * @param {number} userId - 使用者 ID
 * @returns {string} 今日檔案路徑
 */
export function getTodayFilePath(userId) {
  const today = getTodayDate();
  return join(getUserDir(userId), `${today}.md`);
}

/**
 * 取得長期記憶檔案路徑
 * @param {number} userId - 使用者 ID
 * @returns {string} profile.md 路徑
 */
export function getProfilePath(userId) {
  return join(getUserDir(userId), "profile.md");
}

/**
 * 確保使用者資料夾存在
 * @param {number} userId - 使用者 ID
 */
function ensureUserDir(userId) {
  const userDir = getUserDir(userId);
  if (!existsSync(userDir)) {
    mkdirSync(userDir, { recursive: true });
    logger.info(`[ensureUserDir] 建立使用者資料夾: ${userDir}`);
  }
}

/**
 * 檢查並創建今日記憶檔案
 * @param {number} userId - 使用者 ID
 * @returns {boolean} 是否為新建檔案
 */
export function checkOrCreateTodayFile(userId) {
  ensureUserDir(userId);

  const todayPath = getTodayFilePath(userId);
  const today = getTodayDate();

  if (existsSync(todayPath)) {
    logger.debug(`[checkOrCreateTodayFile] 今日檔案已存在: ${todayPath}`);
    return false;
  }

  // 創建新的今日檔案
  const initialContent = `# ${today} 對話記錄\n\n`;
  writeFileSync(todayPath, initialContent, "utf-8");
  logger.info(`[checkOrCreateTodayFile] 建立今日記憶檔案: ${todayPath}`);
  return true;
}

/**
 * 載入長期記憶 (profile.md)
 * @param {number} userId - 使用者 ID
 * @returns {string} 長期記憶內容
 */
export function loadLongTermMemory(userId) {
  const profilePath = getProfilePath(userId);

  if (!existsSync(profilePath)) {
    logger.debug(`[loadLongTermMemory] profile.md 不存在，建立預設檔案`);
    ensureUserDir(userId);

    const defaultProfile = `# 使用者檔案\n\n## 基本資訊\n- 使用者 ID：${userId}\n- 首次對話：${getTodayDate()}\n- 偏好語言：繁體中文\n\n## 互動記錄\n- 總對話次數：0\n- 最後互動：${getTodayDate()}\n\n---\n*此檔案會隨著互動自動更新*\n`;

    writeFileSync(profilePath, defaultProfile, "utf-8");
    return defaultProfile;
  }

  const content = readFileSync(profilePath, "utf-8");
  logger.debug(`[loadLongTermMemory] 載入 profile.md (${content.length} 字元)`);
  return content;
}

/**
 * 載入最近 N 天的記憶
 * @param {number} userId - 使用者 ID
 * @param {number} days - 天數 (預設 3 天)
 * @returns {string} 最近記憶內容
 */
export function loadRecentMemories(userId, days = 3) {
  const userDir = getUserDir(userId);

  if (!existsSync(userDir)) {
    logger.debug(`[loadRecentMemories] 使用者資料夾不存在`);
    return "";
  }

  try {
    // 取得所有 .md 檔案（排除 profile.md）
    const files = readdirSync(userDir)
      .filter((file) => file.endsWith(".md") && file !== "profile.md")
      .sort()
      .reverse(); // 最新的在前

    // 取最近 N 天
    const recentFiles = files.slice(0, days);

    if (recentFiles.length === 0) {
      logger.debug(`[loadRecentMemories] 沒有找到最近的記憶檔案`);
      return "";
    }

    logger.info(`[loadRecentMemories] 載入最近 ${recentFiles.length} 天的記憶`);

    let memories = "## 最近的對話記憶\n\n";

    for (const file of recentFiles) {
      const filePath = join(userDir, file);
      const content = readFileSync(filePath, "utf-8");
      memories += `${content}\n---\n\n`;
    }

    return memories;
  } catch (error) {
    logger.error(`[loadRecentMemories] 載入記憶失敗: ${error.message}`);
    return "";
  }
}

/**
 * 附加記憶到今日檔案
 * @param {number} userId - 使用者 ID
 * @param {string} timestamp - 時間戳記 (HH:mm)
 * @param {string} summary - 對話摘要
 * @param {string[]} topics - 主題標籤
 * @param {number} importance - 重要性 (1-5 星)
 * @param {boolean} isImportant - 是否標記為重要
 */
export function appendTodayMemory(userId, timestamp, summary, topics = [], importance = 3, isImportant = false) {
  checkOrCreateTodayFile(userId);

  const todayPath = getTodayFilePath(userId);

  // 組合記憶內容
  let memoryEntry = `\n## ${timestamp} - 對話\n`;

  if (topics.length > 0) {
    memoryEntry += `- 主題：${topics.join(", ")}\n`;
  }

  memoryEntry += `- 摘要：${summary}\n`;
  memoryEntry += `- 重要性：${"⭐".repeat(importance)}\n`;

  if (isImportant) {
    memoryEntry += `- 標記：#重要\n`;
  }

  memoryEntry += `\n`;

  // 附加到檔案末尾
  try {
    const currentContent = readFileSync(todayPath, "utf-8");
    writeFileSync(todayPath, currentContent + memoryEntry, "utf-8");
    logger.debug(`[appendTodayMemory] 記憶已附加到今日檔案`);
  } catch (error) {
    logger.error(`[appendTodayMemory] 附加記憶失敗: ${error.message}`);
  }
}

/**
 * 更新長期記憶檔案
 * @param {number} userId - 使用者 ID
 * @param {string} updates - 更新內容
 */
export function updateProfile(userId, updates) {
  const profilePath = getProfilePath(userId);

  try {
    let content = "";

    if (existsSync(profilePath)) {
      content = readFileSync(profilePath, "utf-8");
    } else {
      content = loadLongTermMemory(userId); // 建立預設檔案
    }

    // 簡單地附加更新內容到檔案末尾
    content += `\n${updates}\n`;

    writeFileSync(profilePath, content, "utf-8");
    logger.info(`[updateProfile] 長期記憶已更新`);
  } catch (error) {
    logger.error(`[updateProfile] 更新 profile 失敗: ${error.message}`);
  }
}

/**
 * 清理超過 N 天的記憶檔案
 * @param {number} userId - 使用者 ID
 */
export async function cleanupOldMemories(userId) {
  const userDir = getUserDir(userId);

  if (!existsSync(userDir)) {
    return;
  }

  try {
    const files = readdirSync(userDir).filter(
      (file) => file.endsWith(".md") && file !== "profile.md"
    );

    const now = new Date();
    let deletedCount = 0;

    for (const file of files) {
      // 從檔名提取日期
      const dateMatch = file.match(/^(\d{4})-(\d{2})-(\d{2})\.md$/);
      if (!dateMatch) continue;

      const fileDate = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]);
      const daysDiff = (now - fileDate) / (1000 * 60 * 60 * 24);

      // 檢查是否包含 #重要 標記
      const filePath = join(userDir, file);
      const content = readFileSync(filePath, "utf-8");
      const hasImportantTag = content.includes("#重要");

      // 如果超過保留天數且沒有重要標記，則刪除
      if (daysDiff > MEMORY_RETENTION_DAYS && !hasImportantTag) {
        unlinkSync(filePath);
        deletedCount++;
        logger.info(`[cleanupOldMemories] 刪除過期記憶: ${file}`);
      }
    }

    if (deletedCount > 0) {
      logger.info(`[cleanupOldMemories] 共刪除 ${deletedCount} 個過期檔案`);
    }
  } catch (error) {
    logger.error(`[cleanupOldMemories] 清理記憶失敗: ${error.message}`);
  }
}

/**
 * 載入完整記憶（長期 + 最近幾天）
 * @param {number} userId - 使用者 ID
 * @returns {string} 完整記憶內容
 */
export function loadAllMemories(userId) {
  logger.debug(`[loadAllMemories] 載入使用者 ${userId} 的記憶`);

  // 檢查並創建今日檔案
  checkOrCreateTodayFile(userId);

  // 載入長期記憶
  const longTerm = loadLongTermMemory(userId);

  // 載入最近記憶
  const recent = loadRecentMemories(userId, 3);

  let allMemories = "";

  if (longTerm) {
    allMemories += `# 長期記憶\n\n${longTerm}\n\n---\n\n`;
  }

  if (recent) {
    allMemories += recent;
  }

  logger.info(`[loadAllMemories] 記憶載入完成 (總長度: ${allMemories.length} 字元)`);

  return allMemories;
}
