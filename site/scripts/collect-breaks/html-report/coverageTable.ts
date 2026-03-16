// --- Coverage table ---

import type { FlattenedBreak } from "scripts/lib/types";
import { toArray } from "scripts/lib/utilities";
import { escapeHtml } from "./shared";

const renderWcag2Table = (caption: string, items: string[], wcag2Titles: Map<string, string>) => {
    if (items.length === 0) return "";
    let table = `<h3>${escapeHtml(caption)}</h3>`;
    table +=
      "<table><thead><tr><th>Success Criterion</th><th>Title</th></tr></thead><tbody>";
    for (const sc of items) {
      table += `<tr><td>${escapeHtml(sc)}</td><td>${escapeHtml(wcag2Titles.get(sc) ?? "")}</td></tr>`;
    }
    table += "</tbody></table>";
    return table;
  };

  const renderWcag3Table = (caption: string, items: string[]) => {
    if (items.length === 0) return "";
    let table = `<h3>${escapeHtml(caption)}</h3>`;
    table += "<table><thead><tr><th>Outcome</th></tr></thead><tbody>";
    for (const item of items) {
      table += `<tr><td>${escapeHtml(item)}</td></tr>`;
    }
    table += "</tbody></table>";
    return table;
  };

export const renderCoverageTable = (breaks: FlattenedBreak[]): string => {
  const coveredWcag2 = new Set<string>();
  const uncoveredWcag2 = new Set<string>();
  const coveredWcag3 = new Set<string>();
  const uncoveredWcag3 = new Set<string>();

  const wcag2Titles = new Map<string, string>();

  for (const breakItem of breaks) {
    for (const sc of toArray(breakItem.wcag2).filter(Boolean)) {
      if (breakItem.covered) {
        coveredWcag2.add(sc);
      } else {
        uncoveredWcag2.add(sc);
      }
      if (breakItem.wcag2Title) wcag2Titles.set(sc, breakItem.wcag2Title);
    }
    for (const outcome of toArray(breakItem.wcag3).filter(Boolean)) {
      if (breakItem.covered) {
        coveredWcag3.add(outcome);
      } else {
        uncoveredWcag3.add(outcome);
      }
    }
  }

  // A criterion can appear in both covered and uncovered breaks (e.g. covered
  // by one process but listed as uncovered by another). If it's covered anywhere,
  // remove it from the uncovered set so it isn't double-reported.
  for (const sc of coveredWcag2) uncoveredWcag2.delete(sc);
  for (const outcome of coveredWcag3) uncoveredWcag3.delete(outcome);

  const numericSort = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true });

  let html = "";

  html += renderWcag2Table(
    "Covered WCAG 2 Success Criteria",
    [...coveredWcag2].sort(numericSort),
    wcag2Titles
  );
  html += renderWcag2Table(
    "Uncovered WCAG 2 Success Criteria",
    [...uncoveredWcag2].sort(numericSort),
    wcag2Titles
  );
  html += renderWcag3Table("Covered WCAG 3 Outcomes", [...coveredWcag3].sort());
  html += renderWcag3Table(
    "Uncovered WCAG 3 Outcomes",
    [...uncoveredWcag3].sort(),
  );

  return html;
};