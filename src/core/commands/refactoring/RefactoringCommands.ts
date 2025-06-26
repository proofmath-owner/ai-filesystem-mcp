import { Command, CommandContext, CommandResult } from '../Command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

/**
 * Suggest Refactoring Command
 * 코드 리팩토링 제안을 생성합니다.
 */
export class SuggestRefactoringCommand extends Command {
  readonly name = 'suggest_refactoring';
  readonly description = 'Get code refactoring suggestions';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'File path to analyze' 
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path } = context.args;
    return await context.fsManager.suggestRefactoring(path);
  }
}

/**
 * Auto Format Project Command
 * 프로젝트의 모든 코드 파일을 자동으로 포맷합니다.
 */
export class AutoFormatProjectCommand extends Command {
  readonly name = 'auto_format_project';
  readonly description = 'Automatically format all code files in a project';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      directory: { 
        type: 'string', 
        description: 'Project directory' 
      }
    },
    required: ['directory']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.directory, 'directory');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { directory } = context.args;
    return await context.fsManager.autoFormatProject(directory);
  }
}

/**
 * Analyze Code Quality Command
 * 코드 품질 메트릭을 분석합니다.
 */
export class AnalyzeCodeQualityCommand extends Command {
  readonly name = 'analyze_code_quality';
  readonly description = 'Analyze code quality metrics';
  readonly inputSchema: Tool['inputSchema'] = {
    type: 'object',
    properties: {
      path: { 
        type: 'string', 
        description: 'File to analyze' 
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path } = context.args;
    return await context.fsManager.analyzeCodeQuality(path);
  }
}
