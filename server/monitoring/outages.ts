import { randomUUID } from "node:crypto";
import type { Measurement, OutageEvent } from "./types";

export const DEFAULT_OUTAGE_FAILURE_THRESHOLD = 3;

/**
 * Detects only a local observation of an endpoint becoming unavailable.
 * It intentionally makes no claim about broader network or internet status.
 */
export function detectEndpointOutages(
  endpointId: string,
  measurements: Measurement[],
  threshold = DEFAULT_OUTAGE_FAILURE_THRESHOLD
): OutageEvent[] {
  const chronological = [...measurements].sort((a, b) => a.timestamp - b.timestamp);
  const events: OutageEvent[] = [];
  let failureRun: Measurement[] = [];

  const closeRun = (recoveryAt: number | null) => {
    if (failureRun.length >= threshold) {
      events.push({
        id: `incident-${randomUUID()}`,
        endpointId,
        startedAt: failureRun[0].timestamp,
        resolvedAt: recoveryAt,
        consecutiveFailures: failureRun.length,
        scope: "endpoint-local",
        summary: `Local monitor observed ${failureRun.length} consecutive unavailable checks for this endpoint. This does not establish an internet-wide outage.`,
        isDemo: failureRun.every(record => record.isDemo),
      });
    }
    failureRun = [];
  };

  for (const measurement of chronological) {
    const availabilityWasObserved = measurement.provenance.availability === "direct" || (measurement.isDemo && measurement.provenance.availability === "simulated");
    if (availabilityWasObserved && measurement.availability === false) {
      failureRun.push(measurement);
      continue;
    }
    closeRun(measurement.timestamp);
  }
  closeRun(null);
  return events;
}
