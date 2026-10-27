# MASTER PROMPT: India Personal Finance & Monthly Allocation Application

You are building **finance_calculator**: a personal finance application for Indian households. The product helps users understand cash flow, obligations, and investments, and recommends how much to allocate toward investments each month—without executing trades or payments on the user's behalf.

## Product goals

- Give a clear monthly picture: income, essential spending, EMIs, bills, savings buffers, and investable surplus.
- Track liabilities (loans/EMIs) and major investment types common in India.
- Support manual entry and spreadsheet-driven workflows; the user owns their data.
- Prefer accuracy and reconciliation over flashy charts built on duplicate or guessed numbers.
- Work for a single user/household first; design so multi-user/cloud can be added later.

## Target user and conventions

- Currency: **INR** unless the user configures otherwise.
- **Financial year**: India FY (1 April – 31 March) for PPF/EPF summaries and annual limits.
- Dates: support common Indian and international date formats in imports; store canonical ISO dates internally.
- Language: English UI; use familiar Indian product terms (SIP, FD, RD, PPF, EPF, EMI).

## Application surface (dashboard)

Provide a cohesive frontend with primary areas:

| Area | Purpose |
|------|---------|
| **Income** | Salary, business income, other inflows |
| **Expenses** | Day-to-day spending, categories, merchants |
| **EMI** | Loans, schedules, paid vs due |
| **Investments** | Holdings and transactions by asset class |
| **Reports** | Trends, allocation vs actual, export-friendly summaries |

Navigation should make it obvious whether numbers come from **imported**, **manual**, or **scheduled** sources.

## Monthly money-allocation engine (core)

Implement a deterministic **monthly allocation engine** that answers: *given what I know this month, how much cash is truly available and how much should go to investments vs buffers vs essentials?*

The engine should:

- Operate on a **selected calendar month** (and optionally show rolling context).
- Separate **confirmed** vs **expected** income.
- Account for **essential expenses**, **EMIs due**, **credit card payments** (not double-counting card spend + bill pay), **upcoming bills**, **emergency fund targets**, **planned SIPs**, and other **investment commitments**.
- Enforce a configurable **minimum cash buffer** before recommending discretionary spend or new investments.
- Output a **recommended investment amount** and a breakdown the user can audit.
- Never auto-sell assets, auto-debit accounts, or place orders.

When imported bank/card data conflicts with schedules (EMI, SIP, bills), prefer **reconciliation and matching** over naive summation.

## Liabilities and EMI

- Support multiple loans with principal, rate, tenure, EMI amount, and payment history where known.
- Distinguish EMI **schedule** from **actual bank debits**; link them when matched.
- Show remaining tenure and outstanding principal when sufficient data exists; do not invent amortization if inputs are incomplete—label estimates clearly.

## Investment tracking (overview)

Support dedicated experiences for:

- Mutual funds and SIPs  
- Stocks and ETFs  
- Fixed deposits (FD)  
- Recurring deposits (RD)  
- Public Provident Fund (PPF)  
- Employee Provident Fund (EPF)  

Detailed field-level requirements and data-quality rules are specified in **PROJECT CUSTOMIZATION** below (sections 5–6). Do not fabricate NAVs, market prices, or government rates.

## Unified transactions (overview)

All cash and investment events should eventually flow through a **single transaction model** with explicit types (income, expense, transfer, EMI, investment flows, dividends, refunds, adjustments). Sign conventions must be documented. De-duplication rules are mandatory—see PROJECT CUSTOMIZATION §4.

## Data handling (default intent — superseded where customization conflicts)

- Prefer structured, queryable storage over ad hoc in-memory collections for anything that must survive restarts.
- Keep UI components free of direct persistence logic; use services/repositories.
- Support export of user data for backup and portability.
- No requirement for bank API aggregation in v1.

## Import (default intent — superseded where customization conflicts)

- Accept user-provided **CSV/Excel** exports from banks, cards, brokers, and AMCs.
- Validate before commit; show errors and duplicates to the user.
- Full Import Center workflow is defined in PROJECT CUSTOMIZATION §3.

## Architecture (default)

```
Frontend dashboard  →  Application services  →  Data access layer  →  Persistent store
                              ↑
                       Import / export
```

Implement **financial calculations**, **import validation**, **duplicate matching**, and **reporting** in testable modules separate from React (or equivalent) UI.

## Engineering standards

- TypeScript end-to-end where practical; strict typing for money amounts (integer paise or decimal with explicit rounding rules—pick one and document).
- Meaningful automated tests for calculation, import, matching, and persistence paths.
- Sample/fixture data only—never commit real personal finance files.
- Document assumptions, sign conventions, and known limitations in repo docs as features land.

## Implementation order (recommended)

