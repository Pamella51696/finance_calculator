import type { Database } from "better-sqlite3";
import { v4 as uuid } from "uuid";
import type { InvestmentAssetClass } from "@finance/core";

export class InvestmentRepository {
  constructor(private db: Database) {}

  listInstruments(assetClass?: InvestmentAssetClass) {
    const rows = assetClass
      ? (this.db
          .prepare(
            "SELECT * FROM investment_instruments WHERE asset_class = ? ORDER BY name",
          )
          .all(assetClass) as DbInstrument[])
      : (this.db
          .prepare("SELECT * FROM investment_instruments ORDER BY asset_class, name")
          .all() as DbInstrument[]);
    return rows.map(mapInstrument);
  }

  createInstrument(input: {
    assetClass: InvestmentAssetClass;
    name: string;
    identifier?: string;
    metadata?: Record<string, unknown>;
  }) {
    const now = new Date().toISOString();
    const id = uuid();
    this.db
      .prepare(
        `INSERT INTO investment_instruments (id, asset_class, name, identifier, metadata_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.assetClass,
        input.name,
        input.identifier ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
        now,
        now,
      );
    return this.getInstrument(id)!;
  }

  getInstrument(id: string) {
    const row = this.db
      .prepare("SELECT * FROM investment_instruments WHERE id = ?")
      .get(id) as DbInstrument | undefined;
    return row ? mapInstrument(row) : null;
  }

  addInvestmentTransaction(input: {
    instrumentId: string;
    txnDate: string;
    txnType: string;
    amountPaise: number;
    units?: number;
    navPaise?: number;
    source?: string;
    importBatchId?: string;
  }) {
    const now = new Date().toISOString();
    const id = uuid();
    this.db
      .prepare(
        `INSERT INTO investment_transactions (
          id, instrument_id, txn_date, txn_type, units, nav_paise, amount_paise, source, import_batch_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.instrumentId,
        input.txnDate,
        input.txnType,
        input.units ?? null,
        input.navPaise ?? null,
        input.amountPaise,
        input.source ?? "imported",
        input.importBatchId ?? null,
        now,
        now,
      );
    return id;
  }

  latestValuation(instrumentId: string) {
    return this.db
      .prepare(
        `SELECT * FROM valuations WHERE instrument_id = ? ORDER BY valuation_date DESC LIMIT 1`,
      )
      .get(instrumentId) as
      | {
          value_paise: number;
          valuation_date: string;
          data_source: string;
          is_manual: number;
        }
      | undefined;
  }
}

interface DbInstrument {
  id: string;
  asset_class: string;
  name: string;
  identifier: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
}

function mapInstrument(row: DbInstrument) {
  return {
    id: row.id,
    assetClass: row.asset_class as InvestmentAssetClass,
    name: row.name,
    identifier: row.identifier,
    metadata: row.metadata_json ? JSON.parse(row.metadata_json) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
