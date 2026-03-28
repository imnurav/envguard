#!/usr/bin/env node

import { APP_NAME, APP_VERSION } from "../constants/default.js";
import remove from "../commands/remove.js";
import check from "../commands/check.js";
import print from "../commands/print.js";
import sync from "../commands/sync.js";
import fix from "../commands/fix.js";
import add from "../commands/add.js";
import { program } from "commander";

function withTargetOptions(command) {
  return command
    .option("--file <path>", "target a specific env file")
    .option("--env <name>", "target a named env file variant");
}

function withTemplateOptions(command) {
  return command
    .option("--from <path>", "reference env file to use as the source template")
    .option("-e, --example <path>", "legacy alias for --from");
}

program.name(APP_NAME).version(APP_VERSION);

withTemplateOptions(
  withTargetOptions(
    program
      .command("check")
      .option("-a, --all", "check all .env* files")
      .option("-p, --per-file", "show missing keys for each target file")
      .option("-j, --json", "output JSON")
      .option("-s, --strict", "exit with code 1 if variables are missing"),
  ),
).action(check);

withTemplateOptions(
  withTargetOptions(
    program
      .command("fix")
      .option("-a, --all", "fix all .env* files")
      .option("-j, --json", "output JSON"),
  ),
).action(fix);

withTemplateOptions(
  withTargetOptions(
    program
      .command("sync")
      .option("-a, --all", "sync all .env* files")
      .option("-f, --force", "overwrite values from the source file")
      .option("-j, --json", "output JSON"),
  ),
).action(sync);

withTargetOptions(
  program.command("add <entry>").option("-j, --json", "output JSON"),
).action(add);
withTargetOptions(
  program.command("remove <key>").option("-j, --json", "output JSON"),
).action(remove);
withTargetOptions(
  program
    .command("print [key]")
    .option("-a, --all", "print values from all .env* files")
    .option("-j, --json", "output JSON"),
).action(print);

program.parse();
