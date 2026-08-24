import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MonitoringConfigError, validateEndpointInput } from "./config";
import { DefaultMeasurementAdapter } from "./measurement";
import { detectEndpointOutages } from "./outages";
import { MemoryMonitoringRepository, SqliteMonitoringRepository } from "./repository";
import { groupMeasurements, summarizeMeasurements } from "./statistics";
import { extractStructuredText, parseTrendSummary, prepareTrendSummaryInput } from "./trendSummary";
import type { EndpointProfile, Measurement } from "./types";

const endpoint: EndpointProfile = {
  id: "test-endpoint",
  label: "Test endpoint",
  url: "https://example.test/health",
  dnsHost: "localhost",
  intervalMinutes: 30,
  active: true,
  speedTestOptIn: false,
  createdAt: 1,
  updatedAt: 1,
};

function measurement(overrides: Partial<Measurement> = {}): Measurement {
  return {
    id: `m-${overrides.timestamp ?? 1}`,
    endpointId: endpoint.id,
    timestamp: 1,
    availability: true,
    latencyMs: 20,
    dnsLookupMs: 5,
    packetLossPct: 0,
    downloadMbps: null,
    uploadMbps: null,
    provenance: { availability: "direct", latencyMs: "direct", dnsLookupMs: "direct", packetLossPct: "direct" },
    isDemo: false,
    ...overrides,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("monitoring configuration", () => {
  it("rejects malformed or aggressive endpoint profiles", () => {
    expect(() => validateEndpointInput({ ...endpoint, url: "not-a-url" })).toThrow(MonitoringConfigError);
    expect(() => validateEndpointInput({ ...endpoint, intervalMinutes: 5 })).toThrow(MonitoringConfigError);
    expect(() => validateEndpointInput({ ...endpoint, intervalMinutes: 17 })).toThrow(/conservative interval/);
  });
});

describe("statistics", () => {
  it("separates direct, estimated, and simulated observations", () => {
    const summary = summarizeMeasurements([
      measurement({ id: "direct", latencyMs: 10 }),
      measurement({ id: "estimated", latencyMs: 20, provenance: { latencyMs: "estimated" } }),
      measurement({ id: "demo", latencyMs: 30, provenance: { latencyMs: "simulated" }, isDemo: true }),
    ]);
    expect(summary.latencyMs.average).toBe(20);
    expect(summary.directRecordCount).toBe(1);
    expect(summary.estimatedRecordCount).toBe(1);
    expect(summary.simulatedRecordCount).toBe(1);
  });

  it("uses calendar-month buckets for monthly summaries", () => {
    const groups = groupMeasurements([
      measurement({ id: "july", timestamp: Date.parse("2026-07-31T23:00:00.000Z") }),
      measurement({ id: "august", timestamp: Date.parse("2026-08-01T01:00:00.000Z") }),
    ], "month");
    expect(groups.map(group => group.key)).toEqual(["2026-07", "2026-08"]);
  });
});

describe("outage detection", () => {
  it("creates an endpoint-local incident only after consecutive direct failures", () => {
    const records = [
      measurement({ id: "one", timestamp: 1, availability: false }),
      measurement({ id: "two", timestamp: 2, availability: false }),
      measurement({ id: "three", timestamp: 3, availability: false }),
      measurement({ id: "four", timestamp: 4, availability: true }),
    ];
    const events = detectEndpointOutages(endpoint.id, records);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ endpointId: endpoint.id, scope: "endpoint-local", startedAt: 1, resolvedAt: 4, consecutiveFailures: 3 });
    expect(events[0].summary).toContain("does not establish an internet-wide outage");
  });
});

