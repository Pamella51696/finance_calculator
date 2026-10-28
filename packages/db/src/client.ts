import Database from "better-sqlite3";
import { runMigrations } from "./migrations.js";
import { resolveDbPath } from "./paths.js";
import { seedDemoData } from "./seed.js";
import { AccountRepository } from "./repositories/accounts.js";

let shared: Database.Database | null = null;

export function openDatabase(dbPath?: string): Database.Database {
  const path = dbPath ?? resolveDbPath();
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

export function getDatabase(): Database.Database {
  if (!shared) {
    shared = openDatabase();
    seedDemoData(shared);
    const accounts = new AccountRepository(shared);
    if (accounts.list(false).length === 0) {
      accounts.create({ name: "Primary Bank", type: "bank", institution: "Local" });
    }
  }
  return shared;
}

export function closeDatabase(): void {
  if (shared) {
    shared.close();
    shared = null;
  }
}

export type { Database };
