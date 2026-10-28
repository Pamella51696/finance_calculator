import type { Database } from "better-sqlite3";
import { v4 as uuid } from "uuid";
import type { ImportProfile, ParsedImportRow } from "@finance/core";
import type { AccountRepository } from "./accounts.js";
import type { TransactionRepository } from "./transactions.js";

export interface ImportBatchRecord {
  id: string;
  profile: ImportProfile;
  fileName: string;
  fileHash: string;
  worksheetName: string | null;
  status: string;
  summaryJson: string | null;
  createdAt: string;
}

export class ImportRepository {
  constructor(
    private db: Database,
    private accounts: AccountRepository,
    private transactions: TransactionRepository,
  ) {}

  findBatchByFileHash(fileHash: string): ImportBatchRecord | null {
    const row = this.db
      .prepare("SELECT * FROM import_batches WHERE file_hash = ?")
      .get(fileHash) as DbBatch | undefined;
    return row ? mapBatch(row) : null;
  }

  createStagingBatch(input: {
    profile: ImportProfile;
    fileName: string;
    fileHash: string;
    worksheetName?: string;
    rows: ParsedImportRow[];
  }): ImportBatchRecord {
    const id = uuid();
    const now = new Date().toISOString();
    this.db
      .prepare(
        `INSERT INTO import_batches (id, profile, file_name, file_hash, worksheet_name, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'staging', ?)`,
      )
      .run(
        id,
        input.profile,
        input.fileName,
        input.fileHash,
        input.worksheetName ?? null,
        now,
      );

    const insertRow = this.db.prepare(
      `INSERT INTO import_staging_rows (id, batch_id, row_index, status, parsed_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    );
    for (const row of input.rows) {
      const status = row.errors.length ? "invalid" : "valid";
      insertRow.run(uuid(), id, row.rowIndex, status, JSON.stringify(row), now);
    }
    return this.getBatch(id)!;
  }

  getBatch(id: string): ImportBatchRecord | null {
    const row = this.db.prepare("SELECT * FROM import_batches WHERE id = ?").get(id) as
      | DbBatch
      | undefined;
    return row ? mapBatch(row) : null;
  }

  getStagingRows(batchId: string): ParsedImportRow[] {
    const rows = this.db
      .prepare(
        "SELECT parsed_json FROM import_staging_rows WHERE batch_id = ? ORDER BY row_index",
      )
      .all(batchId) as { parsed_json: string }[];
    return rows.map((r) => JSON.parse(r.parsed_json) as ParsedImportRow);
  }

  commitBatch(params: {
    batchId: string;
    accountId: string;
    excludeRowIndexes: number[];
    defaultAccountName?: string;
  }): { imported: number; skipped: number; batch: ImportBatchRecord } {
    const batch = this.getBatch(params.batchId);
    if (!batch) throw new Error("Batch not found");
    if (batch.status === "committed") {
      throw new Error("Batch already committed");
    }
    const existing = this.findBatchByFileHash(batch.fileHash);
    if (existing && existing.status === "committed" && existing.id !== batch.id) {
      throw new Error("Identical file was already imported");
    }

    const rows = this.getStagingRows(params.batchId);
    const exclude = new Set(params.excludeRowIndexes);
    let imported = 0;
    let skipped = 0;

    const commit = this.db.transaction(() => {
      for (const row of rows) {
        if (row.errors.length > 0 || exclude.has(row.rowIndex)) {
          skipped++;
          continue;
        }
        if (!row.date || row.amountPaise == null || !row.transactionType) {
          skipped++;
          continue;
        }
        let accountId = params.accountId;
        if (row.accountName) {
          accountId = this.accounts.getOrCreateByName(row.accountName, "bank").id;
        }
        this.transactions.create({
          accountId,
          txnDate: row.date,
          type: row.transactionType,
          amountPaise: row.amountPaise,
          description: row.description ?? "",
          category: row.category,
          merchant: row.merchant,
          source: "imported",
          importBatchId: params.batchId,
          externalRef: row.reference,
        });
        imported++;
      }
      const summary = JSON.stringify({ imported, skipped });
      this.db
        .prepare(
          "UPDATE import_batches SET status = 'committed', summary_json = ? WHERE id = ?",
        )
        .run(summary, params.batchId);
    });

    try {
      commit();
    } catch (e) {
      throw e;
    }

    return { imported, skipped, batch: this.getBatch(params.batchId)! };
  }
}

interface DbBatch {
  id: string;
  profile: string;
  file_name: string;
  file_hash: string;
  worksheet_name: string | null;
  status: string;
  summary_json: string | null;
  created_at: string;
}

function mapBatch(row: DbBatch): ImportBatchRecord {
  return {
    id: row.id,
    profile: row.profile as ImportProfile,
    fileName: row.file_name,
    fileHash: row.file_hash,
    worksheetName: row.worksheet_name,
    status: row.status,
    summaryJson: row.summary_json,
    createdAt: row.created_at,
  };
}
