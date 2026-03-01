# Additional Scripts

This documents standalone scripts that supplement the core Astro build. These are not part of the site itself but are useful for analysis and reporting.

All commands should be run from within the `site/` directory.

## Prerequisites

These scripts use `tsx` (already in devDependencies) and import data from `src/lib/` and `src/content/`, so make sure you've run `npm install` first.

## Directory layout

```
site/
├── scripts/
│   ├── script-utils.ts          — shared utilities (CSV escaping, SC sorting, etc.)
│   ├── extract-breaks/
│   │   ├── extract-breaks.ts    — main script
│   │   ├── breaks-types.ts      — RawBreak / FlatBreak type definitions
│   │   └── save-breaks.ts       — CSV and JSON output helpers
│   └── generate-coverage/
│       ├── generate-coverage.ts — main script
│       └── coverage-types.ts    — Wcag2Row / Wcag3Row type definitions
├── update-wcag-data.ts          — WCAG data updater (at site root)
└── reports/                     — generated output (gitignored)
```

## Scripts

### extract-breaks

Extracts all documented breaks from the codebase into a CSV or JSON file. This mirrors the logic in `content.config.ts`'s custom break-loader but runs standalone.

```sh
npm run extract-breaks            # CSV output (default)
npm run extract-breaks:json       # JSON output
```

**Output:** `reports/breaks-export.csv` (or `.json`)

Each row includes the break's source file, location, process, WCAG 2 and WCAG 3 criteria, description, and discussion items.

### generate-coverage

Generates coverage reports showing which WCAG 2.2 and WCAG 3 items are covered (and not covered) by the documented breaks.

```sh
npm run generate-coverage         # CSV output (default)
npm run generate-coverage:json    # JSON output
```

**Output:**

- `reports/wcag2-coverage.csv` — all WCAG 2 success criteria with coverage status
- `reports/wcag3-coverage.csv` — all WCAG 3 requirements with coverage status

**Note:** Run `extract-breaks` first to ensure `breaks-export.csv` is up to date, since this script reads from it.

### update-wcag-data

Fetches the latest WCAG 2.2 and WCAG 3 data from W3C sources and updates the JSON files under `src/lib/`. This is already wired up as an npm script:

```sh
npm run update-wcag
```

This also runs `astro check` afterwards in case any updates impact currently-documented breaks.

**Output:**

- `src/lib/wcag2.json` — WCAG 2.2 success criteria (number to title mapping)
- `src/lib/wcag2-details.json` — WCAG 2.2 with level and version info
- `src/lib/wcag3.json` — WCAG 3 requirement names

## Cleaning up

Script output goes to `reports/` (gitignored). To remove it:

```sh
npm run clean:reports
```

## Typical workflow

To generate a full set of reports:

```sh
cd site
npm run extract-breaks
npm run generate-coverage
```

The output CSVs land in `reports/` and can be opened in any spreadsheet application.
