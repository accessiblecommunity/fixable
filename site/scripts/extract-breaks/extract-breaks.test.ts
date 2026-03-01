import { describe, expect, it } from "vitest";
import {
	assignIds,
	extractBreaksFromAstro,
	extractBreaksFromMarkdown,
	flattenRawBreak,
	parseBreakYaml,
	parseFrontmatter,
	resolveContentHref,
	resolveHref,
	resolvePageHref,
} from "./extract-breaks.js";
import type { FlatBreak } from "./breaks-types.js";

// ---------------------------------------------------------------------------
// parseBreakYaml
// ---------------------------------------------------------------------------

describe("parseBreakYaml", () => {
	it("parses key/value pairs", () => {
		const result = parseBreakYaml("wcag2: 1.1.1\nlocation: Home");
		expect(result.wcag2).toBe("1.1.1");
		expect(result.location).toBe("Home");
	});

	it("parses list values", () => {
		const result = parseBreakYaml("wcag2:\n  - 1.1.1\n  - 1.3.1");
		expect(result.wcag2).toEqual(["1.1.1", "1.3.1"]);
	});

	it("parses single-item list as string", () => {
		const result = parseBreakYaml("wcag2:\n  - 1.1.1");
		expect(result.wcag2).toBe("1.1.1");
	});

	it("parses literal block (|) as joined string", () => {
		const result = parseBreakYaml(
			"description: |\n  This is a long\n  description text",
		);
		expect(result.description).toBe("This is a long description text");
	});

	it("strips quotes from values", () => {
		const result = parseBreakYaml('location: "Home Page"');
		expect(result.location).toBe("Home Page");
	});

	it("parses a realistic break comment", () => {
		const yaml = `wcag2: 1.1.1
wcag3: Text Alternatives
description: |
  Image is missing alt text so screen readers
  cannot convey its content.
location: Collections`;
		const result = parseBreakYaml(yaml);
		expect(result.wcag2).toBe("1.1.1");
		expect(result.wcag3).toBe("Text Alternatives");
		expect(result.description).toBe(
			"Image is missing alt text so screen readers cannot convey its content.",
		);
		expect(result.location).toBe("Collections");
	});

	it("skips blank lines", () => {
		const result = parseBreakYaml("wcag2: 1.1.1\n\nlocation: Home");
		expect(result.wcag2).toBe("1.1.1");
		expect(result.location).toBe("Home");
	});
});

// ---------------------------------------------------------------------------
// parseFrontmatter
// ---------------------------------------------------------------------------

describe("parseFrontmatter", () => {
	it("returns empty object when no frontmatter", () => {
		expect(parseFrontmatter("# Hello\nSome content")).toEqual({});
	});

	it("parses scalar fields", () => {
		const content = `---
title: My Page
breaklocation: Blog
---
Content here`;
		const result = parseFrontmatter(content);
		expect(result.title).toBe("My Page");
		expect(result.breaklocation).toBe("Blog");
	});

	it("parses breaks array with single break", () => {
		const content = `---
breaklocation: Blog
breaks:
  - wcag2: 1.1.1
    description: Missing alt
---
Content`;
		const result = parseFrontmatter(content);
		expect(result.breaks).toEqual([
			{ wcag2: "1.1.1", description: "Missing alt" },
		]);
	});

	it("parses breaks array with multiple breaks", () => {
		const content = `---
breaks:
  - wcag2: 1.1.1
    description: First
  - wcag2: 1.3.1
    description: Second
---`;
		const result = parseFrontmatter(content);
		expect(result.breaks).toHaveLength(2);
		expect((result.breaks as Record<string, unknown>[])[0].wcag2).toBe("1.1.1");
		expect((result.breaks as Record<string, unknown>[])[1].wcag2).toBe("1.3.1");
	});

	it("parses discussionItems sub-lists", () => {
		const content = `---
breaks:
  - wcag2: 1.1.1
    discussionItems:
      - Item A
      - Item B
---`;
		const result = parseFrontmatter(content);
		const breaks = result.breaks as Record<string, unknown>[];
		expect(breaks[0].discussionItems).toEqual(["Item A", "Item B"]);
	});

	it("parses quoted values in frontmatter", () => {
		const content = `---
title: "My Title"
---`;
		const result = parseFrontmatter(content);
		expect(result.title).toBe("My Title");
	});
});

