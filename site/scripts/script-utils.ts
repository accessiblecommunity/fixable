/**
 * Shared utilities for standalone scripts (extract-breaks, generate-coverage, etc.).
 *
 * These scripts live outside the Astro build pipeline and run via `npx tsx`.
 * This module centralises helpers that would otherwise be duplicated across them.
 */

// --- CSV helpers ---

/** Escape a value for inclusion in a CSV field (RFC 4180). */
export function escapeCsvField(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

// --- WCAG SC sorting ---

/**
 * Numeric comparator for WCAG 2 Success Criterion numbers (e.g. "1.3.1" < "2.1.1").
 * Splits on "." and compares each segment as a number.
 */
export function sortScNumerically(a: string, b: string): number {
	const pa = a.split(".").map(Number);
	const pb = b.split(".").map(Number);
	for (let i = 0; i < 3; i++) {
		if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
	}
	return 0;
}

// --- CLI argument helpers ---

/**
 * Parse the `--format` flag from `process.argv`.
 * Returns `"json"` when `--format json` is present, otherwise `"csv"`.
 */
export function parseFormatArg(): "csv" | "json" {
	const idx = process.argv.indexOf("--format");
	return idx !== -1 && process.argv[idx + 1] === "json" ? "json" : "csv";
}

// --- Array normalisation ---

/** Normalise a value that may be a string, string[], or undefined into a string[]. */
export const toArray = (val: string | string[] | undefined): string[] => {
	if (!val) return [];
	return Array.isArray(val) ? val : [val];
};

// --- Logging ---

const verbose = process.argv.includes("--verbose");

/**
 * Simple logging helpers so scripts have consistent output.
 *
 * - `logHelper.info`  — progress / result messages (always shown)
 * - `logHelper.debug` — detail messages (shown with `--verbose`)
 * - `logHelper.error` — error messages (to stderr)
 * - `logHelper.summary` — formatted summary block with a header and indented lines
 */
export const logHelper = {
	info(msg: string) {
		console.log(msg);
	},
	debug(msg: string) {
		if (verbose) console.log(msg);
	},
	error(msg: string) {
		console.error(msg);
	},
	summary(label: string, lines: string[]) {
		console.log(`\n${label}`);
		for (const line of lines) {
			console.log(`  ${line}`);
		}
	},
};
