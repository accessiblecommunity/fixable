import type { Logger } from "pino";
import type { ProcessEntry, SectionEntry, Wcag2Detail } from "./schemas";


export interface FlattenBreaksData {
  processes: Map<string, ProcessEntry>;
  sections: Map<string, SectionEntry>;
  wcag2Details: Record<string, Wcag2Detail>;
}

export interface AppendUncoveredData {
  wcag2Details: Record<string, Wcag2Detail>;
  wcag2Map: Record<string, string>;
  wcag3List: string[];
}

export interface BaseBreakInfo {
  id: string;
  sourceFile: string;
  pageLocation: string;
  process: string | string[];
  processTitle: string;
  processDiscussionItems: string | string[];
  route: string;
  sectionPath: string;
  sectionDescription: string;
  sectionDiscussionItems: string | string[];
  description: string;
  discussionItems: string;
}

export interface FlattenedBreak extends BaseBreakInfo {
  uid: string;

  wcag2: string | string[];
  wcag2Title: string;
  wcag2Level: string;
  wcag2SinceVersion: string;
  wcag3: string | string[];

  covered: boolean;
}

export interface FlattenBreaksOptions {
  expandRequirements?: boolean;
}

export type GroupBy = "byWcag" | "byPath";

export interface BreaksReportOptions {
  flattenedBreaks: FlattenedBreak[];
  filename?: string;
  outputPath: string;
  jsonFormat?: boolean;
  csvFormat?: boolean;
  htmlFormat?: boolean;
  groupBy?: GroupBy;
  includeUncovered?: boolean;
  templatePath?: string;
}

export interface SingleReportOptions {
  flattenedBreaks: FlattenedBreak[];
  filename?: string;
  outputPath: string;
  logger: Logger;
}

export interface HtmlReportOptions {
  flattenedBreaks: FlattenedBreak[];
  filename: string;
  outputPath: string;
  groupBy: GroupBy;
  coverageTable: boolean;
  logger: Logger;
  templatePath: string;
}

export interface ProcessGroup {
  processTitle: string;
  processDiscussionItems: string | string[];
  breaks: FlattenedBreak[];
}
