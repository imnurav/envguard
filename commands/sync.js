import { syncTargets } from "../core/env-manager.js";
import { errorPayload, okPayload, printJson } from "../utils/json-output.js";
import { logger } from "../utils/logger.js";

export default function sync(options = {}) {
  const { template, results } = syncTargets(options);
  const quiet = Boolean(options.json);

  if (template.missing) {
    if (quiet) {
      printJson(
        errorPayload("sync", {
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
    logger.heading("Envguard Sync", `Source: ${template.examplePath}`);
  }

  for (const result of results) {
    summary[result.name] = result.changedKeys;

    if (!result.changedKeys.length) {
      if (quiet) continue;
      logger.fileHeader(result.name, "already synchronized");
      continue;
    }

    if (!quiet) {
      logger.fileHeader(result.name, `${result.changedKeys.length} changed`);
      logger.list(result.changedKeys);
    }
  }

  if (options.json) {
    printJson(
      okPayload("sync", {
        source: template.examplePath,
        overwrite: Boolean(options.force),
        files: results.map((result) => ({
          file: result.name,
          changed: result.changedKeys,
          changedCount: result.changedKeys.length,
        })),
        result: {
          updated: summary,
        },
      }),
    );
  }
}
