import { useEffect, useState } from "react";
import { apiGet, apiPost } from "../api/client";

export function InvestmentsPage() {
  const [items, setItems] = useState<
    { id: string; assetClass: string; name: string; latestValuation: unknown }[]
  >([]);

  useEffect(() => {
    apiGet<typeof items>("/investments").then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div>
      <h2>Investments</h2>
      <p className="muted">
        Mutual funds, stocks/ETFs, FD, RD, PPF, and EPF trackers (manual/imported valuations).
      </p>
      <div className="card">
        <button
          className="primary"
          onClick={() =>
            apiPost("/investments", {
              assetClass: "mutual_fund",
              name: "Sample Index Fund",
              identifier: "DEMO-ISIN",
            }).then(() => apiGet<typeof items>("/investments").then(setItems))
          }
        >
          Add sample mutual fund
        </button>
        <table style={{ marginTop: "1rem" }}>
          <thead>
            <tr>
              <th>Class</th>
              <th>Name</th>
              <th>Latest valuation</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.assetClass}</td>
                <td>{i.name}</td>
                <td>{i.latestValuation ? JSON.stringify(i.latestValuation) : "Not valued"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
