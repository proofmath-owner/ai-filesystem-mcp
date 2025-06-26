# Architecture Guide

This guide provides a deep dive into the AI FileSystem MCP architecture, explaining the design decisions, patterns, and structure that make the system robust and extensible.

## 🏗️ High-Level Architecture

AI FileSystem MCP follows a **layered architecture** with **dependency injection** and the **command pattern** at its core:

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Client Layer                        │
│  (Claude, IDEs, Custom Applications)                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ MCP Protocol
┌─────────────────────▼───────────────────────────────────────┐
│                   MCP Server                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Server Layer                          │   │
│  │  - Request/Response handling                       │   │
│  │  - Protocol compliance                             │   │
│  │  - Error formatting                               │   │
│  └─────────────────┬───────────────────────────────────┘   │
│  ┌─────────────────▼───────────────────────────────────┐   │
│  │            Command Layer                           │   │
│  │  - Command routing                                 │   │
│  │  - Input validation                               │   │
│  │  - Command execution                              │   │
│  └─────────────────┬───────────────────────────────────┘   │
│  ┌─────────────────▼───────────────────────────────────┐   │
│  │            Service Layer                           │   │
│  │  - Business logic                                 │   │
│  │  - Cross-cutting concerns                         │   │
│  │  - Resource management                            │   │
│  └─────────────────┬───────────────────────────────────┘   │
│  ┌─────────────────▼───────────────────────────────────┐   │
│  │          Infrastructure Layer                      │   │
│  │  - File system operations                         │   │
│  │  - External integrations                          │   │
│  │  - System resources                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Core Design Patterns

### 1. Command Pattern
Every operation is encapsulated as a command object:

```typescript
// Base command interface
abstract class Command {
  abstract name: string;
  abstract description: string;
  
  abstract validateArgs(args: any): ValidationResult;
  abstract executeCommand(context: CommandContext): Promise<CommandResult>;
  abstract getSchema(): ToolSchema;
}

// Implementation example
class ReadFileCommand extends Command {
  name = 'read_file';
  description = 'Read the contents of a file';
  
  validateArgs(args: any): ValidationResult {
    // Validation logic
  }
  
  async executeCommand(context: CommandContext): Promise<CommandResult> {
    // Execution logic
  }
  
  getSchema(): ToolSchema {
    // MCP tool schema definition
  }
}
```

**Benefits:**
- **Encapsulation**: Each command is self-contained
- **Extensibility**: Easy to add new commands
- **Testability**: Commands can be tested in isolation
- **Consistency**: Uniform interface for all operations

### 2. Dependency Injection
Services are injected through a centralized container:

```typescript
// Service container
class ServiceContainer {
  private services = new Map<string, any>();
  
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }
  
  get<T>(name: string): T {
    return this.services.get(name);
  }
}

// Command using injected services
class SearchCommand extends Command {
  async executeCommand(context: CommandContext): Promise<CommandResult> {
    const fileService = context.container.get<FileService>('fileService');
    const searchService = context.container.get<SearchService>('searchService');
    
    return await searchService.search(args.query, fileService);
  }
}
```

**Benefits:**
- **Loose Coupling**: Commands don't depend on concrete implementations
- **Testability**: Easy to mock dependencies
- **Flexibility**: Services can be swapped without changing commands
- **Centralized Management**: Single point for service lifecycle

### 3. Service Layer Pattern
Business logic is organized into domain services:

```typescript
// Domain service interface
interface FileService {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  moveFile(source: string, destination: string): Promise<void>;
}

// Implementation with cross-cutting concerns
class FileServiceImpl implements FileService {
  constructor(
    private cache: CacheService,
    private security: SecurityService,
    private monitor: MonitoringService
  ) {}
  
  async readFile(path: string): Promise<string> {
    // Security check
    await this.security.validatePath(path);
    
    // Cache check
    const cached = await this.cache.get(`file:${path}`);
    if (cached) return cached;
    
    // Monitor performance
    const startTime = Date.now();
    
    try {
      const content = await fs.readFile(path, 'utf-8');
      
      // Cache result
      await this.cache.set(`file:${path}`, content);
      
      return content;
    } finally {
      this.monitor.recordOperation('file_read', Date.now() - startTime);
    }
  }
}
```

