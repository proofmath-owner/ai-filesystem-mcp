import { ASTProcessor, CodeAnalysis } from './ASTProcessor.js';

export interface RefactoringIssue {
  type: 'complexity' | 'naming' | 'duplication' | 'structure' | 'performance';
  severity: 'low' | 'medium' | 'high';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface RefactoringSuggestion {
  file: string;
  issues: RefactoringIssue[];
  score: number; // 0-100, where 100 is perfect
  suggestions?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    location: { line: number; column: number };
    description: string;
    suggestion: string;
    example?: string;
  }>;
}

export class RefactoringEngine {
  private astProcessor: ASTProcessor;

  constructor() {
    this.astProcessor = new ASTProcessor();
  }

  async analyzeFile(filePath: string): Promise<RefactoringSuggestion> {
    const analysis = await this.astProcessor.analyzeCode(filePath);
    const issues: RefactoringIssue[] = [];
    
    // Check function complexity
    this.checkFunctionComplexity(analysis, issues);
    
    // Check naming conventions
    this.checkNamingConventions(analysis, issues);
    
    // Check for large classes
    this.checkClassSize(analysis, issues);
    
    // Check for unused variables
    this.checkUnusedVariables(analysis, issues);
    
    // Check for missing exports
    this.checkMissingExports(analysis, issues);
    
    // Calculate overall score
    const score = this.calculateScore(issues);
    
    // Convert issues to suggestions format
    const suggestions = issues.map(issue => ({
      type: issue.type,
      severity: issue.severity,
      location: { line: issue.line || 0, column: 0 },
      description: issue.message,
      suggestion: issue.suggestion || '',
      example: undefined
    }));
    
    return {
      file: filePath,
      issues,
      score,
      suggestions
    };
  }

  private checkFunctionComplexity(analysis: CodeAnalysis, issues: RefactoringIssue[]): void {
    for (const func of analysis.functions) {
      // Simple complexity check based on parameter count
      if (func.params.length > 3) {
        issues.push({
          type: 'complexity',
          severity: 'medium',
          message: `Function '${func.name}' has ${func.params.length} parameters. Consider using an options object.`,
          line: func.line,
          suggestion: `Refactor to use a single options parameter: ${func.name}(options: { ${func.params.join(', ')} })`
        });
      }
    }
  }

  private checkNamingConventions(analysis: CodeAnalysis, issues: RefactoringIssue[]): void {
    // Check function names
    for (const func of analysis.functions) {
      if (!this.isCamelCase(func.name)) {
        issues.push({
          type: 'naming',
          severity: 'low',
          message: `Function '${func.name}' should use camelCase naming.`,
          line: func.line,
          suggestion: `Rename to: ${this.toCamelCase(func.name)}`
        });
      }
    }

    // Check class names
    for (const cls of analysis.classes) {
      if (!this.isPascalCase(cls.name)) {
        issues.push({
          type: 'naming',
          severity: 'low',
          message: `Class '${cls.name}' should use PascalCase naming.`,
          line: cls.line,
          suggestion: `Rename to: ${this.toPascalCase(cls.name)}`
        });
      }
    }

    // Check constants
    for (const variable of analysis.variables) {
      if (variable.kind === 'const' && variable.name.toUpperCase() === variable.name) {
        // This is fine - UPPER_CASE constants
      } else if (variable.kind === 'const' && !this.isCamelCase(variable.name)) {
        issues.push({
          type: 'naming',
          severity: 'low',
          message: `Constant '${variable.name}' should use camelCase or UPPER_CASE naming.`,
          line: variable.line
        });
      }
    }
  }

  private checkClassSize(analysis: CodeAnalysis, issues: RefactoringIssue[]): void {
    for (const cls of analysis.classes) {
      if (cls.methods.length > 10) {
        issues.push({
          type: 'structure',
          severity: 'high',
          message: `Class '${cls.name}' has ${cls.methods.length} methods. Consider splitting into smaller classes.`,
          line: cls.line,
          suggestion: 'Apply Single Responsibility Principle and extract related methods into separate classes.'
        });
      }
    }
  }

  private checkUnusedVariables(analysis: CodeAnalysis, issues: RefactoringIssue[]): void {
    // This is a simplified check - in reality, we'd need to track usage
    for (const variable of analysis.variables) {
      if (variable.name.startsWith('_')) {
        issues.push({
          type: 'structure',
          severity: 'low',
          message: `Variable '${variable.name}' appears to be unused (prefixed with _).`,
          line: variable.line,
          suggestion: 'Remove unused variables to keep code clean.'
        });
      }
    }
  }

  private checkMissingExports(analysis: CodeAnalysis, issues: RefactoringIssue[]): void {
    // Check if main classes/functions are exported
    const exportedNames = new Set(analysis.exports.map(exp => exp.name));
    
    for (const cls of analysis.classes) {
      if (!exportedNames.has(cls.name) && !cls.name.startsWith('_')) {
        issues.push({
          type: 'structure',
          severity: 'medium',
          message: `Class '${cls.name}' is not exported. Consider exporting if it's part of the public API.`,
          line: cls.line,
          suggestion: `Add: export { ${cls.name} };`
        });
      }
    }
  }

  private calculateScore(issues: RefactoringIssue[]): number {
    let score = 100;
    
    for (const issue of issues) {
      switch (issue.severity) {
        case 'low':
          score -= 2;
          break;
        case 'medium':
          score -= 5;
          break;
        case 'high':
          score -= 10;
          break;
      }
    }
    
    return Math.max(0, score);
  }

  private isCamelCase(str: string): boolean {
    return /^[a-z][a-zA-Z0-9]*$/.test(str);
  }

  private isPascalCase(str: string): boolean {
    return /^[A-Z][a-zA-Z0-9]*$/.test(str);
  }

  private toCamelCase(str: string): string {
    return str.charAt(0).toLowerCase() + str.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private toPascalCase(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
}
