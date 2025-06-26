#!/usr/bin/env node

import * as fs from 'fs/promises';
import * as path from 'path';

// 명령어 정보 정의 (실제 구현된 39개 명령어 기반)
const commands = [
  // File Operations (8 commands)
  {
    name: 'read_file',
    category: 'File Operations',
    description: 'Read the contents of a file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to the file to read' },
      { name: 'encoding', type: 'string', required: false, description: 'File encoding (default: utf-8)' }
    ]
  },
  {
    name: 'write_file',
    category: 'File Operations',
    description: 'Write content to a file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path where to write the file' },
      { name: 'content', type: 'string', required: true, description: 'Content to write' },
      { name: 'createDirectories', type: 'boolean', required: false, description: 'Create parent directories if needed' }
    ]
  },
  {
    name: 'read_files',
    category: 'File Operations',
    description: 'Read multiple files in a single operation',
    parameters: [
      { name: 'paths', type: 'array', required: true, description: 'Array of file paths to read' },
      { name: 'encoding', type: 'string', required: false, description: 'File encoding for all files' }
    ]
  },
  {
    name: 'update_file',
    category: 'File Operations',
    description: 'Update specific parts of a file using find-and-replace',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to the file to update' },
      { name: 'changes', type: 'array', required: true, description: 'Array of change objects with oldText and newText' },
      { name: 'backup', type: 'boolean', required: false, description: 'Create backup before updating' }
    ]
  },
  {
    name: 'move_file',
    category: 'File Operations',
    description: 'Move or rename a file',
    parameters: [
      { name: 'sourcePath', type: 'string', required: true, description: 'Current file path' },
      { name: 'destinationPath', type: 'string', required: true, description: 'New file path' },
      { name: 'overwrite', type: 'boolean', required: false, description: 'Overwrite destination if exists' }
    ]
  },
  {
    name: 'copy_file',
    category: 'File Operations',
    description: 'Copy a file to a new location',
    parameters: [
      { name: 'sourcePath', type: 'string', required: true, description: 'Source file path' },
      { name: 'destinationPath', type: 'string', required: true, description: 'Destination file path' },
      { name: 'overwrite', type: 'boolean', required: false, description: 'Overwrite destination if exists' }
    ]
  },
  {
    name: 'delete_file',
    category: 'File Operations',
    description: 'Delete a file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to the file to delete' },
      { name: 'force', type: 'boolean', required: false, description: 'Force deletion without prompts' }
    ]
  },
  {
    name: 'get_file_metadata',
    category: 'File Operations',
    description: 'Get detailed metadata about a file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to the file' }
    ]
  },

  // Directory Operations (3 commands)
  {
    name: 'create_directory',
    category: 'Directory Operations',
    description: 'Create a directory and its parent directories if needed',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Directory path to create' },
      { name: 'recursive', type: 'boolean', required: false, description: 'Create parent directories' }
    ]
  },
  {
    name: 'list_directory',
    category: 'Directory Operations',
    description: 'List contents of a directory',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Directory path to list' },
      { name: 'recursive', type: 'boolean', required: false, description: 'Include subdirectories' },
      { name: 'includeHidden', type: 'boolean', required: false, description: 'Include hidden files' },
      { name: 'details', type: 'boolean', required: false, description: 'Include file details' }
    ]
  },
  {
    name: 'remove_directory',
    category: 'Directory Operations',
    description: 'Remove a directory and optionally its contents',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Directory path to remove' },
      { name: 'recursive', type: 'boolean', required: false, description: 'Remove contents recursively' },
      { name: 'force', type: 'boolean', required: false, description: 'Force removal without prompts' }
    ]
  },

  // Search Operations (4 commands)
  {
    name: 'search_files',
    category: 'Search Operations',
    description: 'Search for files by name pattern',
    parameters: [
      { name: 'pattern', type: 'string', required: true, description: 'Search pattern (supports glob patterns)' },
      { name: 'path', type: 'string', required: false, description: 'Directory to search in' },
      { name: 'recursive', type: 'boolean', required: false, description: 'Search subdirectories' },
      { name: 'caseSensitive', type: 'boolean', required: false, description: 'Case-sensitive search' }
    ]
  },
  {
    name: 'search_content',
    category: 'Search Operations',
    description: 'Search for content within files',
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'path', type: 'string', required: false, description: 'Directory to search in' },
      { name: 'filePattern', type: 'string', required: false, description: 'Limit search to files matching pattern' },
      { name: 'useRegex', type: 'boolean', required: false, description: 'Treat query as regular expression' },
      { name: 'caseSensitive', type: 'boolean', required: false, description: 'Case-sensitive search' }
    ]
  },
  {
    name: 'fuzzy_search',
    category: 'Search Operations',
    description: 'Perform fuzzy search for files and content',
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Fuzzy search query' },
      { name: 'path', type: 'string', required: false, description: 'Directory to search in' },
      { name: 'threshold', type: 'number', required: false, description: 'Similarity threshold (0-1)' }
    ]
  },
  {
    name: 'semantic_search',
    category: 'Search Operations',
    description: 'AI-powered semantic search for code and content',
    parameters: [
      { name: 'query', type: 'string', required: true, description: 'Semantic search query' },
      { name: 'path', type: 'string', required: false, description: 'Directory to search in' },
      { name: 'language', type: 'string', required: false, description: 'Programming language context' }
    ]
  },

  // Git Operations (10 commands)
  {
    name: 'git_status',
    category: 'Git Operations',
    description: 'Get the status of a Git repository',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' }
    ]
  },
  {
    name: 'git_add',
    category: 'Git Operations',
    description: 'Stage files for commit',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' },
      { name: 'files', type: 'array', required: true, description: 'Files to stage' }
    ]
  },
  {
    name: 'git_commit',
    category: 'Git Operations',
    description: 'Create a Git commit',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' },
      { name: 'message', type: 'string', required: true, description: 'Commit message' },
      { name: 'author', type: 'object', required: false, description: 'Author information' }
    ]
  },
  {
    name: 'git_push',
    category: 'Git Operations',
    description: 'Push commits to remote repository',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' },
      { name: 'remote', type: 'string', required: false, description: 'Remote name' },
      { name: 'branch', type: 'string', required: false, description: 'Branch to push' }
    ]
  },
  {
    name: 'git_pull',
    category: 'Git Operations',
    description: 'Pull changes from remote repository',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' },
      { name: 'remote', type: 'string', required: false, description: 'Remote name' },
      { name: 'branch', type: 'string', required: false, description: 'Branch to pull' }
    ]
  },
  {
    name: 'git_branch',
    category: 'Git Operations',
    description: 'List, create, or switch Git branches',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' },
      { name: 'action', type: 'string', required: true, description: 'Action: list, create, or switch' },
      { name: 'branchName', type: 'string', required: false, description: 'Branch name for create/switch' }
    ]
  },
  {
    name: 'git_log',
    category: 'Git Operations',
    description: 'Get Git commit history',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' },
      { name: 'limit', type: 'number', required: false, description: 'Number of commits to retrieve' },
      { name: 'format', type: 'string', required: false, description: 'Log format' }
    ]
  },
  {
    name: 'git_diff',
    category: 'Git Operations',
    description: 'Show differences between commits, branches, or files',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' },
      { name: 'target1', type: 'string', required: false, description: 'First target for comparison' },
      { name: 'target2', type: 'string', required: false, description: 'Second target for comparison' },
      { name: 'filePath', type: 'string', required: false, description: 'Specific file to diff' }
    ]
  },
  {
    name: 'git_merge',
    category: 'Git Operations',
    description: 'Merge branches in Git',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' },
      { name: 'sourceBranch', type: 'string', required: true, description: 'Branch to merge from' },
      { name: 'strategy', type: 'string', required: false, description: 'Merge strategy' }
    ]
  },
  {
    name: 'git_reset',
    category: 'Git Operations',
    description: 'Reset Git repository state',
    parameters: [
      { name: 'repositoryPath', type: 'string', required: false, description: 'Path to Git repository' },
      { name: 'mode', type: 'string', required: true, description: 'Reset mode: soft, mixed, hard' },
      { name: 'target', type: 'string', required: false, description: 'Target commit' }
    ]
  },

  // Code Analysis (4 commands)
  {
    name: 'analyze_code',
    category: 'Code Analysis',
    description: 'Analyze code structure and metrics',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to analyze' },
      { name: 'language', type: 'string', required: false, description: 'Programming language' },
      { name: 'includeMetrics', type: 'boolean', required: false, description: 'Include complexity metrics' }
    ]
  },
  {
    name: 'suggest_refactoring',
    category: 'Code Analysis',
    description: 'Get AI-powered refactoring suggestions',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to analyze' },
      { name: 'language', type: 'string', required: false, description: 'Programming language' },
      { name: 'focus', type: 'string', required: false, description: 'Specific area to focus on' }
    ]
  },
  {
    name: 'modify_code',
    category: 'Code Analysis',
    description: 'Apply code modifications based on instructions',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to the file' },
      { name: 'modifications', type: 'array', required: true, description: 'Array of modification instructions' },
      { name: 'language', type: 'string', required: false, description: 'Programming language' }
    ]
  },
  {
    name: 'format_code',
    category: 'Code Analysis',
    description: 'Format code according to language standards',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to the file to format' },
      { name: 'language', type: 'string', required: true, description: 'Programming language' },
      { name: 'style', type: 'object', required: false, description: 'Formatting style options' }
    ]
  },

  // Security Operations (5 commands)
  {
    name: 'encrypt_file',
    category: 'Security Operations',
    description: 'Encrypt a file using AES encryption',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to the file to encrypt' },
      { name: 'password', type: 'string', required: true, description: 'Encryption password' },
      { name: 'outputPath', type: 'string', required: false, description: 'Output path for encrypted file' }
    ]
  },
  {
    name: 'decrypt_file',
    category: 'Security Operations',
    description: 'Decrypt an encrypted file',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to encrypted file' },
      { name: 'password', type: 'string', required: true, description: 'Decryption password' },
      { name: 'outputPath', type: 'string', required: false, description: 'Output path for decrypted file' }
    ]
  },
  {
    name: 'scan_secrets',
    category: 'Security Operations',
    description: 'Scan for potentially sensitive information in code',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to scan' },
      { name: 'recursive', type: 'boolean', required: false, description: 'Scan subdirectories' },
      { name: 'patterns', type: 'array', required: false, description: 'Custom patterns to look for' }
    ]
  },
  {
    name: 'security_audit',
    category: 'Security Operations',
    description: 'Perform a comprehensive security audit',
    parameters: [
      { name: 'path', type: 'string', required: true, description: 'Path to audit' },
      { name: 'includeDependencies', type: 'boolean', required: false, description: 'Include dependency audit' },
      { name: 'reportFormat', type: 'string', required: false, description: 'Report format' }
    ]
  },
  {
    name: 'execute_shell',
    category: 'Security Operations',
    description: 'Execute shell commands with security restrictions',
    parameters: [
      { name: 'command', type: 'string', required: true, description: 'Shell command to execute' },
      { name: 'workingDirectory', type: 'string', required: false, description: 'Working directory' },
      { name: 'timeout', type: 'number', required: false, description: 'Command timeout in milliseconds' }
    ]
  },

  // Utility Operations (5 commands)
  {
    name: 'diff_files',
    category: 'Utility Operations',
    description: 'Compare two files and show differences',
    parameters: [
      { name: 'file1', type: 'string', required: true, description: 'First file path' },
      { name: 'file2', type: 'string', required: true, description: 'Second file path' },
      { name: 'format', type: 'string', required: false, description: 'Diff format' }
    ]
  },
  {
    name: 'compress_files',
    category: 'Utility Operations',
    description: 'Compress files or directories into an archive',
    parameters: [
      { name: 'paths', type: 'array', required: true, description: 'Paths to compress' },
      { name: 'outputPath', type: 'string', required: true, description: 'Output archive path' },
      { name: 'format', type: 'string', required: false, description: 'Archive format' }
    ]
  },
  {
    name: 'extract_archive',
    category: 'Utility Operations',
    description: 'Extract files from an archive',
    parameters: [
      { name: 'archivePath', type: 'string', required: true, description: 'Path to archive file' },
      { name: 'outputPath', type: 'string', required: true, description: 'Directory to extract to' },
      { name: 'overwrite', type: 'boolean', required: false, description: 'Overwrite existing files' }
    ]
  },
  {
    name: 'watch_files',
    category: 'Utility Operations',
    description: 'Watch files or directories for changes',
    parameters: [
      { name: 'paths', type: 'array', required: true, description: 'Paths to watch' },
      { name: 'events', type: 'array', required: false, description: 'Events to watch for' },
      { name: 'callback', type: 'string', required: false, description: 'Callback command to execute' }
    ]
  },
  {
    name: 'get_system_info',
    category: 'Utility Operations',
    description: 'Get system information and metrics',
    parameters: [
      { name: 'includeMetrics', type: 'boolean', required: false, description: 'Include performance metrics' },
      { name: 'includeProcesses', type: 'boolean', required: false, description: 'Include process information' }
    ]
  }
];

