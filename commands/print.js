import { hasExplicitTarget, resolveTargetFiles } from "../core/resolver.js";
import { parseEnv } from "../core/parser.js";
import { errorPayload, okPayload, printJson } from "../utils/json-output.js";
import { logger } from "../utils/logger.js";
import path from "path";
import fs from "fs";

export default function print(key, options = {}) {
  const files = resolveTargetFiles(options);
  const explicitTarget = hasExplicitTarget(options);
  const missingExplicitFiles = explicitTarget
    ? files.filter((file) => !fs.existsSync(file))
    : [];

  if (missingExplicitFiles.length) {
    if (options.json) {
      printJson(
        errorPayload("print", {
          target: missingExplicitFiles[0],
          error: `Target file not found: ${missingExplicitFiles[0]}`,
        }),
      );
      process.exitCode = 1;
      return;
    }

    logger.warn(`Target file not found: ${missingExplicitFiles[0]}`);
    process.exitCode = 1;
    return;
  }

  const payload = Object.fromEntries(
    files.map((file) => [path.basename(file), parseEnv(file)]),
  );

  if (options.json) {
    if (options.all) {
      printJson(
        okPayload("print", {
          mode: "all",
          result: key
            ? {
                key,
                files: Object.fromEntries(
                  Object.entries(payload).map(([fileName, entries]) => [
                    fileName,
                    entries[key] ?? null,
                  ]),
                ),
              }
            : {
                files: payload,
              },
        }),
      );
      return;
    }

    const [[fileName, entries]] = Object.entries(payload);
    printJson(
      okPayload("print", {
        target: fileName,
        result: key
          ? {
              key,
              value: entries[key] ?? null,
            }
          : {
              values: entries,
            },
      }),
    );
    return;
  }

  if (!options.all) {
    const [[fileName, entries]] = Object.entries(payload);

    logger.heading("Envguard Print", `Target: ${fileName}`);

    if (key) {
      if (!(key in entries)) {
        logger.warn(`${key} was not found in ${fileName}`);
        process.exitCode = 1;
        return;
      }

      logger.fileHeader(fileName, "1 value");
      logger.keyValue(key, entries[key] || "(empty)");
      return;
    }

    logger.fileHeader(fileName, `${Object.keys(entries).length} variable(s)`);

    if (!Object.keys(entries).length) {
      logger.empty("No variables found");
      return;
    }

    Object.entries(entries).forEach(([entryKey, entryValue]) => {
      logger.keyValue(entryKey, entryValue || "(empty)");
    });
    return;
  }

  logger.heading("Envguard Print", "Target: all env files");

  if (key) {
    let found = false;

    for (const [fileName, entries] of Object.entries(payload)) {
      if (!(key in entries)) continue;

      found = true;
      logger.fileHeader(fileName, "matched");
      logger.keyValue(key, entries[key] || "(empty)");
    }

    if (!found) {
      logger.warn(`${key} was not found in any env file`);
      process.exitCode = 1;
    }
    return;
  }

  for (const [fileName, entries] of Object.entries(payload)) {
    logger.fileHeader(fileName, `${Object.keys(entries).length} variable(s)`);

    if (!Object.keys(entries).length) {
      logger.empty("No variables found");
      continue;
    }

    Object.entries(entries).forEach(([entryKey, entryValue]) => {
      logger.keyValue(entryKey, entryValue || "(empty)");
    });
  }
}