// ---------------------------------------------------------------------------
// resolvePageHref
// ---------------------------------------------------------------------------

describe("resolvePageHref", () => {
	it("resolves museum page to route", () => {
		expect(resolvePageHref("pages/museum/about.astro")).toBe(
			"/about/#main",
		);
	});

	it("resolves museum index page", () => {
		expect(resolvePageHref("pages/museum/collections/index.astro")).toBe(
			"/collections/#main",
		);
	});

	it("returns undefined for non-museum pages", () => {
		expect(resolvePageHref("pages/index.astro")).toBeUndefined();
	});

	it("returns undefined for dynamic routes", () => {
		expect(
			resolvePageHref("pages/museum/collections/[slug].astro"),
		).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// resolveContentHref
// ---------------------------------------------------------------------------

describe("resolveContentHref", () => {
	it("resolves blog paths", () => {
		expect(resolveContentHref("content/blog/my-post.md")).toBe(
			"/blog/my-post.md/#main",
		);
	});

	it("resolves exhibit-categories paths", () => {
		expect(
			resolveContentHref("content/exhibit-categories/art.json"),
		).toBe("/collections/art.json/#main");
	});

	it("resolves exhibits paths", () => {
		expect(resolveContentHref("content/exhibits/art/painting.md")).toBe(
			"/collections/art/painting.md/#main",
		);
	});

	it("resolves products paths", () => {
		expect(resolveContentHref("content/products/mug.md")).toBe(
			"/gift-shop/mug.md/#main",
		);
	});

	it("returns undefined for unknown paths", () => {
		expect(resolveContentHref("content/other/thing.md")).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// resolveHref
// ---------------------------------------------------------------------------

describe("resolveHref", () => {
	it("returns empty string when both args undefined", () => {
		expect(resolveHref(undefined, undefined)).toBe("");
	});

	it("returns defaultHref when breakHref undefined", () => {
		expect(resolveHref(undefined, "/about/#main")).toBe("/about/#main");
	});

	it("combines hash-only breakHref with defaultHref", () => {
		expect(resolveHref("#section", "/about/#main")).toBe("/about/#section");
	});

	it("returns defaultHref when breakHref is empty string", () => {
		expect(resolveHref("", "/about/#main")).toBe("/about/#main");
	});

	it("returns full breakHref when it has a path", () => {
		expect(resolveHref("/custom/path", "/about/#main")).toBe(
			"/custom/path",
		);
	});
});

// ---------------------------------------------------------------------------
// flattenRawBreak
// ---------------------------------------------------------------------------

describe("flattenRawBreak", () => {
	it("produces one row for a single SC", () => {
		const rows = flattenRawBreak(
			{ wcag2: "1.1.1", description: "Missing alt" },
			"test.astro",
			"Home",
			["learning"],
			"/home/#main",
		);
		expect(rows).toHaveLength(1);
		expect(rows[0].wcag2).toBe("1.1.1");
		expect(rows[0].description).toBe("Missing alt");
		expect(rows[0].duplicate).toBe(false);
	});

	it("produces multiple rows for multiple SCs", () => {
		const rows = flattenRawBreak(
			{ wcag2: ["1.1.1", "1.3.1"], description: "Test" },
			"test.astro",
			"Home",
			["learning"],
			"/home/#main",
		);
		expect(rows).toHaveLength(2);
		expect(rows[0].wcag2).toBe("1.1.1");
		expect(rows[0].duplicate).toBe(false);
		expect(rows[1].wcag2).toBe("1.3.1");
		expect(rows[1].duplicate).toBe(true);
	});

	it("produces rows for multiple processes", () => {
		const rows = flattenRawBreak(
			{ wcag2: "1.1.1", process: ["learning", "blog"] },
			"test.astro",
			"Home",
			undefined,
			"/home/#main",
		);
		expect(rows).toHaveLength(2);
		expect(rows[0].process).toBe(
			"Viewing the Home, About, and Help pages",
		);
		expect(rows[1].process).toBe(
			"Viewing the list of blog posts, and reading individual blog entries",
		);
	});

	it("marks subsequent SCs as duplicate within each process", () => {
		const rows = flattenRawBreak(
			{
				wcag2: ["1.1.1", "1.3.1"],
				process: ["learning", "blog"],
			},
			"test.astro",
			"Home",
			undefined,
			"/home/#main",
		);
		// 2 processes x 2 SCs = 4 rows
		expect(rows).toHaveLength(4);
		// First SC in each process is not duplicate
		expect(rows[0].duplicate).toBe(false);
		expect(rows[1].duplicate).toBe(true);
		expect(rows[2].duplicate).toBe(false);
		expect(rows[3].duplicate).toBe(true);
	});

	it("looks up process title from processesData", () => {
		const rows = flattenRawBreak(
			{ wcag2: "1.1.1", process: "gift-shop" },
			"test.astro",
			"Home",
			undefined,
			"/home/#main",
		);
		expect(rows[0].process).toBe(
			"Browsing products in the Gift shop, adding products to cart, viewing/editing the cart, and completing the checkout process",
		);
	});

	it("uses ALL as-is for process", () => {
		const rows = flattenRawBreak(
			{ wcag2: "1.1.1", process: "ALL" },
			"test.astro",
			"Home",
			undefined,
			"/",
		);
		expect(rows[0].process).toBe("ALL");
	});

	it("looks up WCAG 2 title", () => {
		const rows = flattenRawBreak(
			{ wcag2: "1.1.1" },
			"test.astro",
			"Home",
			["learning"],
			"/",
		);
		expect(rows[0].wcag2Title).toBe("Non-text Content");
	});

	it("falls back to file-level location and process", () => {
		const rows = flattenRawBreak(
			{ wcag2: "1.1.1" },
			"test.astro",
			"Collections",
			["collections"],
			"/collections/#main",
		);
		expect(rows[0].location).toBe("Collections");
		expect(rows[0].process).toContain("Browsing the list of collections");
	});
});

// ---------------------------------------------------------------------------
// extractBreaksFromAstro
// ---------------------------------------------------------------------------

describe("extractBreaksFromAstro", () => {
	it("extracts a break from a JSDoc comment", () => {
		const content = `---
import Something from './Something.astro';
---
/** @breaklocation Home */
/** @breakprocess learning */
/** @break
 * wcag2: 1.1.1
 * description: Missing alt text
 */
<img src="photo.jpg" />`;
		const breaks = extractBreaksFromAstro("pages/museum/index.astro", content);
		expect(breaks).toHaveLength(1);
		expect(breaks[0].wcag2).toBe("1.1.1");
		expect(breaks[0].description).toBe("Missing alt text");
		expect(breaks[0].location).toBe("Home");
	});

	it("extracts multiple breaks from a file", () => {
		const content = `/** @breaklocation Home */
/** @breakprocess learning */
/** @break
 * wcag2: 1.1.1
 * description: First break
 */
/** @break
 * wcag2: 1.3.1
 * description: Second break
 */`;
		const breaks = extractBreaksFromAstro("pages/museum/index.astro", content);
		expect(breaks).toHaveLength(2);
	});

	it("returns empty array when no breaks present", () => {
		const content = `<div>No breaks here</div>`;
		const breaks = extractBreaksFromAstro("pages/museum/about.astro", content);
		expect(breaks).toEqual([]);
	});

	it("resolves page href when no @breakhref", () => {
		const content = `/** @breaklocation Home */
/** @breakprocess learning */
/** @break
 * wcag2: 1.1.1
 */`;
		const breaks = extractBreaksFromAstro("pages/museum/about.astro", content);
		expect(breaks[0].route).toBe("/about/#main");
	});
});

// ---------------------------------------------------------------------------
// extractBreaksFromMarkdown
// ---------------------------------------------------------------------------

describe("extractBreaksFromMarkdown", () => {
	it("extracts breaks from frontmatter", () => {
		const content = `---
title: Test Post
breaklocation: Blog
breakprocess: blog
breaks:
  - wcag2: 1.1.1
    description: Missing alt
---
# Content`;
		const breaks = extractBreaksFromMarkdown("content/blog/test.md", content);
		expect(breaks).toHaveLength(1);
		expect(breaks[0].wcag2).toBe("1.1.1");
		expect(breaks[0].location).toBe("Blog");
	});

	it("returns empty array when no breaks in frontmatter", () => {
		const content = `---
title: No Breaks
---
# Content`;
		const breaks = extractBreaksFromMarkdown("content/blog/test.md", content);
		expect(breaks).toEqual([]);
	});

	it("returns empty array when no frontmatter at all", () => {
		const content = `# Just Markdown`;
		const breaks = extractBreaksFromMarkdown("content/blog/test.md", content);
		expect(breaks).toEqual([]);
	});

	it("resolves content href for blog", () => {
		const content = `---
breaklocation: Blog
breakprocess: blog
breaks:
  - wcag2: 1.1.1
---`;
		const breaks = extractBreaksFromMarkdown("content/blog/my-post.md", content);
		expect(breaks[0].route).toBe("/blog/my-post.md/#main");
	});
});

// ---------------------------------------------------------------------------
// assignIds
// ---------------------------------------------------------------------------

describe("assignIds", () => {
	it("assigns sequential ISSUE-XXXXX IDs", () => {
		const breaks: FlatBreak[] = [
			makeFlatBreak({ wcag2: "1.1.1", location: "A" }),
			makeFlatBreak({ wcag2: "1.3.1", location: "B" }),
		];
		assignIds(breaks);
		expect(breaks[0].id).toBe("ISSUE-00001");
		expect(breaks[1].id).toBe("ISSUE-00002");
	});

	it("sorts by SC numerically then by location", () => {
		const breaks: FlatBreak[] = [
			makeFlatBreak({ wcag2: "2.1.1", location: "Z" }),
			makeFlatBreak({ wcag2: "1.1.1", location: "A" }),
			makeFlatBreak({ wcag2: "1.1.1", location: "B" }),
		];
		assignIds(breaks);
		expect(breaks[0].wcag2).toBe("1.1.1");
		expect(breaks[0].location).toBe("A");
		expect(breaks[1].wcag2).toBe("1.1.1");
		expect(breaks[1].location).toBe("B");
		expect(breaks[2].wcag2).toBe("2.1.1");
	});

	it("puts empty SCs last (treated as 99)", () => {
		const breaks: FlatBreak[] = [
			makeFlatBreak({ wcag2: "", location: "A" }),
			makeFlatBreak({ wcag2: "1.1.1", location: "B" }),
		];
		assignIds(breaks);
		expect(breaks[0].wcag2).toBe("1.1.1");
		expect(breaks[1].wcag2).toBe("");
	});
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFlatBreak(overrides: Partial<FlatBreak>): FlatBreak {
	return {
		id: "",
		sourceFile: "test.astro",
		location: "",
		process: "",
		route: "",
		wcag2: "",
		wcag2Title: "",
		wcag3: "",
		description: "",
		discussionItems: "",
		duplicate: false,
		...overrides,
	};
}
