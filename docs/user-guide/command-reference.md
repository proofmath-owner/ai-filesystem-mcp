# Command Reference

This comprehensive reference covers all 39 commands available in AI FileSystem MCP, organized by category with detailed usage examples.

## 📁 File Operations (8 commands)

### `read_file`
Read the contents of a file.

**Parameters:**
- `path` (string, required): Path to the file to read
- `encoding` (string, optional): File encoding (default: 'utf-8')

**Example:**
```typescript
const result = await mcp.execute('read_file', {
  path: './package.json'
});
console.log(result.content[0].text);
```

### `write_file`
Write content to a file, creating it if it doesn't exist.

**Parameters:**
- `path` (string, required): Path where to write the file
- `content` (string, required): Content to write
- `encoding` (string, optional): File encoding (default: 'utf-8')
- `createDirectories` (boolean, optional): Create parent directories if needed

**Example:**
```typescript
await mcp.execute('write_file', {
  path: './config/settings.json',
  content: JSON.stringify({ debug: true }, null, 2),
  createDirectories: true
});
```

### `read_files`
Read multiple files in a single operation.

**Parameters:**
- `paths` (array, required): Array of file paths to read
- `encoding` (string, optional): File encoding for all files

**Example:**
```typescript
const result = await mcp.execute('read_files', {
  paths: ['./src/index.ts', './src/config.ts', './package.json']
});
const files = JSON.parse(result.content[0].text);
```

### `update_file`
Update specific parts of a file using find-and-replace operations.

**Parameters:**
- `path` (string, required): Path to the file to update
- `changes` (array, required): Array of change objects with `oldText` and `newText`
- `backup` (boolean, optional): Create backup before updating

**Example:**
```typescript
await mcp.execute('update_file', {
  path: './src/config.ts',
  changes: [
    { oldText: 'debug: false', newText: 'debug: true' },
    { oldText: 'version: "1.0.0"', newText: 'version: "2.0.0"' }
  ],
  backup: true
});
```

### `move_file`
Move or rename a file.

**Parameters:**
- `sourcePath` (string, required): Current file path
- `destinationPath` (string, required): New file path
- `overwrite` (boolean, optional): Overwrite destination if exists

**Example:**
```typescript
await mcp.execute('move_file', {
  sourcePath: './temp/draft.md',
  destinationPath: './docs/final.md',
  overwrite: false
});
```

### `copy_file`
Copy a file to a new location.

**Parameters:**
- `sourcePath` (string, required): Source file path
- `destinationPath` (string, required): Destination file path
- `overwrite` (boolean, optional): Overwrite destination if exists

**Example:**
```typescript
await mcp.execute('copy_file', {
  sourcePath: './templates/config.template.json',
  destinationPath: './config/prod.json'
});
```

### `delete_file`
Delete a file.

**Parameters:**
- `path` (string, required): Path to the file to delete
- `force` (boolean, optional): Force deletion without prompts

**Example:**
```typescript
await mcp.execute('delete_file', {
  path: './temp/unnecessary.log',
  force: true
});
```

### `get_file_metadata`
Get detailed metadata about a file.

**Parameters:**
- `path` (string, required): Path to the file

**Example:**
```typescript
const result = await mcp.execute('get_file_metadata', {
  path: './large-dataset.csv'
});
const metadata = JSON.parse(result.content[0].text);
console.log(`Size: ${metadata.size} bytes, Modified: ${metadata.modified}`);
```

## 📂 Directory Operations (3 commands)

### `create_directory`
Create a directory and its parent directories if needed.

**Parameters:**
- `path` (string, required): Directory path to create
- `recursive` (boolean, optional): Create parent directories (default: true)

**Example:**
```typescript
await mcp.execute('create_directory', {
  path: './src/components/ui/buttons',
  recursive: true
});
```

### `list_directory`
List contents of a directory.

**Parameters:**
- `path` (string, required): Directory path to list
- `recursive` (boolean, optional): Include subdirectories
- `includeHidden` (boolean, optional): Include hidden files
- `details` (boolean, optional): Include file details

**Example:**
```typescript
const result = await mcp.execute('list_directory', {
  path: './src',
  recursive: true,
  details: true
});
const files = JSON.parse(result.content[0].text);
```

### `remove_directory`
Remove a directory and optionally its contents.

**Parameters:**
- `path` (string, required): Directory path to remove
- `recursive` (boolean, optional): Remove contents recursively
- `force` (boolean, optional): Force removal without prompts

**Example:**
```typescript
await mcp.execute('remove_directory', {
  path: './temp/build-cache',
  recursive: true,
  force: true
});
```

