/*
 * ============================================================
 * FILE: types.ts
 * PURPOSE: Defines monitoring profiles, measurements, provenance labels, incidents, statistics, and adapter contracts.
 * ============================================================
 */

export const metricNames = [
  "availability",
  "latencyMs",
  "dnsLookupMs",
  "packetLossPct",
  "downloadMbps",
  "uploadMbps",
] as const;

export type MetricName = (typeof metricNames)[number];
export type MeasurementProvenance = "direct" | "estimated" | "simulated";
export type EndpointStatus = "healthy" | "degraded" | "offline" | "unknown";

export type EndpointProfile = {
  id: string;
  label: string;
  url: string;
  dnsHost: string;
  intervalMinutes: number;
  active: boolean;
  speedTestOptIn: boolean;
  scheduleTaskUid?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type Measurement = {
  id: string;
  endpointId: string;
  timestamp: number;
  availability: boolean | null;
  latencyMs: number | null;
  dnsLookupMs: number | null;
  packetLossPct: number | null;
  downloadMbps: number | null;
  uploadMbps: number | null;
  statusCode?: number | null;
  errorMessage?: string | null;
  provenance: Partial<Record<MetricName, MeasurementProvenance>>;
  isDemo: boolean;
  note?: string | null;
};

export type OutageEvent = {
  id: string;
  endpointId: string;
  startedAt: number;
  resolvedAt: number | null;
  consecutiveFailures: number;
  scope: "endpoint-local";
  summary: string;
  isDemo: boolean;
};

export type MetricSummary = {
  count: number;
  average: number | null;
  minimum: number | null;
  maximum: number | null;
  directCount: number;
  estimatedCount: number;
  simulatedCount: number;
};

export type MonitoringStatistics = {
  recordCount: number;
  directRecordCount: number;
  estimatedRecordCount: number;
  simulatedRecordCount: number;
  availabilityPercent: MetricSummary;
  latencyMs: MetricSummary;
  dnsLookupMs: MetricSummary;
  packetLossPct: MetricSummary;
  downloadMbps: MetricSummary;
  uploadMbps: MetricSummary;
};
