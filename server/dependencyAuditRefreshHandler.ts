/*
 * ============================================================
 * FILE: dependencyAuditRefreshHandler.ts
 * PURPOSE: Adapts HTTP requests to the dependency audit refresh server service with validation and normalized responses.
 * ============================================================
 */

import type { Request, Response } from "express";
import { HttpError } from "../shared/_core/errors";
import { sdk } from "./_core/sdk";
import { recordValidatedDependencyAudit } from "./dependencyAuditRefresh";

/** Receives validated aggregate data from the weekly agent-assisted audit workflow. */
export async function handleScheduledDependencyAuditRefresh(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await recordValidatedDependencyAudit(req.body);
    return res.json({ ok: true, inserted: result.inserted, recordedAt: result.snapshot.recordedAt });
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: message,
      context: { callback: "scheduled-dependency-audit-refresh" },
      timestamp: new Date().toISOString(),
    });
  }
}
