import { SearchFilesCommand } from '../../../commands/implementations/search/SearchFilesCommand';
import { SearchContentCommand } from '../../../commands/implementations/search/SearchContentCommand';
import { FuzzySearchCommand } from '../../../commands/implementations/search/FuzzySearchCommand';
import { ServiceContainer } from '../../../core/ServiceContainer';
import { SearchService } from '../../../core/services/search/SearchService';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock file system
jest.mock('fs/promises');

describe('Search Commands', () => {
  let container: ServiceContainer;
  let mockSearchService: jest.Mocked<SearchService>;

  beforeEach(async () => {
    container = new ServiceContainer();
    
    // Create mock search service
    mockSearchService = {
      searchFiles: jest.fn(),
      searchContent: jest.fn(),
      fuzzySearch: jest.fn(),
      semanticSearch: jest.fn(),
      initialize: jest.fn(),
      dispose: jest.fn(),
    } as any;

    container.register('searchService', mockSearchService);
  });

  afterEach(async () => {
    await container.dispose();
    jest.clearAllMocks();
  });

  describe('SearchFilesCommand', () => {
    let command: SearchFilesCommand;

    beforeEach(() => {
      command = new SearchFilesCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('search_files');
      expect(schema.description).toContain('Search for files');
      expect(schema.inputSchema.properties).toHaveProperty('pattern');
      expect(schema.inputSchema.properties).toHaveProperty('directory');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pattern is required');
    });

    it('should validate arguments correctly', () => {
      const validArgs = {
        pattern: '*.ts',
        directory: '/test'
      };
      
      const result = command.validateArgs(validArgs);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should execute search successfully', async () => {
      const args = {
        pattern: '*.ts',
        directory: '/test'
      };

      const mockResults = [
        '/test/file1.ts',
        '/test/file2.ts'
      ];

      mockSearchService.searchFiles.mockResolvedValue(mockResults);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockSearchService.searchFiles).toHaveBeenCalledWith('*.ts', '/test', undefined);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Found 2 files');
      expect(result.content[0].text).toContain('/test/file1.ts');
      expect(result.content[0].text).toContain('/test/file2.ts');
    });

    it('should handle search with no results', async () => {
      const args = {
        pattern: '*.nonexistent',
        directory: '/test'
      };

      mockSearchService.searchFiles.mockResolvedValue([]);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toContain('No files found');
    });

    it('should handle search errors', async () => {
      const args = {
        pattern: '*.ts',
        directory: '/test'
      };

      mockSearchService.searchFiles.mockRejectedValue(new Error('Search failed'));

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Search failed');
    });
  });

  describe('SearchContentCommand', () => {
    let command: SearchContentCommand;

    beforeEach(() => {
      command = new SearchContentCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('search_content');
      expect(schema.description).toContain('Search for content');
      expect(schema.inputSchema.properties).toHaveProperty('query');
      expect(schema.inputSchema.properties).toHaveProperty('directory');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Query is required');
    });

    it('should execute content search successfully', async () => {
      const args = {
        query: 'function test',
        directory: '/test',
        filePattern: '*.ts'
      };

      const mockResults = [
        {
          file: '/test/file1.ts',
          matches: [
            { line: 5, text: 'function test() {', lineNumber: 5 }
          ]
        }
      ];

      mockSearchService.searchContent.mockResolvedValue(mockResults);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockSearchService.searchContent).toHaveBeenCalledWith(
        'function test',
        '/test',
        '*.ts',
        undefined
      );
      expect(result.content[0].text).toContain('Found content in 1 file');
      expect(result.content[0].text).toContain('/test/file1.ts');
      expect(result.content[0].text).toContain('Line 5');
    });

    it('should handle case-insensitive search', async () => {
      const args = {
        query: 'FUNCTION',
        directory: '/test',
        caseSensitive: false
      };

      const mockResults = [
        {
          file: '/test/file1.ts',
          matches: [
            { line: 5, text: 'function test() {', lineNumber: 5 }
          ]
        }
      ];

      mockSearchService.searchContent.mockResolvedValue(mockResults);

      const context = { container, args };
      await command.executeCommand(context);

      expect(mockSearchService.searchContent).toHaveBeenCalledWith(
        'FUNCTION',
        '/test',
        undefined,
        { caseSensitive: false }
      );
    });
  });

  describe('FuzzySearchCommand', () => {
    let command: FuzzySearchCommand;

    beforeEach(() => {
      command = new FuzzySearchCommand();
    });

    it('should have correct tool schema', () => {
      const schema = command.getToolSchema();
      
      expect(schema.name).toBe('fuzzy_search');
      expect(schema.description).toContain('fuzzy search');
      expect(schema.inputSchema.properties).toHaveProperty('query');
      expect(schema.inputSchema.properties).toHaveProperty('directory');
    });

    it('should validate required arguments', () => {
      const result = command.validateArgs({});
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Query is required');
    });

    it('should execute fuzzy search successfully', async () => {
      const args = {
        query: 'test file',
        directory: '/test',
        limit: 10
      };

      const mockResults = [
        {
          path: '/test/test_file.ts',
          score: 0.95,
          type: 'file' as const
        },
        {
          path: '/test/another_test.ts',
          score: 0.85,
          type: 'file' as const
        }
      ];

      mockSearchService.fuzzySearch.mockResolvedValue(mockResults);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(mockSearchService.fuzzySearch).toHaveBeenCalledWith(
        'test file',
        '/test',
        { limit: 10 }
      );
      expect(result.content[0].text).toContain('Found 2 fuzzy matches');
      expect(result.content[0].text).toContain('/test/test_file.ts');
      expect(result.content[0].text).toContain('Score: 0.95');
    });

    it('should handle fuzzy search with threshold', async () => {
      const args = {
        query: 'test',
        directory: '/test',
        threshold: 0.8
      };

      mockSearchService.fuzzySearch.mockResolvedValue([]);

      const context = { container, args };
      await command.executeCommand(context);

      expect(mockSearchService.fuzzySearch).toHaveBeenCalledWith(
        'test',
        '/test',
        { threshold: 0.8 }
      );
    });

    it('should sort results by score', async () => {
      const args = {
        query: 'test',
        directory: '/test'
      };

      const mockResults = [
        {
          path: '/test/low_score.ts',
          score: 0.6,
          type: 'file' as const
        },
        {
          path: '/test/high_score.ts',
          score: 0.9,
          type: 'file' as const
        }
      ];

      mockSearchService.fuzzySearch.mockResolvedValue(mockResults);

      const context = { container, args };
      const result = await command.executeCommand(context);

      expect(result.content[0].text).toMatch(/high_score\.ts.*Score: 0\.9.*low_score\.ts.*Score: 0\.6/s);
    });
  });
});