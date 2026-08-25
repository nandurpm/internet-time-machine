import { getDependencyTriageWithRefreshes } from "./dependencyAuditRefresh";

/**
 * Returns immutable, documented dependency-audit evidence for display. This
 * endpoint intentionally does not run package-manager scans in production.
 */
export async function getDependencyTriage() {
  return getDependencyTriageWithRefreshes();
}
