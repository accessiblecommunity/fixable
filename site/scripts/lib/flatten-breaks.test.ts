import { appendUncoveredCriteria } from "scripts/lib/append-uncovered-criteria";
import { createBreak } from "scripts/test/create-data";
import { mockFlattenBreaksData, mockUncoveredData } from "scripts/test/mock-data";
import { describe, expect, it } from "vitest";
import { flattenBreaks } from "./flatten-breaks";

describe("flattenBreaks", () => {
  it("flattens a single break with process title and no expansion", () => {
    const breaks = [createBreak()];
    const result = flattenBreaks(breaks, mockFlattenBreaksData);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "test-break",
      sourceFile: "components/Test.astro",
      pageLocation: "Home",
      process: "learning",
      processTitle: "Viewing the Home, About, and Help pages",
      processDiscussionItems: [],
      route: "/",
      sectionPath: "",
      sectionDescription: "The home section",
      sectionDiscussionItems: ["Home discussion item"],
      wcag2: "1.1.1",
      wcag3: "Images detectable",
      description: "Test description",
      wcag2Title: "",
      wcag2Level: "",
      wcag2SinceVersion: "",
      covered: true,
    });
  });

  it("includes section data when location matches a section", () => {
    const breaks = [createBreak({ location: "Blog" })];
    const result = flattenBreaks(breaks, mockFlattenBreaksData);

    expect(result[0]).toMatchObject({
      sectionPath: "blog/",
      sectionDescription: "The blog section",
      sectionDiscussionItems: [],
    });
  });

  it("uses empty section fields when location has no matching section", () => {
    const breaks = [createBreak({ location: "Unknown" })];
    const result = flattenBreaks(breaks, mockFlattenBreaksData);

    expect(result[0]).toMatchObject({
      sectionPath: "",
      sectionDescription: "",
      sectionDiscussionItems: [],
    });
  });

  it("includes process discussion items when present", () => {
    const breaks = [createBreak({ process: "collections" })];
    const result = flattenBreaks(breaks, mockFlattenBreaksData);

    expect(result[0].processDiscussionItems).toEqual([
      "Should emojis be hidden?",
    ]);
  });

  it("expands multiple wcag2 and wcag3 into separate rows with details", () => {
    const breaks = [
      createBreak({
        wcag2: ["1.1.1", "2.2.2"],
        wcag3: ["Images detectable", "No visual motion"],
      }),
    ];
    const result = flattenBreaks(breaks, mockFlattenBreaksData, { expandRequirements: true });

    expect(result).toHaveLength(4);

    expect(result[0]).toMatchObject({
      wcag2: "1.1.1",
      wcag2Title: "Non-text Content",
      wcag2Level: "A",
      wcag2SinceVersion: "2.0",
      wcag3: "",
    });
    expect(result[1]).toMatchObject({
      wcag2: "2.2.2",
      wcag2Title: "Pause, Stop, Hide",
      wcag2Level: "A",
      wcag2SinceVersion: "2.0",
      wcag3: "",
    });
    expect(result[2]).toMatchObject({
      wcag2: "",
      wcag2Title: "",
      wcag3: "Images detectable",
    });
    expect(result[3]).toMatchObject({
      wcag2: "",
      wcag2Title: "",
      wcag3: "No visual motion",
    });
  });

  it("produces a single row with empty wcag when break has no requirements", () => {
    const breaks = [createBreak({ wcag2: "", wcag3: "" })];
    const result = flattenBreaks(breaks, mockFlattenBreaksData, { expandRequirements: true });

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ wcag2: "", wcag3: "" });
  });

  it("generates deterministic uids", () => {
    const breaks = [createBreak()];
    const result1 = flattenBreaks(breaks, mockFlattenBreaksData);
    const result2 = flattenBreaks(breaks, mockFlattenBreaksData);

    expect(result1[0].uid).toBe(result2[0].uid);
    expect(result1[0].uid).toMatch(/^[0-9a-f]{8}$/);
  });

  it("generates unique uids per expanded requirement", () => {
    const breaks = [
      createBreak({
        wcag2: ["1.1.1", "2.2.2"],
        wcag3: "Images detectable",
      }),
    ];
    const result = flattenBreaks(breaks, mockFlattenBreaksData, { expandRequirements: true });
    const uids = result.map((item) => item.uid);

    expect(new Set(uids).size).toBe(uids.length);
  });
});

