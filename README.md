# ai-filesystem-mcp

**Your AI agent's Edit isn't atomic. This MCP makes it so.**

A single-tool MCP server for atomic multi-file changes with automatic
rollback — built for Claude Code, Codex CLI, Cursor agents, and other modern
coding agents.

Those agents ship with excellent built-in tools for reading, writing,
searching, editing, and shell. They do not ship with a primitive for
**"apply these N file operations as one transaction; if any of them fail,
revert everything."** That is the one and only thing this MCP provides.

## The tool

`transaction` — apply a batch of file operations atomically.

```jsonc
{
  "name": "transaction",
  "arguments": {
    "operations": [
      { "type": "create", "path": "src/feature.ts",  "content": "..." },
      { "type": "write",  "path": "src/index.ts",    "content": "..." },
      { "type": "update", "path": "src/lib/util.ts",
        "updates": [{ "oldText": "foo()", "newText": "foo(arg)" }] },
      { "type": "move",   "path": "src/old.ts", "destination": "src/legacy/old.ts" },
      { "type": "delete", "path": "src/dead.ts" }
    ],
    "rollbackOnError": true
  }
}
```

If operation 4 fails, operations 1-3 are restored from backup before the call
returns. If everything succeeds, backups are cleaned up.

### Operation kinds

| `type` | Required fields | What it does |
| --- | --- | --- |
| `create` | `path`, `content` | Make a new file (creates parent dirs). |
| `write` | `path`, `content` | Overwrite an existing file. |
| `update` | `path`, `updates[]` | In-place `String.replace(oldText, newText)` for each update, in order. |
| `move` | `path`, `destination` | Rename `path` → `destination`. |
| `delete` | `path` | Remove a file or directory (recursive). |

## Why one tool

Earlier 2.x versions shipped 39 commands: file I/O, search, git, code
analysis, shell, archives, diffs, metadata, encryption, file watcher.
Modern coding agents already do all of that better with their own
Read / Edit / Write / Grep / Glob / Bash tools — wrapping those in MCP
only adds latency and a new failure surface.

What an agent's `Edit` cannot do is treat several file changes as one
unit of work. If op 4 of 5 fails, ops 1-3 are already on disk. Until
the agent grows a real transaction primitive, that gap is filled
externally — which is the entire job of this server.

## When you actually need this

You probably don't need it for a typical "fix this bug" turn. You do
need it when a single logical change must touch several files together:

- DB migration: schema file + matching ORM model + matching test
  fixtures must all land or all revert.
- Cross-cutting rename / refactor that spans many files and would
  half-apply if the agent crashes or runs out of context mid-stream.
- Generated-code updates where the generator output and the hand-edited
  glue must stay in sync.
- Config + corresponding code change (e.g. routing table entry +
  handler), where the half state is broken.

If your edit fits in one file, just use the agent's `Edit`. If it
fits in one shell command, just use `Bash`. Reach for `transaction`
only when "all or nothing" actually matters.

## Install

Requires Node.js ≥ 18.

```bash
npm install -g ai-filesystem-mcp
```

Or from source:

```bash
git clone https://github.com/proofmath-owner/ai-filesystem-mcp.git
cd ai-filesystem-mcp
npm install
npm run build
node dist/index.js
```

## Configure (Claude Code / Codex CLI / any MCP client)

```json
{
  "mcpServers": {
    "ai-filesystem": {
      "command": "node",
      "args": ["/absolute/path/to/ai-filesystem-mcp/dist/index.js"]
    }
  }
}
```

Speaks stdio JSON-RPC. No network ports.

## Trust model

Runs locally beside a trusted AI agent as the user that started it. There is
no path sandbox; the trust boundary is your machine. Do not expose to
untrusted clients.

## Development

```bash
npm install
npm run dev      # tsx watch on src/index.ts
npm run build    # tsc -> dist/
npm run lint
npm run format
```

`tsc` errors fail the build. No `tsc || true`.

## License

MIT
