import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fileContentHash, findDuplicateCandidates, mapRowsToParsed, parseCsvText } from "@finance/core";
import { AccountRepository, ImportRepository, openDatabase, TransactionRepository } from "@finance/db";

describe("SQLite import persistence", () => {
  it("commits batch transactionally and detects duplicate file hash", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "finance-test-"));
    const dbPath = path.join(dir, "test.db");
    const db = openDatabase(dbPath);
    const accounts = new AccountRepository(db);
    const transactions = new TransactionRepository(db);
    const imports = new ImportRepository(db, accounts, transactions);
    const account = accounts.create({ name: "Test Bank", type: "bank" });

    const csv = fs.readFileSync(
      path.join(process.cwd(), "fixtures/sample-bank-statement.csv"),
      "utf8",
    );
    const parsed = parseCsvText(csv);
    const rows = mapRowsToParsed(parsed.rows, {
      profile: "bank_statement",
      dateFormat: "DD/MM/YYYY",
      columnMapping: {
        date: "Date",
        description: "Description",
        debit: "Debit",
        credit: "Credit",
        account: "Account",
      },
    });
    const hash = fileContentHash(csv);
    const batch = imports.createStagingBatch({
      profile: "bank_statement",
      fileName: "sample-bank-statement.csv",
      fileHash: hash,
      rows,
    });
    const result = imports.commitBatch({
      batchId: batch.id,
      accountId: account.id,
      excludeRowIndexes: [],
    });
    expect(result.imported).toBeGreaterThan(0);

    const primary = accounts.findByName("Primary Bank")!;
    expect(primary).toBeTruthy();
    const dups = findDuplicateCandidates(
      rows,
      primary.id,
      transactions.listFingerprintsForAccount(primary.id),
    );
    expect(dups.length).toBeGreaterThan(0);

    db.close();
  });
});
