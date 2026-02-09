import { existsSync, readFileSync, writeFileSync } from "fs";
import cron from "node-cron";
import { join } from "path";
import { logger } from "../logger.js";
import { getProfilePath, getUserDir } from "./memory.js";

/**
 * 分析中期記憶並提取重要資訊
 * @param {number} userId - 使用者 ID
 * @param {string} dateStr - 日期字串 (yyyy-mm-dd)
 * @returns {Object} 分析結果
 */
function analyzeMemoryFile(userId, dateStr) {
  const filePath = join(getUserDir(userId), `${dateStr}.md`);

  if (!existsSync(filePath)) {
    return { importantMemories: [], patterns: null };
  }

  const content = readFileSync(filePath, "utf-8");
  logger.debug(`[analyzeMemoryFile] 分析檔案: ${dateStr}.md (${content.length} 字元)`);

  const importantMemories = [];
  const patterns = {
    topics: {},
    timeSlots: [],
    messageCount: 0,
  };

  // 解析每一段對話記錄
  const sections = content.split(/\n## /);

  for (const section of sections) {
    if (!section.trim()) continue;

    patterns.messageCount++;

    // 提取時間
    const timeMatch = section.match(/^(\d{2}:\d{2})/);
    if (timeMatch) {
      patterns.timeSlots.push(timeMatch[1]);
    }

    // 提取主題
    const topicMatch = section.match(/- 主題[：:]\s*(.+)/);
    if (topicMatch) {
      const topics = topicMatch[1].split(",").map((t) => t.trim());
      topics.forEach((topic) => {
        patterns.topics[topic] = (patterns.topics[topic] || 0) + 1;
      });
    }

    // 檢查是否標記為重要
    const hasImportantTag = section.includes("#重要");
    const importanceMatch = section.match(/- 重要性[：:]\s*([⭐]+)/);
    const importance = importanceMatch ? importanceMatch[1].length : 3;

    // 提取重要記憶 (標記重要 或 重要性 >= 4)
    if (hasImportantTag || importance >= 4) {
      const summaryMatch = section.match(/- 摘要[：:]\s*(.+)/);
      const titleMatch = section.match(/^(\d{2}:\d{2}) - (.+)/);

      if (summaryMatch && titleMatch) {
        importantMemories.push({
          date: dateStr,
          time: titleMatch[1],
          title: titleMatch[2],
          summary: summaryMatch[1],
          importance,
          hasTag: hasImportantTag,
        });
      }
    }
  }

  logger.info(
    `[analyzeMemoryFile] ${dateStr} 分析完成: ${patterns.messageCount} 則對話, ${importantMemories.length} 則重要記憶`
  );

  return { importantMemories, patterns };
}

/**
 * 更新長期記憶檔案 (profile.md)
 * @param {number} userId - 使用者 ID
 * @param {Array} memories - 重要記憶陣列
 */
function updateLongTermMemory(userId, memories) {
  if (memories.length === 0) {
    logger.debug(`[updateLongTermMemory] 沒有新的重要記憶需要更新`);
    return;
  }

  const profilePath = getProfilePath(userId);
  let content = "";

  if (existsSync(profilePath)) {
    content = readFileSync(profilePath, "utf-8");
  } else {
    content = `# 長期記憶檔案\n\n## 重要對話記錄\n\n`;
  }

  // 附加新的重要記憶
  for (const memory of memories) {
    const entry = `\n### ${memory.date} ${memory.time} - ${memory.title}\n`;
    const detail = `- 摘要：${memory.summary}\n`;
    const importance = `- 重要性：${"⭐".repeat(memory.importance)}\n`;

    content += entry + detail + importance;
  }

  writeFileSync(profilePath, content, "utf-8");
  logger.info(`[updateLongTermMemory] 已更新 profile.md，新增 ${memories.length} 則重要記憶`);
}

/**
 * 更新使用者人格檔案 (persona/USER.md)
 * @param {number} userId - 使用者 ID
 * @param {Object} allPatterns - 累積的使用模式
 */
function updateUserPersona(userId, allPatterns) {
  const personaPath = join(process.cwd(), "persona", "USER.md");

  if (!allPatterns || allPatterns.totalMessages === 0) {
    logger.debug(`[updateUserPersona] 資料不足，暫不更新 USER.md`);
    return;
  }

  logger.info(`[updateUserPersona] 更新使用者人格檔案，累積 ${allPatterns.totalMessages} 則對話`);

  // 分析活躍時段
  const timeSlots = allPatterns.allTimeSlots;
  const hourCounts = {};
  timeSlots.forEach((time) => {
    const hour = parseInt(time.split(":")[0]);
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const activeHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([hour]) => `${hour}:00`);

  // 分析常問主題
  const topTopics = Object.entries(allPatterns.allTopics)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  // 組合新的 USER.md 內容
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const newContent = `# 使用者人格檔案

> 此檔案會根據互動自動更新，記錄使用者的偏好與習慣

## 基本資訊
- 主要稱呼：（待學習）
- Telegram ID：${userId}
- 時區：Asia/Taipei (UTC+8)
- 偏好語言：繁體中文
- 首次對話：${allPatterns.firstDate || today}

## 使用習慣
- 主要用途：程式開發協助、技術問題討論
- 活躍時段：${activeHours.join(", ")}
- 常問主題：${topTopics.join(", ") || "（資料累積中）"}
- 對話風格：直接、具體、重視實作細節

## 特殊偏好
- 偏好簡潔明確的回應
- 重視程式碼的模組化與可維護性
- （透過對話逐漸學習中）

## 互動統計
- 總對話次數：${allPatterns.totalMessages}
- 最後互動：${today}
- 主要協助領域：程式開發

---

*此檔案由每日排程自動分析與更新*
*最後更新：${today} (自動)*
`;

  writeFileSync(personaPath, newContent, "utf-8");
  logger.info(`[updateUserPersona] USER.md 更新完成`);
}

/**
 * 取得昨日日期字串
 * @returns {string} yyyy-mm-dd
 */
function getYesterdayDate() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, "0");
  const day = String(yesterday.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 取得最近 N 天的日期陣列（包含今天）
 * @param {number} days - 天數
 * @returns {Array<string>} 日期陣列 (yyyy-mm-dd)
 */
function getRecentDates(days = 7) {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

/**
 * 執行記憶分類與晉升任務
 * @param {number} userId - 使用者 ID
 */
export async function runMemoryClassification(userId) {
  logger.info(`[MemoryClassification] ═══════════════════════════════════════`);
  logger.info(`[MemoryClassification] 開始執行記憶分類任務 | User ${userId}`);

  try {
    // 分析最近 7 天的記憶（包含昨日）
    const recentDates = getRecentDates(7);
    let allImportantMemories = [];
    let allPatterns = {
      allTopics: {},
      allTimeSlots: [],
      totalMessages: 0,
      firstDate: null,
    };

    for (const dateStr of recentDates) {
      const { importantMemories, patterns } = analyzeMemoryFile(userId, dateStr);

      // 累積重要記憶
      allImportantMemories = allImportantMemories.concat(importantMemories);

      // 累積模式分析
      if (patterns) {
        allPatterns.totalMessages += patterns.messageCount;
        allPatterns.allTimeSlots = allPatterns.allTimeSlots.concat(patterns.timeSlots);

        Object.entries(patterns.topics).forEach(([topic, count]) => {
          allPatterns.allTopics[topic] = (allPatterns.allTopics[topic] || 0) + count;
        });

        if (!allPatterns.firstDate && patterns.messageCount > 0) {
          allPatterns.firstDate = dateStr;
        }
      }
    }

    logger.info(
      `[MemoryClassification] 累積分析完成: ${allPatterns.totalMessages} 則對話, ${allImportantMemories.length} 則重要記憶`
    );

    // 更新長期記憶
    if (allImportantMemories.length > 0) {
      updateLongTermMemory(userId, allImportantMemories);
    }

    // 更新使用者人格檔案
    if (allPatterns.totalMessages > 0) {
      updateUserPersona(userId, allPatterns);
    }

    logger.info(`[MemoryClassification] 記憶分類任務完成 ✨`);
  } catch (error) {
    logger.error(`[MemoryClassification] 記憶分類失敗: ${error.message}`);
    logger.error(`[MemoryClassification] 錯誤堆疊:`, { stack: error.stack });
  }
}

/**
 * 啟動記憶分類排程
 * @param {number} userId - 使用者 ID
 */
export function startMemoryClassificationScheduler(userId) {
  // 測試模式：每 5 分鐘執行一次
  // 正式模式：每日凌晨 2:00 執行 ('0 2 * * *')
  const schedule = "*/5 * * * *"; // 每 5 分鐘

  logger.info(`[Scheduler] 啟動記憶分類排程: ${schedule}`);

  cron.schedule(schedule, () => {
    runMemoryClassification(userId);
  });

  // 啟動時立即執行一次（可選）
  // runMemoryClassification(userId);
}
