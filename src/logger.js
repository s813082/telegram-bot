import { dirname, join } from "path";
import { fileURLToPath } from "url";
import winston from "winston";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── 日誌系統設定 ──────────────────────────────────────
export const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss.SSS" }),
    winston.format.errors({ stack: true }),
    winston.format.printf(
      (info) => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}${info.stack ? "\n" + info.stack : ""}`
    )
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: join(__dirname, "..", "logs", "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: join(__dirname, "..", "logs", "combined.log"),
    }),
  ],
});
