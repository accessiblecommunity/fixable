import type { RawBreak } from "@/lib/scan-breaks";
import type { Wcag2Detail } from "./schemas";
import type { BaseBreakInfo, FlattenedBreak } from "./types";
import { shortHash, toArray } from "./utilities";

export const addWcagDetails = (
  breakItem: RawBreak,
  result: FlattenedBreak[],
  base: BaseBreakInfo,
  emptyWcag2Detail: {
    wcag2Title: string;
    wcag2Level: string;
    wcag2SinceVersion: string;
  },
  wcag2Details: Record<string, Wcag2Detail>,
) => {
  const wcag2Items = toArray(breakItem.data.wcag2);
  const wcag3Items = toArray(breakItem.data.wcag3);

  if (wcag2Items.length === 0 && wcag3Items.length === 0) {
    result.push({
      uid: shortHash(breakItem.id),
      ...base,
      wcag2: "",
      ...emptyWcag2Detail,
      wcag3: "",
      covered: true,
    });
  }

  for (const wcag2 of wcag2Items) {
    const detail = wcag2Details[wcag2];
    result.push({
      uid: shortHash(breakItem.id, "wcag2", wcag2),
      ...base,
      wcag2,
      wcag2Title: detail?.title ?? "",
      wcag2Level: detail?.level ?? "",
      wcag2SinceVersion: detail?.sinceVersion ?? "",
      wcag3: "",
      covered: true,
    });
  }
  for (const wcag3 of wcag3Items) {
    result.push({
      uid: shortHash(breakItem.id, "wcag3", wcag3),
      ...base,
      wcag2: "",
      ...emptyWcag2Detail,
      wcag3,
      covered: true,
    });
  }
};
