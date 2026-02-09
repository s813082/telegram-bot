import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MEMORY_DIR = path.join(__dirname, "../../memory");

/**
 * 匯出使用者對話記錄
 */
export async function exportConversationHistory(userId) {
  try {
    const userMemoryDir = path.join(MEMORY_DIR, String(userId));
    
    // 檢查目錄是否存在
    try {
      await fs.access(userMemoryDir);
    } catch {
      logger.warn(`[Export] 使用者 ${userId} 沒有記憶檔案`);
      return null;
    }

    // 讀取所有 JSON 檔案
    const files = await fs.readdir(userMemoryDir);
    const jsonFiles = files.filter(f => f.endsWith(".json"));

    if (jsonFiles.length === 0) {
      logger.warn(`[Export] 使用者 ${userId} 沒有對話記錄`);
      return null;
    }

    // 合併所有記憶
    const allMemories = [];
    for (const file of jsonFiles) {
      const filePath = path.join(userMemoryDir, file);
      try {
        const content = await fs.readFile(filePath, "utf-8");
        const data = JSON.parse(content);
        allMemories.push({
          date: file.replace(".json", ""),
          memories: data.memories || [],
        });
      } catch (error) {
        logger.error(`[Export] 讀取檔案 ${file} 失敗: ${error.message}`);
      }
    }

    // 產生匯出內容
    const exportData = {
      userId,
      exportDate: new Date().toISOString(),
      totalDays: allMemories.length,
      totalMemories: allMemories.reduce((sum, day) => sum + day.memories.length, 0),
      history: allMemories,
    };

    const exportContent = JSON.stringify(exportData, null, 2);
    
    // 儲存到臨時檔案
    const tempFile = path.join("/tmp", `copilot_bot_export_${userId}_${Date.now()}.json`);
    await fs.writeFile(tempFile, exportContent);
    
    logger.info(`[Export] 使用者 ${userId} 匯出完成: ${tempFile}`);
    return tempFile;
  } catch (error) {
    logger.error(`[Export] 匯出失敗: ${error.message}`);
    throw error;
  }
}

/**
 * 產生匯出摘要文字
 */
export function generateExportSummary(exportData) {
  const data = JSON.parse(exportData);
  
  const summary = `
📊 **匯出摘要**

總天數：${data.totalDays}
總記憶數：${data.totalMemories}
匯出時間：${new Date(data.exportDate).toLocaleString("zh-TW")}
  `.trim();
  
  return summary;
}
