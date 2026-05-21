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

Everything else this server used to ship (file I/O, search, git, code
analysis, shell execution, archives, diffs, metadata, encryption, file
watcher, …) overlapped with the agent's own built-in tools. Earlier 2.x / 3.x
versions kept those as wrappers; 4.0 removes them entirely. Your agent already
has them.

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
