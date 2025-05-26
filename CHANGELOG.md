# AI FileSystem MCP - Change Log

## Version 2.0.0 - Major Update

### New Features

#### 1. Transaction Support
- Atomic multi-file operations
- Automatic rollback on failure
- Backup management
- Support for write, update, and delete operations

#### 2. Git Integration
- Check repository status
- Commit changes directly
- View diffs and logs
- Branch management
- Stash support

#### 3. Real-time File Watching
- Monitor files and directories for changes
- Event-based notifications
- Change history tracking
- Statistics and reporting

#### 4. AST-based Code Modification
- TypeScript/JavaScript code analysis
- Intelligent code transformations
- Symbol renaming
- Import management
- Function and property manipulation

#### 5. Enhanced File Operations
- File metadata retrieval (permissions, hash, MIME type)
- Directory tree visualization
- File comparison
- Duplicate file detection
- Symbolic link support
- Safe file moving

### Improvements

- Better error handling with specific error messages
- Improved caching mechanism
- More comprehensive project analysis
- Added TypeScript as runtime dependency for AST processing

### API Changes

New tools added:
- `create_transaction` - Create atomic file operation transactions
- `git_status` - Get git repository status
- `git_commit` - Commit changes to git
- `start_watching` - Start watching files for changes
- `stop_watching` - Stop file watching
- `get_watcher_stats` - Get file watcher statistics
- `analyze_code` - Analyze code structure using AST
- `modify_code` - Modify code using AST transformations
- `get_file_metadata` - Get detailed file metadata
- `get_directory_tree` - Get directory structure as tree
- `compare_files` - Compare two files
- `find_duplicate_files` - Find duplicate files
- `create_symlink` - Create symbolic links
- `move_file` - Move or rename files

### Technical Details

- Added 5 new core modules:
  - `Transaction.ts` - Transaction management
  - `GitIntegration.ts` - Git operations
  - `FileWatcher.ts` - File monitoring
  - `ASTProcessor.ts` - Code analysis and modification
  - `FileUtils.ts` - Advanced file operations

- Total lines of code increased from ~250 to ~1500+
- Maintained backward compatibility with all existing tools
