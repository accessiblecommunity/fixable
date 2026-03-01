/**
 * Extracts all documented breaks from the codebase and writes them to CSV or JSON.
 *
 * "Breaks" are intentional accessibility failures documented inline in the source.
 * This mirrors the logic in content.config.ts's custom break-loader,
 * but runs standalone via `npx tsx scripts/extract-breaks/extract-breaks.ts`.
 *
 * Usage:
 *   npx tsx scripts/extract-breaks/extract-breaks.ts              # CSV (default)
 *   npx tsx scripts/extract-breaks/extract-breaks.ts --format json # JSON output
 *
 * Output: reports/breaks-export.csv or reports/breaks-export.json
 */

import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import fg from "fast-glob";
import processesData from "../../src/content/processes.json" with {
	type: "json",
};
import wcag2Data from "../../src/lib/wcag2.json" with { type: "json" };
import {
	logHelper,
	parseFormatArg,
	sortScNumerically,
	toArray,
} from "../script-utils.js";
import type { FlatBreak, RawBreak } from "./breaks-types.js";
import { saveBreaks } from "./save-breaks.js";

// --- YAML-like parser for @break comments ---
// The break comments use a subset of YAML (scalar values, lists, and `|` literal
// blocks). We parse just enough to extract the fields we need — no dependency
// on a full YAML library.

