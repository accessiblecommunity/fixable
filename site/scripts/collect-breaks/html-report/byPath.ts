import type { FlattenedBreak, ProcessGroup } from "scripts/lib/types";
import { toArray } from "scripts/lib/utilities";
import { escapeHtml, groupBreaksByKey, renderBreakItems, renderProcessDiscussion, renderSectionHeading } from "./shared";

const formatWcag2Ref = (sc: string, title: string): string => {
  const escaped = escapeHtml(sc);
  return title ? `${escaped} - ${escapeHtml(title)}` : escaped;
};

const renderBreaksList = (breaks: FlattenedBreak[]): string => {
  const byCriteria = new Map<string, FlattenedBreak[]>();
  for (const breakItem of breaks) {
    const wcag2Refs = toArray(breakItem.wcag2).filter(Boolean);
    const wcag3Refs = toArray(breakItem.wcag3).filter(Boolean);
    const label =
      [
        ...wcag2Refs.map((sc) => formatWcag2Ref(sc, breakItem.wcag2Title)),
        ...wcag3Refs.map(escapeHtml),
      ].join(", ") || "(No criteria)";

    let list = byCriteria.get(label);
    if (!list) {
      list = [];
      byCriteria.set(label, list);
    }
    list.push(breakItem);
  }

  let html = "";
  for (const [label, breaks] of byCriteria) {
    html += `<div class="break-group"><h5>${label}</h5>`;
    for (const breakItem of breaks) {
      html += renderBreakItems(breakItem.description, breakItem.discussionItems);
    }
    html += "</div>";
  }
  return html;
};

export const renderByPath = (groups: ProcessGroup[]): string => {
  let html = "";
  let sectionIdCounter = 0;
  for (const group of groups) {
    html += renderSectionHeading(escapeHtml(group.processTitle),`bypath-${sectionIdCounter++}` );
    html += renderProcessDiscussion(
      group.processDiscussionItems,
      "Process discussion items",
    );

    const byPath = groupBreaksByKey(
      group.breaks,
      (breakItem) => breakItem.sectionPath || breakItem.route || "(No path)",
    );

    for (const [path, breaks] of byPath) {
      html += `<h3>${escapeHtml(path)}</h3>`;

      const wcag2Breaks = breaks.filter((breakItem) => toArray(breakItem.wcag2).some(Boolean));
      const wcag3Breaks = breaks.filter((breakItem) => toArray(breakItem.wcag3).some(Boolean));

      if (wcag2Breaks.length > 0) {
        html += '<section data-wcag-version="2">';
        html += "<h4>WCAG 2</h4>";
        html += renderBreaksList(wcag2Breaks);
        html += "</section>";
      }
      if (wcag3Breaks.length > 0) {
        html += '<section data-wcag-version="3">';
        html += "<h4>WCAG 3</h4>";
        html += renderBreaksList(wcag3Breaks);
        html += "</section>";
      }
    }
    html += "</div>";
  }
  return html;
};