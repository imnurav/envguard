import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const CLI_PATH = path.resolve(process.cwd(), "bin/index.js");

function createWorkspace(files = {}) {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "envguard-test-"));

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(workspace, relativePath);
    fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
    fs.writeFileSync(absolutePath, content);
  }

  return workspace;
}

function runCli(workdir, args) {
  return spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd: workdir,
    encoding: "utf8",
  });
}

function parseJsonOutput(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

test("check --json reports source, mode, and missing keys", () => {
  const workspace = createWorkspace({
    ".env.example": "JWT_SECRET=\nDATABASE_URL=\nREDIS_URL=\n",
    ".env": "JWT_SECRET=local\n",
  });

  const result = runCli(workspace, ["check", "--json"]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.status, 0);
  assert.equal(payload.command, "check");
  assert.equal(payload.status, "missing");
  assert.equal(payload.mode, "single-file");
  assert.deepEqual(payload.files, [".env"]);
  assert.deepEqual(payload.result.missing, ["DATABASE_URL", "REDIS_URL"]);
});

test("check fails clearly for an explicit missing target file", () => {
  const workspace = createWorkspace({
    ".env.example": "JWT_SECRET=\n",
  });

  const result = runCli(workspace, ["check", "--file", ".env.local", "--json"]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(payload.command, "check");
  assert.equal(payload.status, "error");
  assert.match(payload.error, /Target file not found/);
});

test("sync can use --from to update another env file", () => {
  const workspace = createWorkspace({
    ".env.production": "DATABASE_URL=prod-db\nJWT_SECRET=prod-secret\n",
    ".env.staging": "JWT_SECRET=staging-secret\n",
  });

  const result = runCli(workspace, [
    "sync",
    "--from",
    ".env.production",
    "--env",
    "staging",
    "--json",
  ]);
  const payload = parseJsonOutput(result);
  const stagingContent = fs.readFileSync(path.join(workspace, ".env.staging"), "utf8");

  assert.equal(payload.command, "sync");
  assert.equal(fs.realpathSync(payload.source), fs.realpathSync(path.join(workspace, ".env.production")));
  assert.deepEqual(payload.result.updated[".env.staging"], ["DATABASE_URL"]);
  assert.match(stagingContent, /JWT_SECRET=staging-secret/);
  assert.match(stagingContent, /DATABASE_URL=prod-db/);
});

test("print --json includes target context", () => {
  const workspace = createWorkspace({
    ".env": "JWT_SECRET=local\n",
  });

  const result = runCli(workspace, ["print", "--json"]);
  const payload = parseJsonOutput(result);

  assert.equal(payload.command, "print");
  assert.equal(payload.target, ".env");
  assert.deepEqual(payload.result.values, { JWT_SECRET: "local" });
});

test("print KEY --all --json shows values by env file", () => {
  const workspace = createWorkspace({
    ".env": "DATABASE_URL=local-db\n",
    ".env.production": "DATABASE_URL=prod-db\n",
  });

  const result = runCli(workspace, ["print", "DATABASE_URL", "--all", "--json"]);
  const payload = parseJsonOutput(result);

  assert.equal(payload.command, "print");
  assert.equal(payload.mode, "all");
  assert.equal(payload.result.key, "DATABASE_URL");
  assert.equal(payload.result.files[".env"], "local-db");
  assert.equal(payload.result.files[".env.production"], "prod-db");
});

test("add and remove support JSON output", () => {
  const workspace = createWorkspace({
    ".env": "JWT_SECRET=local\n",
  });

  const addResult = runCli(workspace, ["add", "API_KEY=demo", "--json"]);
  const addPayload = parseJsonOutput(addResult);
  assert.equal(addPayload.command, "add");
  assert.equal(addPayload.result.action, "created");
  assert.equal(addPayload.result.key, "API_KEY");

  const removeResult = runCli(workspace, ["remove", "API_KEY", "--json"]);
  const removePayload = parseJsonOutput(removeResult);
  assert.equal(removePayload.command, "remove");
  assert.equal(removePayload.result.key, "API_KEY");
  assert.equal(removePayload.result.removedCount, 1);
});

test("fix cleans messy blank lines while preserving comments", () => {
  const workspace = createWorkspace({
    ".env.example": "REDIS_URL=\nDATABASE_URL=\nJWT_SECRET=\nKEY=value\n",
    ".env": "# env\nREDIS_URL=\nDATABASE_URL=\nJWT_SECRET=\n\n\nKEY=value\n\n# other env\nDATABASE_URL=Hello\n\n\nKEY=value\n\nREDIS_URL=\nJWT_SECRET=\n",
  });

  const result = runCli(workspace, ["fix"]);
  const envContent = fs.readFileSync(path.join(workspace, ".env"), "utf8");

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(
    envContent,
    "# env\nREDIS_URL=\nDATABASE_URL=\nJWT_SECRET=\nKEY=value\n\n# other env\nDATABASE_URL=Hello\nKEY=value\nREDIS_URL=\nJWT_SECRET=\n",
  );
});

test("check --all --per-file --json returns file-by-file statuses", () => {
  const workspace = createWorkspace({
    ".env.example": "JWT_SECRET=\nDATABASE_URL=\n",
    ".env": "JWT_SECRET=local\n",
    ".env.production": "DATABASE_URL=prod\n",
  });

  const result = runCli(workspace, ["check", "--all", "--per-file", "--json"]);
  const payload = parseJsonOutput(result);

  assert.equal(payload.command, "check");
  assert.equal(payload.mode, "per-file");
  assert.deepEqual(payload.files, [
    { file: ".env", status: "missing", missing: ["DATABASE_URL"] },
    { file: ".env.production", status: "missing", missing: ["JWT_SECRET"] },
  ]);
});

test("check --strict exits with code 1 when variables are missing", () => {
  const workspace = createWorkspace({
    ".env.example": "JWT_SECRET=\nDATABASE_URL=\n",
    ".env": "JWT_SECRET=local\n",
  });

  const result = runCli(workspace, ["check", "--strict"]);

  assert.equal(result.status, 1);
  assert.match(result.stdout, /Missing Variables/);
  assert.match(result.stdout, /DATABASE_URL/);
});

test("check --strict exits with code 0 when all variables are present", () => {
  const workspace = createWorkspace({
    ".env.example": "JWT_SECRET=\nDATABASE_URL=\n",
    ".env": "JWT_SECRET=local\nDATABASE_URL=db\n",
  });

  const result = runCli(workspace, ["check", "--strict"]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /All environment variables are present/);
});

test("sync --force overwrites target values from the source file", () => {
  const workspace = createWorkspace({
    ".env.production": "DATABASE_URL=prod-db\nJWT_SECRET=prod-secret\n",
    ".env.staging": "DATABASE_URL=staging-db\nJWT_SECRET=staging-secret\n",
  });

  const result = runCli(workspace, [
    "sync",
    "--from",
    ".env.production",
    "--env",
    "staging",
    "--force",
    "--json",
  ]);
  const payload = parseJsonOutput(result);
  const stagingContent = fs.readFileSync(path.join(workspace, ".env.staging"), "utf8");

  assert.equal(payload.command, "sync");
  assert.equal(payload.overwrite, true);
  assert.deepEqual(payload.result.updated[".env.staging"], [
    "DATABASE_URL",
    "JWT_SECRET",
  ]);
  assert.match(stagingContent, /DATABASE_URL=prod-db/);
  assert.match(stagingContent, /JWT_SECRET=prod-secret/);
});

test("check returns a JSON error when the source file is missing", () => {
  const workspace = createWorkspace({
    ".env": "JWT_SECRET=local\n",
  });

  const result = runCli(workspace, ["check", "--json"]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(payload.command, "check");
  assert.equal(payload.status, "error");
  assert.match(payload.error, /Source file not found/);
});

test("fix returns a JSON error when the source file is missing", () => {
  const workspace = createWorkspace({
    ".env": "JWT_SECRET=local\n",
  });

  const result = runCli(workspace, ["fix", "--json"]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(payload.command, "fix");
  assert.equal(payload.status, "error");
  assert.match(payload.error, /Source file not found/);
});

test("sync returns a JSON error when the source file is missing", () => {
  const workspace = createWorkspace({
    ".env": "JWT_SECRET=local\n",
  });

  const result = runCli(workspace, ["sync", "--json"]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(payload.command, "sync");
  assert.equal(payload.status, "error");
  assert.match(payload.error, /Source file not found/);
});

test("print returns a JSON error for an explicit missing target file", () => {
  const workspace = createWorkspace({});

  const result = runCli(workspace, ["print", "--file", ".env.local", "--json"]);
  const payload = JSON.parse(result.stdout);

  assert.equal(result.status, 1);
  assert.equal(payload.command, "print");
  assert.equal(payload.status, "error");
  assert.match(payload.error, /Target file not found/);
});

test("add preserves quoted values and equals signs", () => {
  const workspace = createWorkspace({
    ".env": "",
  });

  const result = runCli(workspace, [
    "add",
    'DATABASE_URL=postgres://user:pass@host/db?sslmode=require',
  ]);
  const envContent = fs.readFileSync(path.join(workspace, ".env"), "utf8");

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(envContent, /DATABASE_URL=postgres:\/\/user:pass@host\/db\?sslmode=require/);
});

test("print parses quoted multiline values and values with equals signs", () => {
  const workspace = createWorkspace({
    ".env": 'MULTILINE="line1\nline2"\nDATABASE_URL="postgres://user:pass@host/db?x=y"\n',
  });

  const result = runCli(workspace, ["print", "--json"]);
  const payload = parseJsonOutput(result);

  assert.deepEqual(payload.result.values, {
    MULTILINE: "line1\nline2",
    DATABASE_URL: "postgres://user:pass@host/db?x=y",
  });
});

test("add removes duplicate keys by keeping a single updated value", () => {
  const workspace = createWorkspace({
    ".env": "API_KEY=old\nAPI_KEY=older\n",
  });

  const result = runCli(workspace, ["add", "API_KEY=new-value"]);
  const envContent = fs.readFileSync(path.join(workspace, ".env"), "utf8");

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(envContent, "API_KEY=new-value\n");
});

test("remove deletes all duplicate copies of a key", () => {
  const workspace = createWorkspace({
    ".env": "API_KEY=first\nJWT_SECRET=keep\nAPI_KEY=second\n",
  });

  const result = runCli(workspace, ["remove", "API_KEY", "--json"]);
  const payload = parseJsonOutput(result);
  const envContent = fs.readFileSync(path.join(workspace, ".env"), "utf8");

  assert.equal(payload.result.removedCount, 2);
  assert.equal(envContent, "JWT_SECRET=keep\n");
});
