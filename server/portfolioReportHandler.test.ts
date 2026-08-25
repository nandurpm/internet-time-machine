import type { Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/sdk", () => ({ sdk: { authenticateRequest: vi.fn() } }));
vi.mock("./portfolioReports", () => ({ recordValidatedPortfolioReport: vi.fn() }));

import { sdk } from "./_core/sdk";
import { recordValidatedPortfolioReport } from "./portfolioReports";
import { handleScheduledPortfolioReport } from "./portfolioReportHandler";

function response() {
  const res = { status: vi.fn(), json: vi.fn() };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as Response & { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn> };
}

describe("handleScheduledPortfolioReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists a report only when the caller is an authenticated cron", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ isCron: true, taskUid: "weekly-portfolio" } as never);
    vi.mocked(recordValidatedPortfolioReport).mockResolvedValue({ id: 7, recordedAt: new Date("2026-08-25T07:45:00.000Z") } as never);
    const res = response();

    await handleScheduledPortfolioReport({ body: { source: "validated report" } } as Request, res);

    expect(recordValidatedPortfolioReport).toHaveBeenCalledWith({ source: "validated report" }, "weekly-portfolio");
    expect(res.json).toHaveBeenCalledWith({ ok: true, runId: 7, recordedAt: new Date("2026-08-25T07:45:00.000Z") });
  });

  it("rejects a non-cron caller before accepting report content", async () => {
    vi.mocked(sdk.authenticateRequest).mockResolvedValue({ isCron: false } as never);
    const res = response();

    await handleScheduledPortfolioReport({ body: {} } as Request, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(recordValidatedPortfolioReport).not.toHaveBeenCalled();
  });
});
