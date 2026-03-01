# Linting & Formatting Setup

This document describes the linting and formatting tooling configured for the project, based on the recommendations in `repo-organization-proposals.md`.

## Tools

| Tool | Version | Purpose | Config file |
|------|---------|---------|-------------|
| Biome | 2.4.4 | Format JS/TS, lint JS/TS, organize imports | `biome.json` (repo root) |
| Prettier | 3.3.2 | Format `.astro` files only | `site/.prettierrc`, `site/.prettierignore` |
| ESLint | 9.x | Astro-specific rules, JSX accessibility linting | `site/eslint.config.mjs` |
| Stylelint | 17.x | CSS linting | `site/.stylelintrc.json` |
| Markdownlint | 0.47.x | Markdown content file linting | `site/.markdownlint.json` |
| EditorConfig | — | Consistent editor settings across contributors | `.editorconfig` (repo root) |

## npm scripts

All scripts are in `site/package.json` and run from the `site/` directory.

### Standalone scripts

| Script | Command |
|--------|---------|
| `npm run biome` | Run Biome check (format + lint + import sorting) |
| `npm run biome:fix` | Auto-fix Biome issues |
| `npm run eslint` | Run ESLint |
| `npm run eslint:fix` | Auto-fix ESLint issues |
| `npm run stylelint` | Run Stylelint on CSS files |
| `npm run stylelint:fix` | Auto-fix Stylelint issues |
| `npm run markdownlint` | Run Markdownlint on content files |

### Combined scripts

| Script | Command |
|--------|---------|
| `npm run format` | Format all files (Biome for JS/TS, Prettier for `.astro`) |
| `npm run format:check` | Check formatting without writing changes |
| `npm run lint` | Run all linters (Biome lint + ESLint + Stylelint) |
| `npm run lint:fix` | Auto-fix all linters |

## How the tools divide responsibility

Biome and Prettier have disjoint file scopes to avoid conflicts:

- **Biome** formats and lints `.ts`, `.tsx`, `.js`, `.mjs` files. It also organizes imports. Line width: 80.
- **Prettier** formats only `.astro` files (enforced via `.prettierignore` which denies all files except `*.astro`). Print width: 80 (default).
- **ESLint** handles Astro-specific rules and JSX accessibility linting via `eslint-plugin-astro` and its built-in `jsx-a11y` integration.
- **Stylelint** lints CSS files in `src/assets/styles/`.
- **Markdownlint** lints Markdown content files in `src/content/`.

### Biome/ESLint overlap management

Base JavaScript rules that Biome already covers (`no-unused-vars`, `no-debugger`, `no-constant-condition`, `no-empty`) are disabled in the ESLint config. ESLint focuses on what Biome cannot do: Astro template parsing, JSX accessibility rules, and TypeScript-specific rules like `@typescript-eslint/no-unused-vars` (which supports `argsIgnorePattern`).

Biome's built-in accessibility rules are disabled (`a11y.recommended: false`) since ESLint's astro/jsx-a11y integration handles accessibility linting with proper Astro AST support.

## Accessibility linting

All `astro/jsx-a11y/*` rules are set to **warn** (not error) because this project contains intentional accessibility violations for educational purposes. This means:

- Developers see accessibility issues during development.
- CI does not fail on accessibility warnings.
- The warnings serve as documentation of where intentional violations exist.

## File exclusions

- `src/pages/index.astro` is excluded from ESLint — this is the meta/documentation page which contains intentionally malformed HTML as part of break documentation.
- Generated WCAG JSON files (`src/lib/wcag2.json`, `src/lib/wcag2-details.json`, `src/lib/wcag3.json`) are excluded from Biome.
- `dist/`, `.astro/`, and `node_modules/` are excluded from all tools.

## Stylelint rule adjustments

Several `stylelint-config-standard` rules are disabled to match the project's existing conventions:

| Rule | Reason |
|------|--------|
| `import-notation` | Project uses `@import url(...)` syntax |
| `custom-property-pattern` | Project has its own CSS custom property naming |
| `function-url-quotes` | Project uses unquoted URL function arguments |
| `rule-empty-line-before` | Project's existing empty line style |
| `at-rule-empty-line-before` | Project's existing empty line style |
| `custom-property-empty-line-before` | Project groups custom properties with blank lines |
| `property-no-deprecated` | `clip` property is intentionally used in `.visually-hidden` for browser compatibility |

## Markdownlint rule adjustments

| Rule | Reason |
|------|--------|
| `MD013` (line length) | Content files have long prose paragraphs |
| `MD033` (no inline HTML) | Astro content files may contain HTML elements |
| `MD041` (first line h1) | Titles come from YAML frontmatter, not headings |

## CI

The GitHub Actions PR workflow (`.github/workflows/pr-build.yaml`) has two parallel jobs:

- **`lint`** — runs `format:check`, `lint`, and `markdownlint`
- **`build`** — runs `astro check` (TypeScript validation) and builds the site

## Biome config location

`biome.json` lives at the **repo root** (not in `site/`). Biome v2 auto-discovers the git root as the project root, so placing the config in `site/` causes a "nested root configuration" error. File paths in `biome.json` are prefixed with `site/` accordingly.
