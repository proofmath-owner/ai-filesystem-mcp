import { ICodeAnalysisService } from '../../interfaces/ICodeAnalysisService.js';
import { ASTProcessor, CodeAnalysis } from './ASTProcessor.js';
import { RefactoringEngine, RefactoringSuggestion } from './RefactoringEngine.js';
import * as parser from '@babel/parser';
import * as t from '@babel/types';
import * as fs from 'fs/promises';

// Use require for problematic imports
import traversePkg from '@babel/traverse';
import generatePkg from '@babel/generator';
const traverse = (traversePkg as any).default || traversePkg;
const generate = (generatePkg as any).default || generatePkg;

export interface CodeModification {
  type: 'rename' | 'addImport' | 'removeImport' | 'addFunction' | 'updateFunction' | 'addProperty';
  target?: string;
  newName?: string;
  importName?: string;
  importPath?: string;
  functionCode?: string;
  propertyName?: string;
  propertyValue?: string;
}

export class CodeAnalysisService implements ICodeAnalysisService {
  constructor(
    private astProcessor: ASTProcessor,
    private refactoringEngine: RefactoringEngine
  ) {}

  async analyzeCode(path: string): Promise<CodeAnalysis> {
    const basicAnalysis = await this.astProcessor.analyzeCode(path);
    const qualityMetrics = await this.analyzeQuality(path);
    
    // Enhance basic analysis with detailed metrics
    const enhancedAnalysis = {
      ...basicAnalysis,
      summary: {
        totalFunctions: basicAnalysis.functions.length,
        totalClasses: basicAnalysis.classes.length,
        totalImports: basicAnalysis.imports.length,
        totalExports: basicAnalysis.exports.length,
        linesOfCode: qualityMetrics.linesOfCode
      },
      complexity: {
        overall: qualityMetrics.complexity,
        maintainability: qualityMetrics.maintainability,
        rating: this.getComplexityRating(qualityMetrics.complexity)
      },
      issues: qualityMetrics.issues.map((issue: any) => ({
        type: issue.type,
        severity: issue.type === 'warning' ? 'medium' : 'low',
        message: issue.message,
        category: this.categorizeIssue(issue.message)
      })),
      suggestions: [
        ...(qualityMetrics.complexity > 10 ? [{
          type: 'complexity',
          message: 'Consider breaking down complex functions',
          severity: 'medium'
        }] : []),
        ...(basicAnalysis.functions.length > 20 ? [{
          type: 'structure',
          message: 'Consider splitting this file into smaller modules',
          severity: 'low'
        }] : []),
        ...(basicAnalysis.functions.some((f: any) => !f.name || f.name.length < 3) ? [{
          type: 'naming',
          message: 'Use more descriptive function names',
          severity: 'low'
        }] : [])
      ]
    };
    
    return enhancedAnalysis;
  }

  async modifyCode(
    path: string,
    modifications: CodeModification[]
  ): Promise<{
    appliedModifications: string[];
    backupPath: string;
  }> {
    // Create backup
    const backupPath = `${path}.backup.${Date.now()}`;
    const content = await fs.readFile(path, 'utf-8');
    await fs.writeFile(backupPath, content);
    
    const ast = parser.parse(content, {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'asyncGenerators',
        'objectRestSpread',
        'optionalChaining',
        'nullishCoalescingOperator'
      ]
    });

    const appliedModifications: string[] = [];

    for (const modification of modifications) {
      switch (modification.type) {
        case 'rename':
          this.renameSymbol(ast, modification.target!, modification.newName!);
          appliedModifications.push(`Renamed ${modification.target} to ${modification.newName}`);
          break;
        
        case 'addImport':
          this.addImport(ast, modification.importName!, modification.importPath!);
          appliedModifications.push(`Added import ${modification.importName} from ${modification.importPath}`);
          break;
        
        case 'removeImport':
          this.removeImport(ast, modification.importPath!);
          appliedModifications.push(`Removed import from ${modification.importPath}`);
          break;
        
        case 'addFunction':
          this.addFunction(ast, modification.functionCode!);
          appliedModifications.push('Added function');
          break;
        
        case 'updateFunction':
          this.updateFunction(ast, modification.target!, modification.functionCode!);
          appliedModifications.push(`Updated function ${modification.target}`);
          break;
        
        case 'addProperty':
          this.addProperty(ast, modification.target!, modification.propertyName!, modification.propertyValue!);
          appliedModifications.push(`Added property ${modification.propertyName} to ${modification.target}`);
          break;
      }
    }

    const output = generate(ast, {
      retainLines: true,
      retainFunctionParens: true,
      comments: true
    });

    await fs.writeFile(path, output.code);
    