1. Persistent data model, migrations, repository interfaces.  
2. Unified transaction model and basic CRUD UI.  
3. Import Center with staging, validation, and transactional commit.  
4. Matching/reconciliation (EMI, card bill pay, SIP vs MF purchase).  
5. Investment trackers per asset class.  
6. Monthly allocation engine wired to reconciled data.  
7. Reports and backup/restore hardening.

Advanced analytics and optional market-data providers come **after** reconciled imports and local persistence are solid.

---

# PROJECT CUSTOMIZATION: LOCAL-FIRST FINANCE APPLICATION

> **Note:** This section overrides conflicting defaults in the master prompt above (storage, import depth, investment detail, tests, and completion criteria).

## 1. Storage Architecture

Build the first version as a local-first personal finance application.

Requirements:

- Store all financial records in a local SQLite database.
- Use a persistent database file that survives application restarts.
- Do not store financial records only in browser memory or temporary state.
- Keep the database and exported backups outside disposable build directories.
- Use a repository/service layer so the database implementation can later be replaced or supplemented by a cloud database.
- Separate the UI, financial calculation engine, data access layer, and import/export services.
- Use database migrations and versioned schemas.
- Support exporting a complete backup of the user's financial data.
- Provide backup restoration with validation and confirmation.
- Do not require bank credentials, cloud accounts, or paid APIs for the initial version.

If the existing application uses another suitable local database, assess whether it can meet these requirements before replacing it.

## 2. Future Cloud Migration

Prepare the architecture for a future cloud version without implementing unnecessary cloud infrastructure now.

Requirements:

- Use stable IDs for financial records.
- Track creation and modification timestamps.
- Define user ownership fields or an appropriate ownership abstraction where needed.
- Avoid local file paths or database-specific behavior inside UI components.
- Keep database access behind interfaces.
- Design migrations to preserve existing financial data.
- Document how local data could later migrate to PostgreSQL or another cloud database.
- Do not claim that cloud synchronization is implemented until it actually works.

The local version must work independently without internet access, except for optional future integrations.

## 3. Excel and CSV Import Center

Build a dedicated Import Center for importing financial records from CSV and Excel files (.xlsx and .xls where supported).

The import workflow must include:

1. Select a file.
2. Detect the file format and available worksheets.
3. Preview the uploaded data.
4. Allow the user to select a worksheet.
5. Map spreadsheet columns to application fields.
6. Support common column names such as Date, Description, Debit, Credit, Amount, Category, Merchant, Account, and Transaction Type.
7. Allow date format, currency, and debit/credit conventions to be configured.
8. Validate rows before importing.
9. Display valid rows, invalid rows, warnings, and potential duplicates.
10. Let the user correct mappings and exclude selected rows.
11. Require confirmation before committing records.
12. Display a final import summary.

Support separate import profiles for:

- Bank statements.
- Credit card statements.
- Expense records.
- Income records.
- Mutual fund transactions.
- Stock and ETF transactions.
- SIP transactions.
- FD and RD records.
- PPF and EPF contributions and balances.

Do not assume all spreadsheets have the same structure. Provide configurable mappings and reusable import templates.

### Import correctness

- Use a staging or preview step before writing records to the main database.
- Never silently discard invalid records.
- Never silently convert ambiguous dates or transaction signs.
- Preserve original descriptions and source file details where appropriate.
- Use deterministic duplicate detection based on available fields such as account, date, amount, description, and transaction reference.
- Show potential duplicates instead of automatically deleting legitimate repeated transactions.
- Make imports transactional: either commit the validated batch or roll it back on a database error.
- Record an import batch ID and summary for auditability.
- Ensure re-importing an identical file does not silently double-count transactions.
- Keep imported data separate from sample/demo data.
- Do not execute macros or embedded spreadsheet content.

For large files, process rows efficiently and show progress where appropriate.

## 4. Unified Financial Transaction Model

Create a consistent transaction model for imported and manually entered records.

Support:

- Income.
- Expense.
- Internal transfer.
- Loan/EMI payment.
- Investment contribution.
- Investment sale or redemption.
- Dividend or interest received.
- Refund.
- Adjustment.

Use a consistent sign convention and document it.

Avoid counting the same event twice. For example:

- An EMI payment must not be counted as two separate cash outflows because it appears in both a bank statement and an EMI schedule.
- A mutual fund purchase must not count as both a consumption expense and an investment asset purchase.
- A transfer between two accounts must not count as income or spending.
- A credit card purchase and its subsequent credit card bill payment must not be counted as two expenses.
- A SIP bank debit and the corresponding mutual fund purchase must be reconciled rather than duplicated.

Support transaction matching and manual correction when imported data cannot establish the relationship confidently.

## 5. Investment Tracking: India-Focused

Implement dedicated trackers for all of the following investment types.

### A. Mutual Funds and SIPs

- Fund name and scheme identifier where available.
- Transaction date.
- Purchase, redemption, dividend, and other transaction types.
- Units purchased or redeemed.
- NAV on the transaction date, when provided.
- Transaction amount.
- SIP amount, frequency, and next scheduled contribution.
- Total contributions.
- Current units and valuation.
- Realized and unrealized gains when sufficient data exists.

