import type { Database } from "better-sqlite3";
import { v4 as uuid } from "uuid";
import type { TransactionSource, TransactionType } from "@finance/core";

export interface TransactionRecord {
  id: string;
  userId: string;
  accountId: string;
  txnDate: string;
  type: TransactionType;
  amountPaise: number;
  description: string;
  category: string | null;
  merchant: string | null;
  source: TransactionSource;
  importBatchId: string | null;
  externalRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export class TransactionRepository {
  constructor(private db: Database) {}

  listForMonth(year: number, month: number, excludeDemo = true): TransactionRecord[] {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
    const rows = this.db
      .prepare(
        `SELECT t.* FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         WHERE t.txn_date >= ? AND t.txn_date < ?
         ${excludeDemo ? "AND a.is_demo = 0" : ""}
         ORDER BY t.txn_date, t.created_at`,
      )
      .all(start, end) as DbTxn[];
    return rows.map(mapTxn);
  }

  listFingerprintsForAccount(accountId: string): {
    transactionId: string;
    accountId: string;
    date: string;
    amountPaise: number;
    description: string;
    reference?: string | null;
  }[] {
    const rows = this.db
      .prepare(
        `SELECT id, account_id, txn_date, amount_paise, description, external_ref
         FROM transactions WHERE account_id = ?`,
      )
      .all(accountId) as {
      id: string;
      account_id: string;
      txn_date: string;
      amount_paise: number;
      description: string;
      external_ref: string | null;
    }[];
    return rows.map((r) => ({
      transactionId: r.id,
      accountId: r.account_id,
      date: r.txn_date,
      amountPaise: r.amount_paise,
      description: r.description,
      reference: r.external_ref,
    }));
  }

  create(input: {
    accountId: string;
    txnDate: string;
    type: TransactionType;
    amountPaise: number;
    description: string;
    category?: string;
    merchant?: string;
    source: TransactionSource;
    importBatchId?: string;
    externalRef?: string;
  }): TransactionRecord {
    const now = new Date().toISOString();
    const id = uuid();
    this.db
      .prepare(
        `INSERT INTO transactions (
          id, account_id, txn_date, type, amount_paise, description, category, merchant,
          source, import_batch_id, external_ref, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.accountId,
        input.txnDate,
        input.type,
        input.amountPaise,
        input.description,
        input.category ?? null,
        input.merchant ?? null,
        input.source,
        input.importBatchId ?? null,
        input.externalRef ?? null,
        now,
        now,
      );
    return this.getById(id)!;
  }

  getById(id: string): TransactionRecord | null {
    const row = this.db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as
      | DbTxn
      | undefined;
    return row ? mapTxn(row) : null;
  }

  sumByTypeForMonth(
    year: number,
    month: number,
  ): Record<string, number> {
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const end = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
    const rows = this.db
      .prepare(
        `SELECT t.type, SUM(t.amount_paise) as total
         FROM transactions t
         JOIN accounts a ON a.id = t.account_id
         WHERE t.txn_date >= ? AND t.txn_date < ? AND a.is_demo = 0
         GROUP BY t.type`,
      )
      .all(start, end) as { type: string; total: number }[];
    const out: Record<string, number> = {};
    for (const r of rows) out[r.type] = r.total;
    return out;
  }
}

interface DbTxn {
  id: string;
  user_id: string;
  account_id: string;
  txn_date: string;
  type: string;
  amount_paise: number;
  description: string;
  category: string | null;
  merchant: string | null;
  source: string;
  import_batch_id: string | null;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
}

function mapTxn(row: DbTxn): TransactionRecord {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id,
    txnDate: row.txn_date,
    type: row.type as TransactionType,
    amountPaise: row.amount_paise,
    description: row.description,
    category: row.category,
    merchant: row.merchant,
    source: row.source as TransactionSource,
    importBatchId: row.import_batch_id,
    externalRef: row.external_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
