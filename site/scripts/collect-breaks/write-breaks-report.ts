import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getFixableLogger } from "scripts/lib/common-logger";
import type {
  BreaksReportOptions,
  SingleReportOptions,
} from "scripts/lib/types";
import { writeHtmlReport } from "./html-report/write-html-report";
import { writeCsvReport } from "./write-csv";

const writeJsonReport = async ({
  flattenedBreaks,
  filename,
  outputPath,
  logger,
}: SingleReportOptions): Promise<void> => {
  const outPath = join(outputPath, `${filename}.json`);
  await writeFile(outPath, JSON.stringify(flattenedBreaks, null, 2), "utf8");
  logger.info(`Wrote ${flattenedBreaks.length} rows to ${outPath}`);
};

const MAX_FILENAME_ATTEMPTS = 1000;

const resolveUniqueFilename = (
  outputPath: string,
  filename: string,
  extensions: string[],
): string => {
  if (!extensions.some((ext) => existsSync(join(outputPath, `${filename}.${ext}`)))) {
    return filename;
  }

  for (let increment = 1; increment <= MAX_FILENAME_ATTEMPTS; increment++) {
    const candidate = `${filename}-(${increment})`;
    if (!extensions.some((ext) => existsSync(join(outputPath, `${candidate}.${ext}`)))) {
      return candidate;
    }
  }

  throw new Error(
    `Could not find a unique filename after ${MAX_FILENAME_ATTEMPTS} attempts for "${filename}" in ${outputPath}`,
  );
};

export const writeBreaksReport = async ({
  flattenedBreaks,
  outputPath,
  filename,
  jsonFormat,
  csvFormat,
  htmlFormat,
  groupBy,
  includeUncovered,
  templatePath = "",
}: BreaksReportOptions) => {
  try {
    const logger = getFixableLogger();
    await mkdir(outputPath, { recursive: true });

    const baseName = filename ?? "breaks-report";

    if (jsonFormat || csvFormat) {
      const dataExtensions = [
        ...(jsonFormat ? ["json"] : []),
        ...(csvFormat ? ["csv"] : []),
      ];
      const uniqueDataFilename = resolveUniqueFilename(
        outputPath,
        baseName,
        dataExtensions,
      );

      if (jsonFormat) {
        await writeJsonReport({
          flattenedBreaks,
          filename: uniqueDataFilename,
          outputPath,
          logger,
        });
      }

      if (csvFormat) {
        await writeCsvReport({
          flattenedBreaks,
          filename: uniqueDataFilename,
          outputPath,
          logger,
        });
      }
    }

    if (htmlFormat) {
      const resolvedGroupBy = groupBy ?? "byPath";
      const htmlBaseName = `${baseName}-${resolvedGroupBy}`;
      const uniqueHtmlFilename = resolveUniqueFilename(
        outputPath,
        htmlBaseName,
        ["html"],
      );
      await writeHtmlReport({
        flattenedBreaks,
        filename: uniqueHtmlFilename,
        outputPath,
        groupBy: resolvedGroupBy,
        coverageTable: includeUncovered ?? false,
        logger,
        templatePath
      });
    }
  } catch (error) {
    const logger = getFixableLogger();
    logger.error({ err: error }, "writeBreaksReport: reports could not be written");
  }
};
