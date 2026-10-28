import { useEffect, useMemo, useState } from "react";
import { formatInr, type ColumnMapping, type ImportProfile } from "@finance/core";
import { apiGet, apiPost, apiPostForm } from "../api/client";

type Account = { id: string; name: string; isDemo: boolean };

interface ParsedRow {
  rowIndex: number;
  date?: string;
  description?: string;
  amountPaise?: number;
  errors: string[];
  warnings: string[];
}

interface PreviewResponse {
  headers: string[];
  rows: ParsedRow[];
  worksheets?: string[];
  selectedWorksheet?: string;
  validCount: number;
  invalidCount: number;
  duplicateCandidates: { rowIndex: number; reason: string }[];
}

const PROFILES: { value: ImportProfile; label: string }[] = [
  { value: "bank_statement", label: "Bank statement" },
  { value: "credit_card_statement", label: "Credit card statement" },
  { value: "income_records", label: "Income records" },
  { value: "expense_records", label: "Expense records" },
  { value: "mutual_fund", label: "Mutual fund" },
  { value: "stock_etf", label: "Stock / ETF" },
  { value: "sip", label: "SIP" },
  { value: "fd_rd", label: "FD / RD" },
  { value: "ppf_epf", label: "PPF / EPF" },
];

export function ImportCenterPage() {
  const [step, setStep] = useState(1);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState("");
  const [profile, setProfile] = useState<ImportProfile>("bank_statement");
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: "Date",
    description: "Description",
    debit: "Debit",
    credit: "Credit",
  });
  const [file, setFile] = useState<File | null>(null);
  const [worksheet, setWorksheet] = useState("");
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const [batchId, setBatchId] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Account[]>("/accounts").then((list) => {
      setAccounts(list.filter((a) => !a.isDemo));
      const first = list.find((a) => !a.isDemo);
      if (first) setAccountId(first.id);
    });
  }, []);

  const duplicateRows = useMemo(
    () => new Set(preview?.duplicateCandidates.map((d) => d.rowIndex) ?? []),
    [preview],
  );

  async function runPreview() {
    if (!file) return;
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("profile", profile);
    form.append("columnMapping", JSON.stringify(mapping));
    form.append("accountId", accountId);
    if (worksheet) form.append("worksheetName", worksheet);
    const result = await apiPostForm<PreviewResponse>("/import/preview", form);
    setPreview(result);
    if (result.worksheets?.length && !worksheet) {
      setWorksheet(result.selectedWorksheet ?? result.worksheets[0] ?? "");
    }
    setStep(3);
  }

  async function stageAndCommit() {
    if (!file || !accountId) return;
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("profile", profile);
    form.append("columnMapping", JSON.stringify(mapping));
    if (worksheet) form.append("worksheetName", worksheet);
    const staged = await apiPostForm<{ batchId: string }>("/import/stage", form);
    setBatchId(staged.batchId);
    const committed = await apiPost<{ imported: number; skipped: number }>(
      "/import/commit",
      {
        batchId: staged.batchId,
        accountId,
        excludeRowIndexes: [...excluded, ...duplicateRows],
      },
    );
    setSummary(`Imported ${committed.imported} rows, skipped ${committed.skipped}.`);
    setStep(5);
  }

  return (
    <div>
      <h2>Import Center</h2>
      <p className="muted">
        CSV / Excel · preview · map columns · validate · confirm commit
      </p>

      <div className="steps">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={`step ${step === s ? "active" : ""}`}>
            Step {s}
          </span>
        ))}
      </div>

      {error && <div className="card">{error}</div>}

      {step === 1 && (
        <div className="card">
          <h3>1. Select file & profile</h3>
          <div style={{ display: "grid", gap: "0.75rem", maxWidth: 520 }}>
            <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <select className="select" value={profile} onChange={(e) => setProfile(e.target.value as ImportProfile)}>
              {PROFILES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <select className="select" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <button className="primary" disabled={!file} onClick={() => setStep(2)}>
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && preview?.worksheets && (
        <div className="card">
          <h3>2. Worksheet</h3>
          <select className="select" value={worksheet} onChange={(e) => setWorksheet(e.target.value)}>
            {preview.worksheets.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>
      )}

      {step === 2 && (
        <div className="card">
          <h3>2. Column mapping</h3>
          {(["date", "description", "debit", "credit", "amount", "category"] as const).map((field) => (
            <label key={field} style={{ display: "block", marginBottom: "0.5rem" }}>
              <span className="muted">{field} → </span>
              <input
                className="input"
                value={mapping[field] ?? ""}
                onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
              />
            </label>
          ))}
          <button
            className="primary"
            onClick={() => runPreview().catch((e) => setError(e.message))}
          >
            Preview data
          </button>
        </div>
      )}

      {step >= 3 && preview && (
        <div className="card">
          <h3>3–4. Preview & validation</h3>
          <p>
            Valid: {preview.validCount} · Invalid: {preview.invalidCount} · Potential duplicates:{" "}
            {preview.duplicateCandidates.length}
          </p>
          <table>
            <thead>
              <tr>
                <th>Use</th>
                <th>Row</th>
                <th>Date</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Issues</th>
              </tr>
            </thead>
            <tbody>
              {preview.rows.map((row) => {
                const isDup = duplicateRows.has(row.rowIndex);
                const cls = row.errors.length ? "row-invalid" : isDup ? "row-warning" : "";
                return (
                  <tr key={row.rowIndex} className={cls}>
                    <td>
                      <input
                        type="checkbox"
                        checked={!excluded.has(row.rowIndex) && row.errors.length === 0}
                        disabled={row.errors.length > 0}
                        onChange={(e) => {
                          const next = new Set(excluded);
                          if (e.target.checked) next.delete(row.rowIndex);
                          else next.add(row.rowIndex);
                          setExcluded(next);
                        }}
                      />
                    </td>
                    <td>{row.rowIndex}</td>
                    <td>{row.date ?? "—"}</td>
                    <td>{row.description}</td>
                    <td>{row.amountPaise != null ? formatInr(row.amountPaise) : "—"}</td>
                    <td>
                      {[...row.errors, ...row.warnings, isDup ? "duplicate?" : ""]
                        .filter(Boolean)
                        .join("; ")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <button
            className="primary"
            style={{ marginTop: "1rem" }}
            onClick={() => {
              setStep(4);
              stageAndCommit().catch((e) => setError(e.message));
            }}
          >
            Confirm import
          </button>
        </div>
      )}

      {step === 5 && summary && (
        <div className="card">
          <h3>5. Import summary</h3>
          <p>{summary}</p>
          {batchId && <p className="muted">Batch ID: {batchId}</p>}
          <p>Dashboard and monthly allocation will reflect imported rows (non-demo accounts).</p>
        </div>
      )}
    </div>
  );
}
