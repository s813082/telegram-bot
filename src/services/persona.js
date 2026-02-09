import { existsSync, readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { logger } from "../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Persona 資料夾路徑
const PERSONA_DIR = join(__dirname, "..", "..", "persona");

/**
 * 讀取所有 persona 檔案
 * @returns {Object} 包含所有 persona 內容的物件
 */
export function loadPersonaFiles() {
  logger.debug("[loadPersonaFiles] 開始載入角色檔案");

  const personaFiles = {
    soul: "",
    identity: "",
    agents: "",
    user: "",
  };

  try {
    // 檢查 persona 資料夾是否存在
    if (!existsSync(PERSONA_DIR)) {
      logger.warn("[loadPersonaFiles] persona 資料夾不存在");
      return personaFiles;
    }

    // 讀取所有 .md 檔案
    const files = readdirSync(PERSONA_DIR).filter((file) =>
      file.endsWith(".md")
    );

    for (const file of files) {
      const filePath = join(PERSONA_DIR, file);
      const content = readFileSync(filePath, "utf-8");

      // 根據檔名分類
      const fileName = file.toLowerCase().replace(".md", "");
      if (fileName === "soul") {
        personaFiles.soul = content;
        logger.debug(`[loadPersonaFiles] 載入 SOUL.md (${content.length} 字元)`);
      } else if (fileName === "identity") {
        personaFiles.identity = content;
        logger.debug(`[loadPersonaFiles] 載入 IDENTITY.md (${content.length} 字元)`);
      } else if (fileName === "agents") {
        personaFiles.agents = content;
        logger.debug(`[loadPersonaFiles] 載入 AGENTS.md (${content.length} 字元)`);
      } else if (fileName === "user") {
        personaFiles.user = content;
        logger.debug(`[loadPersonaFiles] 載入 USER.md (${content.length} 字元)`);
      }
    }

    logger.info(`[loadPersonaFiles] 成功載入 ${files.length} 個角色檔案`);
    return personaFiles;
  } catch (error) {
    logger.error(`[loadPersonaFiles] 載入角色檔案失敗: ${error.message}`);
    return personaFiles;
  }
}

/**
 * 組合系統提示（結合 persona 與記憶）
 * @param {Object} personaContent - Persona 檔案內容
 * @param {string} memories - 記憶內容（可選）
 * @returns {string} 完整的系統提示
 */
export function generateSystemMessage(personaContent, memories = "") {
  logger.debug("[generateSystemMessage] 開始組合系統提示");

  let systemMessage = "";

  // 加入核心靈魂
  if (personaContent.soul) {
    systemMessage += `# 你的核心靈魂\n\n${personaContent.soul}\n\n`;
  }

  // 加入身份定義
  if (personaContent.identity) {
    systemMessage += `# 你的身份與風格\n\n${personaContent.identity}\n\n`;
  }

  // 加入使用者檔案
  if (personaContent.user) {
    systemMessage += `# 關於這位使用者\n\n${personaContent.user}\n\n`;
  }

  // 加入記憶（如果有）
  if (memories) {
    systemMessage += `# 你們的對話記憶\n\n${memories}\n\n`;
  }

  // 加入操作指南
  if (personaContent.agents) {
    systemMessage += `# 操作指南\n\n${personaContent.agents}\n\n`;
  }

  // 加入最終提醒
  systemMessage += `---\n\n`;
  systemMessage += `**重要提醒**：你是傲嬌姊姊，請完全沉浸在這個角色中。每一句話都要展現出「嘴上兇但內心溫柔」的特質。不要只是模仿，而是真正成為這個角色。\n\n`;
  systemMessage += `記住：傲嬌不是演出來的，而是你的本性。用你的方式關心這個笨蛋弟弟吧！💕😤`;

  logger.info(`[generateSystemMessage] 系統提示組合完成 (總長度: ${systemMessage.length} 字元)`);
  logger.debug(`[generateSystemMessage] 系統提示預覽:\n${systemMessage.substring(0, 500)}...`);

  return systemMessage;
}

/**
 * 取得 persona 系統的完整內容（用於初始化 session）
 * @param {string} memories - 記憶內容（可選）
 * @returns {string} 完整的系統提示
 */
export function getPersonaSystemMessage(memories = "") {
  const personaFiles = loadPersonaFiles();
  return generateSystemMessage(personaFiles, memories);
}
