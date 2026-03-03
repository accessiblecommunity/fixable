// eslint.config.mjs

import tsParser from "@typescript-eslint/parser";
import astroPlugin from "eslint-plugin-astro";
import jsxA11y from "eslint-plugin-jsx-a11y";
import tseslint from "typescript-eslint";

export default [
	{
		ignores: ["dist/", ".astro/", "node_modules/"],
	},
	...tseslint.configs.recommended,

	// 2. Astro Plugin Configuration
	...astroPlugin.configs.recommended,

	// jsx-a11y for Astro files (uses astro plugin's wrapper that understands Astro's JSX AST)
	...astroPlugin.configs["flat/jsx-a11y-recommended"],

	// jsx-a11y for non-Astro JSX files (tsx/jsx only — the standalone plugin
	// crashes on Astro's shorthand syntax like {size}).
	// Omit plugins since jsx-a11y is already registered by the astro config above.
	{
		files: ["**/*.tsx", "**/*.jsx"],
		rules: jsxA11y.flatConfigs.recommended.rules,
	},

	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
				project: "./tsconfig.json",
			},
		},
	},
];