## 🔍 Search Operations (4 commands)

### `search_files`
Search for files by name pattern.

**Parameters:**
- `pattern` (string, required): Search pattern (supports glob patterns)
- `path` (string, optional): Directory to search in (default: current directory)
- `recursive` (boolean, optional): Search subdirectories
- `caseSensitive` (boolean, optional): Case-sensitive search

**Example:**
```typescript
const result = await mcp.execute('search_files', {
  pattern: '*.{ts,js}',
  path: './src',
  recursive: true
});
const files = JSON.parse(result.content[0].text);
```

### `search_content`
Search for content within files.

**Parameters:**
- `query` (string, required): Search query
- `path` (string, optional): Directory to search in
- `filePattern` (string, optional): Limit search to files matching pattern
- `useRegex` (boolean, optional): Treat query as regular expression
- `caseSensitive` (boolean, optional): Case-sensitive search

**Example:**
```typescript
const result = await mcp.execute('search_content', {
  query: 'TODO|FIXME',
  path: './src',
  filePattern: '*.ts',
  useRegex: true
});
const matches = JSON.parse(result.content[0].text);
```

### `fuzzy_search`
Perform fuzzy search for files and content.

**Parameters:**
- `query` (string, required): Fuzzy search query
- `path` (string, optional): Directory to search in
- `threshold` (number, optional): Similarity threshold (0-1)

**Example:**
```typescript
const result = await mcp.execute('fuzzy_search', {
  query: 'cnfig',  // Will match 'config'
  path: './src',
  threshold: 0.6
});
```

### `semantic_search`
AI-powered semantic search for code and content.

**Parameters:**
- `query` (string, required): Semantic search query
- `path` (string, optional): Directory to search in
- `language` (string, optional): Programming language context

**Example:**
```typescript
const result = await mcp.execute('semantic_search', {
  query: 'functions that handle user authentication',
  path: './src',
  language: 'typescript'
});
```

## 🌿 Git Operations (10 commands)

### `git_status`
Get the status of a Git repository.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository (default: current directory)

**Example:**
```typescript
const result = await mcp.execute('git_status', {
  repositoryPath: './'
});
const status = JSON.parse(result.content[0].text);
console.log(`Branch: ${status.branch}, Modified: ${status.modified.length}`);
```

### `git_add`
Stage files for commit.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository
- `files` (array, required): Files to stage (or ['.'] for all)

**Example:**
```typescript
await mcp.execute('git_add', {
  repositoryPath: './',
  files: ['src/index.ts', 'package.json']
});
```

### `git_commit`
Create a Git commit.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository
- `message` (string, required): Commit message
- `author` (object, optional): Author information

**Example:**
```typescript
await mcp.execute('git_commit', {
  repositoryPath: './',
  message: 'feat: add new search functionality',
  author: {
    name: 'John Doe',
    email: 'john@example.com'
  }
});
```

### `git_push`
Push commits to remote repository.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository
- `remote` (string, optional): Remote name (default: 'origin')
- `branch` (string, optional): Branch to push (default: current branch)

**Example:**
```typescript
await mcp.execute('git_push', {
  repositoryPath: './',
  remote: 'origin',
  branch: 'main'
});
```

### `git_pull`
Pull changes from remote repository.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository
- `remote` (string, optional): Remote name (default: 'origin')
- `branch` (string, optional): Branch to pull

**Example:**
```typescript
await mcp.execute('git_pull', {
  repositoryPath: './',
  remote: 'origin',
  branch: 'main'
});
```

### `git_branch`
List, create, or switch Git branches.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository
- `action` (string, required): 'list', 'create', or 'switch'
- `branchName` (string, optional): Branch name for create/switch actions

**Example:**
```typescript
// List branches
const branches = await mcp.execute('git_branch', {
  repositoryPath: './',
  action: 'list'
});

// Create new branch
await mcp.execute('git_branch', {
  repositoryPath: './',
  action: 'create',
  branchName: 'feature/new-feature'
});
```

### `git_log`
Get Git commit history.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository
- `limit` (number, optional): Number of commits to retrieve
- `format` (string, optional): Log format ('short', 'full', 'json')

**Example:**
```typescript
const result = await mcp.execute('git_log', {
  repositoryPath: './',
  limit: 10,
  format: 'json'
});
const commits = JSON.parse(result.content[0].text);
```

### `git_diff`
Show differences between commits, branches, or files.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository
- `target1` (string, optional): First target for comparison
- `target2` (string, optional): Second target for comparison
- `filePath` (string, optional): Specific file to diff

