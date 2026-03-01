import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Wcag2Row, Wcag3Row } from "./coverage-types.js";

vi.mock("node:fs/promises", () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	readFile: vi.fn().mockResolvedValue(""),
	writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { mkdir, writeFile } from "node:fs/promises";
import { saveCoverage } from "./generate-coverage.js";

const mockMkdir = vi.mocked(mkdir);
const mockWriteFile = vi.mocked(writeFile);

function makeWcag2Row(overrides: Partial<Wcag2Row> = {}): Wcag2Row {
	return {
		sc: "1.1.1",
		scTitle: "Non-text Content",
		level: "A",
		sinceVersion: "2.0",
		covered: true,
		page: "Home",
		route: "/home/#main",
		breakCount: 1,
		description: "Missing alt text",
		...overrides,
	};
}

function makeWcag3Row(overrides: Partial<Wcag3Row> = {}): Wcag3Row {
	return {
		requirement: "Text Alternatives",
		covered: true,
		page: "Home",
		route: "/home/#main",
		breakCount: 1,
		description: "Missing alt text",
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("saveCoverage — CSV", () => {
	it("creates the reports directory", async () => {
		await saveCoverage("csv", [makeWcag2Row()], [makeWcag3Row()]);
		expect(mockMkdir).toHaveBeenCalledWith("reports", { recursive: true });
	});

	it("writes wcag2-coverage.csv with correct headers", async () => {
		await saveCoverage("csv", [makeWcag2Row()], [makeWcag3Row()]);
		const wcag2Call = mockWriteFile.mock.calls.find(
			(c) => (c[0] as string).includes("wcag2-coverage.csv"),
		);
		expect(wcag2Call).toBeDefined();
		const csv = wcag2Call![1] as string;
		const headerLine = csv.split("\n")[0];
		expect(headerLine).toBe(
			"WCAG 2 SC,SC Title,Level,Since Version,Covered?,Page (Location),Route,Break Count,Description",
		);
	});

	it("writes wcag3-coverage.csv with correct headers", async () => {
		await saveCoverage("csv", [makeWcag2Row()], [makeWcag3Row()]);
		const wcag3Call = mockWriteFile.mock.calls.find(
			(c) => (c[0] as string).includes("wcag3-coverage.csv"),
		);
		expect(wcag3Call).toBeDefined();
		const csv = wcag3Call![1] as string;
		const headerLine = csv.split("\n")[0];
		expect(headerLine).toBe(
			"WCAG 3 Requirement,Covered?,Page (Location),Route,Break Count,Description",
		);
	});

	it("maps covered boolean to YES/NO", async () => {
		await saveCoverage(
			"csv",
			[makeWcag2Row({ covered: true }), makeWcag2Row({ sc: "1.3.1", covered: false })],
			[],
		);
		const wcag2Call = mockWriteFile.mock.calls.find(
			(c) => (c[0] as string).includes("wcag2-coverage.csv"),
		);
		const csv = wcag2Call![1] as string;
		const lines = csv.split("\n");
		expect(lines[1]).toContain("YES");
		expect(lines[2]).toContain("NO");
	});

	it("escapes fields containing commas", async () => {
		await saveCoverage(
			"csv",
			[makeWcag2Row({ description: "first, second" })],
			[],
		);
		const wcag2Call = mockWriteFile.mock.calls.find(
			(c) => (c[0] as string).includes("wcag2-coverage.csv"),
		);
		const csv = wcag2Call![1] as string;
		expect(csv).toContain('"first, second"');
	});
});

describe("saveCoverage — JSON", () => {
	it("creates the reports directory", async () => {
		await saveCoverage("json", [makeWcag2Row()], [makeWcag3Row()]);
		expect(mockMkdir).toHaveBeenCalledWith("reports", { recursive: true });
	});

	it("writes valid JSON for wcag2", async () => {
		const wcag2Rows = [makeWcag2Row()];
		await saveCoverage("json", wcag2Rows, []);
		const wcag2Call = mockWriteFile.mock.calls.find(
			(c) => (c[0] as string).includes("wcag2-coverage.json"),
		);
		expect(wcag2Call).toBeDefined();
		const parsed = JSON.parse(wcag2Call![1] as string);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].sc).toBe("1.1.1");
	});

	it("writes valid JSON for wcag3", async () => {
		const wcag3Rows = [makeWcag3Row()];
		await saveCoverage("json", [], wcag3Rows);
		const wcag3Call = mockWriteFile.mock.calls.find(
			(c) => (c[0] as string).includes("wcag3-coverage.json"),
		);
		expect(wcag3Call).toBeDefined();
		const parsed = JSON.parse(wcag3Call![1] as string);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].requirement).toBe("Text Alternatives");
	});

	it("writes to correct output paths", async () => {
		await saveCoverage("json", [makeWcag2Row()], [makeWcag3Row()]);
		const paths = mockWriteFile.mock.calls.map((c) => c[0] as string);
		expect(paths.some((p) => p.includes("wcag2-coverage.json"))).toBe(true);
		expect(paths.some((p) => p.includes("wcag3-coverage.json"))).toBe(true);
	});
});
