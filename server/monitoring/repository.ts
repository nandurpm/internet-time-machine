/*
 * ============================================================
 * FILE: repository.ts
 * PURPOSE: Defines monitoring persistence contracts and memory/SQLite repository implementations for profiles, measurements, and incidents.
 * ============================================================
 */

import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import type { EndpointProfile, Measurement, OutageEvent } from "./types";

const runtimeRequire = createRequire(import.meta.url);
const { DatabaseSync } = runtimeRequire("node:sqlite") as typeof import("node:sqlite");

export interface MonitoringRepository {
  listEndpoints(): EndpointProfile[];
  getEndpoint(id: string): EndpointProfile | null;
  saveEndpoint(endpoint: EndpointProfile): void;
  updateEndpointSchedule(id: string, taskUid: string | null): void;
  listMeasurements(endpointId: string, from?: number, to?: number): Measurement[];
  saveMeasurement(measurement: Measurement): void;
  listOutages(endpointId: string, from?: number, to?: number): OutageEvent[];
  saveOutage(event: OutageEvent): void;
}

export class MemoryMonitoringRepository implements MonitoringRepository {
  private readonly endpoints = new Map<string, EndpointProfile>();
  private readonly measurements: Measurement[] = [];
  private readonly outages: OutageEvent[] = [];

  listEndpoints() { return Array.from(this.endpoints.values()).sort((a, b) => a.label.localeCompare(b.label)); }
  getEndpoint(id: string) { return this.endpoints.get(id) ?? null; }
  saveEndpoint(endpoint: EndpointProfile) { this.endpoints.set(endpoint.id, endpoint); }
  updateEndpointSchedule(id: string, taskUid: string | null) {
    const endpoint = this.getEndpoint(id);
    if (!endpoint) throw new Error(`Endpoint ${id} was not found.`);
    this.saveEndpoint({ ...endpoint, scheduleTaskUid: taskUid, updatedAt: Date.now() });
  }
  listMeasurements(endpointId: string, from = 0, to = Number.MAX_SAFE_INTEGER) {
    return this.measurements.filter(record => record.endpointId === endpointId && record.timestamp >= from && record.timestamp <= to).sort((a, b) => a.timestamp - b.timestamp);
  }
  saveMeasurement(measurement: Measurement) { this.measurements.push(measurement); }
  listOutages(endpointId: string, from = 0, to = Number.MAX_SAFE_INTEGER) {
    return this.outages.filter(event => event.endpointId === endpointId && event.startedAt >= from && event.startedAt <= to).sort((a, b) => a.startedAt - b.startedAt);
  }
  saveOutage(event: OutageEvent) {
    if (!this.outages.some(existing => existing.endpointId === event.endpointId && existing.startedAt === event.startedAt)) this.outages.push(event);
  }
}

export class SqliteMonitoringRepository implements MonitoringRepository {
  private readonly database: InstanceType<typeof DatabaseSync>;

