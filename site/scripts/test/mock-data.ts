import type { AppendUncoveredData, FlattenBreaksData } from "scripts/lib/types";

export const mockFlattenBreaksData: FlattenBreaksData = {
  processes: new Map([
    ["learning", { id: "learning", title: "Viewing the Home, About, and Help pages" }],
    ["collections", { id: "collections", title: "Browsing collections", discussionItems: ["Should emojis be hidden?"] }],
  ]),
  sections: new Map([
    ["Home", { id: "Home", path: "", description: "The home section", discussionItems: ["Home discussion item"] }],
    ["Blog", { id: "Blog", path: "blog/", description: "The blog section" }],
  ]),
  wcag2Details: {
    "1.1.1": { title: "Non-text Content", level: "A", sinceVersion: "2.0" },
    "2.2.2": { title: "Pause, Stop, Hide", level: "A", sinceVersion: "2.0" },
    "1.3.1": { title: "Info and Relationships", level: "A", sinceVersion: "2.0" },
  },
};

export const mockUncoveredData: AppendUncoveredData = {
  wcag2Details: mockFlattenBreaksData.wcag2Details,
  wcag2Map: {
    "1.1.1": "Non-text Content",
    "2.2.2": "Pause, Stop, Hide",
    "1.3.1": "Info and Relationships",
  },
  wcag3List: [
    "Images detectable",
    "No visual motion",
    "Captions available (prerecorded)",
  ],
};
