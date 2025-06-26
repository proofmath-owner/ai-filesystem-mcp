import { AnalyzeCodeCommand, ModifyCodeCommand } from '../../../commands/implementations/code/CodeAnalysisCommands';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { CodeAnalysisService } from '../../../core/services/code/CodeAnalysisService';

describe('Code Analysis Commands', () => {
  let container: ServiceContainer;
  let mockCodeAnalysisService: jest.Mocked<CodeAnalysisService>;

  beforeEach(async () => {
    container = new ServiceContainer();
    
    // Create mock code analysis service
    mockCodeAnalysisService = {
      analyzeCode: jest.fn(),
      modifyCode: jest.fn(),
      validateSyntax: jest.fn(),
      extractDependencies: jest.fn(),
      formatCode: jest.fn(),
      generateDocumentation: jest.fn(),
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    container.register('codeAnalysisService', mockCodeAnalysisService);
  });

  afterEach(async () => {
    await container.dispose();
    jest.clearAllMocks();
  });

  describe('AnalyzeCodeCommand', () => {
    let command: AnalyzeCodeCommand;

    beforeEach(() => {
      command = new AnalyzeCodeCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('analyze_code');
      expect(schema.description).toContain('Analyze code');
      expect(schema.inputSchema.properties).toHaveProperty('path');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path is required');
    });

    it('should execute code analysis for single file', async () => {
      const args = {
        path: '/test/src/utils.ts',
        analysisType: 'comprehensive',
        includeMetrics: true
      };

      const mockResult = {
        path: '/test/src/utils.ts',
        language: 'typescript',
        fileSize: 2048,
        lineCount: 85,
        analysis: {
          complexity: {
            cyclomatic: 12,
            cognitive: 8,
            halstead: {
              volume: 245.6,
              difficulty: 12.3,
              effort: 3021.1
            }
          },
          maintainability: {
            index: 78.5,
            rating: 'B'
          },
          issues: [
            {
              type: 'warning',
              line: 25,
              column: 10,
              message: 'Function is too complex',
              rule: 'max-complexity',
              severity: 'medium'
            },
            {
              type: 'error',
              line: 42,
              column: 5,
              message: 'Unused variable',
              rule: 'no-unused-vars',
              severity: 'low'
            }
          ],
          metrics: {
            functionsCount: 8,
            classesCount: 2,
            linesOfCode: 65,
            commentLines: 15,
            blankLines: 5
          },
          dependencies: [
            { name: 'lodash', version: '^4.17.21', type: 'external' },
            { name: './types', type: 'internal' }
          ]
        }
      };

      mockCodeAnalysisService.analyzeCode.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockCodeAnalysisService.analyzeCode).toHaveBeenCalledWith(
        '/test/src/utils.ts',
        {
          analysisType: 'comprehensive',
          includeMetrics: true
        }
      );
      expect(result.content[0].text).toContain('Code Analysis Report');
      expect(result.content[0].text).toContain('Language: typescript');
      expect(result.content[0].text).toContain('Lines of code: 85');
      expect(result.content[0].text).toContain('Cyclomatic complexity: 12');
      expect(result.content[0].text).toContain('Maintainability index: 78.5 (B)');
      expect(result.content[0].text).toContain('Issues found: 2');
      expect(result.content[0].text).toContain('Line 25: Function is too complex');
      expect(result.content[0].text).toContain('Line 42: Unused variable');
    });

    it('should execute code analysis for directory', async () => {
      const args = {
        path: '/test/src/',
        analysisType: 'quick',
        includeTests: false
      };

      const mockResult = {
        path: '/test/src/',
        language: 'mixed',
        totalFiles: 15,
        analyzedFiles: 12,
        skippedFiles: 3,
        analysis: {
          complexity: {
            average: 8.5,
            maximum: 25,
            files: [
              { path: '/test/src/complex.ts', complexity: 25 },
              { path: '/test/src/simple.ts', complexity: 3 }
            ]
          },
          maintainability: {
            average: 82.3,
            distribution: {
              'A': 5,
              'B': 4,
              'C': 2,
              'D': 1
            }
          },
          issues: [
            {
              file: '/test/src/complex.ts',
              type: 'error',
              line: 45,
              message: 'Potential null pointer',
              severity: 'high'
            }
          ],
          summary: {
            totalLines: 1250,
            codeLines: 980,
            commentLines: 150,
            blankLines: 120,
            functionsCount: 85,
            classesCount: 12
          },
          languages: {
            'typescript': 10,
            'javascript': 2
          }
        }
      };

      mockCodeAnalysisService.analyzeCode.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Directory Analysis Report');
      expect(result.content[0].text).toContain('Total files: 15');
      expect(result.content[0].text).toContain('Analyzed files: 12');
      expect(result.content[0].text).toContain('Average complexity: 8.5');
      expect(result.content[0].text).toContain('Most complex: complex.ts (25)');
      expect(result.content[0].text).toContain('Maintainability distribution:');
      expect(result.content[0].text).toContain('Grade A: 5 files');
    });

    it('should handle syntax-only analysis', async () => {
      const args = {
        path: '/test/script.js',
        analysisType: 'syntax'
      };

      const mockResult = {
        path: '/test/script.js',
        language: 'javascript',
        fileSize: 1024,
        lineCount: 45,
        analysis: {
          syntaxValid: true,
          parseErrors: [],
          warnings: [
            {
              line: 10,
              column: 15,
              message: 'Missing semicolon',
              rule: 'semi'
            }
          ]
        }
      };

      mockCodeAnalysisService.analyzeCode.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Syntax Analysis');
      expect(result.content[0].text).toContain('Syntax valid: ✓');
      expect(result.content[0].text).toContain('Warnings: 1');
      expect(result.content[0].text).toContain('Line 10: Missing semicolon');
    });

    it('should handle analysis errors', async () => {
      const args = {
        path: '/test/corrupted.ts'
      };

      mockCodeAnalysisService.analyzeCode.mockRejectedValue(new Error('Unable to parse file'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unable to parse file');
    });
  });

  describe('ModifyCodeCommand', () => {
    let command: ModifyCodeCommand;

    beforeEach(() => {
      command = new ModifyCodeCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('modify_code');
      expect(schema.description).toContain('Modify code');
      expect(schema.inputSchema.properties).toHaveProperty('path');
      expect(schema.inputSchema.properties).toHaveProperty('modifications');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Path is required');
      expect(result.errors).toContain('Modifications are required');
    });

    it('should validate modifications is array', () => {
      const result = command.validateArgs({
        path: '/test/file.ts',
        modifications: 'not-an-array'
      });
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Modifications must be an array');
    });

    it('should execute code modifications successfully', async () => {
      const args = {
        path: '/test/src/service.ts',
        modifications: [
          {
            type: 'replace',
            target: 'console.log',
            replacement: 'logger.info',
            all: true
          },
          {
            type: 'add_import',
            module: './logger',
            imports: ['logger']
          },
          {
            type: 'add_function',
            name: 'validateInput',
            parameters: ['input: string'],
            returnType: 'boolean',
            body: 'return input.length > 0;'
          }
        ],
        backup: true,
        format: true
      };

      const mockResult = {
        path: '/test/src/service.ts',
        backupPath: '/test/src/service.ts.backup',
        modificationsApplied: 3,
        changes: [
          {
            type: 'replace',
            line: 15,
            before: 'console.log("Debug message")',
            after: 'logger.info("Debug message")',
            success: true
          },
          {
            type: 'replace',
            line: 28,
            before: 'console.log("Another message")',
            after: 'logger.info("Another message")',
            success: true
          },
          {
            type: 'add_import',
            line: 3,
            added: 'import { logger } from "./logger";',
            success: true
          },
          {
            type: 'add_function',
            line: 45,
            added: 'function validateInput(input: string): boolean {\n  return input.length > 0;\n}',
            success: true
          }
        ],
        linesAdded: 3,
        linesModified: 2,
        finalSize: 2150,
        formatted: true
      };

      mockCodeAnalysisService.modifyCode.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockCodeAnalysisService.modifyCode).toHaveBeenCalledWith(
        '/test/src/service.ts',
        args.modifications,
        {
          backup: true,
          format: true
        }
      );
      expect(result.content[0].text).toContain('Code modifications completed');
      expect(result.content[0].text).toContain('3 modifications applied');
      expect(result.content[0].text).toContain('Lines added: 3');
      expect(result.content[0].text).toContain('Lines modified: 2');
      expect(result.content[0].text).toContain('Backup created: service.ts.backup');
      expect(result.content[0].text).toContain('Code formatted');
      expect(result.content[0].text).toContain('Line 15: console.log → logger.info');
    });

    it('should handle refactoring modifications', async () => {
      const args = {
        path: '/test/src/legacy.ts',
        modifications: [
          {
            type: 'refactor_function',
            functionName: 'processData',
            newName: 'processUserData',
            updateReferences: true
          },
          {
            type: 'extract_method',
            startLine: 25,
            endLine: 35,
            newMethodName: 'validateUserInput',
            returnType: 'boolean'
          }
        ]
      };

      const mockResult = {
        path: '/test/src/legacy.ts',
        modificationsApplied: 2,
        changes: [
          {
            type: 'refactor_function',
            line: 10,
            before: 'function processData(data: any)',
            after: 'function processUserData(data: any)',
            success: true,
            referencesUpdated: 5
          },
          {
            type: 'extract_method',
            extracted: {
              name: 'validateUserInput',
              startLine: 25,
              endLine: 35,
              newMethodLine: 8
            },
            success: true
          }
        ],
        linesAdded: 12,
        linesModified: 6,
        finalSize: 1850
      };

      mockCodeAnalysisService.modifyCode.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Refactoring completed');
      expect(result.content[0].text).toContain('processData → processUserData');
      expect(result.content[0].text).toContain('5 references updated');
      expect(result.content[0].text).toContain('Method extracted: validateUserInput');
    });

    it('should handle modification with partial failures', async () => {
      const args = {
        path: '/test/src/problematic.ts',
        modifications: [
          {
            type: 'replace',
            target: 'oldFunction',
            replacement: 'newFunction'
          },
          {
            type: 'add_import',
            module: 'nonexistent-module',
            imports: ['something']
          }
        ]
      };

      const mockResult = {
        path: '/test/src/problematic.ts',
        modificationsApplied: 1,
        changes: [
          {
            type: 'replace',
            line: 12,
            before: 'oldFunction(data)',
            after: 'newFunction(data)',
            success: true
          },
          {
            type: 'add_import',
            error: 'Module not found: nonexistent-module',
            success: false
          }
        ],
        linesModified: 1,
        errors: [
          {
            type: 'add_import',
            error: 'Module not found: nonexistent-module'
          }
        ],
        finalSize: 1024
      };

      mockCodeAnalysisService.modifyCode.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('1/2 modifications applied');
      expect(result.content[0].text).toContain('Errors:');
      expect(result.content[0].text).toContain('add_import: Module not found');
    });

    it('should handle code formatting', async () => {
      const args = {
        path: '/test/src/unformatted.ts',
        modifications: [
          {
            type: 'format_code',
            rules: {
              semicolons: true,
              quotes: 'single',
              indentation: 2
            }
          }
        ]
      };

      const mockResult = {
        path: '/test/src/unformatted.ts',
        modificationsApplied: 1,
        changes: [
          {
            type: 'format_code',
            linesChanged: 25,
            rulesApplied: ['semicolons', 'quotes', 'indentation'],
            success: true
          }
        ],
        linesModified: 25,
        finalSize: 1200,
        formatted: true
      };

      mockCodeAnalysisService.modifyCode.mockResolvedValue(mockResult);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('Code formatted');
      expect(result.content[0].text).toContain('25 lines formatted');
      expect(result.content[0].text).toContain('Rules applied: semicolons, quotes, indentation');
    });

    it('should handle modification errors', async () => {
      const args = {
        path: '/test/readonly.ts',
        modifications: [
          {
            type: 'replace',
            target: 'something',
            replacement: 'else'
          }
        ]
      };

      mockCodeAnalysisService.modifyCode.mockRejectedValue(new Error('Permission denied'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Permission denied');
    });
  });
});