## 📦 Project Structure

```
src/
├── index.ts                    # Entry point - MCP server setup
├── core/                       # Core framework components
│   ├── ServiceContainer.ts     # Dependency injection container
│   ├── commands/              # Command layer
│   │   ├── Command.ts          # Base command class
│   │   ├── CommandRegistry.ts  # Command registration & routing
│   │   ├── file/              # File operation commands
│   │   ├── directory/         # Directory operation commands
│   │   ├── search/            # Search operation commands
│   │   ├── git/               # Git operation commands
│   │   ├── code/              # Code analysis commands
│   │   ├── security/          # Security operation commands
│   │   └── utility/           # Utility commands
│   └── services/              # Service layer
│       ├── FileService.ts      # File operations service
│       ├── SearchService.ts    # Search operations service
│       ├── GitService.ts       # Git operations service
│       ├── SecurityService.ts  # Security operations service
│       ├── CacheService.ts     # Caching service
│       └── MonitoringService.ts # Performance monitoring
├── types/                     # TypeScript type definitions
│   ├── Command.ts             # Command-related types
│   ├── Service.ts             # Service interfaces
│   └── MCP.ts                 # MCP protocol types
└── utils/                     # Utility functions
    ├── validation.ts          # Input validation helpers
    ├── security.ts           # Security utilities
    └── performance.ts        # Performance monitoring
```

## 🔧 Component Deep Dive

### 1. Service Container (`ServiceContainer.ts`)

The heart of the dependency injection system:

```typescript
export class ServiceContainer {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();
  private singletons = new Map<string, any>();
  
  // Register a service instance
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }
  
  // Register a factory function
  registerFactory<T>(name: string, factory: () => T): void {
    this.factories.set(name, factory);
  }
  
  // Register a singleton factory
  registerSingleton<T>(name: string, factory: () => T): void {
    this.factories.set(name, () => {
      if (!this.singletons.has(name)) {
        this.singletons.set(name, factory());
      }
      return this.singletons.get(name);
    });
  }
  
  // Get a service
  get<T>(name: string): T {
    // Check direct registration
    if (this.services.has(name)) {
      return this.services.get(name);
    }
    
    // Check factory registration
    if (this.factories.has(name)) {
      return this.factories.get(name)!();
    }
    
    throw new Error(`Service '${name}' not found`);
  }
  
  // Initialize all services
  async initialize(): Promise<void> {
    // Register core services
    this.registerSingleton('fileService', () => new FileServiceImpl(
      this.get('cacheService'),
      this.get('securityService'),
      this.get('monitoringService')
    ));
    
    // Initialize services that need setup
    for (const service of this.services.values()) {
      if (service.initialize) {
        await service.initialize();
      }
    }
  }
}
```

### 2. Command Registry (`CommandRegistry.ts`)

Manages command registration and execution:

```typescript
export class CommandRegistry {
  private commands = new Map<string, Command>();
  
  // Register a command
  register(command: Command): void {
    this.commands.set(command.name, command);
  }
  
  // Execute a command
  async execute(
    name: string, 
    args: any, 
    container: ServiceContainer
  ): Promise<CommandResult> {
    const command = this.commands.get(name);
    if (!command) {
      throw new Error(`Command '${name}' not found`);
    }
    
    // Validate arguments
    const validation = command.validateArgs(args);
    if (!validation.valid) {
      throw new Error(`Invalid arguments: ${validation.errors.join(', ')}`);
    }
    
    // Create command context
    const context: CommandContext = {
      container,
      command: name,
      args,
      timestamp: new Date()
    };
    
    // Execute with error handling
    try {
      return await command.executeCommand(context);
    } catch (error) {
      // Log error and re-throw with context
      console.error(`Command '${name}' failed:`, error);
      throw error;
    }
  }
  
  // Get all command schemas for MCP
  getSchemas(): ToolSchema[] {
    return Array.from(this.commands.values()).map(cmd => cmd.getSchema());
  }
}
```

### 3. Base Command Class (`Command.ts`)

Provides common functionality for all commands:

