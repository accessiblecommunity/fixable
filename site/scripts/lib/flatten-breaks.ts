import type { RawBreak } from "@/lib/scan-breaks";
import { addWcagDetails } from "./add-wcag-details";
import { getFixableLogger } from "./common-logger";
import type { ProcessEntry } from "./schemas";
import type {
  FlattenBreaksData,
  FlattenBreaksOptions,
  FlattenedBreak,
} from "./types";
import { shortHash, toArray } from "./utilities";

function getProcessInfo(
  breakItem: RawBreak,
  processes: Map<string, ProcessEntry>,
) {
  // process can be a string or an array of strings, so normalize to an array
  const processIds = toArray(breakItem.data.process);
  const processEntries = processIds
    .map((id) => processes.get(id))
    .filter(Boolean) as {
    id: string;
    title: string;
    discussionItems?: string[];
  }[];
  const processTitle = processEntries
    .map((processItem) => processItem.title)
    .join(";\n");
  const processDiscussionItems = processEntries.flatMap(
    (processItem) => processItem.discussionItems ?? [],
  );
  return { processTitle, processDiscussionItems };
}

const emptyWcag2Detail = {
  wcag2Title: "",
  wcag2Level: "",
  wcag2SinceVersion: "",
};

export const flattenBreaks = (
  breaks: RawBreak[],
  data: FlattenBreaksData,
  options: FlattenBreaksOptions = {},
): FlattenedBreak[] => {
  const { expandRequirements = false } = options;
  const { processes, sections, wcag2Details } = data;

  const result: FlattenedBreak[] = [];

  for (const breakItem of breaks) {
    const { processTitle, processDiscussionItems } = getProcessInfo(
      breakItem,
      processes,
    );

    const section = sections.get(breakItem.data.location);
    if (!section) {
      const logger = getFixableLogger();
      logger.warn(
        `No section found for location "${breakItem.data.location}" in break "${breakItem.id}"`,
      );
    }

    const base = {
      id: breakItem.id,
      sourceFile: breakItem.filePath,
      pageLocation: breakItem.data.location,
      process: breakItem.data.process,
      processTitle,
      processDiscussionItems,
      route: breakItem.data.href,
      sectionPath: section?.path ?? "",
      sectionDescription: section?.description ?? "",
      sectionDiscussionItems: section?.discussionItems ?? [],
      description: breakItem.data.description,
      discussionItems: breakItem.data.discussionItems,
    };

    if (expandRequirements) {
      addWcagDetails(breakItem, result, base, emptyWcag2Detail, wcag2Details);
    } else {
      result.push({
        uid: shortHash(breakItem.id),
        ...base,
        ...emptyWcag2Detail,
        wcag2: breakItem.data.wcag2,
        wcag3: breakItem.data.wcag3,
        covered: true,
      });
    }
  }

  return result;
};