async function generateOpenAPI() {
  const spec = {
    openapi: '3.0.3',
    info: {
      title: 'AI FileSystem MCP API',
      version: '2.0.0',
      description: 'AI-optimized Model Context Protocol server for intelligent file system operations with 39 commands across 6 categories.'
    },
    servers: [
      {
        url: 'mcp://ai-filesystem',
        description: 'MCP Server'
      }
    ],
    paths: {} as any,
    components: {
      schemas: {
        CommandResult: {
          type: 'object',
          properties: {
            content: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  text: { type: 'string' }
                }
              }
            }
          }
        }
      }
    }
  };

  // 각 명령어를 path로 추가
  for (const command of commands) {
    const schema: any = {
      type: 'object',
      properties: {},
      required: []
    };

    for (const param of command.parameters) {
      schema.properties[param.name] = {
        type: param.type,
        description: param.description
      };

      if (param.required) {
        schema.required.push(param.name);
      }
    }

    spec.paths[`/${command.name}`] = {
      post: {
        summary: command.description,
        tags: [command.category],
        requestBody: {
          content: {
            'application/json': {
              schema
            }
          }
        },
        responses: {
          '200': {
            description: 'Command executed successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CommandResult' }
              }
            }
          }
        }
      }
    };
  }

  await fs.mkdir('./docs/api', { recursive: true });
  await fs.writeFile('./docs/api/openapi.json', JSON.stringify(spec, null, 2));
}