**Example:**
```typescript
const result = await mcp.execute('git_diff', {
  repositoryPath: './',
  target1: 'HEAD~1',
  target2: 'HEAD',
  filePath: 'src/index.ts'
});
```

### `git_merge`
Merge branches in Git.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository
- `sourceBranch` (string, required): Branch to merge from
- `strategy` (string, optional): Merge strategy

**Example:**
```typescript
await mcp.execute('git_merge', {
  repositoryPath: './',
  sourceBranch: 'feature/new-feature',
  strategy: 'recursive'
});
```

### `git_reset`
Reset Git repository state.

**Parameters:**
- `repositoryPath` (string, optional): Path to Git repository
- `mode` (string, required): Reset mode ('soft', 'mixed', 'hard')
- `target` (string, optional): Target commit (default: 'HEAD')

**Example:**
```typescript
await mcp.execute('git_reset', {
  repositoryPath: './',
  mode: 'soft',
  target: 'HEAD~1'
});
```

## 🔬 Code Analysis (4 commands)

### `analyze_code`
Analyze code structure and metrics.

**Parameters:**
- `path` (string, required): Path to analyze
- `language` (string, optional): Programming language
- `includeMetrics` (boolean, optional): Include complexity metrics

**Example:**
```typescript
const result = await mcp.execute('analyze_code', {
  path: './src/complex-module.ts',
  language: 'typescript',
  includeMetrics: true
});
const analysis = JSON.parse(result.content[0].text);
```

### `suggest_refactoring`
Get AI-powered refactoring suggestions.

**Parameters:**
- `path` (string, required): Path to analyze
- `language` (string, optional): Programming language
- `focus` (string, optional): Specific area to focus on

**Example:**
```typescript
const result = await mcp.execute('suggest_refactoring', {
  path: './src/legacy-code.js',
  language: 'javascript',
  focus: 'performance'
});
const suggestions = JSON.parse(result.content[0].text);
```

### `modify_code`
Apply code modifications based on instructions.

**Parameters:**
- `path` (string, required): Path to the file
- `modifications` (array, required): Array of modification instructions
- `language` (string, optional): Programming language

**Example:**
```typescript
await mcp.execute('modify_code', {
  path: './src/utils.ts',
  modifications: [
    {
      type: 'replace_function',
      target: 'oldFunction',
      replacement: 'export function newFunction() { ... }'
    }
  ],
  language: 'typescript'
});
```

### `format_code`
Format code according to language standards.

**Parameters:**
- `path` (string, required): Path to the file to format
- `language` (string, required): Programming language
- `style` (object, optional): Formatting style options

**Example:**
```typescript
await mcp.execute('format_code', {
  path: './src/messy-code.ts',
  language: 'typescript',
  style: {
    indent: 2,
    quotes: 'single',
    semicolons: true
  }
});
```

## 🔒 Security Operations (5 commands)

### `encrypt_file`
Encrypt a file using AES encryption.

**Parameters:**
- `path` (string, required): Path to the file to encrypt
- `password` (string, required): Encryption password
- `outputPath` (string, optional): Output path for encrypted file

**Example:**
```typescript
await mcp.execute('encrypt_file', {
  path: './sensitive-data.json',
  password: 'strong-password-123',
  outputPath: './sensitive-data.json.enc'
});
```

### `decrypt_file`
Decrypt an encrypted file.

**Parameters:**
- `path` (string, required): Path to encrypted file
- `password` (string, required): Decryption password
- `outputPath` (string, optional): Output path for decrypted file

**Example:**
```typescript
await mcp.execute('decrypt_file', {
  path: './sensitive-data.json.enc',
  password: 'strong-password-123',
  outputPath: './sensitive-data.json'
});
```

### `scan_secrets`
Scan for potentially sensitive information in code.

**Parameters:**
- `path` (string, required): Path to scan
- `recursive` (boolean, optional): Scan subdirectories
- `patterns` (array, optional): Custom patterns to look for

**Example:**
```typescript
const result = await mcp.execute('scan_secrets', {
  path: './src',
  recursive: true,
  patterns: ['API_KEY', 'PASSWORD', 'SECRET']
});
const findings = JSON.parse(result.content[0].text);
```

### `security_audit`
Perform a comprehensive security audit.

**Parameters:**
- `path` (string, required): Path to audit
- `includeDependencies` (boolean, optional): Include dependency audit
- `reportFormat` (string, optional): Report format ('json', 'html', 'text')

**Example:**
```typescript
const result = await mcp.execute('security_audit', {
  path: './',
  includeDependencies: true,
  reportFormat: 'json'
});
const audit = JSON.parse(result.content[0].text);
```

