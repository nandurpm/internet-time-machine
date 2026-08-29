/*
 * ============================================================
 * FILE: demo.ts
 * PURPOSE: Seeds explicitly labeled simulated endpoint measurements and incidents for interface demonstrations.
 * ============================================================
 */

import type { MonitoringRepository } from "./repository";
import { detectEndpointOutages } from "./outages";
import type { EndpointProfile, Measurement } from "./types";

const HOUR = 60 * 60 * 1000;
export const DEMO_ENDPOINT_ID = "demo-cloudflare-dns";

export function seedClearlyLabeledDemoData(repository: MonitoringRepository, now = Date.now()) {
  let endpoint = repository.getEndpoint(DEMO_ENDPOINT_ID);
  if (!endpoint) {
    endpoint = {
    id: DEMO_ENDPOINT_ID,
    label: "Demo endpoint · 1.1.1.1",
    url: "https://1.1.1.1/",
    dnsHost: "one.one.one.one",
    intervalMinutes: 30,
    active: false,
    speedTestOptIn: false,
    createdAt: now - 7 * 24 * HOUR,
    updatedAt: now,
    };
    repository.saveEndpoint(endpoint);
  }
  if (!repository.listMeasurements(endpoint.id).length) {
    const latencyPattern = [23, 25, 21, 28, 32, 26, 24, 22, 20, 31, 27, 24, 29, 26, 25, 23, 34, 28, 26, 22, 21, 24, 27, 30];
    for (let index = 0; index < latencyPattern.length; index += 1) {
    const timestamp = now - (latencyPattern.length - index) * 6 * HOUR;
    const offline = index === 9 || index === 10 || index === 11;
    const record: Measurement = {
      id: `demo-measurement-${index}`,
      endpointId: endpoint.id,
      timestamp,
      availability: !offline,
      latencyMs: offline ? null : latencyPattern[index],
      dnsLookupMs: offline ? null : 8 + (index % 6),
      packetLossPct: offline ? null : index === 18 ? 1.2 : index % 7 === 0 ? 0.3 : 0,
      downloadMbps: null,
      uploadMbps: null,
      statusCode: offline ? null : 204,
      errorMessage: offline ? "Simulated local availability failure for demo only." : null,
      provenance: { availability: "simulated", latencyMs: "simulated", dnsLookupMs: "simulated", packetLossPct: "simulated" },
      isDemo: true,
      note: "Simulated/demo record. It is not a live measurement.",
    };
      repository.saveMeasurement(record);
    }
  }
  detectEndpointOutages(endpoint.id, repository.listMeasurements(endpoint.id)).forEach(event => repository.saveOutage(event));
}
