import { describe, expect, it } from "vitest";
import { dependencyTriageEvidence } from "@shared/dependencyTriage";
import { dependencyTriageCsv, dependencyTriageFilename, dependencyTriagePdfText } from "./dependencyTriageExport";

describe("dependency-triage exports", () => {
  it("includes the adopted v5/v3 audit record and the non-real-time interpretation boundary in CSV", () => {
    const csv = dependencyTriageCsv(dependencyTriageEvidence);

    expect(csv).toContain("Recorded dependency-audit evidence; not a real-time scan");
    expect(csv).toContain("Initial production audit");
    expect(csv).toContain("Validated v5/v3 audit");
    expect(csv).toContain("0,0,0,0,0,0,0");
    expect(csv).not.toContain("Residual path,recharts");
  });

  it("builds a portable PDF text representation and deterministic filenames", () => {
    const text = dependencyTriagePdfText(dependencyTriageEvidence);

    expect(text).toContain("DATA BOUNDARY");
    expect(text).toContain("does not establish runtime reachability or exploitability");
    expect(dependencyTriageFilename("csv")).toBe("internet-time-machine-dependency-triage-ledger.csv");
    expect(dependencyTriageFilename("pdf")).toBe("internet-time-machine-dependency-triage-ledger.pdf");
  });
});
