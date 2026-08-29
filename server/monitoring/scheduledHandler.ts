/*
 * ============================================================
 * FILE: scheduledHandler.ts
 * PURPOSE: Authenticates platform scheduler callbacks and delegates a scheduled endpoint collection cycle.
 * ============================================================
 */

import type { Request, Response } from "express";
import { sdk } from "../_core/sdk";
import { collectScheduledMeasurement } from "./service";

export async function handleScheduledMeasurement(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    const result = await collectScheduledMeasurement(user.taskUid);
    return res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: message,
      context: { callback: "scheduled-monitoring" },
      timestamp: new Date().toISOString(),
    });
  }
}
