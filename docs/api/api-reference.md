# AI FileSystem MCP API Reference

AI-optimized Model Context Protocol server for intelligent file system operations.

## Overview

This API provides **39 commands** across **7 categories** for comprehensive file system management.

## Categories

### Code Analysis (4 commands)

- [`analyze_code`](#analyze-code): Analyze code structure and metrics
- [`suggest_refactoring`](#suggest-refactoring): Get AI-powered refactoring suggestions
- [`modify_code`](#modify-code): Apply code modifications based on instructions
- [`format_code`](#format-code): Format code according to language standards

### Directory Operations (3 commands)

- [`create_directory`](#create-directory): Create a directory and its parent directories if needed
- [`list_directory`](#list-directory): List contents of a directory
- [`remove_directory`](#remove-directory): Remove a directory and optionally its contents

### File Operations (8 commands)

- [`read_file`](#read-file): Read the contents of a file
- [`write_file`](#write-file): Write content to a file
- [`read_files`](#read-files): Read multiple files in a single operation
- [`update_file`](#update-file): Update specific parts of a file using find-and-replace
- [`move_file`](#move-file): Move or rename a file
- [`copy_file`](#copy-file): Copy a file to a new location
- [`delete_file`](#delete-file): Delete a file
- [`get_file_metadata`](#get-file-metadata): Get detailed metadata about a file

### Git Operations (10 commands)

- [`git_status`](#git-status): Get the status of a Git repository
- [`git_add`](#git-add): Stage files for commit
- [`git_commit`](#git-commit): Create a Git commit
- [`git_push`](#git-push): Push commits to remote repository
- [`git_pull`](#git-pull): Pull changes from remote repository
- [`git_branch`](#git-branch): List, create, or switch Git branches
- [`git_log`](#git-log): Get Git commit history
- [`git_diff`](#git-diff): Show differences between commits, branches, or files
- [`git_merge`](#git-merge): Merge branches in Git
- [`git_reset`](#git-reset): Reset Git repository state

### Search Operations (4 commands)

- [`search_files`](#search-files): Search for files by name pattern
- [`search_content`](#search-content): Search for content within files
- [`fuzzy_search`](#fuzzy-search): Perform fuzzy search for files and content
- [`semantic_search`](#semantic-search): AI-powered semantic search for code and content

### Security Operations (5 commands)

- [`encrypt_file`](#encrypt-file): Encrypt a file using AES encryption
- [`decrypt_file`](#decrypt-file): Decrypt an encrypted file
- [`scan_secrets`](#scan-secrets): Scan for potentially sensitive information in code
- [`security_audit`](#security-audit): Perform a comprehensive security audit
- [`execute_shell`](#execute-shell): Execute shell commands with security restrictions

### Utility Operations (5 commands)

- [`diff_files`](#diff-files): Compare two files and show differences
- [`compress_files`](#compress-files): Compress files or directories into an archive
- [`extract_archive`](#extract-archive): Extract files from an archive
- [`watch_files`](#watch-files): Watch files or directories for changes
- [`get_system_info`](#get-system-info): Get system information and metrics

## Commands

### read_file

**Category:** File Operations

Read the contents of a file

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to the file to read |
| `encoding` | `string` | ❌ | File encoding (default: utf-8) |

#### Example

```typescript
const result = await mcp.execute('read_file', {
  "path": "example_value"
});
```

---

### write_file

**Category:** File Operations

Write content to a file

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path where to write the file |
| `content` | `string` | ✅ | Content to write |
| `createDirectories` | `boolean` | ❌ | Create parent directories if needed |

#### Example

```typescript
const result = await mcp.execute('write_file', {
  "path": "example_value",
  "content": "example_value"
});
```

---

### read_files

**Category:** File Operations

Read multiple files in a single operation

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `paths` | `array` | ✅ | Array of file paths to read |
| `encoding` | `string` | ❌ | File encoding for all files |

#### Example

```typescript
const result = await mcp.execute('read_files', {
  "paths": [
    "example"
  ]
});
```

---

### update_file

**Category:** File Operations

Update specific parts of a file using find-and-replace

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to the file to update |
| `changes` | `array` | ✅ | Array of change objects with oldText and newText |
| `backup` | `boolean` | ❌ | Create backup before updating |

#### Example

```typescript
const result = await mcp.execute('update_file', {
  "path": "example_value",
  "changes": [
    "example"
  ]
});
```

---

### move_file

**Category:** File Operations

Move or rename a file

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sourcePath` | `string` | ✅ | Current file path |
| `destinationPath` | `string` | ✅ | New file path |
| `overwrite` | `boolean` | ❌ | Overwrite destination if exists |

#### Example

```typescript
const result = await mcp.execute('move_file', {
  "sourcePath": "example_value",
  "destinationPath": "example_value"
});
```

---

### copy_file

**Category:** File Operations

Copy a file to a new location

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `sourcePath` | `string` | ✅ | Source file path |
| `destinationPath` | `string` | ✅ | Destination file path |
| `overwrite` | `boolean` | ❌ | Overwrite destination if exists |

#### Example

```typescript
const result = await mcp.execute('copy_file', {
  "sourcePath": "example_value",
  "destinationPath": "example_value"
});
```

---

### delete_file

**Category:** File Operations

Delete a file

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to the file to delete |
| `force` | `boolean` | ❌ | Force deletion without prompts |

#### Example

```typescript
const result = await mcp.execute('delete_file', {
  "path": "example_value"
});
```

---

### get_file_metadata

**Category:** File Operations

Get detailed metadata about a file

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to the file |

#### Example

```typescript
const result = await mcp.execute('get_file_metadata', {
  "path": "example_value"
});
```

---

### create_directory

**Category:** Directory Operations

Create a directory and its parent directories if needed

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Directory path to create |
| `recursive` | `boolean` | ❌ | Create parent directories |

#### Example

```typescript
const result = await mcp.execute('create_directory', {
  "path": "example_value"
});
```

---

### list_directory

**Category:** Directory Operations

List contents of a directory

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Directory path to list |
| `recursive` | `boolean` | ❌ | Include subdirectories |
| `includeHidden` | `boolean` | ❌ | Include hidden files |
| `details` | `boolean` | ❌ | Include file details |

#### Example

```typescript
const result = await mcp.execute('list_directory', {
  "path": "example_value"
});
```

---

### remove_directory

**Category:** Directory Operations

Remove a directory and optionally its contents

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Directory path to remove |
| `recursive` | `boolean` | ❌ | Remove contents recursively |
| `force` | `boolean` | ❌ | Force removal without prompts |

#### Example

```typescript
const result = await mcp.execute('remove_directory', {
  "path": "example_value"
});
```

---

### search_files

**Category:** Search Operations

Search for files by name pattern

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `pattern` | `string` | ✅ | Search pattern (supports glob patterns) |
| `path` | `string` | ❌ | Directory to search in |
| `recursive` | `boolean` | ❌ | Search subdirectories |
| `caseSensitive` | `boolean` | ❌ | Case-sensitive search |

#### Example

```typescript
const result = await mcp.execute('search_files', {
  "pattern": "example_value"
});
```

---

### search_content

**Category:** Search Operations

Search for content within files

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✅ | Search query |
| `path` | `string` | ❌ | Directory to search in |
| `filePattern` | `string` | ❌ | Limit search to files matching pattern |
| `useRegex` | `boolean` | ❌ | Treat query as regular expression |
| `caseSensitive` | `boolean` | ❌ | Case-sensitive search |

#### Example

```typescript
const result = await mcp.execute('search_content', {
  "query": "example_value"
});
```

---

### fuzzy_search

**Category:** Search Operations

Perform fuzzy search for files and content

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✅ | Fuzzy search query |
| `path` | `string` | ❌ | Directory to search in |
| `threshold` | `number` | ❌ | Similarity threshold (0-1) |

#### Example

```typescript
const result = await mcp.execute('fuzzy_search', {
  "query": "example_value"
});
```

---

### semantic_search

**Category:** Search Operations

AI-powered semantic search for code and content

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | `string` | ✅ | Semantic search query |
| `path` | `string` | ❌ | Directory to search in |
| `language` | `string` | ❌ | Programming language context |

#### Example

```typescript
const result = await mcp.execute('semantic_search', {
  "query": "example_value"
});
```

---

### git_status

**Category:** Git Operations

Get the status of a Git repository

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |

#### Example

```typescript
const result = await mcp.execute('git_status', {});
```

---

### git_add

**Category:** Git Operations

Stage files for commit

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |
| `files` | `array` | ✅ | Files to stage |

#### Example

```typescript
const result = await mcp.execute('git_add', {
  "files": [
    "example"
  ]
});
```

---

### git_commit

**Category:** Git Operations

Create a Git commit

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |
| `message` | `string` | ✅ | Commit message |
| `author` | `object` | ❌ | Author information |

#### Example

```typescript
const result = await mcp.execute('git_commit', {
  "message": "example_value"
});
```

---

### git_push

**Category:** Git Operations

Push commits to remote repository

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |
| `remote` | `string` | ❌ | Remote name |
| `branch` | `string` | ❌ | Branch to push |

#### Example

```typescript
const result = await mcp.execute('git_push', {});
```

---

### git_pull

**Category:** Git Operations

Pull changes from remote repository

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |
| `remote` | `string` | ❌ | Remote name |
| `branch` | `string` | ❌ | Branch to pull |

#### Example

```typescript
const result = await mcp.execute('git_pull', {});
```

---

### git_branch

**Category:** Git Operations

List, create, or switch Git branches

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |
| `action` | `string` | ✅ | Action: list, create, or switch |
| `branchName` | `string` | ❌ | Branch name for create/switch |

#### Example

```typescript
const result = await mcp.execute('git_branch', {
  "action": "example_value"
});
```

---

### git_log

**Category:** Git Operations

Get Git commit history

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |
| `limit` | `number` | ❌ | Number of commits to retrieve |
| `format` | `string` | ❌ | Log format |

#### Example

```typescript
const result = await mcp.execute('git_log', {});
```

---

### git_diff

**Category:** Git Operations

Show differences between commits, branches, or files

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |
| `target1` | `string` | ❌ | First target for comparison |
| `target2` | `string` | ❌ | Second target for comparison |
| `filePath` | `string` | ❌ | Specific file to diff |

#### Example

```typescript
const result = await mcp.execute('git_diff', {});
```

---

### git_merge

**Category:** Git Operations

Merge branches in Git

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |
| `sourceBranch` | `string` | ✅ | Branch to merge from |
| `strategy` | `string` | ❌ | Merge strategy |

#### Example

```typescript
const result = await mcp.execute('git_merge', {
  "sourceBranch": "example_value"
});
```

---

### git_reset

**Category:** Git Operations

Reset Git repository state

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `repositoryPath` | `string` | ❌ | Path to Git repository |
| `mode` | `string` | ✅ | Reset mode: soft, mixed, hard |
| `target` | `string` | ❌ | Target commit |

#### Example

```typescript
const result = await mcp.execute('git_reset', {
  "mode": "example_value"
});
```

---

### analyze_code

**Category:** Code Analysis

Analyze code structure and metrics

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to analyze |
| `language` | `string` | ❌ | Programming language |
| `includeMetrics` | `boolean` | ❌ | Include complexity metrics |

#### Example

```typescript
const result = await mcp.execute('analyze_code', {
  "path": "example_value"
});
```

---

### suggest_refactoring

**Category:** Code Analysis

Get AI-powered refactoring suggestions

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to analyze |
| `language` | `string` | ❌ | Programming language |
| `focus` | `string` | ❌ | Specific area to focus on |

#### Example

```typescript
const result = await mcp.execute('suggest_refactoring', {
  "path": "example_value"
});
```

---

### modify_code

**Category:** Code Analysis

Apply code modifications based on instructions

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to the file |
| `modifications` | `array` | ✅ | Array of modification instructions |
| `language` | `string` | ❌ | Programming language |

#### Example

```typescript
const result = await mcp.execute('modify_code', {
  "path": "example_value",
  "modifications": [
    "example"
  ]
});
```

---

### format_code

**Category:** Code Analysis

Format code according to language standards

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to the file to format |
| `language` | `string` | ✅ | Programming language |
| `style` | `object` | ❌ | Formatting style options |

#### Example

```typescript
const result = await mcp.execute('format_code', {
  "path": "example_value",
  "language": "example_value"
});
```

---

### encrypt_file

**Category:** Security Operations

Encrypt a file using AES encryption

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to the file to encrypt |
| `password` | `string` | ✅ | Encryption password |
| `outputPath` | `string` | ❌ | Output path for encrypted file |

#### Example

```typescript
const result = await mcp.execute('encrypt_file', {
  "path": "example_value",
  "password": "example_value"
});
```

---

### decrypt_file

**Category:** Security Operations

Decrypt an encrypted file

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to encrypted file |
| `password` | `string` | ✅ | Decryption password |
| `outputPath` | `string` | ❌ | Output path for decrypted file |

#### Example

```typescript
const result = await mcp.execute('decrypt_file', {
  "path": "example_value",
  "password": "example_value"
});
```

---

### scan_secrets

**Category:** Security Operations

Scan for potentially sensitive information in code

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to scan |
| `recursive` | `boolean` | ❌ | Scan subdirectories |
| `patterns` | `array` | ❌ | Custom patterns to look for |

#### Example

```typescript
const result = await mcp.execute('scan_secrets', {
  "path": "example_value"
});
```

---

### security_audit

**Category:** Security Operations

Perform a comprehensive security audit

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `path` | `string` | ✅ | Path to audit |
| `includeDependencies` | `boolean` | ❌ | Include dependency audit |
| `reportFormat` | `string` | ❌ | Report format |

#### Example

```typescript
const result = await mcp.execute('security_audit', {
  "path": "example_value"
});
```

---

### execute_shell

**Category:** Security Operations

Execute shell commands with security restrictions

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `command` | `string` | ✅ | Shell command to execute |
| `workingDirectory` | `string` | ❌ | Working directory |
| `timeout` | `number` | ❌ | Command timeout in milliseconds |

#### Example

```typescript
const result = await mcp.execute('execute_shell', {
  "command": "example_value"
});
```

---

### diff_files

**Category:** Utility Operations

Compare two files and show differences

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `file1` | `string` | ✅ | First file path |
| `file2` | `string` | ✅ | Second file path |
| `format` | `string` | ❌ | Diff format |

#### Example

```typescript
const result = await mcp.execute('diff_files', {
  "file1": "example_value",
  "file2": "example_value"
});
```

---

### compress_files

**Category:** Utility Operations

Compress files or directories into an archive

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `paths` | `array` | ✅ | Paths to compress |
| `outputPath` | `string` | ✅ | Output archive path |
| `format` | `string` | ❌ | Archive format |

#### Example

```typescript
const result = await mcp.execute('compress_files', {
  "paths": [
    "example"
  ],
  "outputPath": "example_value"
});
```

---

### extract_archive

**Category:** Utility Operations

Extract files from an archive

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `archivePath` | `string` | ✅ | Path to archive file |
| `outputPath` | `string` | ✅ | Directory to extract to |
| `overwrite` | `boolean` | ❌ | Overwrite existing files |

#### Example

```typescript
const result = await mcp.execute('extract_archive', {
  "archivePath": "example_value",
  "outputPath": "example_value"
});
```

---

### watch_files

**Category:** Utility Operations

Watch files or directories for changes

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `paths` | `array` | ✅ | Paths to watch |
| `events` | `array` | ❌ | Events to watch for |
| `callback` | `string` | ❌ | Callback command to execute |

#### Example

```typescript
const result = await mcp.execute('watch_files', {
  "paths": [
    "example"
  ]
});
```

---

### get_system_info

**Category:** Utility Operations

Get system information and metrics

#### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `includeMetrics` | `boolean` | ❌ | Include performance metrics |
| `includeProcesses` | `boolean` | ❌ | Include process information |

#### Example

```typescript
const result = await mcp.execute('get_system_info', {});
```

---


## Summary

| Category | Commands | Description |
|----------|----------|-------------|
| **File Operations** | 8 | Basic file manipulation (read, write, move, etc.) |
| **Directory Operations** | 3 | Directory management (create, list, remove) |
| **Search Operations** | 4 | File and content search capabilities |
| **Git Operations** | 10 | Comprehensive Git workflow support |
| **Code Analysis** | 4 | AI-powered code analysis and refactoring |
| **Security Operations** | 5 | Security scanning and file encryption |
| **Utility Operations** | 5 | Additional utility functions |

**Total: 39 commands** providing comprehensive file system management capabilities.
