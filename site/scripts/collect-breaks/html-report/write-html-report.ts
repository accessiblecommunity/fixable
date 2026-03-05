import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { FlattenedBreak, HtmlReportOptions, ProcessGroup } from "scripts/lib/types";
import { renderByPath } from "./byPath";
import { renderByWcag } from "./byWcag";
import { renderCoverageTable } from "./coverageTable";


const groupByProcess = (breaks: FlattenedBreak[]): ProcessGroup[] => {
  const map = new Map<string, ProcessGroup>();
  for (const breakItem of breaks) {
    if (!breakItem.covered) continue;
    const key = breakItem.processTitle || "Site Wide";
    let group = map.get(key);
    if (!group) {
      group = {
        processTitle: key,
        processDiscussionItems: breakItem.processDiscussionItems,
        breaks: [],
      };
      map.set(key, group);
    }
    group.breaks.push(breakItem);
  }
  return [...map.values()];
};

export const writeHtmlReport = async ({
  flattenedBreaks,
  filename,
  outputPath,
  groupBy,
  coverageTable,
  logger,
  templatePath,
}: HtmlReportOptions): Promise<void> => {
  let template: string;
  try {
    template = readFileSync(templatePath, "utf8");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load HTML template at ${templatePath}: ${message}`);
  }

  const title =
    groupBy === "byWcag"
      ? "Breaks Report - by WCAG Criteria"
      : "Breaks Report - by Path";

  const groups = groupByProcess(flattenedBreaks);

  const breaksContent =
    groupBy === "byWcag" ? renderByWcag(groups) : renderByPath(groups);

  const coverageContent = coverageTable
    ? renderCoverageTable(flattenedBreaks)
    : "";

  const html = template
    .replace(/\{\{title\}\}/g, title)
    .replace("{{breaksContent}}", breaksContent)
    .replace("{{coverageContent}}", coverageContent);

  const outPath = join(outputPath, `${filename}.html`);
  await writeFile(outPath, html, "utf8");
  logger.info(`Wrote HTML report to ${outPath}`);
};
