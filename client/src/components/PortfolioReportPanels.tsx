/*
 * ============================================================
 * FILE: PortfolioReportPanels.tsx
 * PURPOSE: Renders dependency-audit and portfolio-report panels, controls, downloads, and status feedback.
 * ============================================================
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, BellRing, CheckCircle2, Clock3, Loader2, ShieldCheck, WifiOff } from "lucide-react";
import { useMemo, useState } from "react";

type ArchiveFilter = "all" | "attention" | "clear";

const displayDate = (value: Date | string) => new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
}).format(new Date(value));

function StatusPill({ status }: { status: "healthy" | "degraded" | "unavailable" }) {
  const styles = {
    healthy: "border-emerald-200 bg-emerald-50 text-emerald-800",
    degraded: "border-amber-200 bg-amber-50 text-amber-800",
    unavailable: "border-rose-200 bg-rose-50 text-rose-800",
  };
  const labels = { healthy: "Healthy", degraded: "Retry-only", unavailable: "Unavailable" };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-extrabold ${styles[status]}`}>{labels[status]}</span>;
}

export default function PortfolioReportPanels() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<ArchiveFilter>("all");
  const archiveQuery = trpc.monitoring.portfolioReportArchive.useQuery();
  const adminHistory = trpc.monitoring.adminPortfolioRunHistory.useQuery(undefined, {
    enabled: user?.role === "admin",
  });
  const visibleReports = useMemo(() => (archiveQuery.data?.reports ?? []).filter(report => {
    if (filter === "attention") return report.degradedCount > 0 || report.unavailableCount > 0;
    if (filter === "clear") return report.degradedCount === 0 && report.unavailableCount === 0;
    return true;
  }), [archiveQuery.data?.reports, filter]);
  const unavailable = archiveQuery.data?.latestUnavailable ?? [];
  const latest = archiveQuery.data?.reports[0];

  return (
    <div className="mt-6 space-y-6">
      <section aria-label="Portfolio availability alerts" className={`rounded-2xl border p-5 shadow-sm ${unavailable.length ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50/70"}`}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${unavailable.length ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}>
              {unavailable.length ? <BellRing className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Portfolio availability alerts</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
                {unavailable.length ? `${unavailable.length} confirmed link${unavailable.length === 1 ? "" : "s"} unavailable in the latest run` : latest ? "No confirmed unavailable links in the latest run" : "Awaiting the first archived weekly report"}
              </h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
                {latest ? `Recorded ${displayDate(latest.recordedAt)}. Retry-only successes remain degraded observations, not unavailable alerts.` : "Alerts appear after the scheduled 25-link validation writes its first privacy-safe archive record."}
              </p>
            </div>
          </div>
          {latest && <div className="text-sm font-bold text-slate-700">{latest.checkedLinkCount} links checked</div>}
        </div>
        {unavailable.length > 0 && (
          <ul className="mt-4 grid gap-2 md:grid-cols-2" aria-label="Unavailable portfolio links">
            {unavailable.map(result => <li key={result.id} className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-white/80 px-3 py-2 text-sm">
              <span className="min-w-0 truncate font-bold text-slate-900">{result.application}</span>
              <StatusPill status="unavailable" />
            </li>)}
          </ul>
        )}
      </section>

      <section aria-labelledby="weekly-report-archive-title" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><Clock3 className="h-5 w-5" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Read-only evidence</p>
              <h2 id="weekly-report-archive-title" className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Weekly portfolio report archive</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">Historical summaries retain status counts and timings only. They never include response bodies, credentials, package audit output, or source code.</p>
            </div>
          </div>
          <div className="flex rounded-xl bg-slate-200/70 p-1" aria-label="Report archive filter">
            {(["all", "attention", "clear"] as ArchiveFilter[]).map(item => <button key={item} onClick={() => setFilter(item)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${filter === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-600"}`}>{item === "all" ? "All" : item === "attention" ? "Needs attention" : "Clear"}</button>)}
          </div>
        </div>
        {archiveQuery.isLoading ? <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading archived reports…</div>
          : archiveQuery.isError ? <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><strong>Weekly report archive is unavailable.</strong> The endpoint dashboard remains available; refresh to try again.</div>
          : visibleReports.length ? <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-[0.1em] text-slate-500"><tr><th className="px-5 py-3">Recorded</th><th className="px-4 py-3">Healthy</th><th className="px-4 py-3">Retry-only</th><th className="px-4 py-3">Unavailable</th><th className="px-4 py-3">Mean response</th><th className="px-5 py-3">Coverage</th></tr></thead><tbody>{visibleReports.map(report => <tr key={report.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4 font-semibold text-slate-900">{displayDate(report.recordedAt)}</td><td className="px-4 py-4 text-emerald-700">{report.healthyCount}</td><td className="px-4 py-4 text-amber-700">{report.degradedCount}</td><td className="px-4 py-4 text-rose-700">{report.unavailableCount}</td><td className="px-4 py-4 text-slate-700">{report.meanResponseMs === null ? "—" : `${report.meanResponseMs} ms`}</td><td className="px-5 py-4 text-slate-700">{report.checkedLinkCount}/25</td></tr>)}</tbody></table></div>
          : <div className="flex items-start gap-3 p-6 text-sm text-slate-600"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />No archived reports match this filter. The first scheduled run will add a read-only summary after it completes.</div>}
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-3 text-xs leading-5 text-slate-500">{archiveQuery.data?.interpretation ?? "Each archived status is an external observation, not a real-time availability guarantee."}</div>
      </section>

      {user?.role === "admin" && <section aria-labelledby="admin-audit-history-title" className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm">
        <div className="flex gap-3 border-b border-indigo-100 bg-indigo-50/70 px-5 py-5"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-700 text-white"><ShieldCheck className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Administrator only</p><h2 id="admin-audit-history-title" className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">Audit-run history</h2><p className="mt-1 text-sm leading-6 text-slate-600">Restricted operational evidence for previous scheduled validation runs. Source text and counts are retained; response bodies and credentials are not.</p></div></div>
        {adminHistory.isLoading ? <div className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading audit-run history…</div>
          : adminHistory.isError ? <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><strong>Admin audit history is unavailable.</strong> Your administrator access remains required to retry this view.</div>
          : adminHistory.data?.length ? <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="border-b border-slate-100 text-xs uppercase tracking-[0.1em] text-slate-500"><tr><th className="px-5 py-3">Run</th><th className="px-4 py-3">Results</th><th className="px-4 py-3">Latency</th><th className="px-4 py-3">Evidence note</th></tr></thead><tbody>{adminHistory.data.map(run => <tr key={run.id} className="border-b border-slate-100 last:border-0"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{displayDate(run.recordedAt)}</p><p className="mt-1 text-xs text-slate-500">Archived {displayDate(run.createdAt)}</p></td><td className="px-4 py-4"><div className="flex flex-wrap gap-1.5"><StatusPill status="healthy" /><span className="text-xs text-slate-600">{run.healthyCount}</span><StatusPill status="degraded" /><span className="text-xs text-slate-600">{run.degradedCount}</span><StatusPill status="unavailable" /><span className="text-xs text-slate-600">{run.unavailableCount}</span></div></td><td className="px-4 py-4 text-slate-700">Median {run.medianResponseMs === null ? "—" : `${run.medianResponseMs} ms`}<br /><span className="text-xs text-slate-500">Slowest {run.slowestResponseMs === null ? "—" : `${run.slowestResponseMs} ms`}</span></td><td className="max-w-md px-4 py-4 text-slate-600">{run.note}</td></tr>)}</tbody></table></div>
          : <div className="flex items-start gap-3 p-6 text-sm text-slate-600"><WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />No audit runs have been archived yet. The scheduled workflow will create the first record after its next successful validation.</div>}
      </section>}
    </div>
  );
}
