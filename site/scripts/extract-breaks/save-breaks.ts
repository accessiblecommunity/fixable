import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { escapeCsvField, logHelper } from "../script-utils.js";
import type { FlatBreak } from "./breaks-types.js";

const REPORTS_DIR = "reports";

const ensureReportsDir = () => mkdir(REPORTS_DIR, { recursive: true });

// --- Output ---

async function saveAsJson(breaks: FlatBreak[]): Promise<void> {
	await ensureReportsDir();
	const outPath = join(REPORTS_DIR, "breaks-export.json");
	await writeFile(outPath, JSON.stringify(breaks, null, 2), "utf8");
	logHelper.info(`Wrote ${breaks.length} rows to ${outPath}`);
}

async function saveAsCsv(breaks: FlatBreak[]): Promise<void> {
	const headers = [
		"ID",
		"Source File",
		"Page (Location)",
		"Process",
		"Route",
		"WCAG 2 SC",
		"WCAG 2 Title",
		"WCAG 3",
		"Description",
		"Discussion Items",
		"Duplicate",
	];

	const rows = breaks.map((b) =>
		[
			b.id,
			b.sourceFile,
			b.location,
			b.process,
			b.route,
			b.wcag2,
			b.wcag2Title,
			b.wcag3,
			b.description,
			b.discussionItems,
			b.duplicate ? "Y" : "",
		]
			.map(escapeCsvField)
			.join(","),
	);

	const csv = [headers.join(","), ...rows].join("\n");
	await ensureReportsDir();
	const outPath = join(REPORTS_DIR, "breaks-export.csv");
	await writeFile(outPath, csv, "utf8");
	logHelper.info(`Wrote ${breaks.length} rows to ${outPath}`);
}

export async function saveBreaks(
	breaks: FlatBreak[],
	format: "csv" | "json",
): Promise<void> {
	if (format === "json") {
		await saveAsJson(breaks);
	} else {
		await saveAsCsv(breaks);
	}
}
