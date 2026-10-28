import type { Express } from "express";
import type { TransactionRepository } from "@finance/db";

export function registerTransactionRoutes(
  app: Express,
  transactions: TransactionRepository,
) {
  app.get("/api/transactions/:year/:month", (req, res) => {
    const year = Number(req.params.year);
    const month = Number(req.params.month);
    res.json(transactions.listForMonth(year, month));
  });

  app.post("/api/transactions", (req, res) => {
    try {
      const body = req.body as {
        accountId: string;
        txnDate: string;
        type: string;
        amountPaise: number;
        description?: string;
        category?: string;
        merchant?: string;
      };
      const record = transactions.create({
        accountId: body.accountId,
        txnDate: body.txnDate,
        type: body.type as "income",
        amountPaise: body.amountPaise,
        description: body.description ?? "",
        category: body.category,
        merchant: body.merchant,
        source: "manual",
      });
      res.json(record);
    } catch (e) {
      res.status(400).json({ error: (e as Error).message });
    }
  });
}
