import { randomUUID } from "node:crypto";
import { promises as dns } from "node:dns";
import type { EndpointProfile, Measurement } from "./types";

const REQUEST_TIMEOUT_MS = 10_000;

export type MeasurementAdapter = {
  measure(endpoint: EndpointProfile): Promise<Measurement>;
};

export async function measureLatencyAndAvailability(endpoint: EndpointProfile, fetcher: typeof fetch = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startedAt = performance.now();
  try {
    const response = await fetcher(endpoint.url, { method: "HEAD", signal: controller.signal, redirect: "follow" });
    return {
      availability: response.ok,
      latencyMs: Math.round(performance.now() - startedAt),
      statusCode: response.status,
      errorMessage: response.ok ? null : `HTTP ${response.status}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function measureDnsLookup(host: string, resolver: Pick<typeof dns, "lookup"> = dns) {
  const startedAt = performance.now();
  await resolver.lookup(host);
  return Math.round(performance.now() - startedAt);
}

/**
 * ICMP access is not universally available in a portable, managed Node runtime.
 * Rather than inventing a loss percentage, the value remains unavailable until an
 * explicit ICMP-capable adapter is supplied by a self-hosted installation.
 */
export async function measurePacketLossBestEffort(): Promise<{ value: number | null; provenance: "direct" | "estimated" | null }> {
  return { value: null, provenance: null };
}

export class DefaultMeasurementAdapter implements MeasurementAdapter {
  async measure(endpoint: EndpointProfile): Promise<Measurement> {
    const timestamp = Date.now();
    const base: Measurement = {
      id: `measurement-${randomUUID()}`,
      endpointId: endpoint.id,
      timestamp,
      availability: null,
      latencyMs: null,
      dnsLookupMs: null,
      packetLossPct: null,
      downloadMbps: null,
      uploadMbps: null,
      statusCode: null,
      errorMessage: null,
      provenance: {},
      isDemo: false,
      note: endpoint.speedTestOptIn
        ? "Download and upload tests are opt-in, but no external speed-test adapter is configured for this profile."
        : "Download and upload tests are disabled for this profile.",
    };

    const [availabilityResult, dnsResult, packetLossResult] = await Promise.allSettled([
      measureLatencyAndAvailability(endpoint),
      measureDnsLookup(endpoint.dnsHost),
      measurePacketLossBestEffort(),
    ]);

    if (availabilityResult.status === "fulfilled") {
      base.availability = availabilityResult.value.availability;
      base.latencyMs = availabilityResult.value.latencyMs;
      base.statusCode = availabilityResult.value.statusCode;
      base.errorMessage = availabilityResult.value.errorMessage;
      base.provenance.availability = "direct";
      base.provenance.latencyMs = "direct";
    } else {
      base.availability = false;
      base.errorMessage = `Availability probe failed: ${normalizeError(availabilityResult.reason)}`;
      base.provenance.availability = "direct";
    }

    if (dnsResult.status === "fulfilled") {
      base.dnsLookupMs = dnsResult.value;
      base.provenance.dnsLookupMs = "direct";
    } else {
      base.note = `${base.note} DNS lookup was unavailable: ${normalizeError(dnsResult.reason)}.`;
    }

    if (packetLossResult.status === "fulfilled" && packetLossResult.value.value !== null && packetLossResult.value.provenance) {
      base.packetLossPct = packetLossResult.value.value;
      base.provenance.packetLossPct = packetLossResult.value.provenance;
    }

    return base;
  }
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
