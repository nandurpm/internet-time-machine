/*
 * ============================================================
 * FILE: portfolioReportPersistence.test.ts
 * PURPOSE: Verifies the portfolio report persistence.test server behavior, authorization, persistence, and response contract.
 * ============================================================
 */

import { describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  listPortfolioValidationResults: vi.fn(),
  listPortfolioValidationRuns: vi.fn(),
  recordPortfolioValidationRun: vi.fn(),
}));

import { recordPortfolioValidationRun } from "./db";
import { portfolioLinks, recordValidatedPortfolioReport } from "./portfolioReports";

const report = {
  source: "Weekly scheduled portfolio health validation",
  note: "Aggregate availability and timing evidence from one completed weekly run.",
  results: portfolioLinks.map((link, index) => ({
    url: link.url,
    status: index === 0 ? "degraded" as const : index === 1 ? "unavailable" as const : "healthy" as const,
    httpStatus: index === 1 ? null : 200,
    responseTimeMs: index === 1 ? null : 100 + index * 10,
    attemptCount: index === 0 || index === 1 ? 2 : 1,
    pageTitle: index === 1 ? null : link.application,
  })),
};

describe("recordValidatedPortfolioReport", () => {
  it("persists only validated aggregate counts and per-link outcome fields", async () => {
    vi.mocked(recordPortfolioValidationRun).mockResolvedValue({ id: 11 } as never);

    await recordValidatedPortfolioReport(report, "weekly-portfolio-task");

    expect(recordPortfolioValidationRun).toHaveBeenCalledWith(expect.objectContaining({
      taskUid: "weekly-portfolio-task",
      healthyCount: 23,
      degradedCount: 1,
      unavailableCount: 1,
      checkedLinkCount: 25,
      meanResponseMs: 225,
      medianResponseMs: 225,
      slowestResponseMs: 340,
      results: expect.arrayContaining([
        expect.objectContaining({ application: "Internet Time Machine", status: "degraded", attemptCount: 2 }),
        expect.objectContaining({ application: "Digital Life Dashboard", status: "unavailable", httpStatus: null, responseTimeMs: null }),
      ]),
    }));
  });
});
