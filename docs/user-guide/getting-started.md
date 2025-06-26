# Getting Started with AI FileSystem MCP

Welcome to AI FileSystem MCP - your intelligent file system companion! This guide will help you get up and running in minutes.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18 or higher
- **npm** or **yarn** package manager
- **TypeScript** (optional, for development)

### Installation

#### Option 1: NPM Package (Recommended)
```bash
npm install -g ai-filesystem-mcp
```

#### Option 2: From Source
```bash
git clone https://github.com/your-org/ai-filesystem-mcp.git
cd ai-filesystem-mcp
npm install
npm run build
npm link
```

### First Run

1. **Start the MCP server:**
```bash
ai-filesystem-mcp
```

2. **Test with MCP Inspector:**
```bash
npx @modelcontextprotocol/inspector ai-filesystem-mcp
```

3. **Your first command:**
```bash
# Read a file
mcp.execute('read_file', { path: './README.md' })

# List directory contents
mcp.execute('list_directory', { path: './' })

# Search for files
mcp.execute('search_files', { pattern: '*.ts', path: './src' })
```

## 💡 Basic Usage Examples

### File Operations
```typescript
// Read a file
const content = await mcp.execute('read_file', {
  path: './package.json'
});

// Write a new file
await mcp.execute('write_file', {
  path: './hello.txt',
  content: 'Hello, World!'
});

// Move/rename a file
await mcp.execute('move_file', {
  sourcePath: './hello.txt',
  destinationPath: './greetings.txt'
});
```

### Search Operations
```typescript
// Find files by pattern
const files = await mcp.execute('search_files', {
  pattern: '*.json',
  path: './',
  recursive: true
});

// Search content within files
const matches = await mcp.execute('search_content', {
  query: 'function',
  path: './src',
  filePattern: '*.ts'
});

// Fuzzy search
const fuzzyResults = await mcp.execute('fuzzy_search', {
  query: 'config',
  path: './'
});
```

### Git Operations
```typescript
// Check repository status
const status = await mcp.execute('git_status', {
  repositoryPath: './'
});

// Stage files
await mcp.execute('git_add', {
  repositoryPath: './',
  files: ['src/index.ts', 'package.json']
});

// Commit changes
await mcp.execute('git_commit', {
  repositoryPath: './',
  message: 'feat: add new feature'
});
```

### Code Analysis
```typescript
// Analyze code structure
const analysis = await mcp.execute('analyze_code', {
  path: './src/index.ts'
});

// Get refactoring suggestions
const suggestions = await mcp.execute('suggest_refactoring', {
  path: './src/legacy-code.js'
});

// Format code
await mcp.execute('format_code', {
  path: './src/messy-code.ts',
  language: 'typescript'
});
```

## 🔧 Configuration

### Basic Configuration
Create a `mcp-config.json` file in your project root:

```json
{
  "server": {
    "port": 3000,
    "host": "localhost"
  },
  "security": {
    "level": "moderate",
    "allowShellExecution": true,
    "maxFileSize": "10MB"
  },
  "performance": {
    "cacheEnabled": true,
    "cacheTTL": 300000,
    "maxConcurrency": 5
  },
  "logging": {
    "level": "info",
    "enableFileLogging": false
  }
}
```

### Environment Variables
```bash
# Security level: strict, moderate, permissive
export MCP_SECURITY_LEVEL=moderate

# Enable debug logging
export MCP_DEBUG=true

# Custom cache directory
export MCP_CACHE_DIR=/tmp/mcp-cache

# Maximum file size for operations
export MCP_MAX_FILE_SIZE=50MB
```

## 🛡️ Security Settings

AI FileSystem MCP includes multiple security levels:

### Strict Mode (Production)
- File operations restricted to current directory
- Shell execution disabled
- Limited file size (1MB)
- Extensive input validation

### Moderate Mode (Default)
- File operations within project boundaries
- Safe shell commands only
- Reasonable file size limits (10MB)
- Balanced security vs usability

