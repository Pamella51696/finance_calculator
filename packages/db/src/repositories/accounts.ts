import type { Database } from "better-sqlite3";
import { v4 as uuid } from "uuid";
import type { AccountType } from "@finance/core";

export interface AccountRecord {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  institution: string | null;
  currency: string;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
}

export class AccountRepository {
  constructor(private db: Database) {}

  list(includeDemo = false): AccountRecord[] {
    const rows = this.db
      .prepare(
        `SELECT * FROM accounts ${includeDemo ? "" : "WHERE is_demo = 0"} ORDER BY name`,
      )
      .all() as DbAccount[];
    return rows.map(mapAccount);
  }

  getById(id: string): AccountRecord | null {
    const row = this.db.prepare("SELECT * FROM accounts WHERE id = ?").get(id) as
      | DbAccount
      | undefined;
    return row ? mapAccount(row) : null;
  }

  findByName(name: string): AccountRecord | null {
    const row = this.db
      .prepare("SELECT * FROM accounts WHERE lower(name) = lower(?)")
      .get(name) as DbAccount | undefined;
    return row ? mapAccount(row) : null;
  }

  create(input: {
    name: string;
    type: AccountType;
    institution?: string;
    isDemo?: boolean;
  }): AccountRecord {
    const now = new Date().toISOString();
    const id = uuid();
    this.db
      .prepare(
        `INSERT INTO accounts (id, name, type, institution, is_demo, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.name,
        input.type,
        input.institution ?? null,
        input.isDemo ? 1 : 0,
        now,
        now,
      );
    return this.getById(id)!;
  }

  getOrCreateByName(name: string, type: AccountType = "bank"): AccountRecord {
    return this.findByName(name) ?? this.create({ name, type });
  }
}

interface DbAccount {
  id: string;
  user_id: string;
  name: string;
  type: string;
  institution: string | null;
  currency: string;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

function mapAccount(row: DbAccount): AccountRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type as AccountType,
    institution: row.institution,
    currency: row.currency,
    isDemo: row.is_demo === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
