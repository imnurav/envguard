import { errorPayload, okPayload, printJson } from "../utils/json-output.js";
import { checkTargets, collectMissingKeys } from "../core/env-manager.js";
import { logger } from "../utils/logger.js";

export default function check(options = {}) {
  const { template, targets } = checkTargets(options);

  if (template.missing) {
    if (options.json) {
      printJson(
        errorPayload("check", {
          source: template.examplePath,
          error: `Source file not found: ${template.examplePath}`,
        }),
      );
      process.exitCode = 1;
      return;
    }

    logger.warn(`Template file not found: ${template.examplePath}`);
    if (options.strict) process.exitCode = 1;
    return;
  }

  const missingExplicitTargets = targets.filter(
    (target) => target.explicit && !target.exists,
  );

  if (missingExplicitTargets.length) {
    if (options.json) {
      printJson(
        errorPayload("check", {
          source: template.examplePath,
          target: missingExplicitTargets[0].name,
          file: missingExplicitTargets[0].file,
          error: `Target file not found: ${missingExplicitTargets[0].file}`,
        }),
      );
      process.exitCode = 1;
      return;
    }

    logger.warn(`Target file not found: ${missingExplicitTargets[0].file}`);
    process.exitCode = 1;
    return;
  }

  if (!options.json) {
    logger.heading("Envguard Check", `Source: ${template.examplePath}`);
  }

  if (options.perFile) {
    const missingByFile = Object.fromEntries(
      targets
        .map((target) => [
          target.name,
          collectMissingKeys(template.entries, target.entries),
        ])
        .filter(([, missingKeys]) => missingKeys.length),
    );

    if (options.json) {
      const files = targets.map((target) => {
        const missingKeys = collectMissingKeys(
          template.entries,
          target.entries,
        );

        return {
          file: target.name,
          status: missingKeys.length ? "missing" : "ok",
          missing: missingKeys,
        };
      });

      printJson({
        ...okPayload("check", {
          source: template.examplePath,
          mode: "per-file",
          files,
        }),
        status: Object.keys(missingByFile).length ? "missing" : "ok",
      });
      if (options.strict && Object.keys(missingByFile).length) {
        process.exitCode = 1;
      }
      return;
    }

    if (!Object.keys(missingByFile).length) {
      logger.success("All environment variables are present");
      return;
    }

    for (const [fileName, missingKeys] of Object.entries(missingByFile)) {
      logger.fileHeader(fileName, `${missingKeys.length} missing`);
      logger.list(missingKeys);
    }

    if (options.strict) process.exitCode = 1;
    return;
  }

  const combinedKeys = new Set();

  for (const target of targets) {
    Object.keys(target.entries).forEach((key) => combinedKeys.add(key));
  }

  const missing = Object.keys(template.entries).filter(
    (key) => !combinedKeys.has(key),
  );

  if (options.json) {
    printJson({
      ...okPayload("check", {
        source: template.examplePath,
        mode: options.all ? "merged-all" : "single-file",
        files: targets.map((target) => target.name),
        result: {
          missing,
          checkedKeyCount: Object.keys(template.entries).length,
        },
      }),
      status: missing.length ? "missing" : "ok",
    });
    if (options.strict && missing.length) {
      process.exitCode = 1;
    }
    return;
  }

  if (!missing.length) {
    logger.success("All environment variables are present");
    return;
  }

  logger.section("Missing Variables");
  logger.list(missing);

  if (options.strict) process.exitCode = 1;
}
