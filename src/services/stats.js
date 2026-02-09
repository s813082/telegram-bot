import { logger } from "../logger.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATS_DIR = path.join(__dirname, "../../memory/stats");
const STATS_FILE = path.join(STATS_DIR, "user_stats.json");

// 記憶體儲存
const userStats = new Map();

/**
 * 初始化統計系統
 */
export async function initStats() {
  try {
    await fs.mkdir(STATS_DIR, { recursive: true });
    
    try {
      const data = await fs.readFile(STATS_FILE, "utf-8");
      const stats = JSON.parse(data);
      Object.entries(stats).forEach(([userId, stat]) => {
        userStats.set(Number(userId), stat);
      });
      logger.info(`[Stats] 載入 ${userStats.size} 個使用者統計`);
    } catch (error) {
      if (error.code !== "ENOENT") {
        logger.warn(`[Stats] 載入統計失敗: ${error.message}`);
      }
    }
  } catch (error) {
    logger.error(`[Stats] 初始化失敗: ${error.message}`);
  }
}

/**
 * 取得使用者統計
 */
export function getUserStats(userId) {
  if (!userStats.has(userId)) {
    userStats.set(userId, {
      messageCount: 0,
      sessionCount: 0,
      longTermMemories: 0,
      mediumTermMemories: 0,
      commandUsage: {},
      lastActive: null,
    });
  }
  return userStats.get(userId);
}

/**
 * 增加訊息計數
 */
export function incrementMessageCount(userId) {
  const stats = getUserStats(userId);
  stats.messageCount++;
  stats.lastActive = new Date().toISOString();
  saveStatsAsync();
}

/**
 * 增加 Session 計數
 */
export function incrementSessionCount(userId) {
  const stats = getUserStats(userId);
  stats.sessionCount++;
  saveStatsAsync();
}

/**
 * 記錄指令使用
 */
export function trackCommandUsage(userId, command) {
  const stats = getUserStats(userId);
  if (!stats.commandUsage[command]) {
    stats.commandUsage[command] = 0;
  }
  stats.commandUsage[command]++;
  stats.lastActive = new Date().toISOString();
  saveStatsAsync();
}

/**
 * 更新記憶統計
 */
export function updateMemoryStats(userId, longTermCount, mediumTermCount) {
  const stats = getUserStats(userId);
  stats.longTermMemories = longTermCount;
  stats.mediumTermMemories = mediumTermCount;
  saveStatsAsync();
}

/**
 * 非同步儲存統計（debounced）
 */
let saveTimeout;
async function saveStatsAsync() {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(async () => {
    try {
      const data = Object.fromEntries(userStats);
      await fs.writeFile(STATS_FILE, JSON.stringify(data, null, 2));
      logger.debug("[Stats] 統計已儲存");
    } catch (error) {
      logger.error(`[Stats] 儲存失敗: ${error.message}`);
    }
  }, 5000); // 5 秒後儲存
}

// 初始化
initStats();
