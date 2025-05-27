#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';

import { FileSystemManager } from './core/FileSystemManager.js';

// MCP 서버 초기화
const server = new Server(
  {
    name: 'ai-filesystem-mcp',
    version: '2.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// FileSystem 매니저 인스턴스
const fsManager = new FileSystemManager();

// 도구 정의
const tools: Tool[] = [
  // === 기존 기능들 ===
  {
    name: 'read_file',
    description: 'Read the contents of a file (with intelligent caching)',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' }
      },
      required: ['path']
    }
  },
  {
    name: 'read_files',
    description: 'Read multiple files at once',
    inputSchema: {
      type: 'object',
      properties: {
        paths: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Array of file paths to read' 
        }
      },
      required: ['paths']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to write' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'search_files',
    description: 'Search for files matching a pattern',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern to search' },
        directory: { type: 'string', description: 'Base directory to search in' }
      },
      required: ['pattern']
    }
  },
  {
    name: 'search_content',
    description: 'Search for content within files',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Text or regex pattern to search' },
        directory: { type: 'string', description: 'Directory to search in' },
        filePattern: { type: 'string', description: 'File pattern to include (e.g., *.ts)' }
      },
      required: ['pattern', 'directory']
    }
  },
  {
    name: 'update_file',
    description: 'Update specific parts of a file',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to update' },
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              oldText: { type: 'string', description: 'Text to find' },
              newText: { type: 'string', description: 'Text to replace with' }
            },
            required: ['oldText', 'newText']
          }
        }
      },
      required: ['path', 'updates']
    }
  },
  {
    name: 'analyze_project',
    description: 'Analyze project structure and dependencies',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Project directory to analyze' }
      },
      required: ['directory']
    }
  },
  {
    name: 'create_transaction',
    description: 'Create a transaction for multiple file operations',
    inputSchema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { 
                type: 'string', 
                enum: ['write', 'update', 'remove'],
                description: 'Operation type' 
              },
              path: { type: 'string', description: 'File path' },
              content: { type: 'string', description: 'Content for write operation' },
              updates: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    oldText: { type: 'string' },
                    newText: { type: 'string' }
                  }
                },
                description: 'Updates for update operation'
              }
            },
            required: ['type', 'path']
          }
        }
      },
      required: ['operations']
    }
  },
  {
    name: 'git_status',
    description: 'Get git repository status',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'git_commit',
    description: 'Commit changes to git',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific files to commit (optional)'
        }
      },
      required: ['message']
    }
  },
  {
    name: 'start_watching',
    description: 'Start watching files or directories for changes',
    inputSchema: {
      type: 'object',
      properties: {
        paths: {
          oneOf: [
            { type: 'string' },
            { type: 'array', items: { type: 'string' } }
          ],
          description: 'Path(s) to watch'
        },
        persistent: { type: 'boolean', description: 'Keep watching persistently' },
        ignoreInitial: { type: 'boolean', description: 'Ignore initial add events' }
      },
      required: ['paths']
    }
  },
  {
    name: 'stop_watching',
    description: 'Stop watching files',
    inputSchema: {
      type: 'object',
      properties: {
        watcherId: { type: 'string', description: 'Watcher ID to stop' }
      },
      required: ['watcherId']
    }
  },
  {
    name: 'get_watcher_stats',
    description: 'Get statistics about file watchers',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'analyze_code',
    description: 'Analyze TypeScript/JavaScript code structure',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to analyze' }
      },
      required: ['path']
    }
  },
  {
    name: 'modify_code',
    description: 'Modify code using AST transformations',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to modify' },
        modifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['rename', 'addImport', 'removeImport', 'addFunction', 'updateFunction', 'addProperty'],
                description: 'Modification type'
              },
              target: { type: 'string', description: 'Target symbol/function/class name' },
              newName: { type: 'string', description: 'New name for rename' },
              importPath: { type: 'string', description: 'Import path' },
              importName: { type: 'string', description: 'Import name' },
              functionCode: { type: 'string', description: 'Function code' },
              propertyName: { type: 'string', description: 'Property name' },
              propertyValue: { type: 'string', description: 'Property value' }
            },
            required: ['type']
          }
        }
      },
      required: ['path', 'modifications']
    }
  },
  {
    name: 'get_file_metadata',
    description: 'Get detailed metadata about a file or directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File or directory path' },
        includeHash: { type: 'boolean', description: 'Include SHA256 hash (for files)' }
      },
      required: ['path']
    }
  },
  {
    name: 'get_directory_tree',
    description: 'Get a tree structure of a directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path' },
        maxDepth: { type: 'number', description: 'Maximum depth to traverse' }
      },
      required: ['path']
    }
  },
  {
    name: 'compare_files',
    description: 'Compare two files to check if they are identical',
    inputSchema: {
      type: 'object',
      properties: {
        file1: { type: 'string', description: 'First file path' },
        file2: { type: 'string', description: 'Second file path' }
      },
      required: ['file1', 'file2']
    }
  },
  {
    name: 'find_duplicate_files',
    description: 'Find duplicate files in a directory',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory to search for duplicates' }
      },
      required: ['directory']
    }
  },
  {
    name: 'create_symlink',
    description: 'Create a symbolic link',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target path' },
        linkPath: { type: 'string', description: 'Symbolic link path' }
      },
      required: ['target', 'linkPath']
    }
  },
  {
    name: 'move_file',
    description: 'Move or rename a file',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'Source file path' },
        destination: { type: 'string', description: 'Destination file path' }
      },
      required: ['source', 'destination']
    }
  },
  
  // === 새로운 기능들 ===
  {
    name: 'diff_files',
    description: 'Compare two files and show differences',
    inputSchema: {
      type: 'object',
      properties: {
        file1: { type: 'string', description: 'First file path' },
        file2: { type: 'string', description: 'Second file path' },
        format: {
          type: 'string',
          enum: ['unified', 'side-by-side', 'inline'],
          description: 'Diff output format'
        }
      },
      required: ['file1', 'file2']
    }
  },
  {
    name: 'compress_files',
    description: 'Compress files into an archive',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Files to compress'
        },
        outputPath: { type: 'string', description: 'Output archive path' },
        format: {
          type: 'string',
          enum: ['zip', 'tar', 'tar.gz'],
          description: 'Archive format'
        }
      },
      required: ['files', 'outputPath']
    }
  },
  {
    name: 'extract_archive',
    description: 'Extract files from an archive',
    inputSchema: {
      type: 'object',
      properties: {
        archivePath: { type: 'string', description: 'Archive file path' },
        destination: { type: 'string', description: 'Extraction destination' }
      },
      required: ['archivePath', 'destination']
    }
  },
  {
    name: 'change_permissions',
    description: 'Change file or directory permissions',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File or directory path' },
        permissions: { type: 'string', description: 'Permissions (e.g., 755, rwxr-xr-x)' }
      },
      required: ['path', 'permissions']
    }
  },
  {
    name: 'search_by_date',
    description: 'Search files by creation or modification date',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory to search' },
        after: { type: 'string', description: 'After date (ISO format)' },
        before: { type: 'string', description: 'Before date (ISO format)' }
      },
      required: ['directory']
    }
  },
  {
    name: 'search_by_size',
    description: 'Search files by size',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory to search' },
        min: { type: 'number', description: 'Minimum size in bytes' },
        max: { type: 'number', description: 'Maximum size in bytes' }
      },
      required: ['directory']
    }
  },
  {
    name: 'fuzzy_search',
    description: 'Search for files with similar names (fuzzy matching)',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern' },
        directory: { type: 'string', description: 'Directory to search' },
        threshold: { type: 'number', description: 'Similarity threshold (0-1)' }
      },
      required: ['pattern', 'directory']
    }
  },
  {
    name: 'semantic_search',
    description: 'Search files using natural language query',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        directory: { type: 'string', description: 'Directory to search' }
      },
      required: ['query', 'directory']
    }
  },
  {
    name: 'suggest_refactoring',
    description: 'Get code refactoring suggestions',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to analyze' }
      },
      required: ['path']
    }
  },
  {
    name: 'auto_format_project',
    description: 'Automatically format all code files in a project',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Project directory' }
      },
      required: ['directory']
    }
  },
  {
    name: 'batch_operations',
    description: 'Execute multiple file operations in batch',
    inputSchema: {
      type: 'object',
      properties: {
        operations: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              op: {
                type: 'string',
                enum: ['rename', 'move', 'copy', 'delete', 'chmod'],
                description: 'Operation type'
              },
              files: {
                type: 'array',
                description: 'Files to operate on'
              },
              options: {
                type: 'object',
                description: 'Operation options'
              }
            }
          }
        }
      },
      required: ['operations']
    }
  },
  {
    name: 'encrypt_file',
    description: 'Encrypt a file with password',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File to encrypt' },
        password: { type: 'string', description: 'Encryption password' }
      },
      required: ['path', 'password']
    }
  },
  {
    name: 'decrypt_file',
    description: 'Decrypt an encrypted file',
    inputSchema: {
      type: 'object',
      properties: {
        encryptedPath: { type: 'string', description: 'Encrypted file path' },
        password: { type: 'string', description: 'Decryption password' }
      },
      required: ['encryptedPath', 'password']
    }
  },
  {
    name: 'scan_secrets',
    description: 'Scan directory for hardcoded secrets and sensitive data',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory to scan' }
      },
      required: ['directory']
    }
  },
  {
    name: 'get_filesystem_stats',
    description: 'Get file system performance and monitoring statistics',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'sync_with_cloud',
    description: 'Sync local directory with cloud storage',
    inputSchema: {
      type: 'object',
      properties: {
        localPath: { type: 'string', description: 'Local directory path' },
        remotePath: { type: 'string', description: 'Remote path' },
        cloudType: {
          type: 'string',
          enum: ['s3', 'gcs'],
          description: 'Cloud storage type'
        }
      },
      required: ['localPath', 'remotePath']
    }
  },
  {
    name: 'security_audit',
    description: 'Perform security audit on directory',
    inputSchema: {
      type: 'object',
      properties: {
        directory: { type: 'string', description: 'Directory to audit' }
      },
      required: ['directory']
    }
  },
  {
    name: 'analyze_code_quality',
    description: 'Analyze code quality metrics',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File to analyze' }
      },
      required: ['path']
    }
  }
];

