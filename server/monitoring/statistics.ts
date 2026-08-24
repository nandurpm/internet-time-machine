import type { Measurement, MetricName, MetricSummary, MonitoringStatistics } from "./types";

const numericMetrics: Exclude<MetricName, "availability">[] = [
  "latencyMs",
  "dnsLookupMs",
  "packetLossPct",
  "downloadMbps",
  "uploadMbps",
];

function numericSummary(records: Measurement[], metric: MetricName): MetricSummary {
  const values = records
    .map(record => metric === "availability" ? (record.availability === null ? null : record.availability ? 100 : 0) : record[metric])
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const provenance = records
    .map(record => record.provenance[metric])
    .filter((value): value is NonNullable<typeof value> => Boolean(value));

  return {
    count: values.length,
    average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null,
    minimum: values.length ? Math.min(...values) : null,
    maximum: values.length ? Math.max(...values) : null,
    directCount: provenance.filter(value => value === "direct").length,
    estimatedCount: provenance.filter(value => value === "estimated").length,
    simulatedCount: provenance.filter(value => value === "simulated").length,
  };
}

export function summarizeMeasurements(records: Measurement[]): MonitoringStatistics {
  const recordKinds = records.reduce(
    (accumulator, record) => {
      const mostConservative = record.isDemo
        ? "simulated"
        : Object.values(record.provenance).includes("estimated")
          ? "estimated"
          : "direct";
      accumulator[mostConservative] += 1;
      return accumulator;
    },
    { direct: 0, estimated: 0, simulated: 0 }
  );

  const summaries = Object.fromEntries(
    ["availability", ...numericMetrics].map(metric => [metric, numericSummary(records, metric as MetricName)])
  ) as Record<MetricName, MetricSummary>;

  return {
    recordCount: records.length,
    directRecordCount: recordKinds.direct,
    estimatedRecordCount: recordKinds.estimated,
    simulatedRecordCount: recordKinds.simulated,
    availabilityPercent: summaries.availability,
    latencyMs: summaries.latencyMs,
    dnsLookupMs: summaries.dnsLookupMs,
    packetLossPct: summaries.packetLossPct,
    downloadMbps: summaries.downloadMbps,
    uploadMbps: summaries.uploadMbps,
  };
}

export function groupMeasurements(records: Measurement[], range: "day" | "week" | "month" | "custom") {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const groups = new Map<string, Measurement[]>();
  const divisor = range === "day" ? 1 : range === "week" ? 7 : 1;
  for (const record of records) {
    if (range === "month") {
      const key = new Date(record.timestamp).toISOString().slice(0, 7);
      groups.set(key, [...(groups.get(key) ?? []), record]);
      continue;
    }
    const day = Math.floor(record.timestamp / 86_400_000 / divisor) * divisor;
    const key = range === "custom" ? formatter.format(record.timestamp) : String(day);
    groups.set(key, [...(groups.get(key) ?? []), record]);
  }
  return Array.from(groups.entries()).map(([key, group]) => ({ key, records: group, summary: summarizeMeasurements(group) }));
}
