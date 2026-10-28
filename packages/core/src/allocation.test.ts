import { describe, expect, it } from "vitest";
import { computeMonthlyAllocation } from "./allocation.js";

describe("monthly allocation", () => {
  it("never recommends negative investment", () => {
    const result = computeMonthlyAllocation({
      year: 2026,
      month: 4,
      minimumCashBufferPaise: 5000000,
      confirmedIncomePaise: 2000000,
      expectedIncomePaise: 0,
      essentialExpensesPaise: 1500000,
      emiDuePaise: 0,
      upcomingBillsPaise: 0,
      emergencySavingsTargetPaise: 0,
      plannedSipPaise: 0,
      otherInvestmentCommitmentsPaise: 0,
      actualInvestmentContributionsPaise: 0,
      cashAvailablePaise: 0,
    });
    expect(result.breakdown.recommendedInvestmentPaise).toBe(0);
  });
});
