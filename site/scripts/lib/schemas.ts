import { z } from "zod";

export const ProcessEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  discussionItems: z.array(z.string()).optional(),
});

export const SectionEntrySchema = z.object({
  id: z.string(),
  path: z.string(),
  description: z.string().optional(),
  discussionItems: z.array(z.string()).optional(),
});

export const Wcag2DetailSchema = z.object({
  title: z.string(),
  level: z.string(),
  sinceVersion: z.string(),
});

export const Wcag2MapSchema = z.record(z.string(), z.string());

export const Wcag3ListSchema = z.array(z.string());


export const CollectBreaksConfigSchema = z.object({
  inputPath: z.string().optional(),
  outputPath: z.string().optional(),
  filename: z.string().optional(),
  verbose: z.boolean().optional(),
  formats: z.object({
    csv: z.boolean().optional(),
    json: z.boolean().optional(),
    html: z.boolean().optional(),
  }).optional(),
  expand: z.boolean().optional(),
  includeUncovered: z.boolean().optional(),
  group: z.enum(["byWcag", "byPath"]).optional(),
  dataPaths: z.object({
    processes: z.string().optional(),
    sections: z.string().optional(),
    wcag2Details: z.string().optional(),
    wcag2: z.string().optional(),
    wcag3: z.string().optional(),
  }).optional(),
});

export type SectionEntry = z.infer<typeof SectionEntrySchema>;
export type ProcessEntry = z.infer<typeof ProcessEntrySchema>;
export type Wcag2Detail = z.infer<typeof Wcag2DetailSchema>;
export type CollectBreaksConfig = z.infer<typeof CollectBreaksConfigSchema>;

