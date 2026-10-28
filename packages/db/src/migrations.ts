import type Database from "better-sqlite3";

const migrations: { id: number; sql: string }[] = [
  {
    id: 1,
    sql: `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  institution TEXT,
  currency TEXT NOT NULL DEFAULT 'INR',
  is_demo INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  profile TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  worksheet_name TEXT,
  status TEXT NOT NULL,
  summary_json TEXT,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_import_batches_file_hash ON import_batches(file_hash);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  account_id TEXT NOT NULL REFERENCES accounts(id),
  txn_date TEXT NOT NULL,
  type TEXT NOT NULL,
  amount_paise INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT,
  merchant TEXT,
  source TEXT NOT NULL,
  import_batch_id TEXT,
  external_ref TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (import_batch_id) REFERENCES import_batches(id)
);

CREATE INDEX IF NOT EXISTS idx_transactions_account_date ON transactions(account_id, txn_date);
CREATE INDEX IF NOT EXISTS idx_transactions_batch ON transactions(import_batch_id);

CREATE TABLE IF NOT EXISTS import_staging_rows (
  id TEXT PRIMARY KEY,
  batch_id TEXT NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_index INTEGER NOT NULL,
  status TEXT NOT NULL,
  parsed_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS import_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  name TEXT NOT NULL,
  profile TEXT NOT NULL,
  mapping_json TEXT NOT NULL,
  options_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_links (
  id TEXT PRIMARY KEY,
  left_transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  right_transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  link_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(left_transaction_id, right_transaction_id, link_type)
);

CREATE TABLE IF NOT EXISTS loans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  name TEXT NOT NULL,
  lender TEXT,
  principal_paise INTEGER,
  interest_rate_bps INTEGER,
  emi_paise INTEGER,
  tenure_months INTEGER,
  start_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS investment_instruments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'local',
  asset_class TEXT NOT NULL,
  name TEXT NOT NULL,
  identifier TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS investment_transactions (
  id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL REFERENCES investment_instruments(id) ON DELETE CASCADE,
  txn_date TEXT NOT NULL,
  txn_type TEXT NOT NULL,
  units REAL,
  nav_paise INTEGER,
  amount_paise INTEGER NOT NULL,
  fees_paise INTEGER,
  source TEXT NOT NULL,
  import_batch_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS valuations (
  id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL REFERENCES investment_instruments(id) ON DELETE CASCADE,
  value_paise INTEGER NOT NULL,
  valuation_date TEXT NOT NULL,
  data_source TEXT NOT NULL,
  is_manual INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS fixed_deposits (
  id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL UNIQUE REFERENCES investment_instruments(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  principal_paise INTEGER NOT NULL,
  interest_rate_bps INTEGER,
  start_date TEXT NOT NULL,
  maturity_date TEXT NOT NULL,
  compounding TEXT,
  payout_type TEXT,
  maturity_value_paise INTEGER,
  maturity_value_estimated INTEGER NOT NULL DEFAULT 1,
  renewal_status TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recurring_deposits (
  id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL UNIQUE REFERENCES investment_instruments(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  monthly_contribution_paise INTEGER NOT NULL,
  interest_rate_bps INTEGER,
  start_date TEXT NOT NULL,
  maturity_date TEXT NOT NULL,
  installment_count INTEGER,
  installments_paid INTEGER NOT NULL DEFAULT 0,
  estimated_maturity_paise INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ppf_accounts (
  id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL UNIQUE REFERENCES investment_instruments(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  recorded_balance_paise INTEGER NOT NULL DEFAULT 0,
  annual_limit_paise INTEGER NOT NULL DEFAULT 15000000,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS epf_accounts (
  id TEXT PRIMARY KEY,
  instrument_id TEXT NOT NULL UNIQUE REFERENCES investment_instruments(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  recorded_balance_paise INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`,
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  const applied = new Set(
    (
      db.prepare("SELECT id FROM schema_migrations").all() as { id: number }[]
    ).map((r) => r.id),
  );
  for (const m of migrations) {
    if (applied.has(m.id)) continue;
    db.exec("BEGIN");
    try {
      db.exec(m.sql);
      db.prepare("INSERT INTO schema_migrations (id) VALUES (?)").run(m.id);
      db.exec("COMMIT");
    } catch (e) {
      db.exec("ROLLBACK");
      throw e;
    }
  }
}
