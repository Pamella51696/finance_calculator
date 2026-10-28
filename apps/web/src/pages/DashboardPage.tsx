import { useEffect, useState } from "react";
import { formatInr } from "@finance/core";
import { apiGet } from "../api/client";

interface DashboardResponse {
  transactions: {
    id: string;
    txnDate: string;
    type: string;
    amountPaise: number;
    description: string;
    source: string;
  }[];
  allocation: {
    breakdown: {
      confirmedIncomePaise: number;
      essentialExpensesPaise: number;
      recommendedInvestmentPaise: number;
      actualInvestmentContributionsPaise: number;
      safeDiscretionaryPaise: number;
      cashAvailablePaise: number;
    };
    notes: string[];
  };
}

function currentMonth() {
  const d = new Date();
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function DashboardPage() {
  const [{ year, month }, setYm] = useState(currentMonth);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<DashboardResponse>(`/dashboard/${year}/${month}`)
      .then(setData)
      .catch((e) => setError(String(e.message)));
  }, [year, month]);

  const b = data?.allocation.breakdown;

  return (
    <div>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <p className="muted">Monthly allocation and recent activity</p>
        </div>
        <div>
          <input
            className="input"
            type="month"
            value={`${year}-${String(month).padStart(2, "0")}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              if (y && m) setYm({ year: y, month: m });
            }}
          />
        </div>
      </header>

      {error && <div className="card">{error}</div>}

      {b && (
        <div className="grid-3">
          <div className="card">
            <div className="stat-label">Confirmed income</div>
            <div className="stat-value">{formatInr(b.confirmedIncomePaise)}</div>
          </div>
          <div className="card">
            <div className="stat-label">Essential expenses</div>
            <div className="stat-value">{formatInr(b.essentialExpensesPaise)}</div>
          </div>
          <div className="card">
            <div className="stat-label">Recommended investment</div>
            <div className="stat-value">{formatInr(b.recommendedInvestmentPaise)}</div>
          </div>
          <div className="card">
            <div className="stat-label">Actual investments</div>
            <div className="stat-value">{formatInr(b.actualInvestmentContributionsPaise)}</div>
          </div>
          <div className="card">
            <div className="stat-label">Safe discretionary</div>
            <div className="stat-value">{formatInr(b.safeDiscretionaryPaise)}</div>
          </div>
          <div className="card">
            <div className="stat-label">Cash position (bank)</div>
            <div className="stat-value">{formatInr(b.cashAvailablePaise)}</div>
          </div>
        </div>
      )}

      {data?.allocation.notes.length ? (
        <div className="card">
          <strong>Allocation notes</strong>
          <ul>
            {data.allocation.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Transactions ({data?.transactions.length ?? 0})</h3>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {(data?.transactions ?? []).map((t) => (
              <tr key={t.id}>
                <td>{t.txnDate}</td>
                <td>{t.type}</td>
                <td>{t.description}</td>
                <td>{formatInr(t.amountPaise)}</td>
                <td>{t.source}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
