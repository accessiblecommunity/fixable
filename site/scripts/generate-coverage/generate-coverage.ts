/**
 * Generates coverage reports showing which WCAG 2.2 and WCAG 3 items
 * are covered (and not covered) by the documented breaks.
 *
 * Output is pivot-table-friendly: one row per SC + page combination,
 * plus rows for uncovered SCs (with empty page fields).
 *
 * Outputs:
 *   reports/wcag2-coverage.csv or .json  — All WCAG 2 SCs with coverage detail
 *   reports/wcag3-coverage.csv or .json  — All WCAG 3 requirements with coverage detail
 *
 * Usage:
 *   npx tsx scripts/generate-coverage/generate-coverage.ts               # CSV (default)
 *   npx tsx scripts/generate-coverage/generate-coverage.ts --format json # JSON output
 *
 * Run extract-breaks first to ensure breaks-export.csv is up to date.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import wcag2Data from "../../src/lib/wcag2.json" with { type: "json" };
import wcag2Details from "../../src/lib/wcag2-details.json" with {
	type: "json",
};
import wcag3Data from "../../src/lib/wcag3.json" with { type: "json" };
import {
	escapeCsvField,
	logHelper,
	parseFormatArg,
	sortScNumerically,
} from "../script-utils.js";
import type { Wcag2DetailsMap, Wcag2Row, Wcag3Row } from "./coverage-types.js";

const REPORTS_DIR = "reports";

const ensureReportsDir = () => mkdir(REPORTS_DIR, { recursive: true });

// --- Types ---

/** Column indices into the parsed breaks CSV. */
export interface BreakColumns {
	location: number;
	route: number;
	wcag2: number;
	wcag3: number;
	desc: number;
}

/** A group of breaks sharing the same key (SC or requirement) + page. */
interface BreakGroup {
	location: string;
	route: string;
	descriptions: string[];
}

// --- CSV parsing ---

export const parseCsvLine = (line: string): string[] => {
	const fields: string[] = [];
	let current = "";
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (inQuotes) {
			if (ch === '"') {
				if (i + 1 < line.length && line[i + 1] === '"') {
					current += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				current += ch;
			}
		} else {
			if (ch === '"') {
				inQuotes = true;
			} else if (ch === ",") {
				fields.push(current);
				current = "";
			} else {
				current += ch;
			}
		}
	}
	fields.push(current);
	return fields;
};