Do not fabricate NAV values or assume that a scheduled SIP was executed.

### B. Stocks and ETFs

- Instrument name and ticker or identifier.
- Buy and sell transactions.
- Quantity.
- Purchase price.
- Fees and taxes when supplied.
- Dividends.
- Current market price and valuation date when available.
- Realized and unrealized gains where sufficient transaction data exists.

If no current price provider is configured, allow manual price updates and mark them as manually entered.

### C. Fixed Deposits (FDs)

- Bank or institution.
- Principal.
- Interest rate.
- Start date.
- Maturity date.
- Compounding frequency where known.
- Payout type.
- Maturity value, if supplied or calculated using a supported method.
- Renewal status.

Distinguish estimated maturity value from a value confirmed by the financial institution.

### D. Recurring Deposits (RDs)

- Institution.
- Monthly contribution.
- Interest rate.
- Start date.
- Maturity date.
- Number of installments.
- Installments paid and remaining.
- Estimated maturity value.

Clearly identify estimates and handle incomplete interest information.

### E. Public Provident Fund (PPF)

- Account identifier or nickname.
- Contributions.
- Withdrawals where applicable.
- Recorded balance.
- Financial-year contribution summary.
- User-entered interest credits.
- Contribution progress toward a configurable annual limit.

Do not hardcode changing government contribution limits or interest rates as permanent values. Make these configurable and date-effective.

### F. Employee Provident Fund (EPF)

- Employee contributions.
- Employer contributions when available.
- Recorded interest credits.
- Transfers and withdrawals where applicable.
- Current recorded balance.
- Financial-year contribution history.

Keep employee and employer contributions separate. Do not assume a fixed contribution rate or calculate a complete EPF balance without sufficient data.

## 6. Investment Data Quality

Use an extensible investment-provider interface for optional market data integrations.

The application must work without a market-data API.

For every valuation, track:

- Value.
- Valuation date.
- Data source.
- Whether the value is manually entered, imported, or provider-supplied.

Do not fabricate prices, NAVs, interest rates, returns, or market performance.

Calculate portfolio totals from recorded holdings and valuations. Clearly identify incomplete valuation coverage.

Keep investment contributions, cash distributions, realized gains, unrealized gains, and current market value distinct.

## 7. Monthly Allocation Integration

Connect imported transactions and investment records to the monthly money-allocation engine.

The engine must distinguish:

- Cash currently available.
- Confirmed income received.
- Expected but unreceived income.
- Essential expenses.
- Unpaid EMI obligations.
- Upcoming bills.
- Emergency savings.
- Planned SIP commitments.
- Other investment contributions.
- Minimum cash buffer.
- Safe discretionary spending.

Prevent duplicate counting when imported transactions match scheduled EMIs, SIPs, bills, or investment records.

Show both the recommended investment allocation and the actual investment contributions for the selected month.

If actual contributions already exceed the recommendation, show the difference and explain the impact on the remaining cash allocation. Never automatically sell investments or initiate transactions.

## 8. Required Additional Tests

Add tests for:

- CSV imports with different delimiters and date formats.
- Excel files with multiple worksheets.
- Debit/credit columns and signed amounts.
- Invalid rows and user-corrected column mappings.
- Duplicate import detection and repeated file imports.
- Transaction rollback when a batch fails.
- Bank debit matched to a mutual fund purchase.
- Credit card purchase matched to bill payment.
- SIP scheduled versus SIP actually executed.
- Missing NAVs or market prices.
- FD/RD maturity estimates with incomplete data.
- PPF/EPF contributions across financial years.
- Local database persistence after application restart.
- Backup and restore.
- Future cloud migration without coupling UI components to SQLite.

## 9. Completion Criteria

The Import Center must be functional, not a static upload button.

Demonstrate the complete workflow using clearly labelled sample spreadsheets:

- Import a bank statement.
- Preview and map its columns.
- Resolve validation warnings.
- Detect duplicates.
- Commit the records.
- Recalculate the dashboard and monthly allocation.
- Export a backup and verify that it can be restored.

Also demonstrate importing investment transactions and updating the relevant portfolio tracker.

Document the accepted file formats, supported column mappings, known limitations, local database location, backup procedure, and future cloud migration strategy.

Do not use real personal financial records in test fixtures.

## Recommended starting architecture

Frontend dashboard

Income · Expenses · EMI · Investments · Reports

Application services

Financial calculations · Import validation · Duplicate matching · Reports

SQLite

Persistent local records

Import center

CSV · Excel · Validation

Future cloud synchronization can be added through the data-access layer without rebuilding the dashboard.

**Implementation priority:** Build the local database, unified transaction model, and import validation before advanced investment analytics so spending insights and recommended investment amounts reflect reconciled data, not duplicated transactions.
