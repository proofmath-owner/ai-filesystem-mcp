# CLAUDE.md

Guidance for Claude Code when working **inside this repo**.

## What this repo is

A one-tool MCP server. The tool is `transaction`: apply N file operations as
one atomic batch with automatic rollback. That is the entire product surface.

It used to ship 39 commands (file I/O, search, git, code analysis, shell,
archives, …) and that overlap with your built-in tools is exactly why the
project was pared down. Everything but `transaction` was removed because you
already have it.

## The contract

`TransactionCommand` (`src/commands/implementations/batch/TransactionCommand.ts`)
exposes an MCP tool with this shape — keep code, schema, and README aligned
on any change:

| `type` | Required | Behavior |
| --- | --- | --- |
| `create` | `path`, `content` | New file; `mkdir -p` parent. |
| `write` | `path`, `content` | Overwrite existing file. |
| `update` | `path`, `updates[]` | For each `{oldText, newText}` apply `String.replace` in order. |
| `move` | `path`, `destination` | `fs.rename`. |
| `delete` | `path` | `unlink` for files, `rm -r` for directories. |

`rollbackOnError` defaults to `true`. On failure, every operation that
already executed is reverted from a backup taken before the batch ran.

## Architecture

```
src/index.ts                    MCP stdio server entry
  └── core/ServiceContainer.ts  Minimal DI, registers TransactionService
src/commands/registry/          BaseCommand / CommandRegistry / CommandLoader
src/commands/implementations/batch/TransactionCommand.ts
src/core/services/batch/TransactionService.ts   on-disk backup + restore
```

~9 .ts files total. Keep it that way. No new tools without a very clear
argument that the agent literally cannot do the thing on its own.

## Conventions

- Every command extends `BaseCommand` (`src/commands/base/BaseCommand.ts`):
  implement `validateArgs()` + `executeCommand()`, register in
  `CommandLoader.loadCommands()`.
- Services come from the container:
  `context.container.getService<T>('transactionService')`.
- Errors: throw inside `executeCommand`; `BaseCommand.execute` formats them.
- Use `execFile` (not `exec`) with array args anywhere shell is needed.
- TS is strict-friendly. `npm run build` is plain `tsc` — do not reintroduce
  `tsc || true`.

## Commands

```bash
npm install
npm run dev      # tsx watch on src/index.ts
npm run build    # tsc -> dist/
npm run start    # node dist/index.js
npm run lint
npm run format
```

No test suite yet — adding focused tests for `transaction` (rollback path,
each op type, concurrent batches) is the most valuable single follow-up.

## What NOT to do

- Do not add file I/O, search, git, code analysis, or shell tools. The agent
  already has them. Adding a wrapper just adds latency.
- Do not advertise streaming, worker pools, or any capability not actually
  implemented.
- Do not let `transaction` silently widen its operation set. Every new `type`
  must update: code, schema, README table, CLAUDE.md table, CHANGELOG.

## Security posture

Local trusted-agent only. No path sandbox, no shell allowlist. The trust
boundary is the user's machine.
