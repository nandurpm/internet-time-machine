import { z } from "zod";
import {
  listPortfolioValidationResults,
  listPortfolioValidationRuns,
  recordPortfolioValidationRun,
} from "./db";

export const portfolioLinks = [
  { application: "Internet Time Machine", url: "https://timemachine-alxsadqu.manus.space" },
  { application: "Digital Life Dashboard", url: "https://digital-life-dashboard.onrender.com" },
  { application: "Folder Archaeologist", url: "https://folder-archaeologist.onrender.com" },
  { application: "Boot Inspector", url: "https://boot-inspector.onrender.com" },
  { application: "System Change Tracker", url: "https://system-change-tracker.onrender.com" },
  { application: "LAN Map", url: "https://lan-map.onrender.com" },
  { application: "WiFi Heatmap", url: "https://wifi-heatmap.onrender.com" },
  { application: "Electrical Troubleshooter", url: "https://electrical-troubleshooter.onrender.com" },
  { application: "Energy Monitor", url: "https://energy-monitor-3ckp.onrender.com" },
  { application: "Component Vault", url: "https://component-vault.onrender.com" },
  { application: "Resistor Vision", url: "https://resistor-vision-artu.onrender.com" },
  { application: "PCB Component Finder", url: "https://pcb-component-finder.onrender.com" },
  { application: "Signal Lab", url: "https://signal-lab.onrender.com" },
  { application: "Motor Toolbox", url: "https://motor-toolbox.onrender.com" },
  { application: "Machine Logbook", url: "https://machine-logbook-a949.onrender.com" },
  { application: "Screen Explainer", url: "https://screen-explainer.onrender.com" },
  { application: "Diagram Script", url: "https://diagram-script.onrender.com" },
  { application: "Tech Calc", url: "https://tech-calc.onrender.com" },
  { application: "Mini Tool Factory", url: "https://mini-tool-factory.onrender.com" },
  { application: "Command Center", url: "https://command-center-3dwl.onrender.com" },
  { application: "Storage Forensics", url: "https://storage-forensics.onrender.com" },
  { application: "Privacy Inspector", url: "https://privacy-inspector.onrender.com" },
  { application: "Repo Time Machine", url: "https://repo-time-machine.onrender.com" },
  { application: "Project Digital Twin", url: "https://project-digital-twin.onrender.com" },
  { application: "Question Machine", url: "https://question-machine.onrender.com" },
] as const;

const responseResult = z.object({
  url: z.string().url().max(2_048),
  status: z.enum(["healthy", "degraded", "unavailable"]),
  httpStatus: z.number().int().min(100).max(599).nullable(),
  responseTimeMs: z.number().int().min(0).max(600_000).nullable(),
  attemptCount: z.number().int().min(1).max(2),
  pageTitle: z.string().trim().min(1).max(160).nullable(),
});

export const portfolioValidationReportInput = z.object({
  source: z.string().trim().min(8).max(255),
  note: z.string().trim().min(8).max(480),
  results: z.array(responseResult).length(portfolioLinks.length),
}).strict().superRefine((value, ctx) => {
  const expectedUrls = new Set(portfolioLinks.map(link => link.url));
  const receivedUrls = new Set(value.results.map(result => result.url));
  if (receivedUrls.size !== portfolioLinks.length || !Array.from(expectedUrls).every(url => receivedUrls.has(url))) {
    ctx.addIssue({ code: "custom", message: "The report must contain one result for every approved portfolio URL." });
  }
  for (const result of value.results) {
    if (result.status === "healthy" && result.attemptCount !== 1) {
      ctx.addIssue({ code: "custom", message: "Healthy results must be first-attempt successes." });
    }
    if (result.status !== "healthy" && result.attemptCount !== 2) {
      ctx.addIssue({ code: "custom", message: "Degraded and unavailable results must include one retry." });
    }
    if (result.status !== "unavailable" && (result.httpStatus === null || result.httpStatus >= 400 || result.responseTimeMs === null)) {
      ctx.addIssue({ code: "custom", message: "Successful results require a successful HTTP status and response time." });
    }
  }
});

function median(values: number[]) {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const center = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[center] : Math.round((ordered[center - 1] + ordered[center]) / 2);
}

export async function recordValidatedPortfolioReport(input: unknown, taskUid: string) {
  const parsed = portfolioValidationReportInput.parse(input);
  const applicationByUrl = new Map<string, string>(portfolioLinks.map(link => [link.url, link.application]));
  const responseTimes = parsed.results.flatMap(result => result.responseTimeMs === null ? [] : [result.responseTimeMs]);
  const healthyCount = parsed.results.filter(result => result.status === "healthy").length;
  const degradedCount = parsed.results.filter(result => result.status === "degraded").length;
  const unavailableCount = parsed.results.filter(result => result.status === "unavailable").length;

  return recordPortfolioValidationRun({
    taskUid,
    healthyCount,
    degradedCount,
    unavailableCount,
    checkedLinkCount: parsed.results.length,
    meanResponseMs: responseTimes.length ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length) : null,
    medianResponseMs: median(responseTimes),
    slowestResponseMs: responseTimes.length ? Math.max(...responseTimes) : null,
    source: parsed.source,
    note: parsed.note,
    results: parsed.results.map(result => ({
      ...result,
      application: applicationByUrl.get(result.url)!,
    })),
  });
}

/** Public, read-only summaries preserve the single-observation interpretation boundary. */
export async function getPortfolioReportArchive() {
  const reports = await listPortfolioValidationRuns();
  const latest = reports[0];
  const latestResults = latest ? await listPortfolioValidationResults(latest.id) : [];
  return {
    reports,
    latestUnavailable: latestResults.filter(result => result.status === "unavailable"),
    interpretation: "Each status is a recorded external HTTP observation from its scheduled run, not a guarantee of application availability or a performance benchmark.",
    cadence: "Weekly scheduled 25-link validation",
  };
}

/** Server callers must apply admin authorization before exposing the complete run timeline. */
export async function getAdminPortfolioRunHistory() {
  return listPortfolioValidationRuns(52);
}
