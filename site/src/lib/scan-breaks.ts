import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { parseFrontmatter } from "@astrojs/markdown-remark";
import fg from "fast-glob";

import { regExpMatchGenerator } from "./util";

export interface RawBreak {
  id: string;
  filePath: string;
  data: {
    location: string;
    process: string;
    href: string;
    wcag2: string | string[];
    wcag3: string | string[];
    description: string;
    discussionItems: string;
  };
}

/** Attempts to resolve a museum page file's path to a default URL path. */
const resolvePageHref = (path: string) => {
  return path.startsWith("pages/museum/") && !/\[.*\]/.test(path)
    ? path
        .replace(/^pages\/museum/, "")
        .replace(/(?:\/index)?\.astro$/, "/#main")
    : undefined;
};

/** Attempts to resolve a content file's path to a default URL path. */
const resolveContentHref = (path: string) => {
  if (/\bblog\b/.test(path)) return `/blog/${basename(path)}/#main`;
  if (/\bexhibit-categories\b/.test(path))
    return `/collections/${basename(path)}/#main`;
  if (/\bexhibits\b/.test(path))
    return `/collections/${path.replace(/.*\bexhibits\//, "/#main")}`;
  if (/\bproducts\b/.test(path))
    return `/gift-shop/${path.replace(/.*\bproducts\//, "/#main")}`;
  return undefined;
};

// Allow individual hrefs to override hash while inheriting rest of default path
const applyHrefOverride = (
  data: Record<string, unknown>,
  defaultHref: string | undefined,
) => {
  if (
    defaultHref &&
    (data.href === "" ||
      (typeof data.href === "string" && data.href.startsWith("#")))
  )
    data.href = `${defaultHref.replace(/#.*$/, "")}${data.href}`;
};

// Extracts breaks from @break comment blocks in an Astro file.
function extractAstroBreaks(path: string, content: string): RawBreak[] {
  const breaks: RawBreak[] = [];

  const locationMatch = /\/\*[\s*]*@breaklocation([\s\S]*?)\*\//.exec(content);
  const location = locationMatch?.[1].trim() || undefined;

  const processMatch = /\/\*[\s*]*@breakprocess([\s\S]*?)\*\//.exec(content);
  const process = processMatch?.[1].trim().split(/\s*,\s*/) || undefined;

  const hrefMatch = /\/\*[\s*]*@breakhref([\s\S]*?)\*\//.exec(content);
  const href = hrefMatch?.[1].trim() || resolvePageHref(path);

  for (const match of regExpMatchGenerator(
    /\/\*[\s*]*@break\b([\s\S]*?)\*\//g,
    content,
  )) {
    const lineNumber = content.slice(0, match.index).split("\n").length;
    const id = `${path}-L${lineNumber}`;
    // Remove leading '* ' from multiline comment blocks
    const yaml = match[1].replace(/^\s+\* /gm, "");
    const { frontmatter } = parseFrontmatter(`---\n${yaml}\n---`);
    const data: Record<string, unknown> = {
      href,
      location,
      process,
      ...frontmatter,
    };
    applyHrefOverride(data, href);
    breaks.push({ id, data: data as RawBreak["data"], filePath: path });
  }

  return breaks;
}

// Extracts breaks from the frontmatter of a Markdown file.
function extractMarkdownBreaks(path: string, content: string): RawBreak[] {
  const { frontmatter } = parseFrontmatter(content);
  if (!frontmatter.breaks) return [];

  const breaks: RawBreak[] = [];

  for (let i = 0; i < frontmatter.breaks.length; i++) {
    const id = `${path}-E${i}`;
    const href = frontmatter.breakhref || resolveContentHref(path);
    const data: Record<string, unknown> = {
      location: frontmatter.breaklocation,
      process: frontmatter.breakprocess,
      href,
      ...frontmatter.breaks[i],
    };
    applyHrefOverride(data, href);
    breaks.push({ id, data: data as RawBreak["data"], filePath: path });
  }

  return breaks;
}

// Collect all breaks from Astro and Markdown source files in the given directory.
export async function scanBreaks(srcDir: string): Promise<RawBreak[]> {
  let paths: string[];
  const breaks: RawBreak[] = [];

  try {
    paths = await fg(["**/*.astro", "content/**/[^_]*.md"], {
      cwd: srcDir,
    });
  } catch (error) {
    console.error("scanBreaks: failed to glob source files", error);
    return breaks;
  }

  for (const path of paths) {
    try {
      const content = await readFile(join(srcDir, path), "utf8");
      const fileBreaks = path.endsWith(".astro")
        ? extractAstroBreaks(path, content)
        : extractMarkdownBreaks(path, content);
      breaks.push(...fileBreaks);
    } catch (error) {
      console.error(`scanBreaks: failed to process ${path}`, error);
    }
  }

  return breaks;
}
