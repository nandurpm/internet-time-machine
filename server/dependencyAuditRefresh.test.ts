import { describe, expect, it } from "vitest";
import { dependencyAuditRefreshInput } from "./dependencyAuditRefresh";

const validRefresh = {
  total: 3,
  critical: 0,
  high: 1,
  moderate: 2,
  low: 0,
  directPackages: 1,
  transitivePackages: 2,
  source: "Weekly validated production pnpm audit",
  note: "Aggregate findings were validated before ledger submission.",
};

describe("dependencyAuditRefreshInput", () => {
  it("accepts a bounded aggregate audit refresh whose severity and dependency totals reconcile", () => {
    expect(dependencyAuditRefreshInput.parse(validRefresh)).toMatchObject(validRefresh);
  });

  it("rejects audit refreshes with severity totals that do not reconcile", () => {
    expect(() => dependencyAuditRefreshInput.parse({ ...validRefresh, total: 4 })).toThrow("Severity counts must sum to total.");
  });

  it("rejects audit refreshes with mismatched direct and transitive totals", () => {
    expect(() => dependencyAuditRefreshInput.parse({ ...validRefresh, transitivePackages: 1 })).toThrow("Direct and transitive counts must sum to total.");
  });
});
