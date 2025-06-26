# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is an AI-optimized Model Context Protocol (MCP) server for intelligent file system operations. The project provides a TypeScript/Node.js implementation with 39+ commands for file manipulation, code analysis, Git operations, security scanning, and shell execution.

## Development Commands

### TypeScript/Node.js Commands
```bash
# Setup and build
npm install          # Install dependencies
npm run build        # Compile TypeScript
npm run clean        # Clean dist directory

# Development
npm run dev          # Development mode with tsx watch
npm run start        # Start built server
npm run format       # Prettier formatting
npm run lint         # ESLint validation

# Testing
npm test             # Run basic integration tests
npm run test:jest    # Run Jest test suite
npm run test:unit    # Unit tests only
npm run test:integration  # Integration tests only
npm run test:coverage     # Test with coverage
npm run test:watch   # Watch mode
npm run test:all     # Run all 39 command tests

# Specialized tests
npm run test:git     # Git operations
npm run test:shell   # Shell execution
npm run test:metadata  # Metadata commands
npm run test:transaction  # Transaction operations
npm run test:phase1  # Phase 1 validation

# Build validation
npm run build:check  # Check build status
npm run build:diagnose  # Diagnose build issues
npm run validate:phase1  # Validate Phase 1 completion
```

### MCP Server Testing
```bash
# Test with MCP inspector (preferred)
npx @modelcontextprotocol/inspector npm run dev

# Direct server execution
npm run start

# Run specific test suites
node tests/integration/test-all-39.js    # All commands
node tests/integration/test-git.js       # Git operations
node tests/integration/test-shell-execution.js  # Shell commands
```

## Architecture Overview

### Core Architecture Pattern: Command Pattern + Service Container

The project follows a **Command Pattern** architecture with **Dependency Injection** through a Service Container:

```
src/index.ts (MCP Server)
    ↓
ServiceContainer.ts (DI Container)
    ↓
CommandRegistry.ts (Command Router)
    ↓
Command.ts (Base Command Class)
    ↓ 
[39 Command Implementations]
```

### Key Architectural Components

#### 1. **Service Container Pattern** (`src/core/ServiceContainer.ts`)
- Centralized dependency injection container
- Manages all services and their lifecycle
- Provides services to commands through dependency injection
- Handles cleanup and resource management

#### 2. **Command Pattern** (`src/core/commands/`)
All 39 commands implement the base `Command` class with:
- **Validation**: `validateArgs()` with type checking helpers
- **Execution**: `executeCommand()` with error handling
- **Tool Schema**: MCP tool definition with JSON schema
- **Categories**: Organized into logical folders (file/, git/, security/, etc.)

#### 3. **Service Layer Architecture**
Services are organized by domain:
- **File Services**: FileService, DirectoryService, FileOperations, FileCache
- **Search Services**: SearchService, ContentSearcher, FuzzySearcher, SemanticSearcher  
- **Git Services**: GitService, GitOperations, GitHubIntegration
- **Code Services**: CodeAnalysisService, ASTProcessor, RefactoringEngine
- **Security Services**: SecurityService, EncryptionService, SecretScanner, ShellExecutionService
- **Utility Services**: DiffService, CompressionService, BatchService, TransactionService

#### 4. **Security Model**
Multi-level security system for shell execution:
- **Strict**: Very restrictive (production)
- **Moderate**: Development-friendly (default)
- **Permissive**: Minimal restrictions

### Command Categories (39 Total)

1. **File Operations** (8): read_file, write_file, read_files, move_file, etc.
2. **Directory Operations** (3): create_directory, list_directory, remove_directory
3. **Search Operations** (4): search_files, search_content, fuzzy_search, semantic_search
4. **Git Operations** (10): git_init, git_add, git_commit, git_push, git_pull, etc.
5. **Code Analysis** (4): analyze_code, modify_code, suggest_refactoring, format_code
6. **Security Operations** (5): encrypt_file, decrypt_file, scan_secrets, security_audit, execute_shell
7. **Utility Operations** (5): diff_files, compress_files, extract_archive, get_file_metadata, change_permissions

### Project Structure
```
src/
├── index.ts                    # MCP server entry point
├── core/
│   ├── ServiceContainer.ts     # DI container
│   ├── commands/
│   │   ├── Command.ts          # Base command class
│   │   ├── CommandRegistry.ts  # Command router
│   │   ├── file/              # File operations (8 commands)
│   │   ├── directory/         # Directory operations (3 commands)
│   │   ├── search/            # Search operations (4 commands)
│   │   ├── git/               # Git operations (10 commands)
│   │   ├── code/              # Code analysis (4 commands)
│   │   ├── security/          # Security operations (5 commands)
│   │   └── utils/             # Utility operations (5 commands)
│   └── services/              # Service layer
└── tests/                     # Test suites
```

## Development Patterns

### Adding New Commands
1. **Create Command Class**: Extend base `Command` class
2. **Implement Required Methods**: `validateArgs()`, `executeCommand()`, define schema
3. **Add to Registry**: Register in `CommandLoader.ts`
4. **Add Tests**: Create integration test
5. **Update Documentation**: Add to README command list

### Service Integration
Commands receive services through the ServiceContainer:
```typescript
async executeCommand(context: CommandContext): Promise<CommandResult> {
  const fileService = context.container.getService<FileService>('fileService');
  const result = await fileService.readFile(path);
  return { content: [{ type: 'text', text: result }] };
}
```

### Error Handling
- All commands have built-in try-catch error handling
- Services throw descriptive errors
- Security validation occurs at multiple levels
- Commands return standardized error format

## Important Files

### Configuration
- `package.json`: Scripts, dependencies, and project metadata
- `tsconfig.json`: TypeScript configuration (ES2022, NodeNext modules)
- `jest.config.ts`: Jest testing configuration with 80% coverage threshold

### Core Implementation
- `src/index.ts:87`: Main server initialization
- `src/core/ServiceContainer.ts:54`: Service container initialization
- `src/core/commands/CommandRegistry.ts:47`: Command execution logic

### Development Scripts
The project includes extensive development automation:
- Build validation scripts in `scripts/`
- Debug utilities for troubleshooting
- Phase validation for migration progress

## Testing Strategy

### Test Organization
- **Unit Tests**: Individual service and command testing
- **Integration Tests**: End-to-end command testing  
- **Phase Tests**: Migration validation
- **Coverage Tests**: 80% minimum coverage requirement

### Key Test Files
- `tests/integration/test-all-39.js`: Validates all 39 commands
- `tests/integration/test-git.js`: Git operation validation
- `tests/integration/test-shell-execution.js`: Shell security testing

## Performance Considerations

### Current Optimizations
- **LRU Caching**: File content caching with configurable TTL
- **Streaming**: Large file handling with stream processing
- **Batch Operations**: Bulk file operations with transaction support
- **Parallel Processing**: Worker threads for CPU-intensive tasks

### Future Optimizations (Phase 3)
- Event-based file watching (100x latency improvement)
- Advanced stream processing (20x memory efficiency)  
- Enhanced worker thread pools (6x speed improvement)

## Security Best Practices

### Built-in Security Features
- **Multi-level Shell Security**: Configurable execution permissions
- **Secret Scanning**: Automatic credential detection
- **File Encryption**: AES-256 encryption support
- **Permission Validation**: Safe file system operations
- **Input Sanitization**: Command argument validation

### Security Guidelines
- Always validate file paths before operations
- Use appropriate security level for shell operations
- Scan for secrets before committing code
- Encrypt sensitive files when appropriate
- Follow least-privilege principle for file permissions