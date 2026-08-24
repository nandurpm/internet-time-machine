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
  parserVersion: "2026-08-24-live";
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
        minItems: 1,
        maxItems: 4,
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

export function extractStructuredText(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(extractStructuredText).filter(Boolean).join("\n");
  if (!value || typeof value !== "object") return "";
  const candidate = value as { type?: unknown; text?: unknown; content?: unknown };
  if (candidate.type === "text" && typeof candidate.text === "string") return candidate.text;
  if (typeof candidate.text === "string") return candidate.text;
  return extractStructuredText(candidate.content);
}

function withModelTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("AI summary request timed out after 25 seconds.")), timeoutMs)),
  ]);
}

export async function generateTrendSummary(input: TrendSummaryInput): Promise<TrendSummary> {
  const models = await listLLMModels();
  const model = "gpt-5-mini";
  if (!models.data.some(candidate => candidate.id === model)) throw new Error("The required gpt-5-mini trend model is unavailable.");

  const systemInstruction = "You summarize network monitoring aggregates precisely. Use only the provided values. Never claim an internet-wide outage, root cause, certainty beyond the data, or a measurement that is not present. Call incidents endpoint-local. Explicitly respect direct, estimated, and simulated provenance. If simulated records dominate, say the summary is a demo interpretation.";
  const userInstruction = `Create a concise trend summary for this aggregate JSON: ${JSON.stringify(input)}`;
  const startedAt = Date.now();
  const response = await withModelTimeout(invokeLLM({
    model,
    maxTokens: 1200,
    outputSchema: summaryOutputSchema,
    messages: [
      {
        role: "system",
        content: systemInstruction,
      },
      {
        role: "user",
        content: userInstruction,
      },
    ],
  }), 25_000);
  const rawContent: unknown = response.choices[0]?.message.content;
  let content = extractStructuredText(rawContent);
  if (!content) {
    const fallback = await withModelTimeout(invokeLLM({
      model,
      maxTokens: 1200,
      messages: [
        { role: "system", content: `${systemInstruction} Return valid JSON only with headline, narrative, one to four highlights (each with finding, evidence, dataBoundary), and caveat. Do not use Markdown.` },
        { role: "user", content: userInstruction },
      ],
    }), 25_000);
    content = extractStructuredText(fallback.choices[0]?.message.content);
  }
  if (!content) {
    const contentShape = rawContent === null ? "null" : Array.isArray(rawContent) ? "array" : typeof rawContent;
    const messageKeys = Object.keys((response.choices[0]?.message ?? {}) as Record<string, unknown>).join(",");
    console.warn(`[TrendSummary] Empty model content; shape=${contentShape}; messageKeys=${messageKeys}; finish=${response.choices[0]?.finish_reason ?? "unknown"}`);
    throw new Error(`AI summary produced no visible text (model=${model}; finish=${response.choices[0]?.finish_reason ?? "unknown"}; elapsedMs=${Date.now() - startedAt}; content=${contentShape}).`);
  }
  return { ...parseTrendSummary(content), generatedAt: Date.now(), model, parserVersion: "2026-08-24-live" };
}
