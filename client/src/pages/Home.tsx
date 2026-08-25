import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { downloadDependencyTriageCsv, downloadDependencyTriagePdf } from "@/lib/dependencyTriageExport";
import { downloadTrendSummaryBatchPdf, downloadTrendSummaryMarkdown, downloadTrendSummaryPdf, reorderTrendSummaryQueue, type TrendSummaryExportContext } from "@/lib/trendSummaryExport";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  Gauge,
  GripVertical,
  Loader2,
  Network,
  Plus,
  ShieldCheck,
  Signal,
  Sparkles,
  WifiOff,
} from "lucide-react";

type RangePreset = "24h" | "7d" | "30d" | "custom";
type SummaryGranularity = "daily" | "weekly" | "monthly" | "custom";
type QueuedTrendSummary = TrendSummaryExportContext & { id: string; selected: boolean };

const formatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const dateTime = (value: number) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);

function exportRows(
  filename: string,
  rows: Record<string, unknown>[],
  format: "json" | "csv"
) {
  const payload =
    format === "json"
      ? JSON.stringify(rows, null, 2)
      : [
          Object.keys(rows[0] ?? {}).join(","),
          ...rows.map(row =>
            Object.values(row)
              .map(value => JSON.stringify(value ?? ""))
              .join(",")
          ),
        ].join("\n");
  const url = URL.createObjectURL(
    new Blob([payload], {
      type: format === "json" ? "application/json" : "text/csv",
    })
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  provenance,
  tone = "slate",
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  detail: string;
  provenance?: "direct" | "estimated" | "simulated";
  tone?: "slate" | "green" | "amber" | "rose";
}) {
  const tones = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-5 text-3xl font-extrabold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{detail}</p>
      {provenance && (
        <div className="mt-3">
          <ProvenanceBadge kind={provenance} />
        </div>
      )}
    </div>
  );
}

function ProvenanceBadge({
  kind,
}: {
  kind: "direct" | "estimated" | "simulated";
}) {
  const copy = {
    direct: "Directly measured",
    estimated: "Estimated",
    simulated: "Simulated / demo",
  };
  const styles = {
    direct: "border-emerald-200 bg-emerald-50 text-emerald-700",
    estimated: "border-amber-200 bg-amber-50 text-amber-700",
    simulated: "border-violet-200 bg-violet-50 text-violet-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${styles[kind]}`}
    >
      {copy[kind]}
    </span>
  );
}

