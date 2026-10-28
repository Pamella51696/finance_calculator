# finance_calculator

Local-first personal finance app for Indian households: SQLite persistence, CSV/Excel Import Center, investment trackers, and a monthly allocation engine.

## Quick start

```bash
npm install
npm run dev
```

- Web UI: http://localhost:5173  
- API: http://localhost:4000  

On first run, the API creates `data/finance.db` and applies migrations.

## Architecture

```
apps/web (React)  →  apps/api (Express)  →  packages/db (SQLite) 
                              ↘ packages/core (calculations, import validation)
```

Agent instructions: `.cursor/CLOUD.md`

## Try the Import Center

1. Create a bank account from the API or import flow.
2. Use **Import Center** with `fixtures/sample-bank-statement.csv`.
3. Map columns (defaults match the sample), preview, confirm import.
4. Open **Dashboard** to see allocation and transactions.

See [docs/DATA_AND_IMPORT.md](docs/DATA_AND_IMPORT.md) for formats, backup, and cloud migration notes.

## Tests

```bash
npm test
```

## Money representation

All amounts are stored as **integer paise** (100 paise = ₹1).
