# @nurav/envguard

`@nurav/envguard` is a developer-first CLI for validating, fixing, syncing, and maintaining environment files across local, CI, and deployment workflows.

Package name:

```bash
@nurav/envguard
```

CLI command:

```bash
envguard
```

It helps teams avoid runtime failures caused by missing or inconsistent variables by keeping `.env` files aligned with `.env.example`.

By default, `.env.example` is the reference file, but you can now use any env file as the source with `--from`.

The project now includes automated CLI tests covering validation, sync, print, JSON output, missing-file errors, duplicate handling, and formatting behavior.

## Why use it

- Catch missing variables before runtime
- Repair env files automatically
- Keep multiple `.env.*` variants aligned
- Support CI checks with strict exit codes
- Produce JSON output for scripts and pipelines

## Install

```bash
npm install -g @nurav/envguard
```

For local development in this project:

```bash
npm install
npm run cli -- --help
```

## Quick Start

Validate the default `.env` file:

```bash
envguard check
```

Validate all env variants:

```bash
envguard check --all
```

Fix missing keys automatically:

```bash
envguard fix
```

Sync production config:

```bash
envguard sync --from .env.production --env staging
```

Add and remove variables:

```bash
envguard add DATABASE_URL=postgres://localhost/app
envguard remove REDIS_URL
```

Inspect values:

```bash
envguard print
envguard print DATABASE_URL
envguard print --all
envguard print --json
```

## How Targeting Works

`envguard` separates the source file from the target file:

- `--from <path>` chooses the reference template or source env file
- `--env <name>` chooses a target like `.env.production`
- `--file <path>` chooses an exact target file
- if no target is passed, `.env` is used

Example:

```bash
envguard sync --from .env.production --env staging
```

What this does:

- reads values from `.env.production`
- updates `.env.staging`
- adds missing keys from the source
- preserves existing staging values unless `--force` is used

## Command Reference

### `check`

Compares the source file with the target env file or files and reports missing keys.

Default source:

```bash
.env.example
```

Examples:

```bash
envguard check
envguard check --env production
envguard check --file .env.local
envguard check --all
envguard check --all --per-file
envguard check --strict
envguard check --json
envguard check --from .env.template
envguard check --from .env.production --env staging
```

What it does:

- checks whether required keys from the source exist in the target
- `--all` merges all `.env*` files and checks combined coverage
- `--per-file` checks each env file independently
- `--strict` exits with status code `1` if keys are missing
- `--json` prints machine-readable output
- `--from` lets you use any env file as the reference source

Useful flags:

- `--all`
- `--per-file`
- `--strict`
- `--json`
- `--from <path>`
- `--env <name>`
- `--file <path>`

### `fix`

Adds missing keys from the source into the target file without overwriting current values.

Examples:

```bash
envguard fix
envguard fix --env production
envguard fix --file .env.local
envguard fix --all
envguard fix --json
envguard fix --from .env.template
envguard fix --from .env.production --env staging
```

What it does:

- creates the target env file if it does not exist
- adds keys that are present in the source but missing in the target
- copies source defaults when values exist in the source
- keeps existing target values unchanged

Useful flags:

- `--all`
- `--json`
- `--from <path>`
- `--env <name>`
- `--file <path>`

### `sync`

Synchronizes target env files with the source file.

Examples:

```bash
envguard sync
envguard sync --env production
envguard sync --file .env.staging
envguard sync --all
envguard sync --force
envguard sync --json
envguard sync --from .env.template
envguard sync --from .env.production --env staging
envguard sync --from .env.shared --all
```

What it does:

- adds missing keys from the source into the target
- preserves target values by default
- with `--force`, overwrites target values with source values
- can use another env file as the source, not only `.env.example`

Useful flags:

- `--all`
- `--force`
- `--json`
- `--from <path>`
- `--env <name>`
- `--file <path>`

### `add`

Adds or updates one key in the target file.

```bash
envguard add KEY=value
envguard add KEY=value --env production
envguard add KEY=value --file .env.local
envguard add KEY=value --json
```

What it does:

- adds the key if it does not exist
- updates the key if it already exists
- avoids duplicate entries for the same key

### `remove`

Removes a key from the target file.

```bash
envguard remove KEY
envguard remove KEY --env production
envguard remove KEY --file .env.local
envguard remove KEY --json
```

What it does:

- removes the key from the selected target file
- removes duplicate copies of that key if present
- leaves unrelated lines and comments untouched

### `print`

Prints one key or all parsed keys from the target file.

```bash
envguard print
envguard print KEY
envguard print --env production
envguard print --all
envguard print KEY --all
envguard print --json
envguard print KEY --all --json
```

What it does:

- prints all keys from the selected env file by default
- prints one requested key when you pass a key name
- `--all` prints values from every discovered `.env*` file
- `KEY --all` shows that key across all env files
- `--json` outputs structured data and includes the source file name

## Publish Readiness

This project is set up for npm publishing as `@nurav/envguard`, and the package contents are restricted so local `.env*` files do not get shipped in the tarball.

1. Choose the final package name and make sure it is available on npm.
2. Update the version in `package.json` when you are ready to release.
3. Add any optional npm metadata you want, like repository, author, and homepage.
4. Run a final local check with:

```bash
npm test
npm pack
```

5. Publish with:

```bash
npm publish
```

Code-wise, the CLI is already set up for npm usage through the `bin` entry, restricted publish `files`, a license file, and automated CLI tests.

## File Resolution

Target resolution priority:

1. `--file <path>`
2. `--env <name>`
3. default `.env`

Examples:

```bash
envguard check --file .env.local
envguard check --env production
envguard fix --all
envguard sync --from .env.production --env staging
```

## CI Usage

Fail a pipeline if required variables are missing:

```bash
envguard check --strict
```

Machine-readable output:

```bash
envguard check --all --per-file --json
```

## Parsing Support

`envguard` supports:

- `KEY=value`
- quoted values
- empty values
- values containing `=`
- comments
- CRLF files
- multiline quoted values

## Documentation

Full command documentation is available in `docs/cli.md`.
