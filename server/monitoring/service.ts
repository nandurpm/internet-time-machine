/*
 * ============================================================
 * FILE: service.ts
 * PURPOSE: Coordinates endpoint CRUD, collection, history, incidents, and scheduler state across monitoring adapters and repositories.
 * ============================================================
 */

import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { validateEndpointInput } from "./config";
import { seedClearlyLabeledDemoData } from "./demo";
import { DefaultMeasurementAdapter, type MeasurementAdapter } from "./measurement";
import { detectEndpointOutages } from "./outages";
import { SqliteMonitoringRepository, type MonitoringRepository } from "./repository";
import { groupMeasurements, summarizeMeasurements } from "./statistics";
import type { EndpointProfile, Measurement } from "./types";

const databasePath = resolve(process.env.MONITORING_DB_PATH || "data/internet-time-machine.sqlite");
const repository = new SqliteMonitoringRepository(databasePath);
seedClearlyLabeledDemoData(repository);

export function getMonitoringRepository(): MonitoringRepository {
  return repository;
}

export function listEndpointProfiles() {
  return repository.listEndpoints();
}

export function createEndpointProfile(input: unknown) {
  const endpoint = validateEndpointInput(input);
  const existing = repository.getEndpoint(endpoint.id);
  repository.saveEndpoint({ ...endpoint, createdAt: existing?.createdAt ?? endpoint.createdAt });
  return repository.getEndpoint(endpoint.id) as EndpointProfile;
}

export async function collectMeasurement(endpointId: string, adapter: MeasurementAdapter = new DefaultMeasurementAdapter()) {
  const endpoint = repository.getEndpoint(endpointId);
  if (!endpoint) throw new Error("Endpoint profile was not found.");
  if (!endpoint.active) throw new Error("Endpoint monitoring is paused.");

  let measurement: Measurement;
  try {
    measurement = await adapter.measure(endpoint);
  } catch (error) {
    measurement = {
      id: `measurement-${randomUUID()}`,
      endpointId,
      timestamp: Date.now(),
      availability: null,
      latencyMs: null,
      dnsLookupMs: null,
      packetLossPct: null,
      downloadMbps: null,
      uploadMbps: null,
      errorMessage: `Recoverable measurement adapter failure: ${error instanceof Error ? error.message : String(error)}`,
      provenance: {},
      isDemo: false,
      note: "Measurement was not produced because an adapter failed. Existing history is preserved.",
    };
  }
  repository.saveMeasurement(measurement);
  const events = detectEndpointOutages(endpointId, repository.listMeasurements(endpointId));
  events.forEach(event => repository.saveOutage(event));
  return measurement;
}

export function getHistory(endpointId: string, from?: number, to?: number) {
  const measurements = repository.listMeasurements(endpointId, from, to);
  return {
    measurements,
    outages: repository.listOutages(endpointId, from, to),
    statistics: summarizeMeasurements(measurements),
    groupedStatistics: {
      daily: groupMeasurements(measurements, "day"),
      weekly: groupMeasurements(measurements, "week"),
      monthly: groupMeasurements(measurements, "month"),
      custom: groupMeasurements(measurements, "custom"),
    },
  };
}

export function updateEndpointSchedule(endpointId: string, taskUid: string | null) {
  repository.updateEndpointSchedule(endpointId, taskUid);
  return repository.getEndpoint(endpointId);
}

export async function collectScheduledMeasurement(taskUid: string) {
  const endpoint = repository.listEndpoints().find(profile => profile.scheduleTaskUid === taskUid);
  if (!endpoint) return { ok: true, skipped: "orphan" as const };
  if (!endpoint.active) return { ok: true, skipped: "paused" as const };
  const measurement = await collectMeasurement(endpoint.id);
  return { ok: true, endpointId: endpoint.id, measurementId: measurement.id };
}
