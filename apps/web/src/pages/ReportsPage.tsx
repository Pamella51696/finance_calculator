import { useEffect, useState } from "react";
import { formatInr } from "@finance/core";
import { apiGet } from "../api/client";

export function ReportsPage() {
  const d = new Date();
  const [allocation, setAllocation] = useState<{ breakdown: Record<string, number> } | null>(null);

  useEffect(() => {
    apiGet<{ breakdown: Record<string, number> }>(
      `/allocation/${d.getFullYear()}/${d.getMonth() + 1}`,
    ).then(setAllocation);
  }, []);

  return (
    <div>
      <h2>Reports</h2>
      <div className="card">
        <h3>Monthly allocation breakdown</h3>
        <ul>
          {allocation &&
            Object.entries(allocation.breakdown).map(([k, v]) => (
              <li key={k}>
                {k}: {formatInr(v)}
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}
