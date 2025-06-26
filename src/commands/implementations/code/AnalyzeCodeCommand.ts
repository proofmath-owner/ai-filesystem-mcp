import { BaseCommand } from '../../base/BaseCommand.js';
import { CommandContext, CommandResult } from '../../../core/interfaces/ICommand.js';
import { ICodeAnalysisService } from '../../../core/interfaces/ICodeAnalysisService.js';

export class AnalyzeCodeCommand extends BaseCommand {
  readonly name = 'analyze_code';
  readonly description = 'Analyze TypeScript/JavaScript code structure';
  readonly inputSchema = {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'File or directory path to analyze'
      },
      options: {
        type: 'object',
        properties: {
          includeTests: { type: 'boolean', description: 'Include test files' },
          includeNodeModules: { type: 'boolean', description: 'Include node_modules' },
          outputFormat: { 
            type: 'string', 
            enum: ['summary', 'detailed', 'json'],
            description: 'Output format'
          }
        }
      }
    },
    required: ['path']
  };

  protected validateArgs(args: Record<string, any>): void {
    this.assertString(args.path, 'path');
    
    if (args.options !== undefined) {
      if (typeof args.options !== 'object') {
        throw new Error('Options must be an object');
      }
    }
  }

  protected async executeCommand(context: CommandContext): Promise<CommandResult> {
    const { path, options = {} } = context.args;
    const codeService = context.container.getService<ICodeAnalysisService>('codeAnalysisService');
    
    const analysis = await codeService.analyzeCode(path);
    
    // Format the analysis result based on output format
    if (options.outputFormat === 'json') {
      return this.formatResult(JSON.stringify(analysis, null, 2));
    }
    
    // Format as readable text
    let output = `📊 Code Analysis Results for: ${path}\n\n`;
    
    // Handle both enhanced and basic analysis formats
    if (analysis.summary) {
      output += `📈 Summary:\n`;
      output += `  Lines of code: ${analysis.summary.linesOfCode || 0}\n`;
      output += `  Functions: ${analysis.summary.totalFunctions || analysis.functions?.length || 0}\n`;
      output += `  Classes: ${analysis.summary.totalClasses || analysis.classes?.length || 0}\n`;
      output += `  Imports: ${analysis.summary.totalImports || analysis.imports?.length || 0}\n`;
      output += `  Exports: ${analysis.summary.totalExports || analysis.exports?.length || 0}\n\n`;
    } else {
      // Fallback for basic analysis without summary
      output += `📈 Summary:\n`;
      output += `  Functions: ${analysis.functions?.length || 0}\n`;
      output += `  Classes: ${analysis.classes?.length || 0}\n`;
      output += `  Imports: ${analysis.imports?.length || 0}\n`;
      output += `  Exports: ${analysis.exports?.length || 0}\n\n`;
    }
    
    if (analysis.complexity) {
      output += `🔍 Complexity Analysis:\n`;
      output += `  Overall complexity: ${analysis.complexity.overall || 0}\n`;
      output += `  Maintainability: ${analysis.complexity.maintainability || 0}%\n`;
      output += `  Rating: ${analysis.complexity.rating || 'unknown'}\n\n`;
    }
    
    if (analysis.issues && analysis.issues.length > 0) {
      output += `⚠️ Issues Found (${analysis.issues.length}):\n`;
      analysis.issues.slice(0, 10).forEach((issue: any) => {
        output += `  [${issue.severity.toUpperCase()}] ${issue.category}: ${issue.message}\n`;
      });
      if (analysis.issues.length > 10) {
        output += `  ... and ${analysis.issues.length - 10} more issues\n`;
      }
      output += '\n';
    }
    
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      output += `💡 Suggestions:\n`;
      analysis.suggestions.forEach((suggestion: any) => {
        const msg = typeof suggestion === 'string' ? suggestion : suggestion.message;
        output += `  • ${msg}\n`;
      });
      output += '\n';
    }
    
    // Show function details if in detailed mode
    if (options.outputFormat === 'detailed' && analysis.functions?.length > 0) {
      output += `🔧 Function Details:\n`;
      analysis.functions.slice(0, 5).forEach((func: any) => {
        output += `  • ${func.name || 'anonymous'} (${func.params?.length || 0} params)\n`;
      });
      if (analysis.functions.length > 5) {
        output += `  ... and ${analysis.functions.length - 5} more functions\n`;
      }
      output += '\n';
    }
    
    // Show class details if in detailed mode
    if (options.outputFormat === 'detailed' && analysis.classes?.length > 0) {
      output += `📦 Class Details:\n`;
      analysis.classes.slice(0, 3).forEach((cls: any) => {
        output += `  • ${cls.name} (${cls.methods?.length || 0} methods)\n`;
      });
      if (analysis.classes.length > 3) {
        output += `  ... and ${analysis.classes.length - 3} more classes\n`;
      }
    }
    
    return this.formatResult(output.trim());
  }
}
