import { NavLink, Route, Routes } from "react-router-dom";
import { DashboardPage } from "./pages/DashboardPage";
import { ImportCenterPage } from "./pages/ImportCenterPage";
import { InvestmentsPage } from "./pages/InvestmentsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { EmiPage } from "./pages/EmiPage";

export function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <h1>Finance Calculator</h1>
        <p className="muted" style={{ fontSize: "0.85rem", marginTop: "-0.5rem" }}>
          Local-first · SQLite
        </p>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/import">Import Center</NavLink>
          <NavLink to="/investments">Investments</NavLink>
          <NavLink to="/emi">EMI</NavLink>
          <NavLink to="/reports">Reports</NavLink>
          <NavLink to="/settings">Backup &amp; Settings</NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/import" element={<ImportCenterPage />} />
          <Route path="/investments" element={<InvestmentsPage />} />
          <Route path="/emi" element={<EmiPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </main>
    </div>
  );
}