export function parseBreakYaml(yaml: string): RawBreak {
	const result: Record<string, unknown> = {};
	const lines = yaml.split("\n");
	let currentKey = "";
	let currentList: string[] | null = null;
	let isLiteralBlock = false; // true when key uses `|` (join lines into one string)

	const saveCurrentKey = () => {
		if (currentList && currentKey) {
			if (isLiteralBlock) {
				// `|` block: join all lines into a single string
				result[currentKey] = currentList.join(" ").trim();
			} else {
				result[currentKey] =
					currentList.length === 1 ? currentList[0] : currentList;
			}
		}
	};

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		// Check for list item under current key
		const listMatch = trimmed.match(/^-\s+(.*)/);
		if (listMatch && currentKey && currentList && !isLiteralBlock) {
			currentList.push(listMatch[1].trim());
			continue;
		}

		// Check for key: value
		const kvMatch = trimmed.match(/^(\w+):\s*(.*)/);
		if (kvMatch) {
			saveCurrentKey();

			currentKey = kvMatch[1];
			const value = kvMatch[2].trim();

			if (value === "|") {
				// Literal block scalar — join subsequent lines into one string
				currentList = [];
				isLiteralBlock = true;
			} else if (value === "") {
				// Upcoming list
				currentList = [];
				isLiteralBlock = false;
			} else {
				currentList = null;
				isLiteralBlock = false;
				// Handle quoted strings
				const unquoted = value.replace(/^["'](.*)["']$/, "$1");
				result[currentKey] = unquoted;
			}
			continue;
		}

		// Continuation of a multiline value or list
		if (currentList) {
			if (isLiteralBlock) {
				currentList.push(trimmed);
			} else {
				const itemMatch = trimmed.match(/^-\s+(.*)/);
				if (itemMatch) {
					currentList.push(itemMatch[1].trim());
				} else {
					currentList.push(trimmed);
				}
			}
		}
	}

	saveCurrentKey();
	return result as RawBreak;
}

// --- Markdown frontmatter parser ---

export function parseFrontmatter(content: string): Record<string, unknown> {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
	if (!match) return {};

	const yaml = match[1];
	const result: Record<string, unknown> = {};
	const lines = yaml.split("\n");

	let currentKey = "";
	let currentList: unknown[] | null = null;
	let inBreaks = false;
	let currentBreak: Record<string, unknown> | null = null;
	let breaks: Record<string, unknown>[] = [];
	let breakKey = "";
	let breakList: string[] | null = null;

	for (const line of lines) {
		const trimmed = line.trimEnd();

		// Top-level key (no indentation)
		if (/^\S/.test(trimmed) && trimmed.includes(":")) {
			// Save previous state
			if (inBreaks && currentBreak) {
				if (breakList && breakKey) {
					currentBreak[breakKey] =
						breakList.length === 1 ? breakList[0] : breakList;
				}
				breaks.push(currentBreak);
			}
			if (currentList && currentKey) {
				result[currentKey] =
					currentList.length === 1 ? currentList[0] : currentList;
			}

			const [key, ...rest] = trimmed.split(":");
			const value = rest.join(":").trim();
			currentKey = key.trim();

			if (currentKey === "breaks") {
				inBreaks = true;
				currentBreak = null;
				breakKey = "";
				breakList = null;
				breaks = [];
				currentList = null;
				continue;
			}

			inBreaks = false;

			if (value === "" || value === "|") {
				currentList = [];
			} else {
				currentList = null;
				result[currentKey] = value.replace(/^["'](.*)["']$/, "$1");
			}
			continue;
		}

		if (inBreaks) {
			// Break list items start with "  - " at 2-space indent
			const breakItemMatch = trimmed.match(/^  - (\w+):\s*(.*)/);
			if (breakItemMatch) {
				// Save previous break
				if (currentBreak) {
					if (breakList && breakKey) {
						currentBreak[breakKey] =
							breakList.length === 1 ? breakList[0] : breakList;
					}
					breaks.push(currentBreak);
				}
				currentBreak = {};
				breakKey = breakItemMatch[1];
				const val = breakItemMatch[2].trim();
				if (val === "" || val === "|") {
					breakList = [];
				} else {
					breakList = null;
					currentBreak[breakKey] = val.replace(/^["'](.*)["']$/, "$1");
				}
				continue;
			}

			// Continuation key within a break (4+ space indent)
			const contKeyMatch = trimmed.match(/^    (\w+):\s*(.*)/);
			if (contKeyMatch && currentBreak) {
				if (breakList && breakKey) {
					currentBreak[breakKey] =
						breakList.length === 1 ? breakList[0] : breakList;
				}
				breakKey = contKeyMatch[1];
				const val = contKeyMatch[2].trim();
				if (val === "" || val === "|") {
					breakList = [];
				} else {
					breakList = null;
					currentBreak[breakKey] = val.replace(/^["'](.*)["']$/, "$1");
				}
				continue;
			}

			// List item within a break key (6+ space indent with -)
			const subListMatch = trimmed.match(/^      - (.*)/);
			if (subListMatch && breakList) {
				breakList.push(subListMatch[1].trim());
				continue;
			}

			continue;
		}

		// Regular list item or continuation
		const listItemMatch = trimmed.match(/^\s+-\s+(.*)/);
		if (listItemMatch && currentList) {
			currentList.push(listItemMatch[1].trim());
		}
	}

	// Save final state
	if (inBreaks && currentBreak) {
		if (breakList && breakKey) {
			currentBreak[breakKey] =
				breakList.length === 1 ? breakList[0] : breakList;
		}
		breaks.push(currentBreak);
	}
	if (breaks.length > 0) result.breaks = breaks;
	if (currentList && currentKey && !inBreaks) {
		result[currentKey] =
			currentList.length === 1 ? currentList[0] : currentList;
	}

	return result;
}

// --- Href resolution helpers ---
// These map source file paths to the routes they produce on the built site,
// so each break record can include a link to the relevant page.

const processMap = new Map(processesData.map((p) => [p.id, p.title]));

export const resolvePageHref = (path: string): string | undefined =>
	path.startsWith("pages/museum/") && !/\[.*\]/.test(path)
		? path
				.replace(/^pages\/museum/, "")
				.replace(/(?:\/index)?\.astro$/, "/#main")
		: undefined;

export const resolveContentHref = (path: string): string | undefined => {
	if (/\bblog\b/.test(path)) return `/blog/${basename(path)}/#main`;
	if (/\bexhibit-categories\b/.test(path))
		return `/collections/${basename(path)}/#main`;
	if (/\bexhibits\b/.test(path))
		return `/collections/${path.replace(/.*\bexhibits\//, "")}/#main`;
	if (/\bproducts\b/.test(path))
		return `/gift-shop/${path.replace(/.*\bproducts\//, "")}/#main`;
	return undefined;
};

export function resolveHref(
	breakHref: string | undefined,
	defaultHref: string | undefined,
): string {
	if (!breakHref && !defaultHref) return "";
	if (!breakHref) return defaultHref || "";

	// Hash-only override: combine with default path
	if (defaultHref && (breakHref === "" || breakHref.startsWith("#"))) {
		return `${defaultHref.replace(/#.*$/, "")}${breakHref}`;
	}

	return breakHref;
}

// --- Break flattening ---

/**
 * Flatten a single parsed break into one or more output rows.
 *
 * A break may reference multiple WCAG 2 SCs and/or multiple processes.
 * We produce one row per (process × SC) combination so that every SC gets
 * its own line in the output. Rows after the first for the same break are
 * marked `duplicate: true` so consumers can de-duplicate if needed.
 */
export function flattenRawBreak(
	raw: RawBreak,
	path: string,
	fileLocation: string | undefined,
	fileProcess: string[] | undefined,
	fileHref: string | undefined,
): FlatBreak[] {
	const location = raw.location || fileLocation || "";
	const processes = toArray(raw.process).length
		? toArray(raw.process)
		: fileProcess || [""];
	const href = resolveHref(raw.href, fileHref);
	const descriptions = toArray(raw.description);
	const wcag2List = toArray(raw.wcag2);
	const wcag3List = toArray(raw.wcag3);
	const discussionItems = toArray(
		raw.discussionItems as unknown as string | string[] | undefined,
	);

	const descText = descriptions.join(" ").trim();
	const wcag3Text = wcag3List.join("; ");
	const discussionText = discussionItems.join(" | ");
	// One row per WCAG 2 SC (or one row if no SC listed)
	const scEntries = wcag2List.length > 0 ? wcag2List : [""];

	const rows: FlatBreak[] = [];

	for (const proc of processes) {
		const processTitle = proc === "ALL" ? "ALL" : processMap.get(proc) || proc;

		let isFirst = true;
		for (const sc of scEntries) {
			rows.push({
				id: "", // assigned after sorting
				sourceFile: path,
				location,
				process: processTitle,
				route: href,
				wcag2: sc,
				wcag2Title: sc
					? (wcag2Data as Record<string, string>)[sc] || "Unknown"
					: "",
				wcag3: wcag3Text,
				description: descText,
				discussionItems: discussionText,
				duplicate: !isFirst,
			});
			isFirst = false;
		}
	}

	return rows;
}

// --- Per-file break extraction ---

/**
 * Extract breaks from an Astro component file.
 *
 * Looks for `@breaklocation`, `@breakprocess`, `@breakhref` (file-level defaults)
 * and `@break` JSDoc-style comments containing YAML break definitions.
 */
export function extractBreaksFromAstro(path: string, content: string): FlatBreak[] {
	const locationMatch = /\/\*[\s*]*@breaklocation([\s\S]*?)\*\//.exec(content);
	const fileLocation = locationMatch?.[1].trim() || undefined;

	const processMatch = /\/\*[\s*]*@breakprocess([\s\S]*?)\*\//.exec(content);
	const fileProcess = processMatch?.[1].trim().split(/\s*,\s*/) || undefined;

	const hrefMatch = /\/\*[\s*]*@breakhref([\s\S]*?)\*\//.exec(content);
	const fileHref = hrefMatch?.[1].trim() || resolvePageHref(path);

	const breaks: FlatBreak[] = [];
	const breakRegex = /\/\*[\s*]*@break\b([\s\S]*?)\*\//g;
	let match = breakRegex.exec(content);
	while (match !== null) {
		const yaml = match[1].replace(/^\s+\* /gm, "");
		const raw = parseBreakYaml(yaml);
		breaks.push(
			...flattenRawBreak(raw, path, fileLocation, fileProcess, fileHref),
		);
		match = breakRegex.exec(content);
	}

	return breaks;
}

/**
 * Extract breaks from a Markdown content file.
 *
 * Reads `breaklocation`, `breakprocess`, `breakhref`, and `breaks` array
 * from the YAML frontmatter.
 */
export function extractBreaksFromMarkdown(path: string, content: string): FlatBreak[] {
	const fm = parseFrontmatter(content);
	if (!fm.breaks || !Array.isArray(fm.breaks)) return [];

	const fileLocation = (fm.breaklocation as string) || undefined;
	const fileProcess = fm.breakprocess
		? String(fm.breakprocess).split(/\s*,\s*/)
		: undefined;
	const fileHref = (fm.breakhref as string) || resolveContentHref(path);

	const breaks: FlatBreak[] = [];
	for (const raw of fm.breaks as RawBreak[]) {
		breaks.push(
			...flattenRawBreak(raw, path, fileLocation, fileProcess, fileHref),
		);
	}
	return breaks;
}

// --- Scanning and orchestration ---

/** Scan the src/ directory for all .astro and .md source files. */
async function scanSourceFiles(): Promise<string[]> {
	return fg(["**/*.astro", "content/**/[^_]*.md"], { cwd: "src" });
}

/** Walk every source file and collect all break rows. */
async function extractAllBreaks(): Promise<FlatBreak[]> {
	const paths = await scanSourceFiles();
	const allBreaks: FlatBreak[] = [];

	for (const path of paths) {
		const content = await readFile(join("src", path), "utf8");

		if (path.endsWith(".astro")) {
			allBreaks.push(...extractBreaksFromAstro(path, content));
		} else {
			allBreaks.push(...extractBreaksFromMarkdown(path, content));
		}
	}

	return allBreaks;
}

/** Sort breaks by WCAG 2 SC (numerically) then location, and assign sequential IDs. */
export function assignIds(breaks: FlatBreak[]): void {
	breaks.sort((a, b) => {
		const scA = a.wcag2 || "99";
		const scB = b.wcag2 || "99";
		return sortScNumerically(scA, scB) || a.location.localeCompare(b.location);
	});

	for (let i = 0; i < breaks.length; i++) {
		breaks[i].id = `ISSUE-${String(i + 1).padStart(5, "0")}`;
	}
}

function printSummary(breaks: FlatBreak[]): void {
	const bySC = new Map<string, number>();
	for (const b of breaks) {
		if (b.wcag2) bySC.set(b.wcag2, (bySC.get(b.wcag2) || 0) + 1);
	}

	const sorted = [...bySC.entries()].sort((a, b) =>
		sortScNumerically(a[0], b[0]),
	);

	logHelper.summary(
		"Breakdown by WCAG 2 SC:",
		sorted.map(
			([sc, count]) =>
				`${sc} ${(wcag2Data as Record<string, string>)[sc] || "Unknown"}: ${count}`,
		),
	);

	const dupeCount = breaks.filter((b) => b.duplicate).length;
	if (dupeCount > 0) {
		logHelper.info(
			`\n${dupeCount} duplicate rows (breaks with multiple WCAG 2 SCs)`,
		);
	}
}

// --- Main ---

async function main() {
	const format = parseFormatArg();
	const breaks = await extractAllBreaks();
	assignIds(breaks);
	await saveBreaks(breaks, format);
	printSummary(breaks);
}

main().catch(console.error);
