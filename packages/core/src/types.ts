/**
 * Money is stored as integer paise (1 INR = 100 paise).
 * Sign convention for account transactions:
 * - Positive amount_paise increases the account balance (inflows: income, transfers in, refunds).
 * - Negative amount_paise decreases the account balance (outflows: expense, EMI, transfers out).
 */
export type TransactionType =
  | "income"
  | "expense"
  | "internal_transfer"
  | "loan_emi_payment"
  | "investment_contribution"
  | "investment_redemption"
  | "dividend_interest"
  | "refund"
  | "adjustment";

export type TransactionSource = "manual" | "imported" | "scheduled" | "demo";

export type ImportProfile =
  | "bank_statement"
  | "credit_card_statement"
  | "expense_records"
  | "income_records"
  | "mutual_fund"
  | "stock_etf"
  | "sip"
  | "fd_rd"
  | "ppf_epf";

export type AccountType =
  | "bank"
  | "credit_card"
  | "cash"
  | "investment"
  | "loan";

export type InvestmentAssetClass =
  | "mutual_fund"
  | "stock_etf"
  | "fd"
  | "rd"
  | "ppf"
  | "epf";

export type ValuationSource = "manual" | "imported" | "provider";

export interface ColumnMapping {
  date?: string;
  description?: string;
  debit?: string;
  credit?: string;
  amount?: string;
  category?: string;
  merchant?: string;
  account?: string;
  transactionType?: string;
  reference?: string;
}

export interface ImportParseOptions {
  profile: ImportProfile;
  worksheetName?: string;
  delimiter?: string;
  dateFormat?: string;
  currency?: string;
  debitIsOutflow?: boolean;
  columnMapping: ColumnMapping;
}

export interface ParsedImportRow {
  rowIndex: number;
  raw: Record<string, string>;
  date?: string;
  description?: string;
  amountPaise?: number;
  category?: string;
  merchant?: string;
  accountName?: string;
  transactionType?: TransactionType;
  reference?: string;
  errors: string[];
  warnings: string[];
}

export interface DuplicateCandidate {
  rowIndex: number;
  existingTransactionId: string;
  reason: string;
}

export interface ImportPreviewResult {
  fileName: string;
  profile: ImportProfile;
  worksheets?: string[];
  selectedWorksheet?: string;
  headers: string[];
  rows: ParsedImportRow[];
  validCount: number;
  invalidCount: number;
  duplicateCandidates: DuplicateCandidate[];
}

export interface MonthlyAllocationInput {
  year: number;
  month: number;
  minimumCashBufferPaise: number;
  confirmedIncomePaise: number;
  expectedIncomePaise: number;
  essentialExpensesPaise: number;
  emiDuePaise: number;
  upcomingBillsPaise: number;
  emergencySavingsTargetPaise: number;
  plannedSipPaise: number;
  otherInvestmentCommitmentsPaise: number;
  actualInvestmentContributionsPaise: number;
  cashAvailablePaise: number;
}

export interface MonthlyAllocationResult {
  year: number;
  month: number;
  breakdown: {
    cashAvailablePaise: number;
    confirmedIncomePaise: number;
    expectedIncomePaise: number;
    essentialExpensesPaise: number;
    emiDuePaise: number;
    upcomingBillsPaise: number;
    emergencySavingsTargetPaise: number;
    plannedSipPaise: number;
    otherInvestmentCommitmentsPaise: number;
    minimumCashBufferPaise: number;
    obligationsTotalPaise: number;
    recommendedInvestmentPaise: number;
    actualInvestmentContributionsPaise: number;
    investmentDeltaPaise: number;
    safeDiscretionaryPaise: number;
  };
  notes: string[];
}

export function paiseToInr(paise: number): number {
  return paise / 100;
}

export function inrToPaise(inr: number): number {
  return Math.round(inr * 100);
}

export function formatInr(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(paiseToInr(paise));
}