```typescript
export abstract class Command {
  abstract name: string;
  abstract description: string;
  
  // Validate command arguments
  abstract validateArgs(args: any): ValidationResult;
  
  // Execute the command
  abstract executeCommand(context: CommandContext): Promise<CommandResult>;
  
  // Get MCP tool schema
  abstract getSchema(): ToolSchema;
  
  // Common validation helpers
  protected validatePath(path: string): boolean {
    return path && typeof path === 'string' && path.length > 0;
  }
  
  protected validateRequired(value: any, name: string): void {
    if (value === undefined || value === null) {
      throw new Error(`Required parameter '${name}' is missing`);
    }
  }
  
  protected sanitizePath(path: string): string {
    return path.replace(/\.\./g, '').replace(/\/+/g, '/');
  }
  
  // Common error formatting
  protected formatError(error: any): CommandResult {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error instanceof Error ? error.message : String(error)}`
      }]
    };
  }
  
  // Common success formatting
  protected formatSuccess(message: string, data?: any): CommandResult {
    return {
      content: [{
        type: 'text',
        text: data ? JSON.stringify({ message, data }, null, 2) : message
      }]
    };
  }
}
```

## 🚀 Request Flow

Here's how a typical request flows through the system:

```
1. MCP Client Request
   ↓
2. MCP Server (index.ts)
   ├─ Parse request
   ├─ Extract command & args
   └─ Route to CommandRegistry
   ↓
3. CommandRegistry
   ├─ Find command by name
   ├─ Validate arguments
   ├─ Create context
   └─ Execute command
   ↓
4. Command Implementation
   ├─ Get required services from container
   ├─ Perform business logic
   └─ Return result
   ↓
5. Service Layer
   ├─ Apply cross-cutting concerns
   ├─ Interact with infrastructure
   └─ Return data
   ↓
6. Response Formatting
   ├─ Format as MCP response
   └─ Send to client
```

### Example: Read File Request

```typescript
// 1. Client request
const request = {
  method: 'tools/call',
  params: {
    name: 'read_file',
    arguments: { path: './package.json' }
  }
};

// 2. Server routing
const result = await commandRegistry.execute('read_file', args, container);

// 3. Command execution
class ReadFileCommand extends Command {
  async executeCommand(context: CommandContext): Promise<CommandResult> {
    // 4. Service injection
    const fileService = context.container.get<FileService>('fileService');
    
    // 5. Service execution
    const content = await fileService.readFile(context.args.path);
    
    // 6. Response formatting
    return this.formatSuccess('File read successfully', { content });
  }
}
```

## 🔐 Security Architecture

Security is implemented at multiple layers:

### 1. Input Validation
```typescript
// Command level validation
validateArgs(args: any): ValidationResult {
  const errors: string[] = [];
  
  if (!this.validatePath(args.path)) {
    errors.push('Invalid file path');
  }
  
  if (args.path.includes('..')) {
    errors.push('Path traversal not allowed');
  }
  
  return { valid: errors.length === 0, errors };
}
```

### 2. Service Level Security
```typescript
class SecurityService {
  private securityLevel: 'strict' | 'moderate' | 'permissive';
  
  async validatePath(path: string): Promise<void> {
    // Check against security level
    if (this.securityLevel === 'strict') {
      await this.validateStrictPath(path);
    }
    
    // Check for malicious patterns
    if (this.containsMaliciousPattern(path)) {
      throw new Error('Potentially malicious path detected');
    }
  }
  
  private containsMaliciousPattern(path: string): boolean {
    const patterns = [
      /\.\./,           // Path traversal
      /\/etc\/passwd/,  // System files
      /\/proc\//,       // Process files
      /\$\{.*\}/,       // Variable injection
    ];
    
    return patterns.some(pattern => pattern.test(path));
  }
}
```

### 3. Resource Limits
```typescript
class ResourceManager {
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly maxConcurrency = 10;
  private activeTasks = 0;
  
  async checkResourceLimits(operation: string, size?: number): Promise<void> {
    if (this.activeTasks >= this.maxConcurrency) {
      throw new Error('Too many concurrent operations');
    }
    
    if (size && size > this.maxFileSize) {
      throw new Error('File too large');
    }
  }
}
```

## 📊 Performance Architecture

Performance is optimized through several mechanisms:

### 1. Caching System
```typescript
interface CacheService {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

class LRUCacheService implements CacheService {
  private cache = new Map();
  private maxSize = 1000;
  private defaultTTL = 5 * 60 * 1000; // 5 minutes
  
