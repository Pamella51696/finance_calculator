import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase, AccountRepository } from "@finance/db";

describe("database persistence", () => {
  it("keeps accounts after reopening the database file", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "finance-persist-"));
    const dbPath = path.join(dir, "finance.db");
    const db1 = openDatabase(dbPath);
    const accounts1 = new AccountRepository(db1);
    accounts1.create({ name: "Persistent Account", type: "bank" });
    db1.close();

    const db2 = openDatabase(dbPath);
    const accounts2 = new AccountRepository(db2);
    expect(accounts2.findByName("Persistent Account")).toBeTruthy();
    db2.close();
  });
});
