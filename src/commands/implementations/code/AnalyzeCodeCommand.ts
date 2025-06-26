import { BaseCommand, CommandContext, CommandResult } from '../../base/BaseCommand.js';

export class AnalyzeCodeCommand extends BaseCommand {
  readonly name = 'analyze_code';
  readonly description = 'Analyze TypeScript/JavaScript code structure';
  readonly inputSchema = {
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
    const codeService = context.container.getService('codeAnalysisService') as any;
    
    const analysis = await codeService.analyzeCode(path);
    
    return this.formatResult(analysis);
  }
}