function DependencyStatusBadge({ status }: { status: "review" | "remediated" }) {
  const isReview = status === "review";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-extrabold ${
        isReview
          ? "border-amber-200 bg-amber-50 text-amber-800"
          : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      {isReview ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
      {isReview ? "Recorded review status" : "Recorded remediated status"}
    </span>
  );
}

/**
 * All content in this page are only for example, replace with your own feature implementation
 * When building pages, remember your instructions in Frontend Workflow, Frontend Best Practices, Design Guide and Common Pitfalls
 */
export default function Home() {
  const [endpointId, setEndpointId] = useState("demo-cloudflare-dns");
  const [range, setRange] = useState<RangePreset>("7d");
  const [summaryGranularity, setSummaryGranularity] =
    useState<SummaryGranularity>("daily");
  const [isRefreshingSummary, setIsRefreshingSummary] = useState(false);
  const [summaryPdfQueue, setSummaryPdfQueue] = useState<QueuedTrendSummary[]>([]);
  const [draggedSummaryId, setDraggedSummaryId] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState(() =>
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [customTo, setCustomTo] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [formOpen, setFormOpen] = useState(false);
  const [profile, setProfile] = useState({
    id: "",
    label: "",
    url: "https://",
    intervalMinutes: 30,
    speedTestOptIn: false,
  });
  const dateRange = useMemo(() => {
    const to =
      range === "custom"
        ? new Date(`${customTo}T23:59:59.999Z`).getTime()
        : Date.now();
    const from =
      range === "24h"
        ? to - 24 * 60 * 60 * 1000
        : range === "7d"
          ? to - 7 * 24 * 60 * 60 * 1000
          : range === "30d"
            ? to - 30 * 24 * 60 * 60 * 1000
            : new Date(`${customFrom}T00:00:00.000Z`).getTime();
    return { from, to };
  }, [range, customFrom, customTo]);
  const endpointsQuery = trpc.monitoring.endpoints.useQuery();
  const dependencyTriageQuery = trpc.monitoring.dependencyTriage.useQuery();
  const historyQuery = trpc.monitoring.history.useQuery({
    endpointId,
    from: dateRange.from,
    to: dateRange.to,
  });
  const createEndpoint = trpc.monitoring.saveEndpoint.useMutation({
    onSuccess: () => {
      endpointsQuery.refetch();
      setFormOpen(false);
    },
  });
  const measureNow = trpc.monitoring.measureNow.useMutation({
    onSuccess: () => historyQuery.refetch(),
  });
  const enableSchedule = trpc.monitoring.schedule.useMutation({
    onSuccess: () => endpointsQuery.refetch(),
  });
  const trendSummary = trpc.monitoring.trendSummary.useMutation();
  const endpoint = endpointsQuery.data?.find(item => item.id === endpointId);
  const history = historyQuery.data;
  const latest = history?.measurements[history.measurements.length - 1];
  const points = useMemo(
    () =>
      (history?.measurements ?? []).map(record => ({
        label: dateTime(record.timestamp),
        timestamp: record.timestamp,
        latency: record.latencyMs,
        dns: record.dnsLookupMs,
        loss: record.packetLossPct,
        availability:
          record.availability === null ? null : record.availability ? 100 : 0,
      })),
    [history?.measurements]
  );
  const isDemo = Boolean(latest?.isDemo);
  const status =
    latest?.availability === true
      ? "Healthy"
      : latest?.availability === false
        ? "Unavailable"
        : "Awaiting data";
  const statusTone: "green" | "rose" | "amber" =
    latest?.availability === true
      ? "green"
      : latest?.availability === false
        ? "rose"
        : "amber";
  const provenanceOf = (
    metric: "availability" | "latencyMs" | "dnsLookupMs" | "packetLossPct"
  ) => latest?.provenance[metric] ?? (latest?.isDemo ? "simulated" : undefined);
  const currentGroups = history?.groupedStatistics[summaryGranularity];
  const outageChartData = (history?.outages ?? []).map(event => ({
    label: dateTime(event.startedAt),
    failures: event.consecutiveFailures,
  }));
  const summaryExport = history
    ? [
        {
          endpoint: endpoint?.label ?? endpointId,
          startUtc: new Date(dateRange.from).toISOString(),
          endUtc: new Date(dateRange.to).toISOString(),
          records: history.statistics.recordCount,
          directRecords: history.statistics.directRecordCount,
          estimatedRecords: history.statistics.estimatedRecordCount,
          simulatedRecords: history.statistics.simulatedRecordCount,
          availabilityPercent: history.statistics.availabilityPercent.average,
          averageLatencyMs: history.statistics.latencyMs.average,
          averageDnsLookupMs: history.statistics.dnsLookupMs.average,
          averagePacketLossPct: history.statistics.packetLossPct.average,
          incidents: history.outages.length,
        },
      ]
    : [];
  const selectedPdfSummaries = summaryPdfQueue.filter(item => item.selected);
  const addCurrentSummaryToPdfQueue = () => {
    if (!trendSummary.data) return;
    const context: TrendSummaryExportContext = {
      endpointLabel: endpoint?.label ?? endpointId,
      from: dateRange.from,
      to: dateRange.to,
      summary: trendSummary.data,
    };
    const id = `${endpointId}:${dateRange.from}:${dateRange.to}:${trendSummary.data.generatedAt}`;
    setSummaryPdfQueue(current => current.some(item => item.id === id) ? current : [...current, { ...context, id, selected: true }]);
  };
  const reorderPdfQueue = (sourceId: string, targetId: string) => {
    setSummaryPdfQueue(current => reorderTrendSummaryQueue(current, sourceId, targetId));
    setDraggedSummaryId(null);
  };
  const movePdfQueueItem = (id: string, direction: "up" | "down") => {
    setSummaryPdfQueue(current => {
      const index = current.findIndex(item => item.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      return target < 0 || target >= current.length ? current : reorderTrendSummaryQueue(current, id, current[target].id);
    });
  };
  const periodLabel = (key: string) =>
    /^\d{4}-\d{2}$/.test(key)
      ? new Intl.DateTimeFormat("en", {
          month: "long",
          year: "numeric",
        }).format(new Date(`${key}-01T00:00:00.000Z`))
      : /^\d+$/.test(key)
        ? new Intl.DateTimeFormat("en", {
            month: "short",
            day: "numeric",
          }).format(Number(key) * 86_400_000)
        : key;
  const triageCurrent = dependencyTriageQuery.data?.snapshots.at(-1);

  if (endpointsQuery.isLoading)
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <Loader2 className="h-7 w-7 animate-spin text-slate-500" />
      </div>
    );
  if (endpointsQuery.isError)
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50 p-6">
        <div className="max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Monitoring data is unavailable
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            The dashboard could not load endpoint data. Refresh the page or
            check the local service logs.
          </p>
        </div>
      </div>
    );

  return (
    <DashboardLayout>
      <div className="min-h-full bg-[#F6F8FB] font-[Manrope] text-slate-900">
        <section className="overflow-hidden rounded-3xl bg-[#071B2D] px-6 py-7 text-white shadow-[0_20px_55px_rgba(7,27,45,0.24)] md:px-8">
          <div className="flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-200">
                <span className="h-2 w-2 rounded-full bg-cyan-300" />{" "}
                Endpoint-scoped observability
              </div>
              <h1 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">
                A calm, honest record of
                <br className="hidden md:block" /> your network health.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                Internet Time Machine preserves direct observations, marks
                simulations and estimates, and describes local endpoint
                incidents without overstating their scope.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ProvenanceBadge kind="direct" />
              <ProvenanceBadge kind="estimated" />
              <ProvenanceBadge kind="simulated" />
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 via-white to-amber-50 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-lg shadow-slate-200">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  Dependency triage ledger
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
                  Recorded remediation progress and remaining review paths
                </h2>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                  A source-backed record of production dependency audits and validated upgrade trials. It is not a live package scan and does not establish runtime exploitability.
                </p>
              </div>
            </div>
            {dependencyTriageQuery.data && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-slate-200 bg-white/80"
                  onClick={() => downloadDependencyTriageCsv(dependencyTriageQuery.data!)}
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Ledger CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg border-slate-200 bg-white/80"
                  onClick={() => void downloadDependencyTriagePdf(dependencyTriageQuery.data!)}
                >
                  <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                  Ledger PDF
                </Button>
                <DependencyStatusBadge status={dependencyTriageQuery.data.status} />
              </div>
            )}
          </div>

          {dependencyTriageQuery.isLoading ? (
            <div className="grid gap-4 p-5 md:grid-cols-4">
              {[0, 1, 2, 3].map(item => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
            </div>
          ) : dependencyTriageQuery.isError ? (
            <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
              <strong>Dependency-triage evidence is unavailable.</strong> The endpoint monitoring dashboard remains available; refresh to try loading the recorded audit ledger again.
            </div>
          ) : dependencyTriageQuery.data && triageCurrent ? (
            <div className="p-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricCard icon={ShieldCheck} label="Critical records" value={String(triageCurrent.critical)} detail="Recorded current production audit" tone="green" />
                <MetricCard icon={AlertTriangle} label="High records" value={String(triageCurrent.high)} detail="Transitive parent-package review paths" tone="amber" />
                <MetricCard icon={ArrowDown} label="Audit records reduced" value={`${dependencyTriageQuery.data.snapshots[0].total - triageCurrent.total}`} detail={`${dependencyTriageQuery.data.snapshots[0].total} baseline → ${triageCurrent.total} recorded current`} tone="green" />
                <MetricCard icon={Database} label="Direct affected packages" value={String(triageCurrent.directPackages)} detail={`${triageCurrent.transitivePackages} remaining transitive records`} tone="slate" />
              </div>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Historical audit evidence</p>
                      <h3 className="mt-1 text-lg font-extrabold tracking-tight">Severity records across remediation checkpoints</h3>
                    </div>
                    <span className="text-xs font-semibold text-slate-500">Recorded {dateTime(new Date(triageCurrent.recordedAt).getTime())}</span>
                  </div>
                  <div className="mt-5 h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={dependencyTriageQuery.data.snapshots} margin={{ left: -20, right: 8, top: 8, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="#E6EAF0" />
                        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #E2E8F0", boxShadow: "0 12px 28px rgba(15,23,42,.12)" }} />
                        <Bar dataKey="critical" name="Critical" stackId="severity" fill="#E11D48" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="high" name="High" stackId="severity" fill="#F59E0B" />
                        <Bar dataKey="moderate" name="Moderate" stackId="severity" fill="#38BDF8" />
                        <Bar dataKey="low" name="Low" stackId="severity" fill="#94A3B8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <aside className="rounded-2xl border border-amber-100 bg-amber-50/60 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800">
                    {dependencyTriageQuery.data.residualPaths.length ? "Recorded high review paths" : "Current recorded status"}
                  </p>
                  <div className="mt-4 space-y-4">
                    {dependencyTriageQuery.data.residualPaths.length ? dependencyTriageQuery.data.residualPaths.map(path => (
                      <div key={path.parent} className="rounded-xl border border-amber-100 bg-white/80 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-extrabold text-slate-900">{path.parent} {path.currentVersion}</p>
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold uppercase text-amber-800">{path.severity}</span>
                        </div>
                        <p className="mt-1 text-xs font-semibold text-slate-500">Transitive package: {path.packageName}</p>
                        <p className="mt-3 text-sm leading-5 text-slate-700">{path.nextAction}</p>
                      </div>
                    )) : (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm leading-5 text-emerald-900">
                        The latest recorded production audit has no critical, high, moderate, or low advisory records. The next validated aggregate refresh will preserve a dated checkpoint rather than replacing this evidence.
                      </div>
                    )}
                  </div>
                </aside>
              </div>

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                <strong className="text-slate-800">Interpretation boundary.</strong> {dependencyTriageQuery.data.interpretation} Source: {dependencyTriageQuery.data.source}. Refresh cadence: {dependencyTriageQuery.data.refreshCadence ?? "Recorded evidence only"}.
              </div>
            </div>
          ) : null}
        </section>

        <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
              <Network className="h-4 w-4 text-slate-400" /> Endpoint
            </div>
            <select
              value={endpointId}
              onChange={event => setEndpointId(event.target.value)}
              className="h-10 min-w-64 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold outline-none ring-offset-2 focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">Choose endpoint</option>
              {endpointsQuery.data?.map(item => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {(["24h", "7d", "30d", "custom"] as RangePreset[]).map(item => (
                <button
                  key={item}
                  onClick={() => setRange(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${range === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
                >
                  {item === "custom" ? "Custom" : item}
                </button>
              ))}
            </div>
            <Button
              onClick={() => measureNow.mutate({ endpointId })}
              disabled={measureNow.isPending || !endpoint?.active}
              className="rounded-xl bg-[#0B7E84] hover:bg-[#086B70]"
            >
              <Activity className="mr-2 h-4 w-4" />
              {measureNow.isPending ? "Measuring" : "Measure now"}
            </Button>
          </div>
        </div>
        {range === "custom" && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
            <span className="font-bold text-slate-600">Custom UTC range</span>
            <Input
              type="date"
              value={customFrom}
              onChange={event => setCustomFrom(event.target.value)}
              className="w-40"
            />
            <span className="text-slate-400">to</span>
            <Input
              type="date"
              value={customTo}
              onChange={event => setCustomTo(event.target.value)}
              className="w-40"
            />
          </div>
        )}

        {endpointId && historyQuery.isLoading ? (
          <div className="mt-6 grid min-h-80 place-items-center rounded-2xl border border-slate-200 bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
          </div>
        ) : historyQuery.isError ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center">
            <AlertTriangle className="mx-auto h-8 w-8 text-rose-600" />
            <h2 className="mt-3 text-lg font-bold text-rose-950">
              This history could not be loaded
            </h2>
            <p className="mt-2 text-sm text-rose-800">
              The endpoint profile remains available, but its historical records
              could not be retrieved. Try a different range or refresh.
            </p>
          </div>
        ) : !endpoint ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <Database className="mx-auto h-8 w-8 text-slate-400" />
            <h2 className="mt-4 text-lg font-bold">
              No endpoint profile selected
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Create a conservative endpoint profile to begin collecting local
              observations.
            </p>
          </div>
        ) : (
          <>
            {isDemo && (
              <div className="mt-6 flex gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
                <Database className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
                <p>
                  <strong>Demo data is active.</strong> Every record currently
                  shown is explicitly simulated for safe exploration. Create a
                  profile and enable its schedule to begin recording your own
                  direct observations.
                </p>
              </div>
            )}
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                icon={latest?.availability ? ShieldCheck : WifiOff}
                label="Current status"
                value={status}
                detail={
                  latest
                    ? `Last check ${dateTime(latest.timestamp)}`
                    : "No measurement yet"
                }
                provenance={provenanceOf("availability")}
                tone={statusTone}
              />
              <MetricCard
                icon={Gauge}
                label="Median latency"
                value={
                  history?.statistics.latencyMs.average === null ||
                  history?.statistics.latencyMs.average === undefined
                    ? "—"
                    : `${formatter.format(history.statistics.latencyMs.average)} ms`
                }
                detail={`${history?.statistics.latencyMs.directCount ?? 0} direct samples in range`}
                provenance={provenanceOf("latencyMs")}
                tone="slate"
              />
              <MetricCard
                icon={Signal}
                label="DNS lookup"
                value={
                  history?.statistics.dnsLookupMs.average === null ||
                  history?.statistics.dnsLookupMs.average === undefined
                    ? "—"
                    : `${formatter.format(history.statistics.dnsLookupMs.average)} ms`
                }
                detail="Direct timings when lookup succeeds"
                provenance={provenanceOf("dnsLookupMs")}
                tone="slate"
              />
              <MetricCard
                icon={AlertTriangle}
                label="Endpoint incidents"
                value={String(history?.outages.length ?? 0)}
                detail="Local observations only—not an internet-wide claim"
                provenance={isDemo ? "simulated" : undefined}
                tone={(history?.outages.length ?? 0) > 0 ? "amber" : "green"}
              />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                      Performance timeline
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                      Latency, DNS, and availability
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() =>
                        exportRows(
                          "internet-time-machine-history.json",
                          history?.measurements ?? [],
                          "json"
                        )
                      }
                    >
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      History JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() =>
                        exportRows(
                          "internet-time-machine-history.csv",
                          history?.measurements ?? [],
                          "csv"
                        )
                      }
                    >
                      <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                      History CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() =>
                        exportRows(
                          "internet-time-machine-summary.json",
                          summaryExport,
                          "json"
                        )
                      }
                    >
                      Summary JSON
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() =>
                        exportRows(
                          "internet-time-machine-summary.csv",
                          summaryExport,
                          "csv"
                        )
                      }
                    >
                      Summary CSV
                    </Button>
                  </div>
                </div>
                <div className="mt-6 h-72" data-testid="performance-timeline-chart">
                  {points.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={points}
                        margin={{ left: -15, right: 12, top: 12, bottom: 0 }}
                      >
                        <CartesianGrid vertical={false} stroke="#E6EAF0" />
                        <XAxis
                          dataKey="label"
                          minTickGap={48}
                          tick={{ fontSize: 11, fill: "#64748B" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#64748B" }}
                          axisLine={false}
                          tickLine={false}
                          unit="ms"
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 14,
                            border: "1px solid #E2E8F0",
                            boxShadow: "0 12px 28px rgba(15,23,42,.12)",
                          }}
                        />
                        <Legend
                          verticalAlign="top"
                          align="right"
                          wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="latency"
                          name="Latency"
                          stroke="#0B7E84"
                          strokeWidth={3}
                          dot={false}
                          connectNulls
                        />
                        <Line
                          type="monotone"
                          dataKey="dns"
                          name="DNS"
                          stroke="#F59E0B"
                          strokeWidth={2}
                          dot={false}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grid h-full place-items-center text-sm text-slate-500">
                      No measurements in this period.
                    </div>
                  )}
                </div>
                <div className="grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Packet loss</p>
                    <p className="mt-1 text-lg font-extrabold">
                      {history?.statistics.packetLossPct.average === null ||
                      history?.statistics.packetLossPct.average === undefined
                        ? "Unavailable"
                        : `${formatter.format(history.statistics.packetLossPct.average)}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Availability</p>
                    <p className="mt-1 text-lg font-extrabold">
                      {history?.statistics.availabilityPercent.average ===
                        null ||
                      history?.statistics.availabilityPercent.average ===
                        undefined
                        ? "—"
                        : `${formatter.format(history.statistics.availabilityPercent.average)}%`}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Records included</p>
                    <p className="mt-1 text-lg font-extrabold">
                      {history?.statistics.recordCount ?? 0}
                    </p>
                  </div>
                </div>
              </div>
              <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-extrabold">Measurement ledger</h2>
                </div>
                <div className="mt-5 space-y-5">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                      Active profile
                    </p>
                    <p className="mt-2 font-bold text-slate-800">
                      {endpoint.label}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-slate-500">
                      {endpoint.url}
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-700">
                      Monitoring cadence
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Every {endpoint.intervalMinutes} minutes; enforced
                      conservative minimum: 15 minutes.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-bold text-slate-700">
                      Optional speed tests
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {endpoint.speedTestOptIn
                        ? "Opted in, adapter required"
                        : "Disabled by default"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                    <p className="text-xs font-bold text-amber-900">
                      Interpretation boundary
                    </p>
                    <p className="mt-1 text-sm leading-5 text-amber-800">
                      An incident means this monitor could not reach this
                      endpoint. It is not evidence of an internet-wide outage.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Availability history
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                    Reachability over time
                  </h2>
                </div>
                <div className="text-sm text-slate-500">
                  {history?.statistics.directRecordCount ?? 0} direct ·{" "}
                  {history?.statistics.estimatedRecordCount ?? 0} estimated ·{" "}
                  {history?.statistics.simulatedRecordCount ?? 0} simulated
                </div>
              </div>
              <div className="mt-5 h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={points}
                    margin={{ left: -18, right: 12, top: 8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="availability"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop
                          offset="0%"
                          stopColor="#22C55E"
                          stopOpacity={0.35}
                        />
                        <stop
                          offset="100%"
                          stopColor="#22C55E"
                          stopOpacity={0.02}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#E6EAF0" />
                    <XAxis
                      dataKey="label"
                      minTickGap={48}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 50, 100]}
                      tick={{ fontSize: 11, fill: "#64748B" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip />
                    <Area
                      type="stepAfter"
                      dataKey="availability"
                      name="Availability"
                      stroke="#16A34A"
                      fill="url(#availability)"
                      strokeWidth={2.5}
                      connectNulls
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-cyan-100 bg-cyan-50/50 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-cyan-700">
                  Background collection
                </p>
                <h2 className="mt-1 text-lg font-extrabold tracking-tight text-slate-900">
                  {endpoint.scheduleTaskUid
                    ? "Rate-limited schedule enabled"
                    : "Ready to accumulate measurements"}
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-600">
                  {endpoint.scheduleTaskUid
                    ? `This endpoint is scheduled at the configured ${endpoint.intervalMinutes}-minute cadence.`
                    : "After deployment, enable an authenticated background schedule. It will use the profile’s conservative interval and remains independent of this dashboard being open."}
                </p>
                {enableSchedule.error && (
                  <p className="mt-2 text-sm text-rose-600">
                    {enableSchedule.error.message}
                  </p>
                )}
              </div>
              <Button
                className="rounded-xl bg-[#0B7E84] hover:bg-[#086B70]"
                disabled={
                  !endpoint.active ||
                  Boolean(endpoint.scheduleTaskUid) ||
                  enableSchedule.isPending
                }
                onClick={() =>
                  enableSchedule.mutate({ endpointId: endpoint.id })
                }
              >
                {endpoint.scheduleTaskUid
                  ? "Schedule enabled"
                  : enableSchedule.isPending
                    ? "Enabling"
                    : "Enable schedule"}
              </Button>
            </div>
            <section className="mt-6 overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
              <div className="flex flex-col gap-4 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
                      AI trend summary
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                      Explain the selected history carefully
                    </h2>
                    <p className="mt-1 max-w-2xl text-sm text-slate-600">
                      A user-triggered analysis of aggregate metrics, provenance
                      totals, and endpoint-local incident counts. Endpoint URLs
                      and raw error messages are not sent for this summary.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => {
                    setIsRefreshingSummary(Boolean(trendSummary.data));
                    trendSummary.mutate(
                      { endpointId, from: dateRange.from, to: dateRange.to },
                      { onSettled: () => setIsRefreshingSummary(false) }
                    );
                  }}
                  disabled={
                    trendSummary.isPending || !history?.statistics.recordCount
                  }
                  className="rounded-xl bg-indigo-600 hover:bg-indigo-700"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  {trendSummary.isPending
                    ? isRefreshingSummary
                      ? "Refreshing summary"
                      : "Analyzing trends"
                    : trendSummary.data
                      ? "Refresh summary"
                      : "Generate summary"}
                </Button>
              </div>
              {trendSummary.isPending && !trendSummary.data && (
                <div className="grid gap-3 p-5 md:grid-cols-3">
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                  <div className="h-20 animate-pulse rounded-xl bg-slate-100" />
                </div>
              )}
              {trendSummary.isPending && trendSummary.data && (
                <div className="border-y border-indigo-100 bg-indigo-50 px-5 py-3 text-sm text-indigo-900">
                  <strong>Refreshing summary.</strong> The previous analysis
                  remains visible until the updated summary replaces it.
                </div>
              )}
              {trendSummary.error && (
                <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  <strong>The AI summary is unavailable.</strong>{" "}
                  {trendSummary.error.message}
                </div>
              )}
              {trendSummary.data && (
                <div className="p-5">
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold tracking-tight text-slate-950">
                        {trendSummary.data.headline}
                      </h3>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                        {trendSummary.data.narrative}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {trendSummary.data.model} ·{" "}
                      {trendSummary.data.parserVersion}
                    </span>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() =>
                          downloadTrendSummaryMarkdown({
                            endpointLabel: endpoint?.label ?? endpointId,
                            from: dateRange.from,
                            to: dateRange.to,
                            summary: trendSummary.data,
                          })
                        }
                      >
                        <Download className="mr-1.5 h-3.5 w-3.5" />
                        Markdown
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={() => {
                          void downloadTrendSummaryPdf({
                            endpointLabel: endpoint?.label ?? endpointId,
                            from: dateRange.from,
                            to: dateRange.to,
                            summary: trendSummary.data,
                          });
                        }}
                      >
                        <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                        PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg"
                        onClick={addCurrentSummaryToPdfQueue}
                      >
                        Add to batch
                      </Button>
                    </div>
                  </div>
                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {trendSummary.data.highlights.map((highlight, index) => (
                      <div
                        key={`${highlight.finding}-${index}`}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                      >
                        {highlight.dataBoundary === "mixed" ? (
                          <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            Mixed provenance
                          </span>
                        ) : (
                          <ProvenanceBadge kind={highlight.dataBoundary} />
                        )}
                        <p className="mt-3 text-sm font-bold text-slate-900">
                          {highlight.finding}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-600">
                          {highlight.evidence}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                    <strong>Interpretation boundary.</strong>{" "}
                    {trendSummary.data.caveat}
                  </div>
                  {summaryPdfQueue.length > 0 && (
                    <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">
                            Session PDF queue
                          </p>
                          <p className="mt-1 text-sm text-indigo-950">
                            Drag a queue row to set PDF order, or use its move buttons. The queue stays only in this browser session.
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="rounded-lg bg-indigo-600 hover:bg-indigo-700"
                          disabled={!selectedPdfSummaries.length}
                          onClick={() => {
                            void downloadTrendSummaryBatchPdf(selectedPdfSummaries);
                          }}
                        >
                          <ArrowDownToLine className="mr-1.5 h-3.5 w-3.5" />
                          Batch PDF ({selectedPdfSummaries.length})
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-2">
                        {summaryPdfQueue.map((item, index) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={() => setDraggedSummaryId(item.id)}
                            onDragEnd={() => setDraggedSummaryId(null)}
                            onDragOver={event => event.preventDefault()}
                            onDrop={() => draggedSummaryId && reorderPdfQueue(draggedSummaryId, item.id)}
                            className={`flex items-start gap-2 rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-800 transition ${draggedSummaryId === item.id ? "opacity-50" : ""}`}
                          >
                            <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                            <input
                              type="checkbox"
                              aria-label={`Include ${item.endpointLabel} summary: ${item.summary.headline}`}
                              checked={item.selected}
                              onChange={() =>
                                setSummaryPdfQueue(current =>
                                  current.map(candidate =>
                                    candidate.id === item.id
                                      ? { ...candidate, selected: !candidate.selected }
                                      : candidate
                                  )
                                )
                              }
                            />
                            <span>
                              <strong>{item.endpointLabel}</strong> ·{" "}
                              {new Date(item.from).toLocaleDateString()}–
                              {new Date(item.to).toLocaleDateString()} ·{" "}
                              {item.summary.headline}
                            </span>
                            <span className="ml-auto flex shrink-0 gap-1">
                              <button type="button" className="rounded border border-slate-200 p-1 text-slate-500 disabled:opacity-40" aria-label={`Move ${item.summary.headline} up`} disabled={index === 0} onClick={() => movePdfQueueItem(item.id, "up")}><ArrowUp className="h-3.5 w-3.5" /></button>
                              <button type="button" className="rounded border border-slate-200 p-1 text-slate-500 disabled:opacity-40" aria-label={`Move ${item.summary.headline} down`} disabled={index === summaryPdfQueue.length - 1} onClick={() => movePdfQueueItem(item.id, "down")}><ArrowDown className="h-3.5 w-3.5" /></button>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Packet loss timeline
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                  Best-effort loss observations
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Values remain blank when no portable ICMP-capable adapter is
                  configured.
                </p>
                <div className="mt-4 h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={points}>
                      <CartesianGrid vertical={false} stroke="#E6EAF0" />
                      <XAxis
                        dataKey="label"
                        minTickGap={50}
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        unit="%"
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="loss"
                        name="Packet loss"
                        stroke="#F97316"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  Incident timeline
                </p>
                <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                  Consecutive local failures
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Bars represent endpoint-scoped events only.
                </p>
                <div className="mt-4 h-52">
                  {outageChartData.length ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={outageChartData}>
                        <CartesianGrid vertical={false} stroke="#E6EAF0" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10, fill: "#64748B" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          allowDecimals={false}
                          tick={{ fontSize: 10, fill: "#64748B" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip />
                        <Bar
                          dataKey="failures"
                          name="Consecutive failures"
                          fill="#F59E0B"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="grid h-full place-items-center rounded-xl bg-slate-50 text-sm text-slate-500">
                      No local endpoint incidents in this range.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Grouped statistics
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                    {summaryGranularity.charAt(0).toUpperCase() +
                      summaryGranularity.slice(1)}{" "}
                    measurement summary
                  </h2>
                </div>
                <div className="flex rounded-xl bg-slate-100 p-1">
                  {(
                    [
                      "daily",
                      "weekly",
                      "monthly",
                      "custom",
                    ] as SummaryGranularity[]
                  ).map(item => (
                    <button
                      key={item}
                      onClick={() => setSummaryGranularity(item)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${summaryGranularity === item ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Direct, estimated, and simulated records stay separate. Monthly
                groups use calendar months.
              </p>
              <div className="mt-5 overflow-x-auto">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="border-b border-slate-100 text-xs uppercase tracking-[0.1em] text-slate-400">
                    <tr>
                      <th className="pb-3 font-bold">Period</th>
                      <th className="pb-3 font-bold">Records</th>
                      <th className="pb-3 font-bold">Avg latency</th>
                      <th className="pb-3 font-bold">Availability</th>
                      <th className="pb-3 font-bold">Provenance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(currentGroups ?? [])
                      .slice(-6)
                      .reverse()
                      .map(group => (
                        <tr
                          key={group.key}
                          className="border-b border-slate-50"
                        >
                          <td className="py-3 font-semibold">
                            {periodLabel(group.key)}
                          </td>
                          <td className="py-3 text-slate-600">
                            {group.summary.recordCount}
                          </td>
                          <td className="py-3 text-slate-600">
                            {group.summary.latencyMs.average === null
                              ? "—"
                              : `${formatter.format(group.summary.latencyMs.average)} ms`}
                          </td>
                          <td className="py-3 text-slate-600">
                            {group.summary.availabilityPercent.average === null
                              ? "—"
                              : `${formatter.format(group.summary.availabilityPercent.average)}%`}
                          </td>
                          <td className="py-3 text-slate-600">
                            {group.summary.directRecordCount} direct ·{" "}
                            {group.summary.estimatedRecordCount} est. ·{" "}
                            {group.summary.simulatedRecordCount} demo
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Incident log
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                    Endpoint-scoped availability events
                  </h2>
                </div>
                <Clock3 className="h-5 w-5 text-slate-400" />
              </div>
              <div className="mt-5 overflow-x-auto">
                {history?.outages.length ? (
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead className="border-b border-slate-100 text-xs uppercase tracking-[0.1em] text-slate-400">
                      <tr>
                        <th className="pb-3 font-bold">Observed start</th>
                        <th className="pb-3 font-bold">Recovery</th>
                        <th className="pb-3 font-bold">Scope</th>
                        <th className="pb-3 font-bold">Interpretation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.outages.map(event => (
                        <tr key={event.id} className="border-b border-slate-50">
                          <td className="py-4 font-semibold">
                            {dateTime(event.startedAt)}
                          </td>
                          <td className="py-4 text-slate-600">
                            {event.resolvedAt
                              ? dateTime(event.resolvedAt)
                              : "Ongoing"}
                          </td>
                          <td className="py-4">
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700">
                              Endpoint-local
                            </span>
                          </td>
                          <td className="max-w-md py-4 text-slate-600">
                            {event.summary}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="rounded-xl bg-slate-50 p-6 text-sm text-slate-500">
                    No endpoint-scoped availability incidents were detected in
                    this range.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                Configuration
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight">
                Add a safe endpoint profile
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Profiles are validated before a rate-limited schedule can be
                enabled.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setFormOpen(!formOpen)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {formOpen ? "Close form" : "New profile"}
            </Button>
          </div>
          {formOpen && (
            <form
              className="mt-5 grid gap-3 border-t border-slate-100 pt-5 md:grid-cols-2"
              onSubmit={event => {
                event.preventDefault();
                createEndpoint.mutate({ ...profile, active: true });
              }}
            >
              <Input
                required
                placeholder="ID (e.g. office-gateway)"
                value={profile.id}
                onChange={event =>
                  setProfile({ ...profile, id: event.target.value })
                }
              />
              <Input
                required
                placeholder="Display name"
                value={profile.label}
                onChange={event =>
                  setProfile({ ...profile, label: event.target.value })
                }
              />
              <Input
                required
                type="url"
                placeholder="https://example.com"
                value={profile.url}
                onChange={event =>
                  setProfile({ ...profile, url: event.target.value })
                }
              />
              <select
                value={profile.intervalMinutes}
                onChange={event =>
                  setProfile({
                    ...profile,
                    intervalMinutes: Number(event.target.value),
                  })
                }
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value={15}>Every 15 minutes (minimum)</option>
                <option value={30}>Every 30 minutes</option>
                <option value={60}>Hourly</option>
                <option value={240}>Every 4 hours</option>
              </select>
              <label className="flex items-center gap-2 text-sm text-slate-600 md:col-span-2">
                <input
                  type="checkbox"
                  checked={profile.speedTestOptIn}
                  onChange={event =>
                    setProfile({
                      ...profile,
                      speedTestOptIn: event.target.checked,
                    })
                  }
                />{" "}
                Explicitly opt in to download/upload testing when a dedicated
                adapter is configured.
              </label>
              {createEndpoint.error && (
                <p className="text-sm text-rose-600 md:col-span-2">
                  {createEndpoint.error.message}
                </p>
              )}
              <div className="md:col-span-2">
                <Button
                  type="submit"
                  disabled={createEndpoint.isPending}
                  className="rounded-xl bg-[#0B7E84] hover:bg-[#086B70]"
                >
                  {createEndpoint.isPending ? "Saving" : "Save profile"}
                </Button>
              </div>
            </form>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
