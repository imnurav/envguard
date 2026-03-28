# @nurav/envguard CLI Guide

`@nurav/envguard` validates, repairs, and manages `.env` files against a source reference file.

Repository: [github.com/imnurav/envguard](https://github.com/imnurav/envguard)

README: [README.md](https://github.com/imnurav/envguard/blob/main/README.md)

Package name:

```bash
@nurav/envguard
```

CLI command:

```bash
envguard
```

Default source reference:

```bash
.env.example
```

You can override that with:

```bash
--from <path>
```

## Install

```bash
npm install -g @nurav/envguard
```

Run locally during development:

```bash
npm run cli -- <command>
```

## Source And Target Rules

`envguard` has two separate concepts:

- source file: the file used as the reference
- target file: the file that will be checked, fixed, synced, printed, or edited

Source priority:

1. `--from <path>`
2. `--example <path>`
3. default `.env.example`

Target priority:

1. `--file <path>`
2. `--env <name>`
3. default `.env`

Examples:

```bash
envguard sync --from .env.production --env staging
envguard check --from .env.template --file .env.local
envguard add API_URL=https://local --file .env.local
```

What these do:

- `envguard sync --from .env.production --env staging`
  updates `.env.staging` using `.env.production` as the source
- `envguard check --from .env.template --file .env.local`
  validates `.env.local` against `.env.template`
- `envguard add API_URL=https://local --file .env.local`
  inserts or updates `API_URL` in `.env.local`

## Commands

### `check`

Validate required keys from the source file.

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

Behavior:

- Default mode checks the source against the targeted file.
- `--all` merges keys across all `.env*` files except `.env.example`.
- `--per-file` reports missing keys for each file independently.
- `--strict` exits with code `1` when keys are missing.
- `--json` prints machine-readable output.
- `--from` uses another env file as the source reference.

### `fix`

Add missing keys from the source into the targeted env file or files without overwriting existing values.

```bash
envguard fix
envguard fix --env production
envguard fix --file .env.local
envguard fix --all
envguard fix --json
envguard fix --from .env.template
envguard fix --from .env.production --env staging
```

Behavior:

- Creates the target file if it does not exist.
- Copies values from the source file when they exist.
- Preserves existing values.
- `--from` lets you use any env file as the source.

### `sync`

Synchronize env files with the source.

```bash
envguard sync
envguard sync --env production
envguard sync --file .env.staging
envguard sync --all
envguard sync --force
envguard sync --json
envguard sync --from .env.template
envguard sync --from .env.production --env staging
```

Behavior:

- Adds missing keys from the source.
- Preserves current values by default.
- `--force` overwrites current values with source values.
- `--from` uses another env file as the source.

### `add`

Insert or update a variable in the targeted file.

```bash
envguard add DATABASE_URL=postgres://localhost/db
envguard add JWT_SECRET=abc123 --env production
envguard add REDIS_URL=redis://localhost --file .env.local
envguard add API_KEY=demo --json
```

Behavior:

- Requires `KEY=value` format.
- Updates an existing key instead of duplicating it.

### `remove`

Delete a variable from the targeted file.

```bash
envguard remove REDIS_URL
envguard remove JWT_SECRET --env production
envguard remove API_KEY --file .env.local
envguard remove API_KEY --json
```

Behavior:

- Removes all duplicate instances of the key if they exist.
- Leaves unrelated comments and lines untouched.

### `print`

Show env values from the targeted file.

```bash
envguard print
envguard print DATABASE_URL
envguard print --env production
envguard print --all
envguard print DATABASE_URL --all
envguard print --json
```

Behavior:

- Prints all parsed variables when no key is provided.
- Prints one value when a key is provided.
- `--all` prints values from every discovered `.env*` file.
- `KEY --all` prints the same key across all env files.
- JSON output includes the file name so you know which env file the values came from.
- Human-readable output prints the file name as a header before the values.
- Exits with code `1` if the requested key does not exist.

## JSON Output Examples

`check --json`

```json
{
  "command": "check",
  "status": "missing",
  "source": "/path/.env.example",
  "mode": "single-file",
  "files": [".env"],
  "result": {
    "missing": ["DATABASE_URL", "REDIS_URL"],
    "checkedKeyCount": 3
  }
}
```

`check --all --per-file --json`

```json
{
  "command": "check",
  "status": "missing",
  "source": "/path/.env.example",
  "mode": "per-file",
  "files": [
    {
      "file": ".env",
      "status": "missing",
      "missing": ["DATABASE_URL"]
    },
    {
      "file": ".env.production",
      "status": "missing",
      "missing": ["JWT_SECRET"]
    }
  ]
}
```

`fix --json`

```json
{
  "command": "fix",
  "status": "ok",
  "source": "/path/.env.example",
  "files": [
    {
      "file": ".env",
      "added": ["DATABASE_URL", "REDIS_URL"],
      "addedCount": 2
    }
  ],
  "result": {
    "updated": {
      ".env": ["DATABASE_URL", "REDIS_URL"]
    }
  }
}
```

`print --json`

```json
{
  "command": "print",
  "status": "ok",
  "target": ".env",
  "result": {
    "values": {
      "JWT_SECRET": "",
      "DATABASE_URL": "",
      "REDIS_URL": ""
    }
  }
}
```

`print DATABASE_URL --all --json`

```json
{
  "command": "print",
  "status": "ok",
  "mode": "all",
  "result": {
    "key": "DATABASE_URL",
    "files": {
      ".env": "postgres://localhost/app",
      ".env.production": "postgres://prod/app"
    }
  }
}
```

## Supported Files

`envguard` works with:

- `.env`
- `.env.local`
- `.env.development`
- `.env.production`
- `.env.staging`
- `.env.test`
- custom `.env.*` variants

## Notes

- `.env.example` is treated as the source by default.
- `--from` is the preferred way to choose another source file.
- `--example` is still supported as a legacy alias.
- Missing template files show a warning or JSON error payload.
- Empty values, quoted values, and values containing `=` are supported.
- Multiline quoted values are parsed safely.
