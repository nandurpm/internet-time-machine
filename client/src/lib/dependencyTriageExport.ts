import type { DependencyTriageLedger } from "@shared/dependencyTriage";

export type DependencyTriageExportData = DependencyTriageLedger;

function csvCell(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRow(values: Array<string | number>) {
  return values.map(csvCell).join(",");
}

export function dependencyTriageCsv(data: DependencyTriageExportData) {
  const rows: string[] = [
    csvRow(["Internet Time Machine dependency triage ledger"]),
    csvRow(["Data boundary", "Recorded dependency-audit evidence; not a real-time scan and not proof of runtime exploitability."]),
    csvRow(["Recorded at", data.recordedAt]),
    csvRow(["Source", data.source]),
    "",
    csvRow(["Section", "Label", "Recorded at", "Total", "Critical", "High", "Moderate", "Low", "Direct packages", "Transitive packages", "Note"]),
    ...data.snapshots.map(snapshot => csvRow([
      "Audit snapshot",
      snapshot.label,
      snapshot.recordedAt,
      snapshot.total,
      snapshot.critical,
      snapshot.high,
      snapshot.moderate,
      snapshot.low,
      snapshot.directPackages,
      snapshot.transitivePackages,
      snapshot.note,
    ])),
    "",
    csvRow(["Section", "Package", "Severity", "Parent", "Current version", "Migration state", "Next action"]),
    ...data.residualPaths.map(path => csvRow([
      "Residual path",
      path.packageName,
      path.severity,
      path.parent,
      path.currentVersion,
      path.migrationState,
      path.nextAction,
    ])),
    "",
    csvRow(["Interpretation", data.interpretation]),
  ];
  return `${rows.join("\n")}\n`;
}

export function dependencyTriagePdfText(data: DependencyTriageExportData) {
  const snapshots = data.snapshots
    .map(snapshot => `${snapshot.label}: ${snapshot.total} total (${snapshot.critical} critical, ${snapshot.high} high, ${snapshot.moderate} moderate, ${snapshot.low} low); ${snapshot.note}`)
    .join("\n");
  const residualPaths = data.residualPaths
    .map(path => `${path.parent} ${path.currentVersion} → ${path.packageName} (${path.severity}, ${path.migrationState})\nNext action: ${path.nextAction}`)
    .join("\n\n");

  return `Internet Time Machine dependency triage ledger

DATA BOUNDARY
This export contains recorded production dependency-audit evidence. It is not a real-time package scan and does not establish runtime reachability or exploitability.

RECORDED AT
${data.recordedAt}

SOURCE
${data.source}

HISTORICAL AUDIT SNAPSHOTS
${snapshots}

RESIDUAL HIGH-SEVERITY PARENT PATHS
${residualPaths}

INTERPRETATION BOUNDARY
${data.interpretation}
`;
}

export function dependencyTriageFilename(extension: "csv" | "pdf") {
  return `internet-time-machine-dependency-triage-ledger.${extension}`;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadDependencyTriageCsv(data: DependencyTriageExportData) {
  downloadBlob(
    dependencyTriageFilename("csv"),
    new Blob([dependencyTriageCsv(data)], { type: "text/csv;charset=utf-8" }),
  );
}

export async function downloadDependencyTriagePdf(data: DependencyTriageExportData) {
  const { jsPDF } = await import("jspdf");
  const document = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 46;
  const lineHeight = 15;
  const pageHeight = document.internal.pageSize.getHeight();
  const lines = document.splitTextToSize(
    dependencyTriagePdfText(data),
    document.internal.pageSize.getWidth() - margin * 2,
  );
  let y = margin;
  for (const line of lines) {
    if (y > pageHeight - margin) {
      document.addPage();
      y = margin;
    }
    document.text(line, margin, y);
    y += lineHeight;
  }
  document.save(dependencyTriageFilename("pdf"));
}
