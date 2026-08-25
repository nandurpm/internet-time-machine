import { describe, expect, it } from "vitest";
import { getDependencyTriage } from "./dependencyTriage";

describe("getDependencyTriage", () => {
  it("exposes the recorded remediation progression without presenting it as a live scan", async () => {
    const triage = await getDependencyTriage();
    const current = triage.snapshots.at(-1);

    expect(triage.status).toBe("remediated");
    expect(triage.source).toContain("production pnpm audit");
    expect(triage.interpretation).toContain("does not establish runtime reachability");
    expect(current).toMatchObject({
      total: 0,
      critical: 0,
      high: 0,
      directPackages: 0,
      transitivePackages: 0,
    });
    expect(current?.label).toMatch(/Validated v5\/v3 audit|Weekly audit · 2026-08-25/);
  });

  it("records no residual high parent path after the validated package adoption", async () => {
    const triage = await getDependencyTriage();

    expect(triage.residualPaths).toEqual([]);
  });
});
