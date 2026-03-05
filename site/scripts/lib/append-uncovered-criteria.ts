import type { AppendUncoveredData, FlattenedBreak } from "./types";
import { shortHash, toArray } from "./utilities";

const emptyUncoveredBase = {
  id: "",
  sourceFile: "",
  pageLocation: "no page",
  process: "",
  processTitle: "",
  processDiscussionItems: "",
  route: "",
  sectionPath: "",
  sectionDescription: "",
  sectionDiscussionItems: "",
  description: "",
  discussionItems: "",
  covered: false,
};

export const appendUncoveredCriteria = (
  flattenedBreaks: FlattenedBreak[],
  data: AppendUncoveredData,
): FlattenedBreak[] => {
  const { wcag2Details, wcag2Map, wcag3List } = data;

  // Collect all covered WCAG 2 SCs and WCAG 3 outcomes from existing breaks
  const coveredWcag2 = new Set<string>();
  const coveredWcag3 = new Set<string>();

  for (const breakItem of flattenedBreaks) {
    // wcag2 and wcag3 may be either a string or an array of strings.
    // Use toArray to normalize them to arrays for iteration.
    for (const successCriteria of toArray(breakItem.wcag2)) {
      if (successCriteria) coveredWcag2.add(successCriteria);
    }
    for (const outcome of toArray(breakItem.wcag3)) {
      if (outcome) coveredWcag3.add(outcome);
    }
  }

  const uncovered: FlattenedBreak[] = [];

  // Uncovered WCAG 2 SCs
  for (const successCriteriaItem of Object.keys(wcag2Map)) {
    if (coveredWcag2.has(successCriteriaItem)) continue;
    const detail = wcag2Details[successCriteriaItem];
    uncovered.push({
      uid: shortHash("uncovered", "wcag2", successCriteriaItem),
      ...emptyUncoveredBase,
      wcag2: successCriteriaItem,
      wcag2Title: detail?.title ?? wcag2Map[successCriteriaItem] ?? "",
      wcag2Level: detail?.level ?? "",
      wcag2SinceVersion: detail?.sinceVersion ?? "",
      wcag3: "",
    });
  }

  // Uncovered WCAG 3 outcomes
  for (const wcag3Item of wcag3List) {
    if (coveredWcag3.has(wcag3Item)) continue;
    uncovered.push({
      uid: shortHash("uncovered", "wcag3", wcag3Item),
      ...emptyUncoveredBase,
      wcag2: "",
      wcag2Title: "",
      wcag2Level: "",
      wcag2SinceVersion: "",
      wcag3: wcag3Item,
    });
  }

  return [...flattenedBreaks, ...uncovered];
};