// 도구 목록 요청 처리
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// 도구 실행 요청 처리
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    // args가 없거나 객체가 아닌 경우 에러
    if (!args || typeof args !== 'object') {
      throw new Error('Invalid arguments');
    }

    // 타입 안전성을 위한 args 캐스팅
    const typedArgs = args as Record<string, any>;

    switch (name) {
      // === 기존 도구들 ===
      case 'read_file':
        if (!typedArgs.path || typeof typedArgs.path !== 'string') {
          throw new Error('path is required and must be a string');
        }
        return await fsManager.readFile(typedArgs.path);

      case 'read_files':
        if (!Array.isArray(typedArgs.paths)) {
          throw new Error('paths is required and must be an array');
        }
        return await fsManager.readFiles(typedArgs.paths);

      case 'write_file':
        if (!typedArgs.path || typeof typedArgs.path !== 'string') {
          throw new Error('path is required and must be a string');
        }
        if (!typedArgs.content || typeof typedArgs.content !== 'string') {
          throw new Error('content is required and must be a string');
        }
        return await fsManager.writeFile(typedArgs.path, typedArgs.content);

      case 'search_files':
        if (!typedArgs.pattern || typeof typedArgs.pattern !== 'string') {
          throw new Error('pattern is required and must be a string');
        }
        return await fsManager.searchFiles(typedArgs.pattern, typedArgs.directory);

      case 'search_content':
        if (!typedArgs.pattern || typeof typedArgs.pattern !== 'string') {
          throw new Error('pattern is required and must be a string');
        }
        if (!typedArgs.directory || typeof typedArgs.directory !== 'string') {
          throw new Error('directory is required and must be a string');
        }
        return await fsManager.searchContent(typedArgs.pattern, typedArgs.directory, typedArgs.filePattern);

      case 'update_file':
        if (!typedArgs.path || typeof typedArgs.path !== 'string') {
          throw new Error('path is required and must be a string');
        }
        if (!Array.isArray(typedArgs.updates)) {
          throw new Error('updates is required and must be an array');
        }
        return await fsManager.updateFile(typedArgs.path, typedArgs.updates);

      case 'analyze_project':
        if (!typedArgs.directory || typeof typedArgs.directory !== 'string') {
          throw new Error('directory is required and must be a string');
        }
        return await fsManager.analyzeProject(typedArgs.directory);

      case 'create_transaction':
        if (!Array.isArray(typedArgs.operations)) {
          throw new Error('operations is required and must be an array');
        }
        const transaction = fsManager.createTransaction();
        for (const op of typedArgs.operations) {
          switch (op.type) {
            case 'write':
              transaction.write(op.path, op.content);
              break;
            case 'update':
              transaction.update(op.path, op.updates);
              break;
            case 'remove':
              transaction.remove(op.path);
              break;
          }
        }
        const result = await transaction.commit();
        return {
          content: [{
            type: 'text',
            text: result.success 
              ? `Transaction completed successfully: ${result.operations} operations`
              : `Transaction failed: ${result.error}. Rolled back to ${result.rollbackPath}`
          }]
        };

      case 'git_status':
        return await fsManager.gitStatus();

      case 'git_commit':
        if (!typedArgs.message || typeof typedArgs.message !== 'string') {
          throw new Error('message is required and must be a string');
        }
        return await fsManager.gitCommit(typedArgs.message, typedArgs.files);

      case 'start_watching':
        if (!typedArgs.paths) {
          throw new Error('paths is required');
        }
        return await fsManager.startWatching(typedArgs.paths, {
          persistent: typedArgs.persistent,
          ignoreInitial: typedArgs.ignoreInitial
        });

      case 'stop_watching':
        if (!typedArgs.watcherId || typeof typedArgs.watcherId !== 'string') {
          throw new Error('watcherId is required and must be a string');
        }
        return await fsManager.stopWatching(typedArgs.watcherId);

      case 'get_watcher_stats':
        return fsManager.getWatcherStats();

      case 'analyze_code':
        if (!typedArgs.path || typeof typedArgs.path !== 'string') {
          throw new Error('path is required and must be a string');
        }
        return await fsManager.analyzeCode(typedArgs.path);

      case 'modify_code':
        if (!typedArgs.path || typeof typedArgs.path !== 'string') {
          throw new Error('path is required and must be a string');
        }
        if (!Array.isArray(typedArgs.modifications)) {
          throw new Error('modifications is required and must be an array');
        }
        return await fsManager.modifyCode(typedArgs.path, typedArgs.modifications);

      case 'get_file_metadata':
        if (!typedArgs.path || typeof typedArgs.path !== 'string') {
          throw new Error('path is required and must be a string');
        }
        return await fsManager.getFileMetadata(typedArgs.path, typedArgs.includeHash);

      case 'get_directory_tree':
        if (!typedArgs.path || typeof typedArgs.path !== 'string') {
          throw new Error('path is required and must be a string');
        }
        return await fsManager.getDirectoryTree(typedArgs.path, typedArgs.maxDepth);

      case 'compare_files':
        if (!typedArgs.file1 || typeof typedArgs.file1 !== 'string') {
          throw new Error('file1 is required and must be a string');
        }
        if (!typedArgs.file2 || typeof typedArgs.file2 !== 'string') {
          throw new Error('file2 is required and must be a string');
        }
        return await fsManager.compareFiles(typedArgs.file1, typedArgs.file2);

      case 'find_duplicate_files':
        if (!typedArgs.directory || typeof typedArgs.directory !== 'string') {
          throw new Error('directory is required and must be a string');
        }
        return await fsManager.findDuplicateFiles(typedArgs.directory);

      case 'create_symlink':
        if (!typedArgs.target || typeof typedArgs.target !== 'string') {
          throw new Error('target is required and must be a string');
        }
        if (!typedArgs.linkPath || typeof typedArgs.linkPath !== 'string') {
          throw new Error('linkPath is required and must be a string');
        }
        return await fsManager.createSymlink(typedArgs.target, typedArgs.linkPath);

      case 'move_file':
        if (!typedArgs.source || typeof typedArgs.source !== 'string') {
          throw new Error('source is required and must be a string');
        }
        if (!typedArgs.destination || typeof typedArgs.destination !== 'string') {
          throw new Error('destination is required and must be a string');
        }
        return await fsManager.moveFile(typedArgs.source, typedArgs.destination);

      // === 새로운 도구들 ===
      case 'diff_files':
        if (!typedArgs.file1 || !typedArgs.file2) {
          throw new Error('file1 and file2 are required');
        }
        return await fsManager.diffFiles(typedArgs.file1, typedArgs.file2, typedArgs.format);

      case 'compress_files':
        if (!Array.isArray(typedArgs.files) || !typedArgs.outputPath) {
          throw new Error('files array and outputPath are required');
        }
        return await fsManager.compressFiles(typedArgs.files, typedArgs.outputPath, typedArgs.format);

      case 'extract_archive':
        if (!typedArgs.archivePath || !typedArgs.destination) {
          throw new Error('archivePath and destination are required');
        }
        return await fsManager.extractArchive(typedArgs.archivePath, typedArgs.destination);

      case 'change_permissions':
        if (!typedArgs.path || !typedArgs.permissions) {
          throw new Error('path and permissions are required');
        }
        return await fsManager.changePermissions(typedArgs.path, typedArgs.permissions);

      case 'search_by_date':
        if (!typedArgs.directory) {
          throw new Error('directory is required');
        }
        const after = typedArgs.after ? new Date(typedArgs.after) : undefined;
        const before = typedArgs.before ? new Date(typedArgs.before) : undefined;
        return await fsManager.searchByDate(typedArgs.directory, after, before);

      case 'search_by_size':
        if (!typedArgs.directory) {
          throw new Error('directory is required');
        }
        return await fsManager.searchBySize(typedArgs.directory, typedArgs.min, typedArgs.max);

      case 'fuzzy_search':
        if (!typedArgs.pattern || !typedArgs.directory) {
          throw new Error('pattern and directory are required');
        }
        return await fsManager.fuzzySearch(typedArgs.pattern, typedArgs.directory, typedArgs.threshold);

      case 'semantic_search':
        if (!typedArgs.query || !typedArgs.directory) {
          throw new Error('query and directory are required');
        }
        return await fsManager.semanticSearch(typedArgs.query, typedArgs.directory);

      case 'suggest_refactoring':
        if (!typedArgs.path) {
          throw new Error('path is required');
        }
        return await fsManager.suggestRefactoring(typedArgs.path);

      case 'auto_format_project':
        if (!typedArgs.directory) {
          throw new Error('directory is required');
        }
        return await fsManager.autoFormatProject(typedArgs.directory);

      case 'batch_operations':
        if (!Array.isArray(typedArgs.operations)) {
          throw new Error('operations array is required');
        }
        return await fsManager.batchOperations(typedArgs.operations);

      case 'encrypt_file':
        if (!typedArgs.path || !typedArgs.password) {
          throw new Error('path and password are required');
        }
        return await fsManager.encryptFile(typedArgs.path, typedArgs.password);

      case 'decrypt_file':
        if (!typedArgs.encryptedPath || !typedArgs.password) {
          throw new Error('encryptedPath and password are required');
        }
        return await fsManager.decryptFile(typedArgs.encryptedPath, typedArgs.password);

      case 'scan_secrets':
        if (!typedArgs.directory) {
          throw new Error('directory is required');
        }
        return await fsManager.scanSecrets(typedArgs.directory);

      case 'get_filesystem_stats':
        return await fsManager.getFileSystemStats();

      case 'sync_with_cloud':
        if (!typedArgs.localPath || !typedArgs.remotePath) {
          throw new Error('localPath and remotePath are required');
        }
        return await fsManager.syncWithCloud(typedArgs.localPath, typedArgs.remotePath, typedArgs.cloudType);

      case 'security_audit':
        if (!typedArgs.directory) {
          throw new Error('directory is required');
        }
        return await fsManager.securityAudit(typedArgs.directory);

      case 'analyze_code_quality':
        if (!typedArgs.path) {
          throw new Error('path is required');
        }
        return await fsManager.analyzeCodeQuality(typedArgs.path);

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`
        }
      ]
    };
  }
});

// 프로세스 종료 시 정리
process.on('SIGINT', async () => {
  await fsManager.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await fsManager.cleanup();
  process.exit(0);
});

// MCP 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AI FileSystem MCP Server v2.0 started - Now with 10 major improvements!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});