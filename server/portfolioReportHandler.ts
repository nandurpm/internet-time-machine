import type { Request, Response } from "express";
import { HttpError } from "../shared/_core/errors";
import { sdk } from "./_core/sdk";
import { recordValidatedPortfolioReport } from "./portfolioReports";

/** Accepts only cron-authenticated, validated, safe report summaries from the weekly portfolio workflow. */
export async function handleScheduledPortfolioReport(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const run = await recordValidatedPortfolioReport(req.body, user.taskUid);
    return res.json({ ok: true, runId: run.id, recordedAt: run.recordedAt });
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ error: error.message });
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: message,
      context: { callback: "scheduled-portfolio-report" },
      timestamp: new Date().toISOString(),
    });
  }
}