export const parseCsv = (content: string): string[][] => {
	const lines = content.split("\n");
	const rows: string[][] = [];
	let pendingLine = "";

	for (const line of lines) {
		pendingLine = pendingLine ? `${pendingLine}\n${line}` : line;
		const quoteCount = (pendingLine.match(/"/g) || []).length;
		if (quoteCount % 2 === 0) {
			const trimmed = pendingLine.replace(/\r$/, "");
			if (trimmed) {
				rows.push(parseCsvLine(trimmed));
			}
			pendingLine = "";
		}
	}
	if (pendingLine.trim()) {
		rows.push(parseCsvLine(pendingLine.replace(/\r$/, "")));
	}
	return rows;
};

// --- Loading breaks data ---

/** Read and parse the breaks CSV export, returning rows and column indices. */
const loadBreaksData = async (): Promise<{
	rows: string[][];
	cols: BreakColumns;
}> => {
	const content = await readFile(join(REPORTS_DIR, "breaks-export.csv"), "utf8");
	const allRows = parseCsv(content);
	const header = allRows[0];

	return {
		rows: allRows.slice(1),
		cols: {
			location: header.indexOf("Page (Location)"),
			route: header.indexOf("Route"),
			wcag2: header.indexOf("WCAG 2 SC"),
			wcag3: header.indexOf("WCAG 3"),
			desc: header.indexOf("Description"),
		},
	};
};

// --- Grouping helpers ---

/**
 * Group break rows by a key field + page location.
 * Returns the groups map and the set of unique keys seen.
 */
export const groupBreaksByField = (
	rows: string[][],
	cols: BreakColumns,
	keyCol: number,
	splitSemicolons: boolean,
): { groups: Map<string, BreakGroup>; seen: Set<string> } => {
	const groups = new Map<string, BreakGroup>();
	const seen = new Set<string>();

	for (const row of rows) {
		const rawField = (row[keyCol] || "").trim();
		if (!rawField) continue;

		// WCAG 3 fields may contain semicolon-separated values
		const keys = splitSemicolons
			? rawField
					.split(";")
					.map((s) => s.trim())
					.filter(Boolean)
			: [rawField];

		for (const key of keys) {
			seen.add(key);
			const location = row[cols.location] || "";
			const groupKey = `${key}\0${location}`;

			if (!groups.has(groupKey)) {
				groups.set(groupKey, {
					location,
					route: row[cols.route] || "",
					descriptions: [],
				});
			}
			const desc = (row[cols.desc] || "").trim();
			const group = groups.get(groupKey);
			if (desc && group) group.descriptions.push(desc);
		}
	}

	return { groups, seen };
};

// --- WCAG 2 coverage ---

/** Build coverage rows for all WCAG 2 SCs. */
export const buildWcag2Coverage = (
	rows: string[][],
	cols: BreakColumns,
): { rows: Wcag2Row[]; covered: number; notCovered: number } => {
	const { groups, seen } = groupBreaksByField(rows, cols, cols.wcag2, false);
	const allScs = Object.keys(wcag2Data).sort(sortScNumerically);

	const result: Wcag2Row[] = [];
	let covered = 0;
	let notCovered = 0;

	for (const sc of allScs) {
		const title = (wcag2Data as Record<string, string>)[sc];
		const details = (wcag2Details as Wcag2DetailsMap)[sc];
		const level = details?.level ?? "?";
		const version = details?.sinceVersion ?? "?";
		const isCovered = seen.has(sc);

		if (isCovered) covered++;
		else notCovered++;

		const scGroups = [...groups.entries()]
			.filter(([key]) => key.startsWith(`${sc}\0`))
			.sort((a, b) => a[1].location.localeCompare(b[1].location));

		if (scGroups.length === 0) {
			result.push({
				sc,
				scTitle: title,
				level,
				sinceVersion: version,
				covered: false,
				page: "",
				route: "",
				breakCount: 0,
				description: "",
			});
		} else {
			for (const [, group] of scGroups) {
				result.push({
					sc,
					scTitle: title,
					level,
					sinceVersion: version,
					covered: true,
					page: group.location,
					route: group.route,
					breakCount: group.descriptions.length,
					description: group.descriptions.join(" | "),
				});
			}
		}
	}

	return { rows: result, covered, notCovered };
};

// --- WCAG 3 coverage ---

/** Build coverage rows for all WCAG 3 requirements. */
export const buildWcag3Coverage = (
	rows: string[][],
	cols: BreakColumns,
): { rows: Wcag3Row[]; covered: number; notCovered: number } => {
	const { groups, seen } = groupBreaksByField(rows, cols, cols.wcag3, true);
	const allReqs = [...new Set(wcag3Data)];

	const result: Wcag3Row[] = [];
	let covered = 0;
	let notCovered = 0;

	for (const req of allReqs) {
		const isCovered = seen.has(req);

		if (isCovered) covered++;
		else notCovered++;

		const reqGroups = [...groups.entries()]
			.filter(([key]) => key.startsWith(`${req}\0`))
			.sort((a, b) => a[1].location.localeCompare(b[1].location));

		if (reqGroups.length === 0) {
			result.push({
				requirement: req,
				covered: false,
				page: "",
				route: "",
				breakCount: 0,
				description: "",
			});
		} else {
			for (const [, group] of reqGroups) {
				result.push({
					requirement: req,
					covered: true,
					page: group.location,
					route: group.route,
					breakCount: group.descriptions.length,
					description: group.descriptions.join(" | "),
				});
			}
		}
	}

	return { rows: result, covered, notCovered };
};

// --- Output ---

const saveWcag2Csv = async (rows: Wcag2Row[]): Promise<void> => {
	const headers = [
		"WCAG 2 SC",
		"SC Title",
		"Level",
		"Since Version",
		"Covered?",
		"Page (Location)",
		"Route",
		"Break Count",
		"Description",
	];

	const csvRows = rows.map((r) =>
		[
			r.sc,
			r.scTitle,
			r.level,
			r.sinceVersion,
			r.covered ? "YES" : "NO",
			r.page,
			r.route,
			String(r.breakCount),
			r.description,
		]
			.map(escapeCsvField)
			.join(","),
	);

	const csv = [headers.join(","), ...csvRows].join("\n");
	const outPath = join(REPORTS_DIR, "wcag2-coverage.csv");
	await writeFile(outPath, csv, "utf8");
	logHelper.info(`Wrote: ${outPath} (${rows.length} rows)`);
};

const saveWcag3Csv = async (rows: Wcag3Row[]): Promise<void> => {
	const headers = [
		"WCAG 3 Requirement",
		"Covered?",
		"Page (Location)",
		"Route",
		"Break Count",
		"Description",
	];

	const csvRows = rows.map((r) =>
		[
			r.requirement,
			r.covered ? "YES" : "NO",
			r.page,
			r.route,
			String(r.breakCount),
			r.description,
		]
			.map(escapeCsvField)
			.join(","),
	);

	const csv = [headers.join(","), ...csvRows].join("\n");
	const outPath = join(REPORTS_DIR, "wcag3-coverage.csv");
	await writeFile(outPath, csv, "utf8");
	logHelper.info(`Wrote: ${outPath} (${rows.length} rows)`);
};

const saveJson = async (
	wcag2Rows: Wcag2Row[],
	wcag3Rows: Wcag3Row[],
): Promise<void> => {
	const wcag2Path = join(REPORTS_DIR, "wcag2-coverage.json");
	await writeFile(wcag2Path, JSON.stringify(wcag2Rows, null, 2), "utf8");
	logHelper.info(`Wrote: ${wcag2Path} (${wcag2Rows.length} rows)`);

	const wcag3Path = join(REPORTS_DIR, "wcag3-coverage.json");
	await writeFile(wcag3Path, JSON.stringify(wcag3Rows, null, 2), "utf8");
	logHelper.info(`Wrote: ${wcag3Path} (${wcag3Rows.length} rows)`);
};

export const saveCoverage = async (
	format: "csv" | "json",
	wcag2Rows: Wcag2Row[],
	wcag3Rows: Wcag3Row[],
): Promise<void> => {
	await ensureReportsDir();
	if (format === "json") {
		await saveJson(wcag2Rows, wcag3Rows);
	} else {
		await saveWcag2Csv(wcag2Rows);
		await saveWcag3Csv(wcag3Rows);
	}
};

// --- Summary ---

const printSummary = (
	wcag2: { rows: Wcag2Row[]; covered: number; notCovered: number },
	wcag3: { rows: Wcag3Row[]; covered: number; notCovered: number },
): void => {
	const allScs = Object.keys(wcag2Data).sort(sortScNumerically);
	const wcag2ScsSeen = new Set(
		wcag2.rows.filter((r) => r.covered).map((r) => r.sc),
	);

	// Breakdown by level
	const byLevel = new Map<string, { covered: number; total: number }>();
	for (const sc of allScs) {
		const det = (wcag2Details as Wcag2DetailsMap)[sc];
		const level = det?.level ?? "?";
		let entry = byLevel.get(level);
		if (!entry) {
			entry = { covered: 0, total: 0 };
			byLevel.set(level, entry);
		}
		entry.total++;
		if (wcag2ScsSeen.has(sc)) entry.covered++;
	}

	logHelper.summary("=== WCAG 2 Coverage ===", [
		`Total SCs:     ${allScs.length}`,
		`Covered:       ${wcag2.covered}`,
		`Not covered:   ${wcag2.notCovered}`,
		...[...byLevel.entries()]
			.sort()
			.map(([level, data]) => `Level ${level}: ${data.covered}/${data.total} covered`),
	]);

	logHelper.summary("Not covered SCs:",
		allScs
			.filter((sc) => !wcag2ScsSeen.has(sc))
			.map((sc) => {
				const title = (wcag2Data as Record<string, string>)[sc];
				const details = (wcag2Details as Wcag2DetailsMap)[sc];
				return `${sc} ${title} (${details?.level ?? "?"}, ${details?.sinceVersion ?? "?"})`;
			}),
	);

	logHelper.summary("=== WCAG 3 Coverage ===", [
		`Total requirements: ${[...new Set(wcag3Data)].length}`,
		`Covered:            ${wcag3.covered}`,
		`Not covered:        ${wcag3.notCovered}`,
	]);
};

// --- Main ---

const main = async () => {
	const format = parseFormatArg();
	const breaks = await loadBreaksData();
	const wcag2 = buildWcag2Coverage(breaks.rows, breaks.cols);
	const wcag3 = buildWcag3Coverage(breaks.rows, breaks.cols);
	await saveCoverage(format, wcag2.rows, wcag3.rows);
	printSummary(wcag2, wcag3);
};

main().catch(console.error);