async function generateMarkdown() {
  let markdown = `# AI FileSystem MCP API Reference

AI-optimized Model Context Protocol server for intelligent file system operations.

## Overview

This API provides **${commands.length} commands** across **${getCategories().length} categories** for comprehensive file system management.

## Categories

`;

  // 카테고리별 목차
  const categories = getCategories();
  for (const category of categories) {
    const categoryCommands = commands.filter(cmd => cmd.category === category);
    markdown += `### ${category} (${categoryCommands.length} commands)\n\n`;
    
    for (const command of categoryCommands) {
      markdown += `- [\`${command.name}\`](#${command.name.toLowerCase().replace(/_/g, '-')}): ${command.description}\n`;
    }
    markdown += '\n';
  }

  markdown += '## Commands\n\n';

  // 각 명령어 상세 문서
  for (const command of commands) {
    markdown += generateCommandMarkdown(command);
  }

  markdown += `
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

**Total: ${commands.length} commands** providing comprehensive file system management capabilities.
`;

  await fs.writeFile('./docs/api/api-reference.md', markdown);
}

function getCategories(): string[] {
  return [...new Set(commands.map(cmd => cmd.category))].sort();
}

function generateCommandMarkdown(command: any): string {
  let md = `### ${command.name}

**Category:** ${command.category}

${command.description}

#### Parameters

`;

  if (command.parameters.length === 0) {
    md += 'No parameters required.\n\n';
  } else {
    md += '| Name | Type | Required | Description |\n';
    md += '|------|------|----------|-------------|\n';
    
    for (const param of command.parameters) {
      const required = param.required ? '✅' : '❌';
      md += `| \`${param.name}\` | \`${param.type}\` | ${required} | ${param.description} |\n`;
    }
    md += '\n';
  }

  // 예제 추가
  md += '#### Example\n\n';
  md += '```typescript\n';
  
  // 파라미터가 있으면 예시 값 생성
  const exampleArgs: any = {};
  for (const param of command.parameters) {
    if (param.required) {
      if (param.type === 'string') {
        exampleArgs[param.name] = 'example_value';
      } else if (param.type === 'boolean') {
        exampleArgs[param.name] = true;
      } else if (param.type === 'number') {
        exampleArgs[param.name] = 0;
      } else if (param.type === 'array') {
        exampleArgs[param.name] = ['example'];
      } else {
        exampleArgs[param.name] = {};
      }
    }
  }

  md += `const result = await mcp.execute('${command.name}', ${JSON.stringify(exampleArgs, null, 2)});\n`;
  md += '```\n\n';

  md += '---\n\n';
  return md;
}

