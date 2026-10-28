export function EmiPage() {
  return (
    <div>
      <h2>EMI & Loans</h2>
      <div className="card">
        <p>
          Track loan schedules and match EMI debits to bank imports. Loan CRUD API is backed by the{" "}
          <code>loans</code> table; UI forms can be expanded in a follow-up.
        </p>
        <p className="muted">
          Imported <strong>loan_emi_payment</strong> transactions feed the monthly allocation engine.
        </p>
      </div>
    </div>
  );
}