  async get(key: string): Promise<any> {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check TTL
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }
}
```

### 2. Stream Processing
```typescript
class StreamingFileService {
  async readLargeFile(path: string): Promise<ReadableStream> {
    return new ReadableStream({
      start(controller) {
        const stream = fs.createReadStream(path, { highWaterMark: 64 * 1024 });
        
        stream.on('data', chunk => {
          controller.enqueue(chunk);
        });
        
        stream.on('end', () => {
          controller.close();
        });
        
        stream.on('error', err => {
          controller.error(err);
        });
      }
    });
  }
}
```

### 3. Monitoring & Metrics
```typescript
class MonitoringService {
  private metrics = new Map<string, number[]>();
  
  recordOperation(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const durations = this.metrics.get(operation)!;
    durations.push(duration);
    
    // Keep only last 1000 measurements
    if (durations.length > 1000) {
      durations.shift();
    }
  }
  
  getMetrics(operation: string): OperationMetrics {
    const durations = this.metrics.get(operation) || [];
    
    return {
      count: durations.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      p95: this.percentile(durations, 0.95),
      p99: this.percentile(durations, 0.99)
    };
  }
}
```

## 🧪 Testing Architecture

The testing strategy follows the architecture layers:

### 1. Unit Tests
```typescript
describe('ReadFileCommand', () => {
  let command: ReadFileCommand;
  let mockFileService: jest.Mocked<FileService>;
  let container: ServiceContainer;
  
  beforeEach(() => {
    mockFileService = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      // ... other methods
    };
    
    container = new ServiceContainer();
    container.register('fileService', mockFileService);
    
    command = new ReadFileCommand();
  });
  
  it('should read file successfully', async () => {
    mockFileService.readFile.mockResolvedValue('file content');
    
    const result = await command.executeCommand({
      container,
      command: 'read_file',
      args: { path: './test.txt' },
      timestamp: new Date()
    });
    
    expect(result.content[0].text).toContain('file content');
  });
});
```

### 2. Integration Tests
```typescript
describe('File Operations Integration', () => {
  let server: MCPServer;
  
  beforeAll(async () => {
    server = new MCPServer();
    await server.start();
  });
  
  it('should complete file lifecycle', async () => {
    // Create file
    await server.execute('write_file', {
      path: './test-file.txt',
      content: 'test content'
    });
    
    // Read file
    const readResult = await server.execute('read_file', {
      path: './test-file.txt'
    });
    
    expect(readResult.content[0].text).toBe('test content');
    
    // Delete file
    await server.execute('delete_file', {
      path: './test-file.txt'
    });
  });
});
```

## 🔧 Extension Points

The architecture provides several extension points:

### 1. Custom Commands
```typescript
class CustomAnalysisCommand extends Command {
  name = 'custom_analysis';
  description = 'Custom code analysis';
  
  validateArgs(args: any): ValidationResult {
    // Custom validation
  }
  
  async executeCommand(context: CommandContext): Promise<CommandResult> {
    // Custom logic
  }
  
  getSchema(): ToolSchema {
    // Custom schema
  }
}

// Register the command
commandRegistry.register(new CustomAnalysisCommand());
```

### 2. Custom Services
```typescript
interface CustomService {
  performCustomOperation(data: any): Promise<any>;
}

class CustomServiceImpl implements CustomService {
  async performCustomOperation(data: any): Promise<any> {
    // Custom implementation
  }
}

// Register the service
container.register('customService', new CustomServiceImpl());
```

### 3. Middleware
```typescript
interface CommandMiddleware {
  before(context: CommandContext): Promise<void>;
  after(context: CommandContext, result: CommandResult): Promise<CommandResult>;
}

class LoggingMiddleware implements CommandMiddleware {
  async before(context: CommandContext): Promise<void> {
    console.log(`Executing command: ${context.command}`);
  }
  
  async after(context: CommandContext, result: CommandResult): Promise<CommandResult> {
    console.log(`Command completed: ${context.command}`);
    return result;
  }
}
```

This architecture provides a solid foundation for the AI FileSystem MCP, enabling scalability, maintainability, and extensibility while maintaining high performance and security standards.