describe("persistence", () => {
  const directories: string[] = [];
  afterEach(() => directories.splice(0).forEach(directory => rmSync(directory, { recursive: true, force: true })));

  it("persists endpoint metadata, timestamped records, and outage events in SQLite", () => {
    const directory = mkdtempSync(join(tmpdir(), "time-machine-"));
    directories.push(directory);
    const repository = new SqliteMonitoringRepository(join(directory, "monitor.sqlite"));
    repository.saveEndpoint(endpoint);
    repository.saveMeasurement(measurement({ timestamp: 42 }));
    const event = detectEndpointOutages(endpoint.id, [
      measurement({ id: "a", timestamp: 10, availability: false }),
      measurement({ id: "b", timestamp: 11, availability: false }),
      measurement({ id: "c", timestamp: 12, availability: false }),
    ])[0];
    repository.saveOutage(event);
    repository.saveOutage({ ...event, id: "duplicate-event" });
    expect(repository.getEndpoint(endpoint.id)?.label).toBe("Test endpoint");
    expect(repository.listMeasurements(endpoint.id)[0]?.timestamp).toBe(42);
    expect(repository.listOutages(endpoint.id)).toHaveLength(1);
    expect(repository.listOutages(endpoint.id)[0]?.scope).toBe("endpoint-local");
  });

  it("supports an in-memory repository for isolated tests", () => {
    const repository = new MemoryMonitoringRepository();
    repository.saveEndpoint(endpoint);
    repository.saveMeasurement(measurement());
    expect(repository.listMeasurements(endpoint.id)).toHaveLength(1);
  });
});

describe("measurement failures", () => {
  it("records a recoverable availability failure instead of throwing away the cycle", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network unavailable"); }));
    const record = await new DefaultMeasurementAdapter().measure(endpoint);
    expect(record.availability).toBe(false);
    expect(record.provenance.availability).toBe("direct");
    expect(record.errorMessage).toContain("Availability probe failed");
    expect(record.latencyMs).toBeNull();
  });
});

describe("AI trend-summary preparation", () => {
  it("uses aggregates and provenance while omitting endpoint URLs and raw measurement errors", () => {
    const records = [measurement({ errorMessage: "private upstream detail", timestamp: 100 }), measurement({ id: "m-200", timestamp: 200 })];
    const input = prepareTrendSummaryInput(endpoint, summarizeMeasurements(records), [], records.map(record => record.timestamp));
    const serialized = JSON.stringify(input);
    expect(input.provenance.direct).toBe(2);
    expect(input.metrics.averageLatencyMs).toBe(20);
    expect(serialized).not.toContain(endpoint.url);
    expect(serialized).not.toContain("private upstream detail");
  });

  it("accepts only the expected structured summary schema", () => {
    const parsed = parseTrendSummary(JSON.stringify({
      headline: "Stable latency across the selected period",
      narrative: "The selected observations show consistent direct latency values with no endpoint-local incident events recorded.",
      highlights: [{ finding: "Latency remained stable", evidence: "Average latency was 20 ms across two direct records.", dataBoundary: "direct" }],
      caveat: "These observations describe one endpoint from one monitor and do not establish broader internet conditions.",
    }));
    expect(parsed.highlights[0]?.dataBoundary).toBe("direct");
    expect(() => parseTrendSummary('{"headline":"missing required fields"}')).toThrow();
  });

  it("extracts text from provider response objects and content-part arrays", () => {
    expect(extractStructuredText({ type: "text", text: "{\"ok\":true}" })).toBe('{"ok":true}');
    expect(extractStructuredText([{ type: "text", text: "first" }, { type: "text", text: "second" }])).toBe("first\nsecond");
  });

  it("normalizes an overlong valid highlight list to the four-item dashboard limit", () => {
    const summary = parseTrendSummary(JSON.stringify({
      headline: "Simulated endpoint trend summary",
      narrative: "This intentionally simulated record set demonstrates a local monitoring interpretation with clear provenance.",
      highlights: Array.from({ length: 5 }, (_, index) => ({ finding: `Finding ${index} is simulated`, evidence: `Evidence ${index} comes from the simulated aggregate.`, dataBoundary: "simulated" })),
      caveat: "This is simulated demo history and does not establish a live or internet-wide condition.",
    }));
    expect(summary.highlights).toHaveLength(4);
  });
});
