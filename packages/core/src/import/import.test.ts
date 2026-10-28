import { describe, expect, it } from "vitest";
import { parseCsvText, mapRowsToParsed } from "@finance/core";

describe("CSV import", () => {
  it("parses semicolon delimiter", () => {
    const text = "Date;Amount\n01/01/2026;100.00";
    const { headers, rows } = parseCsvText(text, ";");
    expect(headers).toEqual(["Date", "Amount"]);
    expect(rows[0]?.Amount).toBe("100.00");
  });

  it("maps debit as outflow", () => {
    const rows = [{ Date: "01/04/2026", Description: "Shop", Debit: "100.00", Credit: "" }];
    const parsed = mapRowsToParsed(rows, {
      profile: "bank_statement",
      dateFormat: "DD/MM/YYYY",
      debitIsOutflow: true,
      columnMapping: { date: "Date", description: "Description", debit: "Debit", credit: "Credit" },
    });
    expect(parsed[0]?.errors).toHaveLength(0);
    expect(parsed[0]?.amountPaise).toBe(-10000);
  });
});
