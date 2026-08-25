import { describe, expect, it } from "vitest";
import { portfolioLinks, portfolioValidationReportInput } from "./portfolioReports";

const validReport = {
  source: "Weekly scheduled portfolio health validation",
  note: "All results are aggregate observations from one completed weekly run.",
  results: portfolioLinks.map((link, index) => ({
    url: link.url,
    status: "healthy" as const,
    httpStatus: 200,
    responseTimeMs: 100 + index,
    attemptCount: 1,
    pageTitle: link.application,
  })),
};

describe("portfolioValidationReportInput", () => {
  it("accepts exactly one bounded result for every approved portfolio URL", () => {
    expect(portfolioValidationReportInput.parse(validReport).results).toHaveLength(25);
  });

  it("rejects reports that omit an approved portfolio URL", () => {
    expect(() => portfolioValidationReportInput.parse({ ...validReport, results: validReport.results.slice(1) })).toThrow();
  });

  it("rejects a retry-only or unavailable result that does not record both attempts", () => {
    const invalid = structuredClone(validReport);
    invalid.results[0] = { ...invalid.results[0], status: "unavailable", httpStatus: null, responseTimeMs: null, attemptCount: 1 };
    expect(() => portfolioValidationReportInput.parse(invalid)).toThrow("Degraded and unavailable results must include one retry.");
  });
});
