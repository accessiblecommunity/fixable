import { describe, expect, it } from "vitest";
import {
	buildWcag2Coverage,
	buildWcag3Coverage,
	groupBreaksByField,
	parseCsv,
	parseCsvLine,
} from "./generate-coverage.js";
import type { BreakColumns } from "./generate-coverage.js";

// ---------------------------------------------------------------------------
// parseCsvLine
// ---------------------------------------------------------------------------

describe("parseCsvLine", () => {
	it("parses simple comma-separated fields", () => {
		expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
	});

	it("handles quoted fields", () => {
		expect(parseCsvLine('"hello","world"')).toEqual(["hello", "world"]);
	});

	it("handles escaped quotes inside quoted fields", () => {
		expect(parseCsvLine('"say ""hi"""')).toEqual(['say "hi"']);
	});

	it("handles commas inside quoted fields", () => {
		expect(parseCsvLine('"a,b",c')).toEqual(["a,b", "c"]);
	});

	it("handles empty fields", () => {
		expect(parseCsvLine("a,,c")).toEqual(["a", "", "c"]);
	});

	it("handles single field", () => {
		expect(parseCsvLine("hello")).toEqual(["hello"]);
	});

	it("handles empty string", () => {
		expect(parseCsvLine("")).toEqual([""]);
	});
});

// ---------------------------------------------------------------------------
// parseCsv
// ---------------------------------------------------------------------------

