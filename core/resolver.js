import {
  DEFAULT_ENV_FILE,
  DEFAULT_EXAMPLE_FILE,
} from "../constants/default.js";
import path from "path";
import fs from "fs";

export function resolveEnvFile(options = {}) {
  const cwd = process.cwd();

  if (options.file) return path.resolve(cwd, options.file);
  if (options.env) return path.resolve(cwd, `.env.${options.env}`);

  return path.resolve(cwd, DEFAULT_ENV_FILE);
}

export function resolveExampleFile(options = {}) {
  const cwd = process.cwd();

  if (options.from) return path.resolve(cwd, options.from);
  if (options.example) return path.resolve(cwd, options.example);

  return path.resolve(cwd, DEFAULT_EXAMPLE_FILE);
}

export function discoverEnvFiles(cwd = process.cwd()) {
  return fs
    .readdirSync(cwd)
    .filter((file) => file.startsWith(".env") && file !== DEFAULT_EXAMPLE_FILE)
    .sort((left, right) => {
      if (left === DEFAULT_ENV_FILE) return -1;
      if (right === DEFAULT_ENV_FILE) return 1;
      return left.localeCompare(right);
    })
    .map((file) => path.resolve(cwd, file));
}

export function resolveTargetFiles(options = {}) {
  if (options.all) {
    const discovered = discoverEnvFiles();

    if (discovered.length) return discovered;

    return [resolveEnvFile(options)];
  }

  return [resolveEnvFile(options)];
}

export function hasExplicitTarget(options = {}) {
  return Boolean(options.file || options.env);
}
