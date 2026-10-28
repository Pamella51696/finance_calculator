import type { Database } from "better-sqlite3";
import { v4 as uuid } from "uuid";

/** Demo data is isolated (is_demo = 1) and kept separate from imported user data. */
export function seedDemoData(db: Database): void {
  const row = db.prepare("SELECT COUNT(*) as c FROM accounts WHERE is_demo = 1").get() as {
    c: number;
  };
  if (row.c > 0) return;

  const now = new Date().toISOString();
  const demoAccountId = uuid();
  db.prepare(
    `INSERT INTO accounts (id, name, type, institution, is_demo, created_at, updated_at)
     VALUES (?, 'Demo Savings (sample)', 'bank', 'Sample Bank', 1, ?, ?)`,
  ).run(demoAccountId, now, now);

  db.prepare(
    `INSERT INTO app_settings (key, value_json, updated_at) VALUES ('allocation', ?, ?)
     ON CONFLICT(key) DO NOTHING`,
  ).run(
    JSON.stringify({
      minimumCashBufferPaise: 5000000,
      emergencySavingsTargetPaise: 0,
      plannedSipPaise: 0,
    }),
    now,
  );
}
