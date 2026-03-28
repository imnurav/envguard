import { appendVars, ensureEnvFile, syncVars } from "./writer.js";
import { parseEnv } from "./parser.js";
import path from "path";
import fs from "fs";
import {
  hasExplicitTarget,
  resolveExampleFile,
  resolveTargetFiles,
} from "./resolver.js";

export function loadTemplate(options = {}) {
  const examplePath = resolveExampleFile(options);

  if (!fs.existsSync(examplePath)) {
    return {
      examplePath,
      entries: {},
      missing: true,
    };
  }

  return {
    examplePath,
    entries: parseEnv(examplePath),
    missing: false,
  };
}

export function collectMissingKeys(templateEntries, targetEntries) {
  return Object.keys(templateEntries).filter((key) => !(key in targetEntries));
}

export function checkTargets(options = {}) {
  const template = loadTemplate(options);

  if (template.missing) {
    return {
      template,
      targets: [],
    };
  }

  const files = resolveTargetFiles(options);
  const explicitTarget = hasExplicitTarget(options);

  return {
    template,
    targets: files.map((file) => ({
      file,
      name: path.basename(file),
      exists: fs.existsSync(file),
      explicit: explicitTarget,
      entries: parseEnv(file),
    })),
  };
}

export function fixTargets(options = {}) {
  const { template, targets } = checkTargets(options);

  if (template.missing) {
    return { template, results: [] };
  }

  return {
    template,
    results: targets.map((target) => {
      ensureEnvFile(target.file);

      const missingKeys = collectMissingKeys(template.entries, target.entries);
      const missingEntries = Object.fromEntries(
        missingKeys.map((key) => [key, template.entries[key] ?? ""]),
      );
      const addedKeys = appendVars(target.file, missingEntries);

      return {
        file: target.file,
        name: target.name,
        addedKeys,
      };
    }),
  };
}

export function syncTargets(options = {}) {
  const { template, targets } = checkTargets(options);

  if (template.missing) {
    return { template, results: [] };
  }

  return {
    template,
    results: targets.map((target) => {
      ensureEnvFile(target.file);
      const changedKeys = syncVars(target.file, template.entries, {
        overwrite: Boolean(options.force),
      });

      return {
        file: target.file,
        name: target.name,
        changedKeys,
      };
    }),
  };
}
