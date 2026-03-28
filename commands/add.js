import { okPayload, printJson } from "../utils/json-output.js";
import { resolveEnvFile } from "../core/resolver.js";
import { upsertVar } from "../core/writer.js";
import { logger } from "../utils/logger.js";

export default function add(entry, options) {
  const file = resolveEnvFile(options);
  const quiet = Boolean(options.json);
  const separatorIndex = entry.indexOf("=");

  if (separatorIndex === -1) {
    logger.error("Entry must be in KEY=value format");
    process.exitCode = 1;
    return;
  }

  const key = entry.slice(0, separatorIndex).trim();
  const value = entry.slice(separatorIndex + 1);

  if (!key) {
    logger.error("Environment variable key cannot be empty");
    process.exitCode = 1;
    return;
  }

  const result = upsertVar(file, key, value, { overwrite: true });

  if (quiet) {
    printJson(
      okPayload("add", {
        target: file,
        result: {
          key,
          value,
          action: result.added ? "created" : "updated",
        },
      }),
    );
    return;
  }

  logger.heading("Envguard Add", `Target: ${file}`);
  logger.fileHeader(key, result.added ? "created" : "updated");
  logger.keyValue("value", value || "(empty)");
}
