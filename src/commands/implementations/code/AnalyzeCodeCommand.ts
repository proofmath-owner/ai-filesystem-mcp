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
    
    if (analysis.summary) {
      output += `📈 Summary:\n`;
      output += `  Files analyzed: ${analysis.summary.totalFiles || 0}\n`;
      output += `  Lines of code: ${analysis.summary.totalLines || 0}\n`;
      output += `  Functions: ${analysis.summary.functions || 0}\n`;
      output += `  Classes: ${analysis.summary.classes || 0}\n`;
      output += `  Interfaces: ${analysis.summary.interfaces || 0}\n\n`;
    }
    
    if (analysis.complexity) {
      output += `🔍 Complexity:\n`;
      output += `  Average complexity: ${analysis.complexity.average || 0}\n`;
      output += `  Max complexity: ${analysis.complexity.max || 0}\n`;
      if (analysis.complexity.mostComplex) {
        output += `  Most complex file: ${analysis.complexity.mostComplex}\n`;
      }
      output += '\n';
    }
    
    if (analysis.issues && analysis.issues.length > 0) {
      output += `⚠️ Issues Found (${analysis.issues.length}):\n`;
      analysis.issues.slice(0, 10).forEach(issue => {
        output += `  ${issue.file}:${issue.line} - ${issue.message}\n`;
      });
      if (analysis.issues.length > 10) {
        output += `  ... and ${analysis.issues.length - 10} more issues\n`;
      }
      output += '\n';
    }
    
    if (analysis.suggestions && analysis.suggestions.length > 0) {
      output += `💡 Suggestions:\n`;
      analysis.suggestions.forEach(suggestion => {
        output += `  • ${suggestion}\n`;
      });
    }
    
    return this.formatResult(output.trim());
  }
}
