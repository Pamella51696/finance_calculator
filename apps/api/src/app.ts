import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Express } from "express";
import express from "express";
import multer from "multer";
import * as XLSX from "xlsx";
import {
  fileContentHash,
  findDuplicateCandidates,
  mapRowsToParsed,
  parseCsvText,
  partitionValidInvalid,
  type ColumnMapping,
  type ImportParseOptions,
  type ImportProfile,
} from "@finance/core";
import {
  AccountRepository,
  buildAllocationForMonth,
  exportBackup,
  getDatabase,
  ImportRepository,
  InvestmentRepository,
  restoreBackupSync,
  TransactionRepository,
} from "@finance/db";
import { registerInvestmentRoutes } from "./routes/investments.js";
import { registerTransactionRoutes } from "./routes/transactions.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  const db = getDatabase();
  const accounts = new AccountRepository(db);
  const transactions = new TransactionRepository(db);
  const imports = new ImportRepository(db, accounts, transactions);
  const investments = new InvestmentRepository(db);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/accounts", (_req, res) => {
    res.json(accounts.list(true));
  });

  app.post("/api/accounts", (req, res) => {
    const { name, type, institution } = req.body as {
      name?: string;
      type?: string;
      institution?: string;
    };
    if (!name) return res.status(400).json({ error: "name required" });
    res.json(
      accounts.create({
        name,
        type: (type as "bank") ?? "bank",
        institution,
      }),
    );
  });

  registerTransactionRoutes(app, transactions);
  registerInvestmentRoutes(app, investments);

  app.get("/api/allocation/:year/:month", (req, res) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    res.json(buildAllocationForMonth(db, transactions, year, month));
  });

  app.get("/api/dashboard/:year/:month", (req, res) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    const txns = transactions.listForMonth(year, month);
    const allocation = buildAllocationForMonth(db, transactions, year, month);
    res.json({ transactions: txns, allocation });
  });

  app.post("/api/import/preview", upload.single("file"), (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "file required" });
      const options = buildImportOptions(req.body as Record<string, string>);
      const parsed = parseUploadedFile(file.buffer, file.originalname, options);
      const { valid, invalid } = partitionValidInvalid(parsed.rows);
      const accountId = req.body.accountId as string | undefined;
      let duplicateCandidates = parsed.duplicateCandidates;
      if (accountId) {
        duplicateCandidates = findDuplicateCandidates(
          parsed.rows,
          accountId,
          transactions.listFingerprintsForAccount(accountId),
          parsed.fileHash,
        );
      }
      res.json({
        ...parsed,
        validCount: valid.length,
        invalidCount: invalid.length,
        duplicateCandidates,
      });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.post("/api/import/stage", upload.single("file"), (req, res) => {
    try {
      const file = req.file;
      if (!file) return res.status(400).json({ error: "file required" });
      const options = buildImportOptions(req.body as Record<string, string>);
      const parsed = parseUploadedFile(file.buffer, file.originalname, options);
      const prior = imports.findBatchByFileHash(parsed.fileHash);
      if (prior?.status === "committed") {
        return res.status(409).json({
          error: "This file was already imported",
          batchId: prior.id,
        });
      }
      const batch = imports.createStagingBatch({
        profile: options.profile,
        fileName: file.originalname,
        fileHash: parsed.fileHash,
        worksheetName: options.worksheetName,
        rows: parsed.rows,
      });
      res.json({ batchId: batch.id, rows: parsed.rows, fileHash: parsed.fileHash });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.post("/api/import/commit", (req, res) => {
    try {
      const { batchId, accountId, excludeRowIndexes } = req.body as {
        batchId?: string;
        accountId?: string;
        excludeRowIndexes?: number[];
      };
      if (!batchId || !accountId) {
        return res.status(400).json({ error: "batchId and accountId required" });
      }
      const result = imports.commitBatch({
        batchId,
        accountId,
        excludeRowIndexes: excludeRowIndexes ?? [],
      });
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  app.get("/api/import/templates", (_req, res) => {
    res.json(defaultTemplates());
  });

  app.post("/api/backup/export", (_req, res) => {
    const backupPath = exportBackup(db);
    res.json({ path: backupPath, message: "Backup created" });
  });

  app.post("/api/backup/restore", upload.single("file"), (req, res) => {
    try {
      const confirm = req.body.confirm === "true" || req.body.confirm === true;
      let backupPath = req.body.path as string | undefined;
      if (req.file) {
        backupPath = path.join(os.tmpdir(), `restore-${Date.now()}.db`);
        fs.writeFileSync(backupPath, req.file.buffer);
      }
      if (!backupPath) {
        return res.status(400).json({ error: "Upload backup file or provide path" });
      }
      const restoredTo = restoreBackupSync(backupPath, confirm);
      res.json({ restoredTo, message: "Restart the app to use restored data" });
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });

  return app;
}

function buildImportOptions(body: Record<string, string>): ImportParseOptions {
  return {
    profile: (body.profile ?? "bank_statement") as ImportProfile,
    worksheetName: body.worksheetName,
    delimiter: body.delimiter,
    dateFormat: body.dateFormat,
    debitIsOutflow: body.debitIsOutflow !== "false",
    columnMapping: JSON.parse(body.columnMapping ?? "{}") as ColumnMapping,
  };
}

function parseUploadedFile(
  buffer: Buffer,
  fileName: string,
  options: ImportParseOptions,
) {
  const lower = fileName.toLowerCase();

  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    const text = buffer.toString("utf8");
    const parsed = parseCsvText(text, options.delimiter);
    const fileHash = fileContentHash(text);
    const mapped = mapRowsToParsed(parsed.rows, options);
    return {
      fileName,
      profile: options.profile,
      headers: parsed.headers,
      rows: mapped,
      fileHash,
      duplicateCandidates: [] as ReturnType<typeof findDuplicateCandidates>,
    };
  }

  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: false });
    const worksheets = wb.SheetNames;
    const sheetName = options.worksheetName ?? wb.SheetNames[0];
    if (!sheetName || !wb.Sheets[sheetName]) {
      throw new Error("Worksheet not found");
    }
    const sheet = wb.Sheets[sheetName]!;
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: "",
      raw: false,
    });
    if (json.length === 0) throw new Error("Worksheet is empty");
    const headers = Object.keys(json[0]!);
    const rows = json.map((r) => {
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(r)) out[k] = String(v ?? "").trim();
      return out;
    });
    const fileHash = fileContentHash(buffer.toString("binary"));
    const mapped = mapRowsToParsed(rows, options);
    return {
      fileName,
      profile: options.profile,
      worksheets,
      selectedWorksheet: sheetName,
      headers,
      rows: mapped,
      fileHash,
      duplicateCandidates: [],
    };
  }

  throw new Error("Unsupported file type (use CSV, XLSX, or XLS)");
}

function defaultTemplates() {
  return [
    {
      name: "Generic bank CSV",
      profile: "bank_statement",
      mapping: {
        date: "Date",
        description: "Description",
        debit: "Debit",
        credit: "Credit",
        account: "Account",
      },
      dateFormat: "DD/MM/YYYY",
    },
    {
      name: "Mutual fund CAS",
      profile: "mutual_fund",
      mapping: {
        date: "Date",
        description: "Scheme",
        amount: "Amount",
        transactionType: "Transaction Type",
      },
    },
  ];
}
