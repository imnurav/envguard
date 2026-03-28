import { errorPayload, okPayload, printJson } from "../utils/json-output.js";
import { fixTargets } from "../core/env-manager.js";
import { logger } from "../utils/logger.js";

export default function fix(options = {}) {
  const { template, results } = fixTargets(options);
  const quiet = Boolean(options.json);

  if (template.missing) {
    if (quiet) {
      printJson(
        errorPayload("fix", {
          source: template.examplePath,
          error: `Source file not found: ${template.examplePath}`,
        }),
      );
      process.exitCode = 1;
      return;
    }

    logger.warn(`Template file not found: ${template.examplePath}`);
    return;
  }

  const summary = {};

  if (!quiet) {
    logger.heading("Envguard Fix", `Source: ${template.examplePath}`);
  }

  for (const result of results) {
    summary[result.name] = result.addedKeys;

    if (!result.addedKeys.length) {
      if (quiet) continue;
      logger.fileHeader(result.name, "already up to date");
      continue;
    }

    if (!quiet) {
      logger.fileHeader(result.name, `${result.addedKeys.length} added`);
      logger.list(result.addedKeys);
    }
  }

  if (options.json) {
    printJson(
      okPayload("fix", {
        source: template.examplePath,
        files: results.map((result) => ({
          file: result.name,
          added: result.addedKeys,
          addedCount: result.addedKeys.length,
        })),
        result: {
          updated: summary,
        },
      }),
    );
  }
}
