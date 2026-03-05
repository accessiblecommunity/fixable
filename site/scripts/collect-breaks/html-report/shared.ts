import { render } from "preact";
import type { FlattenedBreak } from "scripts/lib/types";
import { toArray } from "scripts/lib/utilities";

export const groupBreaksByKey = (
  breaks: FlattenedBreak[],
  keyFn: (breakItem: FlattenedBreak) => string,
): Map<string, FlattenedBreak[]> => {
  const map = new Map<string, FlattenedBreak[]>();
  for (const breakItem of breaks) {
    const key = keyFn(breakItem);
    let list = map.get(key);
    if (!list) {
      list = [];
      map.set(key, list);
    }
    list.push(breakItem);
  }
  return map;
};

export const escapeHtml = (text: unknown): string => {
  const str = text == null ? "" : String(text);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
};

export const renderSectionHeading = (title: string, sectionId: string): string => {
  return (
    `<h2><button type="button" class="toggle-btn" aria-expanded="true" aria-controls="${sectionId}" aria-label="Toggle ${title}">▾</button>${title}</h2>` +
    `<div class="process-body" id="${sectionId}">`
  );
};

export const renderProcessDiscussion = (
  items: string | string[],
  label = "Discussion items",
): string => {
  return renderDiscussion(items, label, true);
}

export const renderBreakDiscussion = (
  items: string | string[],
  label = "Discussion items",
): string => {
  return renderDiscussion(items, label);
};

export const renderDiscussion = (
  items: string | string[],
  label = "Discussion items",
  isProcessDiscussion = false,
): string => {
  const list = toArray(items).filter(Boolean);
  if (list.length === 0) return "";
  const tag = isProcessDiscussion ? "h3" : "h6";
  return (
    `<${tag} class="discussion-label">${escapeHtml(label)}:</${tag}>` +
    `<div class="discussion"><ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>`
  );
};


export const renderBreakItems = (
  descriptions: unknown,
  discussionItems: string | string[],
): string => {
  const descs = Array.isArray(descriptions) ? descriptions : [descriptions];
  let html = "<ul>";
  for (const item of descs) {
    html += `<li class="break-item">${escapeHtml(item)}</li>`;
  }
  html += "</ul>";
  html += renderBreakDiscussion(discussionItems);
  return html;
};