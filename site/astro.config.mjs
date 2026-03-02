import { defineConfig } from 'astro/config';

import icon from "astro-icon";

import preact from "@astrojs/preact";

// https://astro.build/config
export default defineConfig({
  site: "https://accessiblecommunity.github.io",
  base: "fixable",
  trailingSlash: "always",
  server: {
    host: true,
    port: 4323,
  },
  integrations: [
    icon({
      iconDir: "src/assets/icons",
    }),
    preact(),
  ],
});
