import type { MonthlyAllocationInput, MonthlyAllocationResult } from "./types.js";

export function computeMonthlyAllocation(
  input: MonthlyAllocationInput,
): MonthlyAllocationResult {
  const notes: string[] = [];

  const obligationsTotalPaise =
    input.essentialExpensesPaise +
    input.emiDuePaise +
    input.upcomingBillsPaise +
    input.emergencySavingsTargetPaise +
    input.plannedSipPaise +
    input.otherInvestmentCommitmentsPaise +
    input.minimumCashBufferPaise;

  const incomeBase =
    input.confirmedIncomePaise + input.expectedIncomePaise;
  const availableAfterObligations =
    input.cashAvailablePaise + input.confirmedIncomePaise - obligationsTotalPaise;

  let recommendedInvestmentPaise = Math.max(
    0,
    availableAfterObligations - input.minimumCashBufferPaise,
  );

  if (input.expectedIncomePaise > 0) {
    notes.push(
      "Expected but unreceived income is shown separately and not treated as cash on hand.",
    );
  }

  const investmentDeltaPaise =
    input.actualInvestmentContributionsPaise - recommendedInvestmentPaise;

  if (investmentDeltaPaise > 0) {
    notes.push(
      `Actual investment contributions exceed the recommendation by ${investmentDeltaPaise / 100} INR; remaining cash allocation is reduced accordingly.`,
    );
    recommendedInvestmentPaise = 0;
  }

  const safeDiscretionaryPaise = Math.max(
    0,
    availableAfterObligations -
      recommendedInvestmentPaise -
      Math.max(0, investmentDeltaPaise),
  );

  if (incomeBase < obligationsTotalPaise) {
    notes.push(
      "Obligations exceed confirmed income plus cash on hand; review essential expenses, EMIs, or buffers.",
    );
  }

  return {
    year: input.year,
    month: input.month,
    breakdown: {
      cashAvailablePaise: input.cashAvailablePaise,
      confirmedIncomePaise: input.confirmedIncomePaise,
      expectedIncomePaise: input.expectedIncomePaise,
      essentialExpensesPaise: input.essentialExpensesPaise,
      emiDuePaise: input.emiDuePaise,
      upcomingBillsPaise: input.upcomingBillsPaise,
      emergencySavingsTargetPaise: input.emergencySavingsTargetPaise,
      plannedSipPaise: input.plannedSipPaise,
      otherInvestmentCommitmentsPaise: input.otherInvestmentCommitmentsPaise,
      minimumCashBufferPaise: input.minimumCashBufferPaise,
      obligationsTotalPaise,
      recommendedInvestmentPaise,
      actualInvestmentContributionsPaise: input.actualInvestmentContributionsPaise,
      investmentDeltaPaise,
      safeDiscretionaryPaise,
    },
    notes,
  };
}
