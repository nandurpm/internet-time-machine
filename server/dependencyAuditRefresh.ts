import { z } from "zod";
import { listDependencyAuditSnapshots, recordDependencyAuditSnapshot } from "./db";
import { type DependencyAuditSnapshot, dependencyTriageEvidence } from "../shared/dependencyTriage";

const count = z.number().int().min(0).max(100_000);

export const dependencyAuditRefreshInput = z.object({
  total: count,
  critical: count,
  high: count,
  moderate: count,
  low: count,
  directPackages: count,
  transitivePackages: count,
  source: z.string().trim().min(8).max(255),
  note: z.string().trim().min(8).max(1_000),
}).superRefine((value, ctx) => {
  if (value.total !== value.critical + value.high + value.moderate + value.low) {
    ctx.addIssue({ code: "custom", message: "Severity counts must sum to total." });
  }
  if (value.total !== value.directPackages + value.transitivePackages) {
    ctx.addIssue({ code: "custom", message: "Direct and transitive counts must sum to total." });
  }
});

function asSnapshot(record: Awaited<ReturnType<typeof listDependencyAuditSnapshots>>[number]): DependencyAuditSnapshot {
  return {
    label: `Weekly audit · ${record.recordedAt.toISOString().slice(0, 10)}`,
    recordedAt: record.recordedAt.toISOString(),
    total: record.total,
    critical: record.critical,
    high: record.high,
    moderate: record.moderate,
    low: record.low,
    directPackages: record.directPackages,
    transitivePackages: record.transitivePackages,
    note: record.note,
  };
}

export async function recordValidatedDependencyAudit(input: unknown) {
  const parsed = dependencyAuditRefreshInput.parse(input);
  return recordDependencyAuditSnapshot(parsed);
}

/**
 * Adds only server-validated aggregate refresh records to immutable historical
 * evidence. The production application never runs package-manager commands.
 */
export async function getDependencyTriageWithRefreshes() {
  const persisted = await listDependencyAuditSnapshots();
  const snapshotsByRecordedAt = new Map<string, DependencyAuditSnapshot>();
  for (const snapshot of dependencyTriageEvidence.snapshots) {
    snapshotsByRecordedAt.set(snapshot.recordedAt, snapshot);
  }
  for (const snapshot of persisted.map(asSnapshot)) {
    snapshotsByRecordedAt.set(snapshot.recordedAt, snapshot);
  }
  const snapshots = Array.from(snapshotsByRecordedAt.values())
    .sort((left, right) => left.recordedAt.localeCompare(right.recordedAt));
  const latest = snapshots.at(-1) ?? dependencyTriageEvidence.snapshots.at(-1)!;
  return {
    ...dependencyTriageEvidence,
    status: latest.critical === 0 && latest.high === 0 ? "remediated" as const : "review" as const,
    recordedAt: latest.recordedAt,
    source: persisted[0]?.source ?? dependencyTriageEvidence.source,
    snapshots,
    residualPaths: latest.high === 0 ? [] : dependencyTriageEvidence.residualPaths,
    refreshCadence: "Weekly validated aggregate audit refresh",
  };
}
