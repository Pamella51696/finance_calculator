import fs from "node:fs";
import path from "node:path";
import type { Database } from "better-sqlite3";
import { resolveDataDir, resolveDbPath } from "./paths.js";

export function exportBackup(db: Database, destPath?: string): string {
  const dataDir = resolveDataDir();
  const backupsDir = path.join(dataDir, "backups");
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const out = destPath ?? path.join(backupsDir, `finance-backup-${stamp}.db`);
  db.backup(out);
  return out;
}

export function restoreBackupSync(backupPath: string, confirm: boolean): string {
  if (!confirm) throw new Error("Restore requires explicit confirmation");
  if (!fs.existsSync(backupPath)) throw new Error("Backup file not found");
  const dbPath = resolveDbPath();
  fs.copyFileSync(backupPath, dbPath);
  return dbPath;
}
