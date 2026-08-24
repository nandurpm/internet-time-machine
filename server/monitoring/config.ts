import { z } from "zod";
import type { EndpointProfile } from "./types";

export const MINIMUM_INTERVAL_MINUTES = 15;
export const MAXIMUM_INTERVAL_MINUTES = 24 * 60;
export const supportedIntervals = [15, 30, 60, 120, 240, 360, 720, 1440] as const;

const endpointSchema = z.object({
  id: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores."),
  label: z.string().trim().min(2).max(80),
  url: z.string().url(),
  dnsHost: z.string().trim().min(1).max(253).optional(),
  intervalMinutes: z.number().int().min(MINIMUM_INTERVAL_MINUTES).max(MAXIMUM_INTERVAL_MINUTES),
  active: z.boolean().default(true),
  speedTestOptIn: z.boolean().default(false),
});

export class MonitoringConfigError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(issues.join(" "));
    this.name = "MonitoringConfigError";
    this.issues = issues;
  }
}

export function validateEndpointInput(input: unknown, now = Date.now()): EndpointProfile {
  const parsed = endpointSchema.safeParse(input);
  if (!parsed.success) {
    throw new MonitoringConfigError(parsed.error.issues.map(issue => issue.message));
  }

  const safeUrl = new URL(parsed.data.url);
  if (!/^https?:$/.test(safeUrl.protocol)) {
    throw new MonitoringConfigError(["Endpoint URLs must use http or https."]);
  }
  if (!supportedIntervals.includes(parsed.data.intervalMinutes as (typeof supportedIntervals)[number])) {
    throw new MonitoringConfigError([
      `Choose a conservative interval of ${supportedIntervals.join(", ")} minutes.`,
    ]);
  }
  if (safeUrl.username || safeUrl.password) {
    throw new MonitoringConfigError(["Endpoint URLs must not include credentials."]);
  }

  return {
    id: parsed.data.id,
    label: parsed.data.label,
    url: safeUrl.toString(),
    dnsHost: parsed.data.dnsHost || safeUrl.hostname,
    intervalMinutes: parsed.data.intervalMinutes,
    active: parsed.data.active,
    speedTestOptIn: parsed.data.speedTestOptIn,
    createdAt: now,
    updatedAt: now,
  };
}

export function intervalToSafeCron(intervalMinutes: number): string {
  if (!supportedIntervals.includes(intervalMinutes as (typeof supportedIntervals)[number])) {
    throw new MonitoringConfigError(["The requested interval is not supported for safe scheduling."]);
  }
  if (intervalMinutes < 60) return `0 */${intervalMinutes} * * * *`;
  if (intervalMinutes === 60) return "0 0 * * * *";
  if (intervalMinutes < 24 * 60) return `0 0 */${intervalMinutes / 60} * * *`;
  return "0 0 0 * * *";
}
