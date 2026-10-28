import type { Database } from "better-sqlite3";
import { computeMonthlyAllocation, type MonthlyAllocationResult } from "@finance/core";
import type { TransactionRepository } from "../repositories/transactions.js";

export function buildAllocationForMonth(
  db: Database,
  transactions: TransactionRepository,
  year: number,
  month: number,
): MonthlyAllocationResult {
  const settingsRow = db
    .prepare("SELECT value_json FROM app_settings WHERE key = 'allocation'")
    .get() as { value_json: string } | undefined;
  const settings = settingsRow
    ? (JSON.parse(settingsRow.value_json) as {
        minimumCashBufferPaise?: number;
        emergencySavingsTargetPaise?: number;
        plannedSipPaise?: number;
      })
    : {};

  const sums = transactions.sumByTypeForMonth(year, month);
  const income = (sums.income ?? 0) + (sums.dividend_interest ?? 0) + (sums.refund ?? 0);
  const expenses = Math.abs(
    (sums.expense ?? 0) +
      (sums.loan_emi_payment ?? 0) +
      (sums.investment_contribution ?? 0),
  );
  const investmentContrib = Math.abs(sums.investment_contribution ?? 0);

  const cashRow = db
    .prepare(
      `SELECT COALESCE(SUM(amount_paise), 0) as total FROM transactions t
       JOIN accounts a ON a.id = t.account_id
       WHERE a.type = 'bank' AND a.is_demo = 0 AND t.txn_date <= date(?, '+1 month', '-1 day')`,
    )
    .get(`${year}-${String(month).padStart(2, "0")}-01`) as { total: number };

  return computeMonthlyAllocation({
    year,
    month,
    minimumCashBufferPaise: settings.minimumCashBufferPaise ?? 5000000,
    confirmedIncomePaise: Math.max(0, income),
    expectedIncomePaise: 0,
    essentialExpensesPaise: expenses,
    emiDuePaise: Math.abs(sums.loan_emi_payment ?? 0),
    upcomingBillsPaise: 0,
    emergencySavingsTargetPaise: settings.emergencySavingsTargetPaise ?? 0,
    plannedSipPaise: settings.plannedSipPaise ?? 0,
    otherInvestmentCommitmentsPaise: 0,
    actualInvestmentContributionsPaise: investmentContrib,
    cashAvailablePaise: cashRow?.total ?? 0,
  });
}
