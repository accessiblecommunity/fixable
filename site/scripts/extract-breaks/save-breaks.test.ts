import { describe, expect, it, vi, beforeEach } from "vitest";
import type { FlatBreak } from "./breaks-types.js";

// Mock node:fs/promises before importing saveBreaks
vi.mock("node:fs/promises", () => ({
	mkdir: vi.fn().mockResolvedValue(undefined),
	writeFile: vi.fn().mockResolvedValue(undefined),
}));

import { mkdir, writeFile } from "node:fs/promises";
import { saveBreaks } from "./save-breaks.js";

const mockMkdir = vi.mocked(mkdir);
const mockWriteFile = vi.mocked(writeFile);

function makeFlatBreak(overrides: Partial<FlatBreak> = {}): FlatBreak {
	return {
		id: "ISSUE-00001",
		sourceFile: "test.astro",
		location: "Home",
		process: "Learning",
		route: "/home/#main",
		wcag2: "1.1.1",
		wcag2Title: "Non-text Content",
		wcag3: "Text Alternatives",
		description: "Missing alt text",
		discussionItems: "",
		duplicate: false,
		...overrides,
	};
}

beforeEach(() => {
	vi.clearAllMocks();
});

describe("saveBreaks — CSV", () => {
	it("creates the reports directory", async () => {
		await saveBreaks([makeFlatBreak()], "csv");
		expect(mockMkdir).toHaveBeenCalledWith("reports", { recursive: true });
	});

	it("writes CSV with correct headers", async () => {
		await saveBreaks([makeFlatBreak()], "csv");
		const csv = mockWriteFile.mock.calls[0][1] as string;
		const headerLine = csv.split("\n")[0];
		expect(headerLine).toBe(
			"ID,Source File,Page (Location),Process,Route,WCAG 2 SC,WCAG 2 Title,WCAG 3,Description,Discussion Items,Duplicate",
		);
	});

	it("escapes fields containing commas", async () => {
		await saveBreaks(
			[makeFlatBreak({ description: "has, comma" })],
			"csv",
		);
		const csv = mockWriteFile.mock.calls[0][1] as string;
		const dataLine = csv.split("\n")[1];
		expect(dataLine).toContain('"has, comma"');
	});

	it("writes to reports/breaks-export.csv", async () => {
		await saveBreaks([makeFlatBreak()], "csv");
		const outPath = mockWriteFile.mock.calls[0][0] as string;
		expect(outPath).toContain("breaks-export.csv");
	});
});

describe("saveBreaks — JSON", () => {
	it("creates the reports directory", async () => {
		await saveBreaks([makeFlatBreak()], "json");
		expect(mockMkdir).toHaveBeenCalledWith("reports", { recursive: true });
	});

	it("writes valid JSON", async () => {
		const breaks = [makeFlatBreak()];
		await saveBreaks(breaks, "json");
		const json = mockWriteFile.mock.calls[0][1] as string;
		const parsed = JSON.parse(json);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].id).toBe("ISSUE-00001");
	});

	it("writes to reports/breaks-export.json", async () => {
		await saveBreaks([makeFlatBreak()], "json");
		const outPath = mockWriteFile.mock.calls[0][0] as string;
		expect(outPath).toContain("breaks-export.json");
	});
});