    return {
      appliedModifications,
      backupPath
    };
  }

  async suggestRefactoring(
    path: string,
    options?: {
      focusAreas?: Array<'complexity' | 'naming' | 'duplication' | 'performance' | 'structure'>;
      maxSuggestions?: number;
    }
  ): Promise<Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    location: { line: number; column: number };
    description: string;
    suggestion: string;
    example?: string;
  }>> {
    const analysis = await this.refactoringEngine.analyzeFile(path);
    const suggestions: Array<{
      type: string;
      severity: 'low' | 'medium' | 'high';
      location: { line: number; column: number };
      description: string;
      suggestion: string;
      example?: string;
    }> = [];
    
    // Convert RefactoringSuggestion to the expected format
    // This is a simplified version - you'd implement the full conversion logic
    if (analysis.suggestions) {
      analysis.suggestions.forEach((s: any) => {
        suggestions.push({
          type: s.type,
          severity: s.severity || 'medium',
          location: s.location || { line: 0, column: 0 },
          description: s.description,
          suggestion: s.suggestion,
          example: s.example
        });
      });
    }
    
    // Filter by focus areas if specified
    let filteredSuggestions = suggestions;
    if (options?.focusAreas && options.focusAreas.length > 0) {
      filteredSuggestions = suggestions.filter(s => 
        options.focusAreas!.includes(s.type as any)
      );
    }
    
    // Limit suggestions if specified
    if (options?.maxSuggestions) {
      filteredSuggestions = filteredSuggestions.slice(0, options.maxSuggestions);
    }
    
    return filteredSuggestions;
  }

  async formatCode(
    path: string,
    options?: {
      style?: 'prettier' | 'eslint' | 'standard' | 'custom';
      config?: Record<string, any>;
      fix?: boolean;
    }
  ): Promise<{
    modified: boolean;
    changes: Array<{ line: number; description: string }>;
  }> {
    const originalContent = await fs.readFile(path, 'utf-8');
    const changes: Array<{ line: number; description: string }> = [];
    
    // For now, just re-parse and regenerate to normalize the code
    const ast = parser.parse(originalContent, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'decorators-legacy']
    });

    const output = generate(ast, {
      retainLines: false,
      compact: false,
      concise: false,
      comments: true
    });

    const modified = originalContent !== output.code;
    
    if (modified && options?.fix !== false) {
      await fs.writeFile(path, output.code);
      
      // Simple line-by-line comparison for changes
      const oldLines = originalContent.split('\n');
      const newLines = output.code.split('\n');
      
      for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
        if (oldLines[i] !== newLines[i]) {
          changes.push({
            line: i + 1,
            description: 'Line formatted'
          });
        }
      }
    }
    
    return {
      modified,
      changes
    };
  }

  private renameSymbol(ast: any, oldName: string, newName: string): void {
    traverse(ast, {
      Identifier(path: any) {
        if (path.node.name === oldName && path.isReferencedIdentifier()) {
          path.node.name = newName;
        }
      }
    });
  }
  
  async analyzeQuality(path: string): Promise<any> {
    const analysis = await this.analyzeCode(path);
    const content = await fs.readFile(path, 'utf-8');
    const lines = content.split('\n');
    
    // Calculate metrics
    const metrics: any = {
      linesOfCode: lines.length,
      functions: analysis.functions.length,
      classes: analysis.classes.length,
      complexity: this.calculateComplexity(content),
      maintainability: this.calculateMaintainability(analysis, lines.length),
      issues: [] as Array<{type: string; message: string}>
    };
    
    // Check for potential issues
    if (metrics.functions > 20) {
      metrics.issues.push({
        type: 'warning',
        message: 'File has too many functions, consider splitting'
      });
    }
    
    if (metrics.complexity > 10) {
      metrics.issues.push({
        type: 'warning', 
        message: 'High complexity detected'
      });
    }
    
    return metrics;
  }
  
  private calculateComplexity(content: string): number {
    // Simple cyclomatic complexity calculation
    let complexity = 1;
    const complexityPatterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /case\s+/g,
      /catch\s*\(/g,
      /\|\|/g,
      /&&/g,
      /\?\s*:/g
    ];
    
    complexityPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });
    
    return complexity;
  }
  
  private calculateMaintainability(analysis: CodeAnalysis, linesOfCode: number): number {
    // Simple maintainability index calculation
    const avgFunctionLength = linesOfCode / (analysis.functions.length || 1);
    const complexity = this.calculateComplexity('');
    
    // Simplified maintainability index (0-100)
    let maintainability = 100;
    maintainability -= avgFunctionLength > 50 ? 20 : 0;
    maintainability -= complexity > 10 ? 20 : 0;
    maintainability -= analysis.functions.length > 20 ? 10 : 0;
    
    return Math.max(0, maintainability);
  }
  
  private getComplexityRating(complexity: number): string {
    if (complexity <= 5) return 'low';
    if (complexity <= 10) return 'medium';
    if (complexity <= 20) return 'high';
    return 'very_high';
  }
  
  private categorizeIssue(message: string): string {
    if (message.includes('function')) return 'structure';
    if (message.includes('complex')) return 'complexity';
    if (message.includes('naming')) return 'naming';
    return 'general';
  }

  private addImport(ast: any, importName: string, importPath: string): void {
    const importDeclaration = t.importDeclaration(
      [t.importDefaultSpecifier(t.identifier(importName))],
      t.stringLiteral(importPath)
    );

    // Add import at the beginning of the file
    ast.program.body.unshift(importDeclaration);
  }

  private removeImport(ast: any, importPath: string): void {
    traverse(ast, {
      ImportDeclaration(path: any) {
        if (path.node.source.value === importPath) {
          path.remove();
        }
      }
    });
  }

  private addFunction(ast: any, functionCode: string): void {
    // Parse the function code
    const funcAst = parser.parse(functionCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    // Extract the function declaration
    const funcDecl = funcAst.program.body[0];
    if (t.isFunctionDeclaration(funcDecl)) {
      ast.program.body.push(funcDecl);
    }
  }

  private updateFunction(ast: any, functionName: string, newCode: string): void {
    // Parse the new function code
    const funcAst = parser.parse(newCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript']
    });

    const newFuncDecl = funcAst.program.body[0];

    traverse(ast, {
      FunctionDeclaration(path: any) {
        if (path.node.id && path.node.id.name === functionName) {
          path.replaceWith(newFuncDecl);
        }
      }
    });
  }

  private addProperty(ast: any, className: string, propertyName: string, propertyValue: string): void {
    traverse(ast, {
      ClassDeclaration(path: any) {
        if (path.node.id && path.node.id.name === className) {
          const property = t.classProperty(
            t.identifier(propertyName),
            t.identifier(propertyValue)
          );
          path.node.body.body.push(property);
        }
      }
    });
  }
}