### Permissive Mode (Development)
- Broader file system access
- Most shell commands allowed
- Larger file size limits (100MB)
- Minimal restrictions

## 📚 Common Workflows

### 1. Project Analysis
```typescript
// Get project overview
const overview = await mcp.execute('get_directory_tree', {
  path: './src',
  maxDepth: 3
});

// Analyze code quality
const analysis = await mcp.execute('analyze_code', {
  path: './src',
  includeMetrics: true
});

// Search for todos and fixmes
const todos = await mcp.execute('search_content', {
  query: 'TODO|FIXME|HACK',
  path: './src',
  useRegex: true
});
```

### 2. Code Refactoring
```typescript
// Get refactoring suggestions
const suggestions = await mcp.execute('suggest_refactoring', {
  path: './src/legacy.js'
});

// Apply specific refactoring
await mcp.execute('modify_code', {
  path: './src/legacy.js',
  changes: suggestions.changes
});

// Format the refactored code
await mcp.execute('format_code', {
  path: './src/legacy.js',
  language: 'javascript'
});
```

### 3. Git Workflow
```typescript
// Check what changed
const status = await mcp.execute('git_status', {
  repositoryPath: './'
});

// Stage specific files
await mcp.execute('git_add', {
  repositoryPath: './',
  files: status.modified
});

// Create a commit
await mcp.execute('git_commit', {
  repositoryPath: './',
  message: 'refactor: improve code structure'
});
```

### 4. File Organization
```typescript
// Create organized directory structure
await mcp.execute('create_directory', {
  path: './organized/components'
});
await mcp.execute('create_directory', {
  path: './organized/utils'
});
await mcp.execute('create_directory', {
  path: './organized/tests'
});

// Move files based on type
const jsFiles = await mcp.execute('search_files', {
  pattern: '*.js',
  path: './src'
});

for (const file of jsFiles.results) {
  if (file.includes('component')) {
    await mcp.execute('move_file', {
      sourcePath: file,
      destinationPath: `./organized/components/${path.basename(file)}`
    });
  }
}
```

## 🎯 Tips for Success

### 1. **Start Small**
Begin with simple file operations before moving to complex workflows.

### 2. **Use the Inspector**
The MCP Inspector is invaluable for testing and debugging commands.

### 3. **Check Security Settings**
Always verify your security level matches your use case.

### 4. **Monitor Performance**
Use the built-in monitoring to track performance and resource usage.

### 5. **Read the Logs**
Enable logging to understand what's happening under the hood.

## 🔍 Troubleshooting

### Common Issues

#### "Command not found"
```bash
# Check if the server is running
ps aux | grep ai-filesystem-mcp

# Restart the server
killall node
ai-filesystem-mcp
```

#### "Permission denied"
```typescript
// Check your security level
const config = await mcp.execute('get_config');
console.log('Security level:', config.security.level);

// Try with a different security level
export MCP_SECURITY_LEVEL=permissive
```

#### "File too large"
```bash
# Increase the file size limit
export MCP_MAX_FILE_SIZE=100MB

# Or modify the config file
{
  "security": {
    "maxFileSize": "100MB"
  }
}
```

#### "Memory issues"
```typescript
// Check memory usage
const metrics = await mcp.execute('get_system_metrics');
console.log('Memory usage:', metrics.memory);

// Clear cache if needed
await mcp.execute('clear_cache');
```

## 📖 Next Steps

1. **[Command Reference](./command-reference.md)** - Learn about all 39 available commands
2. **[Configuration Guide](./configuration.md)** - Deep dive into configuration options
3. **[Examples](./examples/)** - Browse real-world usage examples
4. **[API Reference](../api/api-reference.md)** - Complete API documentation

## 🤝 Getting Help

- **Documentation**: Check our comprehensive guides
- **Issues**: Report bugs on GitHub
- **Discussions**: Join our community discussions
- **Support**: Contact our support team

Happy coding with AI FileSystem MCP! 🚀