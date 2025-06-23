import { defineConfig } from 'astro/config';
import icon from "astro-icon";
import { load } from "cheerio";
import fg from "fast-glob";
import GithubSlugger from "github-slugger";

import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

// https://astro.build/config
export default defineConfig({
  site: "https://accessiblecommunity.github.io",
  base: "fixable",
  trailingSlash: "always",
  server: {
    host: true,
    port: 4323
  },
  integrations: [
    icon({
      iconDir: "src/assets/icons",
    }),
    {
      /**
       * Ensures all headings have IDs
       * (even *.astro pages, which can't be done via `markdown` config)
       */
      name: "heading-ids",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          const distPath = fileURLToPath(dir);
          const htmlPaths = await fg.glob("**/*.html", { cwd: distPath });
          const start = Date.now();
          const slugger = new GithubSlugger();
          for (const path of htmlPaths) {
            slugger.reset();
            const filePath = join(distPath, path);
            const $ = load(await readFile(filePath));

            $("h1, h2, h3, h4, h5, h6").each((_, el) => {
              if (!el.attribs.id) el.attribs.id = slugger.slug($(el).text());
            });
            await writeFile(filePath, $.html());
          }
          console.log(`Heading ID plugin completed in ${Date.now() - start}ms`);
        },
      },
    },
  ]
});