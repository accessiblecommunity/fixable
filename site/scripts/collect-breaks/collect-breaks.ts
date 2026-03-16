import { existsSync } from "node:fs";
import { basename, join } from "node:path";
import commandLineArgs from "command-line-args";
import { appendUncoveredCriteria } from "scripts/lib/append-uncovered-criteria";
import {
  getFixableLogger,
  initializeFixableLogger,
} from "scripts/lib/common-logger";
import { flattenBreaks } from "scripts/lib/flatten-breaks";
import { loadJsonFile, loadProcesses, loadSections, loadWcag2Details, loadWcag2Map, loadWcag3List } from "scripts/lib/load-data";
import type { CollectBreaksConfig } from "scripts/lib/schemas";
import { CollectBreaksConfigSchema } from "scripts/lib/schemas";
import { scanBreaks } from "@/lib/scan-breaks";
import { writeBreaksReport } from "./write-breaks-report";

const DEFAULT_DATA_PATHS = {
  processes: join("src", "content", "processes.json"),
  sections: join("src", "content", "sections.json"),
  wcag2Details: join("src", "lib", "wcag2-details.json"),
  wcag2: join("src", "lib", "wcag2.json"),
  wcag3: join("src", "lib", "wcag3.json"),
};

const TEMPLATE_PATH = join(import.meta.dirname, "html-report", "template", "report-template.html");

const optionDefinitions = [
  {
    name: "help",
    alias: "h",
    type: Boolean,
    description: "Display this help message",
  },
  {
    name: "config",
    type: String,
    description: "Path to a JSON configuration file",
  },
  {
    name: "inputPath",
    alias: "i",
    type: String,
    description: "input path to scan for breaks",
  },
  {
    name: "verbose",
    alias: "v",
    type: Boolean,
    description: "output verbose logging - debug level",
  },
  {
    name: "csv",
    alias: "c",
    type: Boolean,
    description: "output results in csv format (default if neither specified)",
  },
  {
    name: "json",
    alias: "j",
    type: Boolean,
    description: "output results in json format",
  },
  {
    name: "outputPath",
    alias: "o",
    type: String,
    description: "output file path",
  },
  {
    name: "filename",
    alias: "f",
    type: String,
    description: "json or csv output file name",
  },
  {
    name: "expand",
    alias: "e",
    type: Boolean,
    description: "create a separate row for each WCAG 2 and WCAG 3 requirement",
  },
  {
    name: "includeUncovered",
    alias: "u",
    type: Boolean,
    description:
      "add rows for WCAG 2 and WCAG 3 criteria not covered by any break",
  },
  {
    name: "html",
    alias: "t",
    type: Boolean,
    description: "output results in html format",
  },
  {
    name: "group",
    alias: "g",
    type: String,
    description: "group html report by 'byWcag' or 'byPath' (default: byPath)",
  },
];

const printHelp = () => {
  console.log("Usage: collect-breaks [options]\n");
  console.log("Options:");
  for (const opt of optionDefinitions) {
    const alias = opt.alias ? `-${opt.alias}, ` : "    ";
    const name = `--${opt.name}`;
    console.log(`  ${alias}${name.padEnd(22)} ${opt.description}`);
  }
  console.log(
    "\nWhen --config is provided, CLI arguments override config file values.",
  );
};

const loadConfig = (configPath: string): CollectBreaksConfig => {
  const raw = loadJsonFile(configPath);
  return CollectBreaksConfigSchema.parse(raw);
};

const OPTION_DEFAULTS: ResolvedOptions = {
  inputPath: "src",
  outputPath: "reports",
  filename: "breaks-report",
  verbose: false,
  csv: false,
  json: false,
  html: false,
  group: "byPath",
  expand: false,
  includeUncovered: false,
  dataPaths: DEFAULT_DATA_PATHS,
};

interface ResolvedOptions {
  inputPath: string;
  outputPath: string;
  filename: string;
  verbose: boolean;
  csv: boolean;
  json: boolean;
  html: boolean;
  group: string;
  expand: boolean;
  includeUncovered: boolean;
  dataPaths: typeof DEFAULT_DATA_PATHS;
}

const stripUndefined = (obj: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined && value !== ""));

const resolveOptions = (
  cliArgs: Record<string, unknown>,
  config: CollectBreaksConfig | undefined,
): ResolvedOptions => {
  const configValues = config ? stripUndefined(config) : {};
  const cliValues = stripUndefined(cliArgs);

  const resolvedOptions = {
    ...OPTION_DEFAULTS,
    ...configValues,
    ...cliValues,
    dataPaths: { ...DEFAULT_DATA_PATHS, ...(config?.dataPaths && stripUndefined(config.dataPaths)) },
  } as ResolvedOptions;

  // Default to CSV if no format is specified
  resolvedOptions.csv = resolvedOptions.csv || (!resolvedOptions.json && !resolvedOptions.html);

  return resolvedOptions;
};

const main = async () => {
  try {
    const cliArgs = commandLineArgs(optionDefinitions);

    if (cliArgs.help) {
      printHelp();
      return;
    }

    const config = cliArgs.config
      ? loadConfig(cliArgs.config as string)
      : undefined;

    const {verbose, inputPath, filename, group, csv, json, html, expand, includeUncovered, dataPaths, outputPath} = resolveOptions(cliArgs, config);

    initializeFixableLogger(verbose);
    const logger = getFixableLogger();

    if (config) {
      logger.info(`Loaded configuration from ${cliArgs.config}`);
    }

    if (!existsSync(inputPath)) {
      logger.error(`Input path does not exist: ${inputPath}`);
      return;
    }

    if (filename !== basename(filename)) {
      logger.error(`Filename must not contain path separators: ${filename}`);
      return;
    }

    const validGroupValues = ["byWcag", "byPath"] as const;
    if (!validGroupValues.includes(group as typeof validGroupValues[number])) {
      logger.error(
        `Invalid group value: ${group}. Must be one of: ${validGroupValues.join(", ")}`,
      );
      return;
    }

    const breaks = await scanBreaks(inputPath);
    logger.info(`Collected ${breaks.length} breaks from ${inputPath}`);
    logger.debug({ breaks }, "Breaks collected");

    const processes = loadProcesses(dataPaths.processes);
    const sections = loadSections(dataPaths.sections);
    const wcag2Details = loadWcag2Details(dataPaths.wcag2Details);

    let flattenedBreaks = flattenBreaks(
      breaks,
      { processes, sections, wcag2Details },
      { expandRequirements: expand },
    );

    if (includeUncovered) {
      const wcag2Map = loadWcag2Map(dataPaths.wcag2);
      const wcag3List = loadWcag3List(dataPaths.wcag3);
      flattenedBreaks = appendUncoveredCriteria(flattenedBreaks, {
        wcag2Details,
        wcag2Map,
        wcag3List,
      });
      logger.info(
        `Added uncovered WCAG criteria (${flattenedBreaks.length} total rows)`,
      );
    }

    await writeBreaksReport({
      flattenedBreaks,
      outputPath: outputPath,
      filename: filename,
      jsonFormat: json,
      csvFormat: csv,
      htmlFormat: html,
      groupBy: group as "byWcag" | "byPath",
      includeUncovered: includeUncovered,
      templatePath: TEMPLATE_PATH,
    });
  } catch (error) {
    const logger = getFixableLogger();
    logger.error({ err: error }, "Error collecting breaks");
  }
};

main();
