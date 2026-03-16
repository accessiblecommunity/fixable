import { readFileSync } from "node:fs";
import { z } from "zod";
import { ProcessEntrySchema, SectionEntrySchema, Wcag2DetailSchema, Wcag2MapSchema, Wcag3ListSchema } from "./schemas";

export const loadJsonFile = (filePath: string): unknown => {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to load ${filePath}: ${message}`);
  }
};

export const loadProcesses = (processPath: string) => {
  const entries = z
    .array(ProcessEntrySchema)
    .parse(loadJsonFile(processPath));
  return new Map(entries.map((entryItem) => [entryItem.id, entryItem]));
};

export const loadSections = (sectionsPath: string) => {
  const entries = z
    .array(SectionEntrySchema)
    .parse(loadJsonFile(sectionsPath));
  return new Map(entries.map((entryItem) => [entryItem.id, entryItem]));
};

export const loadWcag2Details = (wcag2DetailsPath: string) =>
  z
    .record(z.string(), Wcag2DetailSchema)
    .parse(loadJsonFile(wcag2DetailsPath));

export const loadWcag2Map = (wcag2Path: string) =>
  Wcag2MapSchema.parse(loadJsonFile(wcag2Path));

export const loadWcag3List = (wcag3Path: string) =>
  Wcag3ListSchema.parse(loadJsonFile(wcag3Path));
