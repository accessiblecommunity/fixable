/** @fileoverview Updates src/lib/wcag*.json, used for validation in list of breaks. */

import { fromURL } from "cheerio";
import { writeFile } from "fs/promises";
import { join } from "path";

const get = (url: string) =>
  fetch(url).then((response) => {
    if (response.status >= 400)
      throw new Error(`HTTP error code received: ${response.status}`);
    return response;
  });

const wcag22 = await (
  await get("https://www.w3.org/WAI/WCAG22/wcag.json")
).json();
const wcag22Map: Record<string, string> = {};
const wcag22Details: Record<
  string,
  { title: string; level: string; sinceVersion: string }
> = {};
for (const principle of wcag22.principles) {
  for (const guideline of principle.guidelines) {
    for (const criterion of guideline.successcriteria) {
      if (criterion.level) {
        wcag22Map[criterion.num] = criterion.handle;
        wcag22Details[criterion.num] = {
          title: criterion.handle,
          level: criterion.level,
          // The versions array lists all WCAG versions that include this SC;
          // the earliest (first) entry is the version that introduced it.
          sinceVersion: criterion.versions?.[0] ?? "2.0",
        };
      }
    }
  }
}

const $ = await fromURL("https://w3c.github.io/wcag3/guidelines/");
const wcag3Values: string[] = [];
$("#guidelines h4, #guidelines h5").each((_, el) => {
  const $el = $(el);
  $el.find("bdi, span").remove();
  wcag3Values.push($el.text().trim());
});

await writeFile(
  join("src", "lib", "wcag2.json"),
  JSON.stringify(wcag22Map, null, "  ") + "\n"
);

await writeFile(
  join("src", "lib", "wcag2-details.json"),
  JSON.stringify(wcag22Details, null, "  ") + "\n"
);

await writeFile(
  join("src", "lib", "wcag3.json"),
  JSON.stringify(wcag3Values, null, "  ") + "\n"
);

console.log(
  `Updated: ${Object.keys(wcag22Map).length} WCAG 2 SCs, ${wcag3Values.length} WCAG 3 requirements`
);
console.log(`  src/lib/wcag2.json         — SC number → title`);
console.log(`  src/lib/wcag2-details.json  — SC number → { title, level, sinceVersion }`);
console.log(`  src/lib/wcag3.json         — requirement names`);
