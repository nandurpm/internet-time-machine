import { z } from "zod";
import { invokeLLM, listLLMModels } from "../_core/llm";
import type { EndpointProfile, MonitoringStatistics, OutageEvent } from "./types";

const trendSummarySchema = z.object({
  headline: z.string().min(8).max(120),
  narrative: z.string().min(40).max(600),
  highlights: z.array(z.object({
    finding: z.string().min(8).max(220),
    evidence: z.string().min(5).max(180),
    dataBoundary: z.enum(["direct", "estimated", "simulated", "mixed"]),
  })).min(1).max(4),
  caveat: z.string().min(20).max(260),
});

export type TrendSummary = z.infer<typeof trendSummarySchema> & {
  generatedAt: number;
  model: string;
};

export type TrendSummaryInput = {
  endpointLabel: string;
  timeWindow: { start: number | null; end: number | null };
  recordCount: number;
  provenance: { direct: number; estimated: number; simulated: number };
  metrics: {
    availabilityPercent: number | null;
    averageLatencyMs: number | null;
    averageDnsLookupMs: number | null;
    averagePacketLossPct: number | null;
  };
  endpointLocalIncidents: number;
  allIncidentsSimulated: boolean;
};

const summaryOutputSchema = {
  name: "network_trend_summary",
  strict: true,
  schema: {
    type: "object",
    properties: {
      headline: { type: "string" },
      narrative: { type: "string" },
      highlights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            finding: { type: "string" },
            evidence: { type: "string" },
            dataBoundary: { type: "string", enum: ["direct", "estimated", "simulated", "mixed"] },
          },
          required: ["finding", "evidence", "dataBoundary"],
          additionalProperties: false,
        },
      },
      caveat: { type: "string" },
    },
    required: ["headline", "narrative", "highlights", "caveat"],
    additionalProperties: false,
  },
} as const;

const safeNumber = (value: number | null) => value === null ? null : Number(value.toFixed(2));

/** Prepares only aggregate, provenance-aware facts; URLs and raw failure text are intentionally omitted. */
export function prepareTrendSummaryInput(
  endpoint: EndpointProfile,
  statistics: MonitoringStatistics,
  outageEvents: OutageEvent[],
  measurementTimestamps: number[]
): TrendSummaryInput {
  return {
    endpointLabel: endpoint.label,
    timeWindow: {
      start: measurementTimestamps.length ? Math.min(...measurementTimestamps) : null,
      end: measurementTimestamps.length ? Math.max(...measurementTimestamps) : null,
    },
    recordCount: statistics.recordCount,
    provenance: {
      direct: statistics.directRecordCount,
      estimated: statistics.estimatedRecordCount,
      simulated: statistics.simulatedRecordCount,
    },
    metrics: {
      availabilityPercent: safeNumber(statistics.availabilityPercent.average),
      averageLatencyMs: safeNumber(statistics.latencyMs.average),
      averageDnsLookupMs: safeNumber(statistics.dnsLookupMs.average),
      averagePacketLossPct: safeNumber(statistics.packetLossPct.average),
    },
    endpointLocalIncidents: outageEvents.length,
    allIncidentsSimulated: outageEvents.length > 0 && outageEvents.every(event => event.isDemo),
  };
}

export function parseTrendSummary(content: string): z.infer<typeof trendSummarySchema> {
  return trendSummarySchema.parse(JSON.parse(content));
}

export async function generateTrendSummary(input: TrendSummaryInput): Promise<TrendSummary> {
  const models = await listLLMModels();
  const model = models.data.find(candidate => candidate.id === "gpt-5-mini")?.id ?? models.data[0]?.id;
  if (!model) throw new Error("No language model is available for trend analysis.");

  const response = await invokeLLM({
    model,
    maxTokens: 900,
    outputSchema: summaryOutputSchema,
    messages: [
      {
        role: "system",
        content: "You summarize network monitoring aggregates precisely. Use only the provided values. Never claim an internet-wide outage, root cause, certainty beyond the data, or a measurement that is not present. Call incidents endpoint-local. Explicitly respect direct, estimated, and simulated provenance. If simulated records dominate, say the summary is a demo interpretation.",
      },
      {
        role: "user",
        content: `Create a concise trend summary for this aggregate JSON: ${JSON.stringify(input)}`,
      },
    ],
  });
  const content = response.choices[0]?.message.content;
  if (typeof content !== "string") throw new Error("The trend model returned no structured text.");
  return { ...parseTrendSummary(content), generatedAt: Date.now(), model };
}
