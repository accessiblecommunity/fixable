import type { RawBreak } from "@/lib/scan-breaks";

export const createBreak = (overrides: Partial<RawBreak["data"]> = {}): RawBreak => ({
  id: "test-break",
  filePath: "components/Test.astro",
  data: {
    location: "Home",
    process: "learning",
    href: "/",
    wcag2: "1.1.1",
    wcag3: "Images detectable",
    description: "Test description",
    discussionItems: "",
    ...overrides,
  },
});
