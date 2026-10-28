import { useState } from "react";
import { apiPost, apiPostForm } from "../api/client";

export function SettingsPage() {
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);

  return (
    <div>
      <h2>Backup & Settings</h2>
      <div className="card">
        <h3>Export backup</h3>
        <p className="muted">SQLite snapshot written to the repo&apos;s <code>data/backups/</code> folder.</p>
        <button
          className="primary"
          onClick={() =>
            apiPost<{ path: string }>("/backup/export").then((r) =>
              setMessage(`Backup saved: ${r.path}`),
            )
          }
        >
          Export backup
        </button>
      </div>
      <div className="card">
        <h3>Restore backup</h3>
        <label style={{ display: "block", marginBottom: "0.5rem" }}>
          <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} /> I
          understand this replaces the local database
        </label>
        <input
          type="file"
          accept=".db"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const form = new FormData();
            form.append("file", file);
            form.append("confirm", String(confirm));
            try {
              const res = await apiPostForm<{ restoredTo: string }>("/backup/restore", form);
              setMessage(`Restored to ${res.restoredTo}. Restart the API to reload.`);
            } catch (err) {
              setMessage(String((err as Error).message));
            }
          }}
        />
      </div>
      {message && <div className="card">{message}</div>}
      <div className="card">
        <h3>Documentation</h3>
        <p className="muted">See docs/DATA_AND_IMPORT.md in the repository for formats and cloud migration notes.</p>
      </div>
    </div>
  );
}
