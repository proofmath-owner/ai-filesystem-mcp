# Changelog

All notable changes to AI FileSystem MCP will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-05-21

### BREAKING

This is a focused rewrite around what modern coding agents (Claude Code,
Codex CLI, …) cannot trivially do themselves. The ~39-command surface from
2.x is gone — your agent already has built-in tools for file I/O, search,
git, code analysis, shell execution, archives, diffs, and metadata. Use them.

Removed commands (use your agent's built-ins instead):
`read_file`, `read_files`, `write_file`, `update_file`, `move_file`,
`create_directory`, `list_directory`, `remove_directory`,
`search_files`, `search_content`, `fuzzy_search`, `semantic_search`,
`analyze_code`, `modify_code`, `format_code`, `suggest_refactoring`,
`execute_shell`, `shell`, `diff_files`, `compress_files`, `extract_archive`,
`get_file_metadata`, `change_permissions`, `batch_operations`,
all `git_*` / `github_*` commands.

Kept (the things agents can't easily do):
- `transaction` — atomic multi-file ops with rollback
- `file_watcher` — chokidar watcher that survives across MCP turns
- `scan_secrets`, `security_audit`
- `encrypt_file`, `decrypt_file`

### Added
- Encryption file format v1 with magic + version + algo/KDF id + iteration
  count header. Future format changes stay decryptable.
- PBKDF2-SHA256 iterations raised to 600 000 (OWASP 2023+ guidance).
- GCM IV reduced to 12 bytes (NIST SP 800-38D recommendation).
- Option-injection guards for any user-supplied refs / urls / remote names.
- Build now fails on TypeScript errors (no more `tsc || true`).

### Fixed
- `CommandRegistry.execute()` had a `typeof X` always-truthy branch that
  short-circuited result formatting.
- `EnhancedShellExecutionService` used `require('fs')` in an ESM module.
- `setSecurityLevel()` global mutation on a singleton service is gone with
  the shell command itself.
- `SecretScanner` no longer flags every `process.env.X` reference.
- Removed dead `core/commands/`, `services/impl/`, `legacy/`, `index-new.ts`,
  and 20+ root-level `fix-*` / `phase1-*` / `quick-*` migration scripts.

### Security
- Replaced `child_process.exec` with `execFile` and array args (no longer
  applicable to shipped code now that git/shell commands are removed, but
  the pattern is documented for future contributions).

## [2.0.0] - 2024-01-15

### Added
- **39 MCP Commands** across 7 categories for comprehensive file system management
- **Multi-tier Security Model** with strict, moderate, and permissive modes
- **Performance Monitoring** with real-time metrics and alerting
- **Comprehensive Testing Suite** including unit, integration, E2E, and performance tests
- **Complete Documentation** with user guides, API reference, and interactive demo
- **CI/CD Pipeline** with automated testing, security scanning, and deployment
- **Docker Support** with multi-stage builds and security hardening
- **Advanced Search Capabilities** including fuzzy and semantic search
- **Git Integration** with 10+ Git commands for workflow automation
- **Code Analysis Tools** with AI-powered refactoring suggestions
- **Security Framework** with vulnerability scanning and secret detection

#### New Commands
**File Operations (8 commands)**
- `read_file` - Read file contents with encoding support
- `write_file` - Write content to files with directory creation
- `read_files` - Batch read multiple files
- `update_file` - Update files with find-and-replace operations
- `move_file` - Move or rename files safely
- `copy_file` - Copy files with overwrite protection
- `delete_file` - Delete files with confirmation
- `get_file_metadata` - Retrieve detailed file information

**Directory Operations (3 commands)**
- `create_directory` - Create directories recursively
- `list_directory` - List directory contents with details
- `remove_directory` - Remove directories safely

**Search Operations (4 commands)**
- `search_files` - Search files by name patterns
- `search_content` - Search content within files
- `fuzzy_search` - Fuzzy search for files and content
- `semantic_search` - AI-powered semantic search

**Git Operations (10 commands)**
- `git_status` - Get repository status
- `git_add` - Stage files for commit
- `git_commit` - Create commits with metadata
- `git_push` - Push to remote repositories
- `git_pull` - Pull from remote repositories
- `git_branch` - Branch management operations
- `git_log` - View commit history
- `git_diff` - Compare files and commits
- `git_merge` - Merge branches
- `git_reset` - Reset repository state

**Code Analysis (4 commands)**
- `analyze_code` - Analyze code structure and metrics
- `suggest_refactoring` - AI-powered refactoring suggestions
- `modify_code` - Apply code modifications
- `format_code` - Format code according to standards

**Security Operations (5 commands)**
- `encrypt_file` - Encrypt files with AES-256
- `decrypt_file` - Decrypt encrypted files
- `scan_secrets` - Scan for potential secrets in code
- `security_audit` - Comprehensive security audit
- `execute_shell` - Execute shell commands with security restrictions

**Utility Operations (5 commands)**
- `diff_files` - Compare files and show differences
- `compress_files` - Create archives from files/directories
- `extract_archive` - Extract files from archives
- `watch_files` - Watch files for changes
- `get_system_info` - Get system information and metrics

#### Architecture Improvements
- **Command Pattern Implementation** - All commands follow consistent interface
- **Service Container** - Dependency injection for better testability
- **Layered Architecture** - Clear separation of concerns
- **Event-Driven Design** - Asynchronous operations with event handling
- **Plugin System** - Extensible architecture for custom commands

#### Performance Features
- **LRU Caching** - Intelligent caching with configurable TTL
- **Stream Processing** - Efficient handling of large files
- **Parallel Operations** - Concurrent processing where safe
- **Memory Optimization** - Reduced memory footprint and leak prevention
- **Lazy Loading** - On-demand resource loading

#### Security Features
- **Multi-Level Security** - Configurable security levels for different environments
- **Input Validation** - Comprehensive validation and sanitization
- **Path Traversal Protection** - Prevention of directory traversal attacks
- **Command Whitelisting** - Configurable allowed command lists
- **Audit Logging** - Detailed security event logging
- **Secret Detection** - Automated scanning for hardcoded secrets

#### Developer Experience
- **TypeScript Support** - Full type definitions and IntelliSense
- **Comprehensive Testing** - 80%+ code coverage with multiple test types
- **Hot Reload** - Development mode with automatic reloading
- **Debug Mode** - Detailed logging and debugging capabilities
- **Error Handling** - Graceful error handling with detailed messages

#### Documentation
- **User Guides** - Step-by-step tutorials and examples
- **API Reference** - Complete command documentation with examples
- **Developer Guide** - Architecture and extension documentation
- **Security Guide** - Security best practices and policies
- **Deployment Guide** - Production deployment instructions

#### Infrastructure
- **CI/CD Pipeline** - Automated testing, building, and deployment
- **Docker Images** - Multi-platform container support
- **Kubernetes Manifests** - Production-ready K8s configurations
- **Monitoring Stack** - Prometheus, Grafana, and Alertmanager integration
- **Health Checks** - Comprehensive health monitoring

### Changed
- **Improved Error Messages** - More descriptive and actionable error messages
- **Enhanced Performance** - Significant performance improvements across all operations
- **Better Configuration** - Simplified configuration with sensible defaults
- **Updated Dependencies** - Latest versions of all dependencies with security patches

### Security
- **Fixed Path Traversal Vulnerability** - Strengthened path validation
- **Enhanced Input Sanitization** - Improved protection against injection attacks
- **Updated Security Policies** - Comprehensive security documentation and policies
- **Dependency Audit** - Regular security audits of all dependencies

### Fixed
- **Memory Leaks** - Fixed memory leaks in file operations and caching
- **Race Conditions** - Resolved concurrency issues in file operations
- **Error Handling** - Improved error handling and recovery mechanisms
- **Performance Issues** - Optimized slow operations and reduced latency

### Removed
- **Legacy Code** - Removed deprecated APIs and legacy implementations
- **Unused Dependencies** - Cleaned up unused packages to reduce attack surface

## [1.0.0] - 2023-12-01

### Added
- Initial release of AI FileSystem MCP
- Basic file operations (read, write, delete)
- Simple directory management
- Git integration basics
- Security scanning foundation
- Command-line interface
- Basic documentation

### Features
- 20 core commands
- Basic security model
- Simple caching
- Error handling
- TypeScript support

## [0.9.0] - 2023-11-15

### Added
- Beta release for testing
- Core command framework
- Basic file operations
- Initial documentation

### Fixed
- Installation issues
- Basic functionality bugs

## [0.1.0] - 2023-11-01

### Added
- Initial alpha release
- Project structure
- Basic command framework
- Development environment setup

---

## Release Notes Format

Each release includes:
- **Version number** following semantic versioning
- **Release date** in YYYY-MM-DD format
- **Categories** for changes:
  - **Added** for new features
  - **Changed** for changes in existing functionality
  - **Deprecated** for soon-to-be removed features
  - **Removed** for now removed features
  - **Fixed** for any bug fixes
  - **Security** for vulnerability fixes

## Migration Guides

For major version upgrades, detailed migration guides are provided:
- [Migration from 1.x to 2.x](./docs/migration/v1-to-v2.md)

## Support

- **Current Version**: v3.0.0 (Full support)
- **Previous Version**: v2.x.x (Security fixes only)
- **End of Life**: v1.x.x and earlier (No longer supported)

For questions about releases, please see our [FAQ](./docs/FAQ.md) or create an issue on GitHub.