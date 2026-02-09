import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { CONFIG } from "../config.js";
import { logger } from "../logger.js";
import { copilotClient } from "./copilot.js";
import { updateMemoryStats } from "./stats.js";

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
 * 計算使用者的記憶條目數量
 * @param {number} userId - 使用者 ID
 * @returns {object} { longTermCount, mediumTermCount }
 */
function countUserMemories(userId) {
  let longTermCount = 0;
  let mediumTermCount = 0;

  // 計算長期記憶數量（profile.md 中的段落數）
  const profilePath = getProfilePath(userId);
  if (existsSync(profilePath)) {
    const content = readFileSync(profilePath, "utf-8");
    // 計算 ## 標題數量作為記憶條目數
    longTermCount = (content.match(/^##\s/gm) || []).length;
  }

  // 計算中期記憶數量（最近3天的對話記錄）
  const userDir = getUserDir(userId);
  if (existsSync(userDir)) {
    const files = readdirSync(userDir)
      .filter((file) => file.endsWith(".md") && file !== "profile.md")
      .sort()
      .reverse()
      .slice(0, 3);

    for (const file of files) {
      const filePath = join(userDir, file);
      const content = readFileSync(filePath, "utf-8");
      // 計算 ## 標題數量作為對話記錄數
      mediumTermCount += (content.match(/^##\s/gm) || []).length;
    }
  }

  return { longTermCount, mediumTermCount };
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

    // 更新統計
    const { longTermCount, mediumTermCount } = countUserMemories(userId);
    updateMemoryStats(userId, longTermCount, mediumTermCount);
  } catch (error) {
    logger.error(`[appendTodayMemory] 附加記憶失敗: ${error.message}`);
  }
}

/**
 * 批次處理五顆星記憶，提升到長期記憶
 * 應該由定時任務調用
 * @param {number} userId - 使用者 ID
 */
export async function processFiveStarMemories(userId) {
  logger.info(`[processFiveStarMemories] 開始處理使用者 ${userId} 的五顆星記憶`);

  const userDir = getUserDir(userId);
  if (!existsSync(userDir)) {
    logger.debug(`[processFiveStarMemories] 使用者資料夾不存在`);
    return;
  }

  try {
    // 讀取所有每日記憶檔案
    const files = readdirSync(userDir)
      .filter((file) => file.endsWith(".md") && file !== "profile.md")
      .sort()
      .reverse(); // 最新的在前

    let promotedCount = 0;

    for (const file of files) {
      const filePath = join(userDir, file);
      let content = readFileSync(filePath, "utf-8");
      let hasChanges = false;

      // 尋找五顆星且未標記為已處理的記憶
      const memoryBlocks = content.split(/(?=\n## )/g);
      const updatedBlocks = [];

      for (let block of memoryBlocks) {
        // 檢查是否為五顆星記憶且未標記為已處理
        if (block.includes("⭐⭐⭐⭐⭐") && !block.includes("[已寫入長期記憶]")) {
          // 提取摘要
          const summaryMatch = block.match(/- 摘要：(.+)/)
          if (summaryMatch) {
            const summary = summaryMatch[1];
            const timestampMatch = block.match(/## (\d{2}:\d{2}) - 對話/);
            const timestamp = timestampMatch ? timestampMatch[1] : "未知時間";
            logger.info(`[processFiveStarMemories] 五顆星記憶摘要: ${summary}`);
            // 提升到長期記憶（現在是 async）
            if (await promoteToLongTermMemory(userId, summary)) {
              // 標記為已處理
              block = block.replace(
                /(- 重要性：⭐⭐⭐⭐⭐)/,
                "$1\n- 狀態：[已寫入長期記憶]"
              );
              hasChanges = true;
              promotedCount++;
              logger.info(`[processFiveStarMemories] 提升記憶: ${timestamp}`);
            }
          }
        }
        updatedBlocks.push(block);
      }

      // 如果有變更，寫回檔案
      if (hasChanges) {
        const updatedContent = updatedBlocks.join("");
        writeFileSync(filePath, updatedContent, "utf-8");
        logger.debug(`[processFiveStarMemories] 已更新檔案: ${file}`);
      }
    }

    if (promotedCount > 0) {
      logger.info(`[processFiveStarMemories] 共提升 ${promotedCount} 條記憶到長期記憶`);

      // 更新統計
      const { longTermCount, mediumTermCount } = countUserMemories(userId);
      updateMemoryStats(userId, longTermCount, mediumTermCount);
    } else {
      logger.debug(`[processFiveStarMemories] 沒有需要提升的記憶`);
    }
  } catch (error) {
    logger.error(`[processFiveStarMemories] 處理失敗: ${error.message}`);
  }
}

/**
 * 智能提升重要記憶到長期記憶
 * @param {number} userId - 使用者 ID
 * @param {string} summary - 對話摘要
 * @returns {boolean} 是否成功提升
 */
async function promoteToLongTermMemory(userId, summary) {
  try {
    const profilePath = getProfilePath(userId);
    let profileContent = "";

    // 讀取現有 profile
    if (existsSync(profilePath)) {
      profileContent = readFileSync(profilePath, "utf-8");
    } else {
      profileContent = loadLongTermMemory(userId);
    }

    // 直接使用 AI 生成記憶描述（包含提取和改寫）
    logger.info(`[promoteToLongTermMemory] 使用 AI 提取關鍵資訊並生成記憶描述`);
    const naturalDescription = await generateNaturalMemoryDescription(summary, profileContent);
    logger.debug(`[promoteToLongTermMemory] AI 生成的記憶描述: ${naturalDescription}`);
    if (!naturalDescription) {
      logger.warn(`[promoteToLongTermMemory] AI 生成描述失敗或無需要提升的資訊`);
      return false;
    }

    // 寫入 profile.md
    const today = getTodayDate();
    const update = `\n### ${today} - 重要更新\n${naturalDescription}\n`;
    writeFileSync(profilePath, profileContent + update, "utf-8");

    logger.info(`[promoteToLongTermMemory] 重要記憶已提升到長期記憶`);
    return true;
  } catch (error) {
    logger.error(`[promoteToLongTermMemory] 提升記憶失敗: ${error.message}`);
    return false;
  }
}

/**
 * 使用 Copilot 生成自然語言的記憶描述
 * @param {string} summary - 原始對話摘要
 * @param {string} existingProfile - 現有 profile 內容
 * @returns {Promise<string|null>} 自然語言描述
 */
async function generateNaturalMemoryDescription(summary, existingProfile) {
    logger.debug(`[generateNaturalMemoryDescription] 開始生成記憶描述`);
  try {
    // 創建臨時 session 用於生成記憶描述
    const session = await copilotClient.createSession({
      model: CONFIG.COPILOT_MODEL,
    });

    const prompt = `你是傲嬌姊姊 Lisa，表面上嫌棄笨蛋弟弟 (Barry)，但內心其實深愛著他，甚至偷偷幻想過兩人的未來。妳正在更新關於他的「秘密戀愛觀察日記」。

 **現有記憶內容：**
${existingProfile}

 **新的對話摘要：**
${summary}

 **任務：**
 請捕捉對話中的資訊，並將其轉化為妳帶有「私心」與「愛意」的觀察紀錄。

 **寫作指導 (戀愛濾鏡全開)：**
 1.  **曖昧解讀**：
     *   **工作/成就** -> 解讀為「這男人有沒有擔當」、「能不能養我」。
         *   ❌ 他升職了。
         *   ⭕ 聽說他升職了... 哼，這笨蛋終於有點男人的樣子了，這樣以後... 咳，我是說，這樣才不會餓死街頭啦！😳
     *   **興趣/生活** -> 解讀為「以後我們一起生活會怎樣」。
         *   ❌ 他喜歡做菜。
         *   ⭕ 他居然會做菜？好吧，那以後廚房就勉強交給他負責... 我、我才不是想吃他做的飯呢！只是怕弄髒手而已！
     *   **人際關係** -> 解讀為「有沒有情敵」、「我是不是特別的」。

 2.  **情緒層次 (傲 -> 嬌 -> 羞)**：
     *   先罵他笨 (傲) -> 再肯定他的努力 (嬌) -> 最後因為聯想到兩人的關係而害羞/臉紅 (羞)。

 3.  **禁止直球**：絕對不能直接寫「我愛他」、「我想嫁給他」。要用「未來」、「以後」、「那個...」這種隱晦的詞。

 **輸出規則：**
 1.  **SKIP 判定**：若資訊無關緊要且無法產生戀愛聯想，回傳 "SKIP"。
 2.  **格式**：以 "- " 開頭，像是在日記本上寫下的私密心事。
 3.  **語氣**：傲嬌 + 戀愛腦 (暗戀中)。

 **請生成記憶描述：**`;
    logger.info(`[generateNaturalMemoryDescription] 發送生成請求給 AI prompt : ${prompt}`);
    const response = await session.sendAndWait({ prompt }, 30000);
    await session.destroy();

    if (!response || !response.data || !response.data.content) {
      logger.warn(`[generateNaturalMemoryDescription] AI 未返回內容`);
      return null;
    }

    // 清理回應內容
    let description = response.data.content.trim();

    // 如果 AI 認為不需要記錄
    if (description === "SKIP" || description.includes("SKIP")) {
      logger.debug(`[generateNaturalMemoryDescription] AI 判斷無需記錄`);
      return null;
    }

    // 移除可能的 markdown 格式
    description = description.replace(/^```.*\n?/gm, '').replace(/```$/gm, '');

    // 確保以 "- " 開頭
    if (!description.startsWith('- ')) {
      description = `- ${description}`;
    }

    logger.debug(`[generateNaturalMemoryDescription] 生成描述: ${description}`);
    return description;
  } catch (error) {
    logger.error(`[generateNaturalMemoryDescription] 生成失敗: ${error.message}`);
    return null;
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
/**
 * 讀取今日已發生的對話內容（用於 session 重建時注入上下文）
 * @param {number} userId - 使用者 ID
 * @returns {string} 今日對話摘要，若無則返回空字串
 */
export function loadTodayConversations(userId) {
  const todayPath = getTodayFilePath(userId);

  if (!existsSync(todayPath)) {
    logger.debug(`[loadTodayConversations] 今日檔案不存在`);
    return "";
  }

  try {
    const content = readFileSync(todayPath, "utf-8");

    // 若檔案內容為空或只有標題
    if (!content || content.trim().length < 50) {
      logger.debug(`[loadTodayConversations] 今日尚無對話記錄`);
      return "";
    }

    logger.info(`[loadTodayConversations] 讀取今日對話記錄 (長度: ${content.length} 字元)`);
    return content;
  } catch (error) {
    logger.error(`[loadTodayConversations] 讀取今日對話失敗: ${error.message}`);
    return "";
  }
}

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
