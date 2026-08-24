export type ExportableTrendSummary = {
  headline: string;
  narrative: string;
  highlights: Array<{
    finding: string;
    evidence: string;
    dataBoundary: "direct" | "estimated" | "simulated" | "mixed";
  }>;
  caveat: string;
  generatedAt: number;
  model: string;
  parserVersion: string;
};

export type TrendSummaryExportContext = {
  endpointLabel: string;
  from: number;
  to: number;
  summary: ExportableTrendSummary;
};

export function trendSummaryMarkdown({ endpointLabel, from, to, summary }: TrendSummaryExportContext) {
  const generatedAt = new Date(summary.generatedAt).toISOString();
  const selectedWindow = `${new Date(from).toISOString()} to ${new Date(to).toISOString()}`;
  const highlights = summary.highlights
    .map((highlight, index) => `${index + 1}. **${highlight.finding}**  
   _Evidence:_ ${highlight.evidence}  
   _Data boundary:_ ${highlight.dataBoundary}`)
    .join("\n\n");

  return `# Internet Time Machine trend summary

## Scope and provenance

- **Endpoint label:** ${endpointLabel}
- **Selected UTC window:** ${selectedWindow}
- **Generated at:** ${generatedAt}
- **Model:** ${summary.model}
- **Parser version:** ${summary.parserVersion}
- **Scope:** Endpoint-local observations only. This report does not establish broader internet conditions or root cause.

## ${summary.headline}

${summary.narrative}

## Highlights

${highlights}

## Interpretation boundary

${summary.caveat}
`;
}

export function trendSummaryFilename(endpointLabel: string, extension: "md" | "pdf") {
  const slug = endpointLabel
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "endpoint";
  return `internet-time-machine-trend-summary-${slug}.${extension}`;
}

export function trendSummaryBatchFilename(count: number) {
  return `internet-time-machine-trend-summaries-${Math.max(1, count)}.pdf`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadTrendSummaryMarkdown(context: TrendSummaryExportContext) {
  downloadBlob(
    trendSummaryFilename(context.endpointLabel, "md"),
    new Blob([trendSummaryMarkdown(context)], { type: "text/markdown;charset=utf-8" })
  );
}

export async function downloadTrendSummaryPdf(context: TrendSummaryExportContext) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 46;
  const lineHeight = 15;
  const pageHeight = document.internal.pageSize.getHeight();
  const lines = document.splitTextToSize(trendSummaryMarkdown(context), document.internal.pageSize.getWidth() - margin * 2);
  let y = margin;
  for (const line of lines) {
    if (y > pageHeight - margin) {
      document.addPage();
      y = margin;
    }
    document.text(line, margin, y);
    y += lineHeight;
  }
  document.save(trendSummaryFilename(context.endpointLabel, "pdf"));
}

export async function downloadTrendSummaryBatchPdf(contexts: TrendSummaryExportContext[]) {
  if (!contexts.length) return;
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 46;
  const lineHeight = 15;
  const pageHeight = document.internal.pageSize.getHeight();
  const pageWidth = document.internal.pageSize.getWidth();
  contexts.forEach((context, index) => {
    if (index) document.addPage();
    const lines = document.splitTextToSize(`Batch summary ${index + 1} of ${contexts.length}\n\n${trendSummaryMarkdown(context)}`, pageWidth - margin * 2);
    let y = margin;
    for (const line of lines) {
      if (y > pageHeight - margin) {
        document.addPage();
        y = margin;
      }
      document.text(line, margin, y);
      y += lineHeight;
    }
  });
  document.save(trendSummaryBatchFilename(contexts.length));
}
