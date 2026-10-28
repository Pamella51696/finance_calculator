import { parseDateToIso } from "../dates.js";
import type {
  ColumnMapping,
  ImportParseOptions,
  ParsedImportRow,
  TransactionType,
} from "../types.js";
import {
  amountFromDebitCredit,
  inferTransactionType,
  normalizeSignedAmountForType,
} from "./signConvention.js";

export function mapRowsToParsed(
  rows: Record<string, string>[],
  options: ImportParseOptions,
): ParsedImportRow[] {
  const { columnMapping, dateFormat, debitIsOutflow = true } = options;
  return rows.map((raw, idx) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rowIndex = idx + 1;

    const dateRaw = getCell(raw, columnMapping.date);
    const date = dateRaw ? parseDateToIso(dateRaw, dateFormat) : null;
    if (!dateRaw) errors.push("Missing date");
    else if (!date) errors.push(`Unrecognized date: ${dateRaw}`);

    const description =
      getCell(raw, columnMapping.description) ??
      getCell(raw, columnMapping.merchant) ??
      "";

    const { amountPaise, ambiguous } = amountFromDebitCredit({
      debitRaw: getCell(raw, columnMapping.debit),
      creditRaw: getCell(raw, columnMapping.credit),
      amountRaw: getCell(raw, columnMapping.amount),
      debitIsOutflow,
    });

    if (ambiguous) {
      errors.push("Both debit and credit populated; cannot infer amount");
    } else if (amountPaise == null) {
      errors.push("Missing amount (debit, credit, or amount column)");
    }

    let transactionType: TransactionType | undefined;
    const typeRaw = getCell(raw, columnMapping.transactionType);
    if (typeRaw) {
      transactionType = mapTypeLabel(typeRaw);
      if (!transactionType) warnings.push(`Unknown transaction type: ${typeRaw}`);
    }

    if (amountPaise != null && !transactionType) {
      transactionType = inferTransactionType(amountPaise, options.profile);
    }

    const signed =
      amountPaise != null && transactionType
        ? normalizeSignedAmountForType(transactionType, amountPaise)
        : amountPaise ?? undefined;

    return {
      rowIndex,
      raw,
      date: date ?? undefined,
      description,
      amountPaise: signed,
      category: getCell(raw, columnMapping.category),
      merchant: getCell(raw, columnMapping.merchant),
      accountName: getCell(raw, columnMapping.account),
      transactionType,
      reference: getCell(raw, columnMapping.reference),
      errors,
      warnings,
    };
  });
}

function getCell(row: Record<string, string>, header?: string): string | undefined {
  if (!header) return undefined;
  const v = row[header];
  return v === "" ? undefined : v;
}

function mapTypeLabel(label: string): TransactionType | undefined {
  const n = label.toLowerCase().trim();
  const map: Record<string, TransactionType> = {
    income: "income",
    expense: "expense",
    transfer: "internal_transfer",
    emi: "loan_emi_payment",
    "investment buy": "investment_contribution",
    "investment sell": "investment_redemption",
    dividend: "dividend_interest",
    interest: "dividend_interest",
    refund: "refund",
    adjustment: "adjustment",
  };
  return map[n];
}

export function partitionValidInvalid(rows: ParsedImportRow[]): {
  valid: ParsedImportRow[];
  invalid: ParsedImportRow[];
} {
  const valid: ParsedImportRow[] = [];
  const invalid: ParsedImportRow[] = [];
  for (const r of rows) {
    if (r.errors.length === 0) valid.push(r);
    else invalid.push(r);
  }
  return { valid, invalid };
}
