import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: vi.fn() },
}));

vi.mock("./dependencyAuditRefresh", () => ({
  recordValidatedDependencyAudit: vi.fn(),
}));

import { recordValidatedDependencyAudit } from "./dependencyAuditRefresh";
import { handleScheduledDependencyAuditRefresh } from "./dependencyAuditRefreshHandler";
import { sdk } from "./_core/sdk";
import { ForbiddenError } from "../shared/_core/errors";

const body = {
  total: 0,
  critical: 0,
  high: 0,
  moderate: 0,
  low: 0,
  directPackages: 0,
  transitivePackages: 0,
  source: "Weekly validated production pnpm audit",
  note: "Aggregate audit was validated before submission.",
};

function response() {
  const res = {
    status: vi.fn(),
    json: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe("handleScheduledDependencyAuditRefresh", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a cron-authenticated validated aggregate and returns its recorded timestamp", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ isCron: true, taskUid: "weekly-audit" } as never);
    vi.mocked(recordValidatedDependencyAudit).mockResolvedValue({
      inserted: true,
      snapshot: { recordedAt: new Date("2026-08-25T07:18:00.000Z") },
    } as never);
    const res = response();

    await handleScheduledDependencyAuditRefresh({ body } as Request, res);

    expect(recordValidatedDependencyAudit).toHaveBeenCalledWith(body);
    expect(res.json).toHaveBeenCalledWith({ ok: true, inserted: true, recordedAt: new Date("2026-08-25T07:18:00.000Z") });
  });

  it("rejects a non-cron authenticated request before attempting a refresh", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ isCron: false } as never);
    const res = response();

    await handleScheduledDependencyAuditRefresh({ body } as Request, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "cron-only" });
    expect(recordValidatedDependencyAudit).not.toHaveBeenCalled();
  });

  it("returns a forbidden response for an invalid scheduled callback session", async () => {
    vi.mocked(sdk.authenticateRequest).mockRejectedValue(ForbiddenError("Invalid session cookie"));
    const res = response();

    await handleScheduledDependencyAuditRefresh({ body } as Request, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: "Invalid session cookie" });
    expect(recordValidatedDependencyAudit).not.toHaveBeenCalled();
  });
});
