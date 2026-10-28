import type { TransactionType } from "../types.js";

export function amountFromDebitCredit(params: {
  debitRaw?: string;
  creditRaw?: string;
  amountRaw?: string;
  debitIsOutflow: boolean;
}): { amountPaise: number | null; ambiguous: boolean } {
  const parse = (s?: string): number | null => {
    if (s == null || s.trim() === "") return null;
    const cleaned = s.replace(/,/g, "").replace(/[^\d.-]/g, "");
    if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
    const n = Number(cleaned);
    if (Number.isNaN(n)) return null;
    return Math.round(Math.abs(n) * 100);
  };

  const debit = parse(params.debitRaw);
  const credit = parse(params.creditRaw);
  const signed = parse(params.amountRaw);

  if (signed != null) {
    const sign = params.amountRaw!.includes("-") ? -1 : 1;
    return { amountPaise: sign * signed, ambiguous: false };
  }

  if (debit != null && credit != null) {
    return { amountPaise: null, ambiguous: true };
  }
  if (debit != null) {
    return {
      amountPaise: params.debitIsOutflow ? -debit : debit,
      ambiguous: false,
    };
  }
  if (credit != null) {
    return {
      amountPaise: params.debitIsOutflow ? credit : -credit,
      ambiguous: false,
    };
  }
  return { amountPaise: null, ambiguous: false };
}

export function inferTransactionType(
  signedAmountPaise: number,
  profile: string,
): TransactionType {
  if (profile.includes("income")) return "income";
  if (
    profile.includes("mutual_fund") ||
    profile.includes("stock") ||
    profile.includes("sip")
  ) {
    return signedAmountPaise < 0
      ? "investment_contribution"
      : "investment_redemption";
  }
  if (signedAmountPaise >= 0) return "income";
  return "expense";
}

export function normalizeSignedAmountForType(
  type: TransactionType,
  amountPaise: number,
): number {
  const abs = Math.abs(amountPaise);
  switch (type) {
    case "income":
    case "dividend_interest":
    case "refund":
    case "investment_redemption":
      return abs;
    case "expense":
    case "loan_emi_payment":
    case "investment_contribution":
    case "internal_transfer":
    case "adjustment":
      return amountPaise <= 0 ? -abs : -abs;
    default:
      return amountPaise;
  }
}
