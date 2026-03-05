import type { FlattenedBreak, ProcessGroup } from "scripts/lib/types";
import { toArray } from "scripts/lib/utilities";
import { escapeHtml, groupBreaksByKey, renderBreakItems, renderProcessDiscussion, renderSectionHeading } from "./shared";

const renderByWcagBreaks = (breaks: FlattenedBreak[]): string => {
  const byPath = groupBreaksByKey(
    breaks,
    (breakItem) => breakItem.sectionPath || breakItem.route || "(No path)",
  );

  let html = "";
  for (const [path, pathBreaks] of byPath) {
    html += `<div class="break-group"><h5>${escapeHtml(path)}</h5>`;
    for (const breakItem of pathBreaks) {
      html += renderBreakItems(breakItem.description, breakItem.discussionItems);
    }
    html += "</div>";
  }
  return html;
};

export const renderByWcag = (groups: ProcessGroup[]): string => {
  let html = "";
  let sectionIdCounter = 0;
  for (const group of groups) {
    html += renderSectionHeading(escapeHtml(group.processTitle), `bywcag-${sectionIdCounter++}`);
    html += renderProcessDiscussion(
      group.processDiscussionItems,
      "Process discussion items",
    );

    const wcag2Map = new Map<string, FlattenedBreak[]>();
    const wcag3Map = new Map<string, FlattenedBreak[]>();

    for (const breakItem of group.breaks) {
      for (const sc of toArray(breakItem.wcag2).filter(Boolean)) {
        let list = wcag2Map.get(sc);
        if (!list) {
          list = [];
          wcag2Map.set(sc, list);
        }
        list.push(breakItem);
      }
      for (const outcome of toArray(breakItem.wcag3).filter(Boolean)) {
        let list = wcag3Map.get(outcome);
        if (!list) {
          list = [];
          wcag3Map.set(outcome, list);
        }
        list.push(breakItem);
      }
    }

    if (wcag2Map.size > 0) {
      html += '<section data-wcag-version="2">';
      html += "<h3>WCAG 2</h3>";
      const sorted = [...wcag2Map.entries()].sort(([itemA], [itemB]) =>
        itemA.localeCompare(itemB, undefined, { numeric: true }),
      );
      for (const [sc, scBreaks] of sorted) {
        const title = scBreaks[0]?.wcag2Title;
        const label = title ? `${sc} - ${title}` : sc;
        html += `<h4>${escapeHtml(label)}</h4>`;
        html += renderByWcagBreaks(scBreaks);
      }
      html += "</section>";
    }

    if (wcag3Map.size > 0) {
      html += '<section data-wcag-version="3">';
      html += "<h3>WCAG 3</h3>";
      const sorted = [...wcag3Map.entries()].sort(([itemA], [itemB]) =>
        itemA.localeCompare(itemB),
      );
      for (const [outcome, outcomeBreaks] of sorted) {
        html += `<h4>${escapeHtml(outcome)}</h4>`;
        html += renderByWcagBreaks(outcomeBreaks);
      }
      html += "</section>";
    }
    html += "</div>";
  }
  return html;
};