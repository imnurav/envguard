import { resolveEnvFile } from "../core/resolver.js";
import { removeVar } from "../core/writer.js";
import { okPayload, printJson } from "../utils/json-output.js";
import { logger } from "../utils/logger.js";

export default function remove(key, options) {
  const file = resolveEnvFile(options);
  const quiet = Boolean(options.json);
  const result = removeVar(file, key);

  if (!result.removed) {
    logger.warn(`${key} was not found in ${file}`);
    return;
  }

  if (quiet) {
    printJson(
      okPayload("remove", {
        target: file,
        result: {
          key,
          removedCount: result.count,
        },
      }),
    );
    return;
  }

  logger.heading("Envguard Remove", `Target: ${file}`);
  logger.fileHeader(key, "removed");
  logger.keyValue("matches", String(result.count));
}
