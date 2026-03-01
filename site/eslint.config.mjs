import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import eslintPluginAstro from "eslint-plugin-astro";

// Use the astro plugin's jsx-a11y integration which properly handles Astro's
// JSX AST. Filter out the prettier-related configs we don't need.
const astroA11yConfigs = eslintPluginAstro.configs[
  "flat/jsx-a11y-recommended"
].filter(
  (config) =>
    !config.rules ||
    !Object.keys(config.rules).some((r) => r.startsWith("prettier/")),
);

// Downgrade all astro/jsx-a11y rules to "warn" since this project contains
// intentional accessibility violations for educational purposes.
// Also filter out deprecated rules that no longer exist in newer jsx-a11y versions.
const deprecatedRules = new Set(["astro/jsx-a11y/label-has-for"]);
const astroA11yWithWarnings = astroA11yConfigs.map((config) => {
  if (!config.rules) return config;
  const hasA11y = Object.keys(config.rules).some((r) => r.includes("jsx-a11y"));
  if (!hasA11y) return config;
  return {
    ...config,
    rules: Object.fromEntries(
      Object.entries(config.rules)
        .filter(([rule]) => !deprecatedRules.has(rule))
        .map(([rule, val]) => [
          rule,
          Array.isArray(val) ? ["warn", ...val.slice(1)] : "warn",
        ]),
    ),
  };
});

export default [
  // Global ignores
  {
    ignores: [
      "dist/",
      ".astro/",
      "node_modules/",
      // Meta page has intentionally malformed HTML as part of break documentation
      "src/pages/index.astro",
    ],
  },

  // TypeScript files
  {
    files: ["**/*.ts", "**/*.mjs"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Disable rules that Biome already handles
      "no-unused-vars": "off",
      "no-constant-condition": "off",
      "no-debugger": "off",
      "no-empty": "off",

      // TypeScript-specific rules that complement Biome
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  },

  // Astro files with jsx-a11y support (all a11y rules as warnings)
  ...astroA11yWithWarnings,
];
