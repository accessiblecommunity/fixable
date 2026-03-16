import { defineCollection, reference, z } from "astro:content";
import { file, glob } from "astro/loaders";
import type { ZodType, ZodTypeDef } from "astro/zod";

import { scanBreaks } from "./lib/scan-breaks";
import wcag2SuccessCriteria from "./lib/wcag2.json";
import wcag3Values from "./lib/wcag3.json";

/** Fields in common between our schemas that use Astro's image() */
const baseImageSchema = z.object({
  title: z.string().min(1),
  imageDescription: z.string().min(1),
  imagePosition: z.string().optional(),
  skipAlt: z.boolean().optional(),
});

/** Returns a union of the given schema with a non-empty array containing the same type. */
const singleOrArray = <O, D extends ZodTypeDef, I>(schema: ZodType<O, D, I>) =>
  schema.or(z.array(schema).nonempty());

/** Transforms a singleOrArray schema to always return an array for easier processing. */
const transformToArray = <T>(value: T | [T, ...T[]]): [T, ...T[]] =>
  Array.isArray(value) ? value : [value];

/** Like transformToArray, but for use specifically with .optional() schemas. */
const transformToOptionalArray = <T>(
  value: T | [T, ...T[]] | undefined,
): [T, ...T[]] | undefined =>
  typeof value === "undefined" || Array.isArray(value) ? value : [value];

export const collections = {
  breakProcesses: defineCollection({
    loader: file("src/content/processes.json"),
    schema: z.object({
      title: z.string(),
      discussionItems: z.array(z.string()).nonempty().optional(),
      id: z.string(),
    }),
  }),

  breakSections: defineCollection({
    loader: file("src/content/sections.json"),
    schema: z.object({
      description: z.string().optional(),
      discussionItems: z.array(z.string()).nonempty().optional(),
      id: z.string(),
      // Allow empty path for Home but otherwise require trailing slash
      path: z
        .string()
        .regex(/^$|\/$/, "Non-empty path should end with a slash"),
    }),
  }),

  breaks: defineCollection({
    loader: {
      name: "break-loader",
      load: async ({ generateDigest, parseData, store, watcher }) => {
        async function scan() {
          try {
            const breaks = await scanBreaks("src");
            store.clear();
            for (const raw of breaks) {
              const data = await parseData({ id: raw.id, data: raw.data });
              store.set({
                id: raw.id,
                data,
                digest: generateDigest(JSON.stringify(raw.data)),
                filePath: raw.filePath,
              });
            }
          } catch (error) {
            console.error("break-loader: scan failed", error);
          }
        }
        scan();

        if (!watcher) return;

        // Set up a future scan on file changes (debounced in case of multiple consecutive)
        let scanTimeout: ReturnType<typeof setTimeout> | null = null;
        const scheduleScan = () => {
          if (scanTimeout) clearTimeout(scanTimeout);
          scanTimeout = setTimeout(scan, 250);
        };
        watcher.on("change", scheduleScan);
        watcher.on("add", scheduleScan);
        watcher.on("unlink", scheduleScan);
      },
    },
    // Note: This schema needs to be defined at user level, not loader level,
    // in order for typings for references and transforms to work
    schema: z
      .object({
        description: singleOrArray(z.string()).transform(transformToArray),
        discussionItems: z.array(z.string()).nonempty().optional(),
        href: z.string().regex(/^(\/|#|$)/),
        location: reference("breakSections"),
        photosensitivity: z.boolean().optional(),
        process:
          // Using z.string rather than reference makes working with values easier;
          // zod does not correctly short-circuit at z.literal("ALL"),
          // and reference no longer guarantees integrity in Astro 5
          singleOrArray(z.string()).transform(transformToArray),
        wcag2: singleOrArray(
          z.enum(
            Object.keys(wcag2SuccessCriteria) as [
              keyof typeof wcag2SuccessCriteria,
            ],
          ),
        )
          .optional()
          .transform(transformToOptionalArray),
        // TypeScript + Vite manage to recognize object keys from wcag2.json,
        // but wcag3.json only comes across as a generic string array,
        // so validate using a refinement instead
        wcag3: singleOrArray(
          z
            .string()
            .refine(
              (value) => wcag3Values.includes(value),
              "Unrecognized WCAG 3 provision shortname",
            ),
        )
          .optional()
          .transform(transformToOptionalArray),
      })
      .refine((value) => value.wcag2 || value.wcag3, {
        message: "One or both of wcag2 and/or wcag3 must be set.",
      }),
  }),

  blog: defineCollection({
    loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/blog" }),
    schema: ({ image }) =>
      baseImageSchema.extend({
        brokenUrl: z.boolean().default(false),
        category: z.union([z.literal("Events"), z.literal("In the News")]),
        date: z.date().or(z.literal("now")),
        image: image(),
        video: z.string().optional(),
        videoCover: z.string().optional(),
      }),
  }),

  exhibits: defineCollection({
    loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/exhibits" }),
    schema: ({ image }) =>
      baseImageSchema.extend({
        image: image(),
      }),
  }),

  "exhibit-categories": defineCollection({
    loader: glob({
      pattern: "**/[^_]*.md",
      base: "./src/content/exhibit-categories",
    }),
    schema: z.object({
      dangerous: z.boolean().default(false),
      topDescription: z.string().optional(),
      topImageItem: reference("exhibits").optional(),
      title: z.string().min(1),
    }),
  }),

  products: defineCollection({
    loader: glob({ pattern: "**/[^_]*.md", base: "./src/content/products" }),
    schema: ({ image }) =>
      baseImageSchema.extend({
        image: image(),
        price: z.number().positive(),
      }),
  }),
};
