import type { Express } from "express";
import type { InvestmentRepository } from "@finance/db";
import type { InvestmentAssetClass } from "@finance/core";

export function registerInvestmentRoutes(
  app: Express,
  investments: InvestmentRepository,
) {
  app.get("/api/investments", (req, res) => {
    const assetClass = req.query.assetClass as InvestmentAssetClass | undefined;
    const list = investments.listInstruments(assetClass).map((inst) => ({
      ...inst,
      latestValuation: investments.latestValuation(inst.id) ?? null,
    }));
    res.json(list);
  });

  app.post("/api/investments", (req, res) => {
    const body = req.body as {
      assetClass: InvestmentAssetClass;
      name: string;
      identifier?: string;
    };
    res.json(investments.createInstrument(body));
  });

  app.post("/api/investments/:id/transactions", (req, res) => {
    const body = req.body as {
      txnDate: string;
      txnType: string;
      amountPaise: number;
      units?: number;
      navPaise?: number;
    };
    const id = investments.addInvestmentTransaction({
      instrumentId: req.params.id!,
      ...body,
      source: "manual",
    });
    res.json({ id });
  });
}