  constructor(filePath: string) {
    mkdirSync(dirname(filePath), { recursive: true });
    this.database = new DatabaseSync(filePath);
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS endpoint_profiles (
        id TEXT PRIMARY KEY, label TEXT NOT NULL, url TEXT NOT NULL, dns_host TEXT NOT NULL,
        interval_minutes INTEGER NOT NULL, active INTEGER NOT NULL, speed_test_opt_in INTEGER NOT NULL,
        schedule_task_uid TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      ) STRICT;
      CREATE TABLE IF NOT EXISTS measurements (
        id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, timestamp INTEGER NOT NULL, availability INTEGER,
        latency_ms REAL, dns_lookup_ms REAL, packet_loss_pct REAL, download_mbps REAL, upload_mbps REAL,
        status_code INTEGER, error_message TEXT, provenance_json TEXT NOT NULL, is_demo INTEGER NOT NULL,
        note TEXT
      ) STRICT;
      CREATE INDEX IF NOT EXISTS measurements_endpoint_time ON measurements(endpoint_id, timestamp);
      CREATE TABLE IF NOT EXISTS outage_events (
        id TEXT PRIMARY KEY, endpoint_id TEXT NOT NULL, started_at INTEGER NOT NULL, resolved_at INTEGER,
        consecutive_failures INTEGER NOT NULL, scope TEXT NOT NULL, summary TEXT NOT NULL, is_demo INTEGER NOT NULL
      ) STRICT;
      DELETE FROM outage_events
      WHERE id NOT IN (
        SELECT MIN(id) FROM outage_events GROUP BY endpoint_id, started_at
      );
    `);
  }

  listEndpoints(): EndpointProfile[] {
    return (this.database.prepare("SELECT * FROM endpoint_profiles ORDER BY label").all() as Record<string, unknown>[]).map(rowToEndpoint);
  }
  getEndpoint(id: string): EndpointProfile | null {
    const row = this.database.prepare("SELECT * FROM endpoint_profiles WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    return row ? rowToEndpoint(row) : null;
  }
  saveEndpoint(endpoint: EndpointProfile) {
    this.database.prepare(`INSERT INTO endpoint_profiles (id,label,url,dns_host,interval_minutes,active,speed_test_opt_in,schedule_task_uid,created_at,updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET label=excluded.label,url=excluded.url,dns_host=excluded.dns_host,interval_minutes=excluded.interval_minutes,active=excluded.active,speed_test_opt_in=excluded.speed_test_opt_in,schedule_task_uid=excluded.schedule_task_uid,updated_at=excluded.updated_at`
    ).run(endpoint.id, endpoint.label, endpoint.url, endpoint.dnsHost, endpoint.intervalMinutes, Number(endpoint.active), Number(endpoint.speedTestOptIn), endpoint.scheduleTaskUid ?? null, endpoint.createdAt, endpoint.updatedAt);
  }
  updateEndpointSchedule(id: string, taskUid: string | null) { this.database.prepare("UPDATE endpoint_profiles SET schedule_task_uid = ?, updated_at = ? WHERE id = ?").run(taskUid, Date.now(), id); }
  listMeasurements(endpointId: string, from = 0, to = Number.MAX_SAFE_INTEGER): Measurement[] {
    return (this.database.prepare("SELECT * FROM measurements WHERE endpoint_id = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp").all(endpointId, from, to) as Record<string, unknown>[]).map(rowToMeasurement);
  }
  saveMeasurement(measurement: Measurement) {
    this.database.prepare("INSERT OR REPLACE INTO measurements VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(measurement.id, measurement.endpointId, measurement.timestamp, measurement.availability === null ? null : Number(measurement.availability), measurement.latencyMs, measurement.dnsLookupMs, measurement.packetLossPct, measurement.downloadMbps, measurement.uploadMbps, measurement.statusCode ?? null, measurement.errorMessage ?? null, JSON.stringify(measurement.provenance), Number(measurement.isDemo), measurement.note ?? null);
  }
  listOutages(endpointId: string, from = 0, to = Number.MAX_SAFE_INTEGER): OutageEvent[] {
    return (this.database.prepare("SELECT * FROM outage_events WHERE endpoint_id = ? AND started_at BETWEEN ? AND ? ORDER BY started_at").all(endpointId, from, to) as Record<string, unknown>[]).map(rowToOutage);
  }
  saveOutage(event: OutageEvent) {
    const existing = this.database.prepare("SELECT id FROM outage_events WHERE endpoint_id = ? AND started_at = ? LIMIT 1").get(event.endpointId, event.startedAt);
    if (!existing) this.database.prepare("INSERT INTO outage_events VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(event.id, event.endpointId, event.startedAt, event.resolvedAt, event.consecutiveFailures, event.scope, event.summary, Number(event.isDemo));
  }
}

const rowToEndpoint = (row: Record<string, unknown>): EndpointProfile => ({ id: String(row.id), label: String(row.label), url: String(row.url), dnsHost: String(row.dns_host), intervalMinutes: Number(row.interval_minutes), active: Boolean(row.active), speedTestOptIn: Boolean(row.speed_test_opt_in), scheduleTaskUid: row.schedule_task_uid ? String(row.schedule_task_uid) : null, createdAt: Number(row.created_at), updatedAt: Number(row.updated_at) });
const rowToMeasurement = (row: Record<string, unknown>): Measurement => ({ id: String(row.id), endpointId: String(row.endpoint_id), timestamp: Number(row.timestamp), availability: row.availability === null ? null : Boolean(row.availability), latencyMs: row.latency_ms === null ? null : Number(row.latency_ms), dnsLookupMs: row.dns_lookup_ms === null ? null : Number(row.dns_lookup_ms), packetLossPct: row.packet_loss_pct === null ? null : Number(row.packet_loss_pct), downloadMbps: row.download_mbps === null ? null : Number(row.download_mbps), uploadMbps: row.upload_mbps === null ? null : Number(row.upload_mbps), statusCode: row.status_code === null ? null : Number(row.status_code), errorMessage: row.error_message ? String(row.error_message) : null, provenance: JSON.parse(String(row.provenance_json)), isDemo: Boolean(row.is_demo), note: row.note ? String(row.note) : null });
const rowToOutage = (row: Record<string, unknown>): OutageEvent => ({ id: String(row.id), endpointId: String(row.endpoint_id), startedAt: Number(row.started_at), resolvedAt: row.resolved_at === null ? null : Number(row.resolved_at), consecutiveFailures: Number(row.consecutive_failures), scope: "endpoint-local", summary: String(row.summary), isDemo: Boolean(row.is_demo) });