async function generateInteractiveDemo() {
  const demoHtml = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI FileSystem MCP - Interactive Demo</title>
    <style>
        body {
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            background: #1e1e1e;
            color: #d4d4d4;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .title {
            text-align: center;
            color: #4CAF50;
            margin-bottom: 30px;
        }
        .demo-panel {
            display: flex;
            gap: 20px;
            height: 80vh;
        }
        .commands-panel {
            flex: 1;
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            overflow-y: auto;
        }
        .demo-panel-right {
            flex: 2;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .input-panel {
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            height: 40%;
        }
        .output-panel {
            background: #252526;
            border-radius: 8px;
            padding: 20px;
            height: 60%;
            overflow-y: auto;
        }
        .command-item {
            padding: 10px;
            margin: 5px 0;
            background: #2d2d30;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.2s;
        }
        .command-item:hover {
            background: #3e3e42;
        }
        .command-name {
            color: #569cd6;
            font-weight: bold;
        }
        .command-desc {
            color: #9cdcfe;
            font-size: 12px;
            margin-top: 5px;
        }
        .input-area {
            width: 100%;
            height: 80%;
            background: #1e1e1e;
            border: 1px solid #3e3e42;
            border-radius: 4px;
            padding: 10px;
            color: #d4d4d4;
            font-family: inherit;
            font-size: 14px;
            resize: none;
        }
        .execute-btn {
            background: #4CAF50;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 10px;
        }
        .execute-btn:hover {
            background: #45a049;
        }
        .output-content {
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.5;
        }
        .error {
            color: #f44336;
        }
        .success {
            color: #4CAF50;
        }
        .category-header {
            color: #ffeb3b;
            font-weight: bold;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 1px solid #3e3e42;
        }
        .stats {
            background: #2d2d30;
            padding: 15px;
            border-radius: 4px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1 class="title">🤖 AI FileSystem MCP - Interactive Demo</h1>
        
        <div class="stats">
            <h3>📊 System Overview</h3>
            <p><strong>${commands.length}</strong> commands across <strong>${getCategories().length}</strong> categories</p>
            <p>Complete file system management with AI-powered analysis</p>
        </div>
        
        <div class="demo-panel">
            <div class="commands-panel">
                <h3>Available Commands</h3>
                <div id="commands-list"></div>
            </div>
            
            <div class="demo-panel-right">
                <div class="input-panel">
                    <h3>Command Input</h3>
                    <textarea id="command-input" class="input-area" placeholder="Enter your MCP command here..."></textarea>
                    <button id="execute-btn" class="execute-btn">Execute Command</button>
                </div>
                
                <div class="output-panel">
                    <h3>Output</h3>
                    <div id="output-content" class="output-content">Welcome to AI FileSystem MCP Demo!

📁 ${commands.filter(c => c.category === 'File Operations').length} File Operations
📂 ${commands.filter(c => c.category === 'Directory Operations').length} Directory Operations  
🔍 ${commands.filter(c => c.category === 'Search Operations').length} Search Operations
🌿 ${commands.filter(c => c.category === 'Git Operations').length} Git Operations
🔬 ${commands.filter(c => c.category === 'Code Analysis').length} Code Analysis Operations
🔒 ${commands.filter(c => c.category === 'Security Operations').length} Security Operations
🛠️ ${commands.filter(c => c.category === 'Utility Operations').length} Utility Operations

Click on a command from the left panel to get started.</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const commands = ${JSON.stringify(commands, null, 2)};
        
        // 명령어 목록 렌더링
        function renderCommands() {
            const commandsList = document.getElementById('commands-list');
            const categories = {};
            
            // 카테고리별로 그룹화
            commands.forEach(cmd => {
                if (!categories[cmd.category]) {
                    categories[cmd.category] = [];
                }
                categories[cmd.category].push(cmd);
            });
            
            let html = '';
            Object.keys(categories).sort().forEach(category => {
                html += \`<div class="category-header">\${category}</div>\`;
                categories[category].forEach(cmd => {
                    html += \`
                        <div class="command-item" onclick="selectCommand('\${cmd.name}')">
                            <div class="command-name">\${cmd.name}</div>
                            <div class="command-desc">\${cmd.description}</div>
                        </div>
                    \`;
                });
            });
            
            commandsList.innerHTML = html;
        }
        
        // 명령어 선택
        function selectCommand(commandName) {
            const command = commands.find(cmd => cmd.name === commandName);
            if (!command) return;
            
            // 샘플 입력 생성
            const sampleInput = {
                command: commandName,
                arguments: {}
            };
            
            // 필수 파라미터만 예시 값 추가
            command.parameters.filter(p => p.required).forEach(param => {
                if (param.type === 'string') {
                    sampleInput.arguments[param.name] = 'example_value';
                } else if (param.type === 'boolean') {
                    sampleInput.arguments[param.name] = true;
                } else if (param.type === 'number') {
                    sampleInput.arguments[param.name] = 0;
                } else if (param.type === 'array') {
                    sampleInput.arguments[param.name] = ['example'];
                } else {
                    sampleInput.arguments[param.name] = {};
                }
            });
            
            document.getElementById('command-input').value = JSON.stringify(sampleInput, null, 2);
        }
        
        // 명령어 실행 (시뮬레이트)
        function executeCommand() {
            const input = document.getElementById('command-input').value;
            const output = document.getElementById('output-content');
            
            try {
                const commandData = JSON.parse(input);
                
                // 실행 시뮬레이션
                output.innerHTML = \`<span class="success">✅ Command executed successfully!</span>

<strong>Command:</strong> \${commandData.command}
<strong>Arguments:</strong> \${JSON.stringify(commandData.arguments, null, 2)}

<strong>Response:</strong>
\${JSON.stringify({
    content: [{
        type: "text",
        text: \`Command '\${commandData.command}' executed with arguments: \${JSON.stringify(commandData.arguments)}\`
    }]
}, null, 2)}

<em>Note: This is a demo simulation. In a real environment, the command would execute actual operations.</em>\`;
                
            } catch (error) {
                output.innerHTML = \`<span class="error">❌ Error parsing command:</span>
\${error.message}

Please check your JSON syntax.\`;
            }
        }
        
        // 이벤트 리스너
        document.getElementById('execute-btn').addEventListener('click', executeCommand);
        document.getElementById('command-input').addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'Enter') {
                executeCommand();
            }
        });
        
        // 초기화
        renderCommands();
    </script>
</body>
</html>`;

  await fs.writeFile('./docs/api/interactive-demo.html', demoHtml);
}

async function main() {
  console.log('🚀 Generating AI FileSystem MCP documentation...');
  
  await generateOpenAPI();
  console.log('✅ OpenAPI specification generated');
  
  await generateMarkdown();
  console.log('✅ Markdown documentation generated');
  
  await generateInteractiveDemo();
  console.log('✅ Interactive demo generated');
  
  console.log(`\n📁 Documentation generated in ./docs/api/`);
  console.log(`📄 Files created:`);
  console.log(`   - openapi.json (OpenAPI 3.0.3 specification)`);
  console.log(`   - api-reference.md (Complete API reference)`);
  console.log(`   - interactive-demo.html (Interactive demo)`);
  console.log(`\n🎯 Total: ${commands.length} commands documented across ${getCategories().length} categories`);
}

main().catch(console.error);