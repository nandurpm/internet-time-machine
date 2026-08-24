import { describe, expect, it } from "vitest";
import { trendSummaryBatchFilename, trendSummaryFilename, trendSummaryMarkdown } from "./trendSummaryExport";

const summary = {
  headline: "Stable endpoint-local measurements",
  narrative: "The selected records show stable latency in this endpoint-scoped time window.",
  highlights: [{ finding: "Latency remained stable", evidence: "The selected average stayed near 20 ms.", dataBoundary: "direct" as const }],
  caveat: "This is an endpoint-local interpretation and does not establish broader internet conditions.",
  generatedAt: Date.parse("2026-08-24T00:00:00.000Z"),
  model: "gpt-5-mini",
  parserVersion: "2026-08-24-live",
};

describe("trend summary export", () => {
  it("renders a provenance-aware Markdown document without an endpoint URL", () => {
    const markdown = trendSummaryMarkdown({ endpointLabel: "Demo endpoint", from: Date.parse("2026-08-20T00:00:00.000Z"), to: Date.parse("2026-08-21T00:00:00.000Z"), summary });
    expect(markdown).toContain("# Internet Time Machine trend summary");
    expect(markdown).toContain("Data boundary:_ direct");
    expect(markdown).toContain("Endpoint-local observations only");
    expect(markdown).not.toContain("https://");
  });

  it("creates download-safe endpoint filenames", () => {
    expect(trendSummaryFilename("Office DNS / East", "md")).toBe("internet-time-machine-trend-summary-office-dns-east.md");
    expect(trendSummaryBatchFilename(3)).toBe("internet-time-machine-trend-summaries-3.pdf");
  });
});
