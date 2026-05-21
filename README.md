# ai-filesystem-mcp

A focused [Model Context Protocol](https://modelcontextprotocol.io) server that
exposes a small set of tools your AI agent (Claude Code, Codex CLI, …) cannot
trivially do on its own.

Modern coding agents already have great built-in file/search/edit/shell tools.
This server intentionally does **not** re-implement those. It adds only the
operations that benefit from a long-lived process, atomicity, or careful
crypto.

## Tools (6)

| Tool | Why it exists |
| --- | --- |
| `transaction` | Apply a batch of file writes / updates / moves / deletes / creates **atomically**. Any failure rolls all of them back. The agent's per-file `Edit` is not transactional. |
| `file_watcher` | A single tool with an `action` argument (`start` / `stop` / `status` / `events`) that keeps a chokidar watcher alive across agent turns. The agent's own session cannot host a persistent watcher. |
| `scan_secrets` | Pattern-based secret scan (AWS, GitHub, Slack, Stripe, JWT, RSA/SSH keys, DB URLs, generic API keys) with severity scoring. |
| `security_audit` | Higher-level scan over a directory. Wraps `scan_secrets` and produces a structured report. |
| `encrypt_file` | AES-256-GCM with PBKDF2-SHA256 (600 000 iterations), 12-byte IV, 32-byte salt, versioned file header so future format upgrades stay decryptable. |
| `decrypt_file` | Decrypts both the new v1 header format and the legacy (pre-header, 100 000-iteration) blobs produced by older versions of this server. |

## Install

Requires Node.js ≥ 18.

```bash
npm install -g ai-filesystem-mcp
```

Or run from source:

```bash
git clone https://github.com/proofmath-owner/ai-filesystem-mcp.git
cd ai-filesystem-mcp
npm install
npm run build
node dist/index.js
```

## Configure (Claude Code / Codex CLI / any MCP client)

Example `claude_desktop_config.json` / equivalent:

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

The server speaks stdio JSON-RPC. No network ports are opened.

## Trust model

This server is meant to run **locally** alongside a trusted AI agent. It does
not sandbox absolute filesystem paths or shell out to anything beyond the
chokidar watcher and Node `crypto`. Treat it like any other process running as
your user. Do not expose it to untrusted clients.

## Development

```bash
npm install
npm run dev      # tsx watch on src/index.ts
npm run build    # tsc -> dist/
npm run lint
npm run format
```

The TypeScript build is strict-friendly. `tsc` errors fail the build (no more
silent `|| true`).

## What used to be here

Earlier 2.x versions shipped ~39 commands covering file I/O, search, git,
code analysis, shell execution, archives, diffs, metadata, etc. With the
maturity of Claude Code and Codex CLI, those overlapped with the agent's own
tools and were removed in 3.0. If you need them, your agent already has them.

## License

MIT