### `execute_shell`
Execute shell commands with security restrictions.

**Parameters:**
- `command` (string, required): Shell command to execute
- `workingDirectory` (string, optional): Working directory
- `timeout` (number, optional): Command timeout in milliseconds

**Example:**
```typescript
const result = await mcp.execute('execute_shell', {
  command: 'npm test',
  workingDirectory: './',
  timeout: 30000
});
console.log(result.content[0].text);
```

## 🛠️ Utility Operations (5 commands)

### `diff_files`
Compare two files and show differences.

**Parameters:**
- `file1` (string, required): First file path
- `file2` (string, required): Second file path
- `format` (string, optional): Diff format ('unified', 'context', 'json')

**Example:**
```typescript
const result = await mcp.execute('diff_files', {
  file1: './config/dev.json',
  file2: './config/prod.json',
  format: 'unified'
});
```

### `compress_files`
Compress files or directories into an archive.

**Parameters:**
- `paths` (array, required): Paths to compress
- `outputPath` (string, required): Output archive path
- `format` (string, optional): Archive format ('zip', 'tar', 'gzip')

**Example:**
```typescript
await mcp.execute('compress_files', {
  paths: ['./src', './docs', './package.json'],
  outputPath: './backup.zip',
  format: 'zip'
});
```

### `extract_archive`
Extract files from an archive.

**Parameters:**
- `archivePath` (string, required): Path to archive file
- `outputPath` (string, required): Directory to extract to
- `overwrite` (boolean, optional): Overwrite existing files

**Example:**
```typescript
await mcp.execute('extract_archive', {
  archivePath: './backup.zip',
  outputPath: './restored',
  overwrite: true
});
```

### `watch_files`
Watch files or directories for changes.

**Parameters:**
- `paths` (array, required): Paths to watch
- `events` (array, optional): Events to watch for
- `callback` (string, optional): Callback command to execute

**Example:**
```typescript
await mcp.execute('watch_files', {
  paths: ['./src/**/*.ts'],
  events: ['change', 'add', 'unlink'],
  callback: 'npm run build'
});
```

### `get_system_info`
Get system information and metrics.

**Parameters:**
- `includeMetrics` (boolean, optional): Include performance metrics
- `includeProcesses` (boolean, optional): Include process information

**Example:**
```typescript
const result = await mcp.execute('get_system_info', {
  includeMetrics: true,
  includeProcesses: false
});
const info = JSON.parse(result.content[0].text);
```

## 🏷️ Command Categories Summary

| Category | Commands | Description |
|----------|----------|-------------|
| **File Operations** | 8 | Basic file manipulation (read, write, move, etc.) |
| **Directory Operations** | 3 | Directory management (create, list, remove) |
| **Search Operations** | 4 | File and content search capabilities |
| **Git Operations** | 10 | Comprehensive Git workflow support |
| **Code Analysis** | 4 | AI-powered code analysis and refactoring |
| **Security Operations** | 5 | Security scanning and file encryption |
| **Utility Operations** | 5 | Additional utility functions |

## 💡 Usage Tips

### 1. **Combine Commands**
Chain commands together for powerful workflows:
```typescript
// Analyze → Refactor → Format → Commit
const analysis = await mcp.execute('analyze_code', { path: './src' });
const suggestions = await mcp.execute('suggest_refactoring', { path: './src' });
await mcp.execute('modify_code', { path: './src', modifications: suggestions });
await mcp.execute('format_code', { path: './src', language: 'typescript' });
await mcp.execute('git_add', { files: ['./src'] });
await mcp.execute('git_commit', { message: 'refactor: improve code structure' });
```

### 2. **Use Error Handling**
Always handle potential errors:
```typescript
try {
  const result = await mcp.execute('read_file', { path: './might-not-exist.txt' });
  console.log(result.content[0].text);
} catch (error) {
  console.error('File operation failed:', error.message);
}
```

### 3. **Leverage Search**
Use multiple search types for comprehensive results:
```typescript
// File name search
const filesByName = await mcp.execute('search_files', { pattern: 'config*' });

// Content search
const contentMatches = await mcp.execute('search_content', { query: 'database' });

// Fuzzy search for typos
const fuzzyResults = await mcp.execute('fuzzy_search', { query: 'databse' });
```

### 4. **Monitor Performance**
Keep track of system resources:
```typescript
const systemInfo = await mcp.execute('get_system_info', { includeMetrics: true });
console.log('Memory usage:', systemInfo.memory.usage);
```

This command reference provides comprehensive documentation for all AI FileSystem MCP capabilities. Each command is designed to work seamlessly with others, enabling powerful automation workflows.