describe("appendUncoveredCriteria", () => {
  it("adds rows for uncovered WCAG 2 and WCAG 3 criteria", () => {
    const breaks = [createBreak({ wcag2: "1.1.1", wcag3: "Images detectable" })];
    const flattened = flattenBreaks(breaks, mockFlattenBreaksData);
    const result = appendUncoveredCriteria(flattened, mockUncoveredData);

    // Original break + 2 uncovered WCAG 2 (2.2.2, 1.3.1) + 2 uncovered WCAG 3
    expect(result).toHaveLength(5);

    const uncovered = result.filter((item) => !item.covered);
    expect(uncovered).toHaveLength(4);

    const uncoveredWcag2 = uncovered.filter((item) => item.wcag2 !== "");
    expect(uncoveredWcag2.map((item) => item.wcag2)).toEqual(
      expect.arrayContaining(["2.2.2", "1.3.1"]),
    );

    const uncoveredWcag3 = uncovered.filter((item) => item.wcag3 !== "");
    expect(uncoveredWcag3.map((item) => item.wcag3)).toEqual(
      expect.arrayContaining(["No visual motion", "Captions available (prerecorded)"]),
    );
  });

  it("sets covered=false and empty break fields on uncovered rows", () => {
    const flattened = flattenBreaks([createBreak({ wcag2: "1.1.1", wcag3: "" })], mockFlattenBreaksData);
    const result = appendUncoveredCriteria(flattened, mockUncoveredData);

    const uncoveredRow = result.find((item) => item.wcag2 === "2.2.2");
    expect(uncoveredRow).toMatchObject({
      covered: false,
      id: "",
      sourceFile: "",
      pageLocation: "no page",
      process: "",
      processTitle: "",
      route: "",
      description: "",
      wcag2Title: "Pause, Stop, Hide",
      wcag2Level: "A",
      wcag2SinceVersion: "2.0",
    });
  });

  it("populates WCAG 2 details on uncovered rows", () => {
    const flattened = flattenBreaks([createBreak({ wcag2: "1.1.1", wcag3: "" })], mockFlattenBreaksData);
    const result = appendUncoveredCriteria(flattened, mockUncoveredData);

    const row = result.find((item) => item.wcag2 === "1.3.1");
    expect(row).toMatchObject({
      wcag2Title: "Info and Relationships",
      wcag2Level: "A",
      wcag2SinceVersion: "2.0",
    });
  });

  it("does not duplicate already-covered criteria", () => {
    const breaks = [
      createBreak({
        wcag2: ["1.1.1", "2.2.2", "1.3.1"],
        wcag3: ["Images detectable", "No visual motion", "Captions available (prerecorded)"],
      }),
    ];
    const flattened = flattenBreaks(breaks, mockFlattenBreaksData);
    const result = appendUncoveredCriteria(flattened, mockUncoveredData);

    const uncovered = result.filter((item) => !item.covered);
    expect(uncovered).toHaveLength(0);
  });

  it("generates deterministic uids for uncovered rows", () => {
    const flattened = flattenBreaks([createBreak()], mockFlattenBreaksData);
    const result1 = appendUncoveredCriteria(flattened, mockUncoveredData);
    const result2 = appendUncoveredCriteria(flattened, mockUncoveredData);

    const uncovered1 = result1.filter((item) => !item.covered);
    const uncovered2 = result2.filter((item) => !item.covered);

    expect(uncovered1.map((item) => item.uid)).toEqual(uncovered2.map((item) => item.uid));
  });
});