describe("parseCsv", () => {
	it("parses multiple lines", () => {
		const result = parseCsv("a,b\nc,d");
		expect(result).toEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	it("handles newlines within quoted fields", () => {
		const result = parseCsv('"line1\nline2",b\nc,d');
		expect(result).toEqual([
			["line1\nline2", "b"],
			["c", "d"],
		]);
	});

	it("skips empty lines", () => {
		const result = parseCsv("a,b\n\nc,d");
		expect(result).toEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	it("handles Windows line endings", () => {
		const result = parseCsv("a,b\r\nc,d\r\n");
		expect(result).toEqual([
			["a", "b"],
			["c", "d"],
		]);
	});

	it("handles a realistic CSV header + row", () => {
		const csv =
			"ID,Source File,Page (Location),Process,Route,WCAG 2 SC,WCAG 2 Title,WCAG 3,Description,Discussion Items,Duplicate\n" +
			'ISSUE-00001,test.astro,Home,Learning,/home/#main,1.1.1,Non-text Content,Image alternatives,"Missing alt text","",';
		const result = parseCsv(csv);
		expect(result).toHaveLength(2);
		expect(result[0][0]).toBe("ID");
		expect(result[1][0]).toBe("ISSUE-00001");
		expect(result[1][5]).toBe("1.1.1");
	});
});

// ---------------------------------------------------------------------------
// groupBreaksByField
// ---------------------------------------------------------------------------

describe("groupBreaksByField", () => {
	const cols: BreakColumns = {
		location: 2,
		route: 4,
		wcag2: 5,
		wcag3: 7,
		desc: 8,
	};

	const makeRow = (
		location: string,
		route: string,
		wcag2: string,
		wcag3: string,
		desc: string,
	): string[] => {
		const row: string[] = new Array(11).fill("");
		row[cols.location] = location;
		row[cols.route] = route;
		row[cols.wcag2] = wcag2;
		row[cols.wcag3] = wcag3;
		row[cols.desc] = desc;
		return row;
	};

	it("groups rows by WCAG 2 SC and location", () => {
		const rows = [
			makeRow("Home", "/home", "1.1.1", "", "desc1"),
			makeRow("Home", "/home", "1.1.1", "", "desc2"),
			makeRow("Blog", "/blog", "1.1.1", "", "desc3"),
		];
		const { groups, seen } = groupBreaksByField(
			rows,
			cols,
			cols.wcag2,
			false,
		);
		expect(seen.has("1.1.1")).toBe(true);
		expect(groups.size).toBe(2); // two distinct location groups
		const homeGroup = groups.get("1.1.1\0Home");
		expect(homeGroup?.descriptions).toEqual(["desc1", "desc2"]);
		const blogGroup = groups.get("1.1.1\0Blog");
		expect(blogGroup?.descriptions).toEqual(["desc3"]);
	});

	it("skips rows with empty key field", () => {
		const rows = [makeRow("Home", "/home", "", "", "desc")];
		const { groups, seen } = groupBreaksByField(
			rows,
			cols,
			cols.wcag2,
			false,
		);
		expect(seen.size).toBe(0);
		expect(groups.size).toBe(0);
	});

	it("splits semicolons when splitSemicolons is true", () => {
		const rows = [
			makeRow("Home", "/home", "", "Image alternatives; Captions", "desc"),
		];
		const { seen } = groupBreaksByField(rows, cols, cols.wcag3, true);
		expect(seen.has("Image alternatives")).toBe(true);
		expect(seen.has("Captions")).toBe(true);
	});

	it("does not split semicolons when splitSemicolons is false", () => {
		const rows = [
			makeRow("Home", "/home", "1.1.1; 1.3.1", "", "desc"),
		];
		const { seen } = groupBreaksByField(rows, cols, cols.wcag2, false);
		expect(seen.has("1.1.1; 1.3.1")).toBe(true);
		expect(seen.has("1.1.1")).toBe(false);
	});

	it("captures route from the first row in a group", () => {
		const rows = [makeRow("Home", "/home/#main", "1.1.1", "", "desc")];
		const { groups } = groupBreaksByField(rows, cols, cols.wcag2, false);
		expect(groups.get("1.1.1\0Home")?.route).toBe("/home/#main");
	});
});

// ---------------------------------------------------------------------------
// buildWcag2Coverage
// ---------------------------------------------------------------------------

describe("buildWcag2Coverage", () => {
	const cols: BreakColumns = {
		location: 2,
		route: 4,
		wcag2: 5,
		wcag3: 7,
		desc: 8,
	};

	const makeRow = (
		wcag2: string,
		location: string,
		desc: string,
	): string[] => {
		const row: string[] = new Array(11).fill("");
		row[cols.wcag2] = wcag2;
		row[cols.location] = location;
		row[cols.desc] = desc;
		return row;
	};

	it("marks covered SCs", () => {
		const rows = [makeRow("1.1.1", "Home", "Missing alt")];
		const result = buildWcag2Coverage(rows, cols);
		const sc111 = result.rows.find(
			(r) => r.sc === "1.1.1" && r.covered,
		);
		expect(sc111).toBeDefined();
		expect(sc111!.page).toBe("Home");
		expect(sc111!.breakCount).toBe(1);
		expect(sc111!.description).toBe("Missing alt");
	});

	it("marks uncovered SCs with empty page and zero break count", () => {
		const result = buildWcag2Coverage([], cols);
		expect(result.covered).toBe(0);
		expect(result.notCovered).toBeGreaterThan(0);
		const firstRow = result.rows[0];
		expect(firstRow.covered).toBe(false);
		expect(firstRow.page).toBe("");
		expect(firstRow.breakCount).toBe(0);
	});

	it("counts covered vs not covered correctly", () => {
		const rows = [
			makeRow("1.1.1", "Home", "desc1"),
			makeRow("1.3.1", "Home", "desc2"),
		];
		const result = buildWcag2Coverage(rows, cols);
		expect(result.covered).toBe(2);
		// Total SCs minus covered
		expect(result.covered + result.notCovered).toBe(
			result.rows.filter(
				(r, i, arr) => arr.findIndex((x) => x.sc === r.sc) === i,
			).length,
		);
	});

	it("combines descriptions with | for same SC + location", () => {
		const rows = [
			makeRow("1.1.1", "Home", "first"),
			makeRow("1.1.1", "Home", "second"),
		];
		const result = buildWcag2Coverage(rows, cols);
		const sc111 = result.rows.find(
			(r) => r.sc === "1.1.1" && r.page === "Home",
		);
		expect(sc111?.description).toBe("first | second");
		expect(sc111?.breakCount).toBe(2);
	});

	it("creates separate rows for same SC at different locations", () => {
		const rows = [
			makeRow("1.1.1", "Home", "desc1"),
			makeRow("1.1.1", "Blog", "desc2"),
		];
		const result = buildWcag2Coverage(rows, cols);
		const sc111Rows = result.rows.filter((r) => r.sc === "1.1.1");
		expect(sc111Rows).toHaveLength(2);
		expect(sc111Rows.map((r) => r.page).sort()).toEqual(["Blog", "Home"]);
	});

	it("includes level and sinceVersion from wcag2-details", () => {
		const rows = [makeRow("1.1.1", "Home", "desc")];
		const result = buildWcag2Coverage(rows, cols);
		const sc111 = result.rows.find((r) => r.sc === "1.1.1");
		expect(sc111?.level).toBe("A");
		expect(sc111?.sinceVersion).toBe("2.0");
	});
});

// ---------------------------------------------------------------------------
// buildWcag3Coverage
// ---------------------------------------------------------------------------

describe("buildWcag3Coverage", () => {
	const cols: BreakColumns = {
		location: 2,
		route: 4,
		wcag2: 5,
		wcag3: 7,
		desc: 8,
	};

	const makeRow = (
		wcag3: string,
		location: string,
		desc: string,
	): string[] => {
		const row: string[] = new Array(11).fill("");
		row[cols.wcag3] = wcag3;
		row[cols.location] = location;
		row[cols.desc] = desc;
		return row;
	};

	it("marks covered requirements", () => {
		const rows = [makeRow("Image alternatives", "Home", "desc")];
		const result = buildWcag3Coverage(rows, cols);
		const textAlt = result.rows.find(
			(r) => r.requirement === "Image alternatives" && r.covered,
		);
		expect(textAlt).toBeDefined();
		expect(textAlt!.page).toBe("Home");
	});

	it("marks uncovered requirements", () => {
		const result = buildWcag3Coverage([], cols);
		expect(result.notCovered).toBeGreaterThan(0);
		const firstRow = result.rows[0];
		expect(firstRow.covered).toBe(false);
		expect(firstRow.page).toBe("");
	});

	it("handles semicolon-separated WCAG 3 values", () => {
		const rows = [
			makeRow("Image alternatives; Captions", "Home", "desc"),
		];
		const result = buildWcag3Coverage(rows, cols);
		const textAlt = result.rows.find(
			(r) => r.requirement === "Image alternatives" && r.covered,
		);
		const captions = result.rows.find(
			(r) => r.requirement === "Captions" && r.covered,
		);
		expect(textAlt).toBeDefined();
		expect(captions).toBeDefined();
	});

	it("counts covered vs not covered correctly", () => {
		const rows = [makeRow("Image alternatives", "Home", "desc")];
		const result = buildWcag3Coverage(rows, cols);
		expect(result.covered).toBe(1);
		expect(result.covered + result.notCovered).toBe(
			result.rows.filter(
				(r, i, arr) =>
					arr.findIndex((x) => x.requirement === r.requirement) === i,
			).length,
		);
	});
});
