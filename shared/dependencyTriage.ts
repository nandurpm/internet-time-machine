export type DependencySeverity = "critical" | "high" | "moderate" | "low";
export type DependencyHealth = "review" | "remediated";

export type DependencyAuditSnapshot = {
  label: string;
  recordedAt: string;
  refreshedAt?: string;
  total: number;
  critical: number;
  high: number;
  moderate: number;
  low: number;
  directPackages: number;
  transitivePackages: number;
  note: string;
};

export type ResidualDependencyPath = {
  packageName: string;
  severity: DependencySeverity;
  parent: string;
  currentVersion: string;
  migrationState: "planned" | "blocked-by-compatibility";
  nextAction: string;
};

export type DependencyTriageLedger = {
  status: DependencyHealth;
  recordedAt: string;
  source: string;
  interpretation: string;
  snapshots: DependencyAuditSnapshot[];
  residualPaths: ResidualDependencyPath[];
  refreshCadence?: string;
};

/**
 * Recorded evidence from the 25 August 2026 production `pnpm audit --prod`
 * remediation sequence. These values are a dependency-audit ledger, not a
 * real-time scan and not a statement that an advisory is exploitable.
 */
export const dependencyTriageEvidence: DependencyTriageLedger = {
  status: "remediated" as DependencyHealth,
  recordedAt: "2026-08-25T07:18:00.000Z",
  source: "Recorded production pnpm audit after validated Express v5 and Recharts v3 adoption",
  interpretation:
    "A reported package advisory does not establish runtime reachability or exploitability. The remaining items require parent-package migration work.",
  snapshots: [
    {
      label: "Initial production audit",
      recordedAt: "2026-08-25T04:00:00.000Z",
      total: 81,
      critical: 1,
      high: 21,
      moderate: 49,
      low: 10,
      directPackages: 31,
      transitivePackages: 50,
      note: "Baseline before isolated dependency remediation.",
    },
    {
      label: "After compatible updates",
      recordedAt: "2026-08-25T05:04:00.000Z",
      total: 42,
      critical: 0,
      high: 5,
      moderate: 30,
      low: 7,
      directPackages: 2,
      transitivePackages: 40,
      note: "tRPC, Axios, and AWS SDK updates removed the critical advisory cluster.",
    },
    {
      label: "Pre-adoption recorded audit",
      recordedAt: "2026-08-25T05:12:45.459Z",
      total: 8,
      critical: 0,
      high: 2,
      moderate: 4,
      low: 2,
      directPackages: 0,
      transitivePackages: 8,
      note: "Drizzle ORM, Nano ID, and Streamdown remediation left two transitive parent-package review paths.",
    },
    {
      label: "Validated v5/v3 audit",
      recordedAt: "2026-08-25T07:18:00.000Z",
      total: 0,
      critical: 0,
      high: 0,
      moderate: 0,
      low: 0,
      directPackages: 0,
      transitivePackages: 0,
      note: "Production pnpm audit after Express v5 and Recharts v3 adoption reported no advisory records.",
    },
  ] satisfies DependencyAuditSnapshot[],
  residualPaths: [] as ResidualDependencyPath[],
} as const;
