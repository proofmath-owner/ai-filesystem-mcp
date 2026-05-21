# CLAUDE.md

Guidance for Claude Code when working **inside this repo**.

## What this repo is

An MCP (Model Context Protocol) server that exposes **6 tools** focused on
things modern coding agents (you) cannot do well on your own. It is NOT a
generic file/git/shell toolbox — those overlap with your built-in Read / Edit
/ Grep / Bash and were intentionally removed in 3.0.

## Tools the server exposes (do not duplicate these in code)

- `transaction` — atomic multi-file write/update/move/delete/create with
  automatic rollback on failure.
- `file_watcher` — chokidar-backed watcher that survives across MCP turns
  (start / stop / status / recent events).
- `scan_secrets`, `security_audit` — pattern-based secret detection (AWS,
  GitHub, Slack, Stripe, JWT, RSA/SSH, DB URLs, generic API keys).
- `encrypt_file`, `decrypt_file` — AES-256-GCM with PBKDF2-SHA256 (600k
  iters), 12-byte IV, versioned file header. Legacy (pre-header, 100k iters)
  blobs are still decryptable.

## Architecture

```
src/index.ts                    MCP stdio server entry
  └── core/ServiceContainer.ts  Minimal DI: 3 services
        ├── SecurityService     (uses SecretScanner + EncryptionService)
        ├── TransactionService
        └── FileWatcherService
src/commands/registry/          BaseCommand / CommandRegistry / CommandLoader
src/commands/implementations/   6 command classes (one per tool)
```

Total source: ~22 `.ts` files. Keep it that way unless adding a new tool that
clearly does not overlap with agent built-ins.

## Conventions

- Every command extends `BaseCommand` (`src/commands/base/BaseCommand.ts`),
  implements `validateArgs()` / `executeCommand()`, and registers itself in
  `CommandLoader.loadCommands()`.
- Services are pulled from the container via
  `context.container.getService<T>('serviceName')`.
- Error path: throw inside `executeCommand`; `BaseCommand.execute` catches and
  formats as a structured error result.
- No `child_process.exec` with string interpolation. Anywhere shell is needed
  in the future, use `execFile` (or `execa`) with array args.
- TS is strict-friendly. `npm run build` invokes plain `tsc` — do not
  re-introduce `tsc || true`.

## Commands

```bash
npm install
npm run dev      # tsx watch on src/index.ts
npm run build    # tsc -> dist/
npm run start    # node dist/index.js
npm run lint
npm run format
```

There is no test suite right now (the legacy Jest tests were tied to the
removed 39-tool surface). Adding focused tests for the 6 remaining tools is
a good follow-up.

## What NOT to do

- Do not add `read_file` / `write_file` / `search_files` / `execute_shell` /
  `git_*` style tools. The agent already has them.
- Do not pull in babel/AST parsers, archive libs, `natural`, or `command-exists`.
  Those were removed with the categories they served.
- Do not advertise streaming / worker pools / "100x event-based watching"
  unless they are actually implemented.

## Security posture

Local trusted-agent only. No path sandboxing, no command allowlist — the trust
boundary is the user's machine. Anything that needs to run server-to-untrusted
clients would be a separate project.
