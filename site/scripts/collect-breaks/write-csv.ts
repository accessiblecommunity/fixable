import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FlattenedBreak, SingleReportOptions } from "scripts/lib/types";

// Escape a value for inclusion in a CSV field (RFC 4180).
export const escapeCsvField = (value: unknown): string => {
  if (value == null) return "";
  const str = Array.isArray(value) ? value.join(";\n") : String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const csvColumns: { header: string; key: keyof FlattenedBreak }[] = [
  { header: "UID", key: "uid" },
  { header: "ID", key: "id" },
  { header: "Source File", key: "sourceFile" },
  { header: "Page (Location)", key: "pageLocation" },
  { header: "Process", key: "process" },
  { header: "Process Title", key: "processTitle" },
  { header: "Process Discussion Items", key: "processDiscussionItems" },
  { header: "Route", key: "route" },
  { header: "Section Path", key: "sectionPath" },
  { header: "Section Description", key: "sectionDescription" },
  { header: "Section Discussion Items", key: "sectionDiscussionItems" },
  { header: "WCAG 2 SC", key: "wcag2" },
  { header: "WCAG 2 Title", key: "wcag2Title" },
  { header: "WCAG 2 Level", key: "wcag2Level" },
  { header: "WCAG 2 Since Version", key: "wcag2SinceVersion" },
  { header: "WCAG 3", key: "wcag3" },
  { header: "Description", key: "description" },
  { header: "Discussion Items", key: "discussionItems" },
  { header: "Covered", key: "covered" },
];


export const writeCsvReport = async ({
  flattenedBreaks,
  filename,
  outputPath,
  logger,
}: SingleReportOptions): Promise<void> => {
  const headerRow = csvColumns.map((column) => column.header).join(",");
  const rows = flattenedBreaks.map((breakItem) =>
    csvColumns.map((column) => escapeCsvField(breakItem[column.key])).join(","),
  );

  const csv = [headerRow, ...rows].join("\n");
  const outPath = join(outputPath, `${filename}.csv`);
  await writeFile(outPath, csv, "utf8");
  logger.info(`Wrote ${flattenedBreaks.length} rows to ${outPath}`);
};