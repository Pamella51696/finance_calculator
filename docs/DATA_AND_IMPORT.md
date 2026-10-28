# Data, import formats, and cloud migration

## Local database location

- Default SQLite file: `data/finance.db` (created on first API start)
- Backups: `data/backups/finance-backup-<timestamp>.db`
- The `data/` directory is gitignored except this documentation.

## Sign convention (account transactions)

Amounts are stored as **integer paise**. For bank/cash accounts:

- **Positive** `amount_paise` increases balance (income, refunds, redemptions to cash).
- **Negative** `amount_paise` decreases balance (expenses, EMIs, investment contributions).

Document this in UI help when entering manual transactions.

## Accepted import formats

| Format | Notes |
|--------|--------|
| `.csv` | Delimiter auto-detected (`,`, `;`, tab). UTF-8 text. |
| `.xlsx` / `.xls` | Worksheet selectable in Import Center. Macros are not executed. |

## Sample fixtures (non-personal)

- `fixtures/sample-bank-statement.csv` — bank profile with Debit/Credit columns (DD/MM/YYYY)
- `fixtures/sample-mutual-fund.csv` — mutual fund purchase row

## Supported column mapping fields

`Date`, `Description`, `Debit`, `Credit`, `Amount`, `Category`, `Merchant`, `Account`, `Transaction Type`, `Reference` (via mapping JSON keys).

Import profiles: bank, credit card, income, expense, mutual fund, stock/ETF, SIP, FD/RD, PPF/EPF.

## Known limitations (v0.1)

- Market/NAV API integrations are optional; manual valuations only unless imported.
- EMI schedule UI is minimal; matching links can be extended via `transaction_links`.
- Cloud sync is **not** implemented; repositories are structured for a future PostgreSQL adapter.

## Future cloud migration strategy

1. Keep using stable UUID primary keys and `created_at` / `updated_at` on records.
2. Replace `@finance/db` SQLite repositories with PostgreSQL implementations behind the same method signatures.
3. Run dual-write or one-time ETL: export SQLite backup → transform → load into Postgres.
4. UI continues to call REST `/api/*` only; no SQLite types in React components.

## Backup procedure

1. Open **Backup & Settings** in the app, click **Export backup**, or `POST /api/backup/export`.
2. Copy the generated file from `data/backups/` to secure storage.
3. Restore only with explicit confirmation checkbox; restart API after restore.
