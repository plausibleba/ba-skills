import type { ValidationReport, Finding } from "@vcc/shared";

export function formatFinding(f: Finding): string {
  const icon = f.severity === "Error" ? "x" : "!";
  const path = f.path ? ` @ ${f.path}` : "";
  return `  [${icon}] ${f.ruleId} ${f.code}: ${f.message}${path}`;
}

export function formatFindings(findings: Finding[]): string {
  return findings.map(formatFinding).join("\n");
}

export function formatSummary(report: ValidationReport): string {
  const icon = report.status === "Valid" ? "OK" : report.status === "ValidWithWarnings" ? "OK" : "FAIL";
  const parts = [`${icon} ${report.status}`];
  if (report.summary.errorCount > 0) {
    parts.push(`${report.summary.errorCount} error(s)`);
  }
  if (report.summary.warningCount > 0) {
    parts.push(`${report.summary.warningCount} warning(s)`);
  }
  return parts.join(" — ");
}
