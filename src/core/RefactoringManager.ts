import { promises as fs } from 'fs';
import * as path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import * as prettier from 'prettier';
import { ESLint } from 'eslint';

// traverse와 generate 기본 export 처리
const traverseFn = (traverse as any).default || traverse;
const generateFn = (generate as any).default || generate;

export interface RefactoringOptions {
  enablePrettier?: boolean;
  enableESLint?: boolean;
  prettierConfig?: any;
  eslintConfig?: any;
}

export interface RefactoringSuggestion {
  type: 'code-smell' | 'performance' | 'readability' | 'security' | 'best-practice';
  severity: 'low' | 'medium' | 'high';
  message: string;
  line: number;
  column: number;
  fix?: {
    oldCode: string;
    newCode: string;
    action?: string;
  };
}

export interface CodeQualityReport {
  score: number; // 0-100
  issues: RefactoringSuggestion[];
  metrics: {
    complexity: number;
    maintainability: number;
    duplicateCode: number;
    testCoverage?: number;
  };
}

export class RefactoringManager {
  private eslint: ESLint;

  constructor() {
    this.eslint = new ESLint({
      baseConfig: {
        env: {
          es2021: true,
          node: true
        },
        extends: ['eslint:recommended'],
        parserOptions: {
          ecmaVersion: 'latest',
          sourceType: 'module'
        }
      }
    });
  }

  // 리팩토링 제안 생성
  async suggestRefactoring(filePath: string): Promise<RefactoringSuggestion[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return this.suggestJavaScriptRefactoring(content, filePath);
    } else if (ext === '.py') {
      return this.suggestPythonRefactoring(content, filePath);
    } else {
      return this.suggestGeneralRefactoring(content, filePath);
    }
  }

  // JavaScript/TypeScript 리팩토링 제안
  private async suggestJavaScriptRefactoring(content: string, filePath: string): Promise<RefactoringSuggestion[]> {
    const suggestions: RefactoringSuggestion[] = [];
    
    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      // 1. 중복 코드 감지
      const functionBodies = new Map<string, Array<{ name: string; loc: any }>>();
      
      traverseFn(ast, {
        FunctionDeclaration(path: any) {
          const body = generateFn(path.node.body).code;
          if (!functionBodies.has(body)) {
            functionBodies.set(body, []);
          }
          functionBodies.get(body)!.push({
            name: path.node.id?.name || 'anonymous',
            loc: path.node.loc
          });
        }
      });

      // 중복 함수 찾기
      for (const [body, functions] of functionBodies) {
        if (functions.length > 1) {
          suggestions.push({
            type: 'code-smell',
            severity: 'high',
            message: `Duplicate function bodies found: ${functions.map(f => f.name).join(', ')}`,
            line: functions[0].loc?.start.line || 1,
            column: functions[0].loc?.start.column || 0
          });
        }
      }

      // 2. 복잡도 검사
      traverseFn(ast, {
        FunctionDeclaration(path: any) {
          const complexity = calculateCyclomaticComplexity(path.node);
          if (complexity > 10) {
            suggestions.push({
              type: 'readability',
              severity: complexity > 20 ? 'high' : 'medium',
              message: `Function '${path.node.id?.name}' has high cyclomatic complexity: ${complexity}`,
              line: path.node.loc?.start.line || 1,
              column: path.node.loc?.start.column || 0,
              fix: {
                oldCode: generateFn(path.node).code,
                newCode: '// Consider breaking this function into smaller functions',
                action: 'Break down complex function'
              }
            });
          }
        }
      });

      // 3. 변수명 검사
      traverseFn(ast, {
        Identifier(path: any) {
          if (path.isBinding() && path.node.name.length === 1 && !['i', 'j', 'k', 'x', 'y', 'z'].includes(path.node.name)) {
            suggestions.push({
              type: 'readability',
              severity: 'low',
              message: `Single-letter variable name '${path.node.name}' should be more descriptive`,
              line: path.node.loc?.start.line || 1,
              column: path.node.loc?.start.column || 0
            });
          }
        }
      });

      // 4. console.log 검사
      traverseFn(ast, {
        CallExpression(path: any) {
          if (
            t.isMemberExpression(path.node.callee) &&
            t.isIdentifier(path.node.callee.object, { name: 'console' }) &&
            t.isIdentifier(path.node.callee.property, { name: 'log' })
          ) {
            suggestions.push({
              type: 'best-practice',
              severity: 'medium',
              message: 'Remove console.log statement in production code',
              line: path.node.loc?.start.line || 1,
              column: path.node.loc?.start.column || 0,
              fix: {
                oldCode: generateFn(path.node).code,
                newCode: '// ' + generateFn(path.node).code,
                action: 'Comment out or remove console.log'
              }
            });
          }
        }
      });

      // 5. async/await 최적화
      traverseFn(ast, {
        async AwaitExpression(path: any) {
          const parent = path.parent;
          if (t.isReturnStatement(parent)) {
            suggestions.push({
              type: 'performance',
              severity: 'low',
              message: 'Unnecessary await in return statement',
              line: path.node.loc?.start.line || 1,
              column: path.node.loc?.start.column || 0,
              fix: {
                oldCode: `return await ${generateFn(path.node.argument).code}`,
                newCode: `return ${generateFn(path.node.argument).code}`,
                action: 'Remove unnecessary await'
              }
            });
          }
        }
      });

      // 6. ESLint 검사
      const lintResults = await this.eslint.lintText(content, {
        filePath: filePath
      });

      for (const result of lintResults) {
        for (const message of result.messages) {
          suggestions.push({
            type: 'best-practice',
            severity: message.severity === 2 ? 'high' : 'medium',
            message: message.message,
            line: message.line,
            column: message.column
          });
        }
      }

    } catch (error) {
      // 파싱 오류는 무시
    }

    return suggestions;
  }

  // Python 리팩토링 제안
  private async suggestPythonRefactoring(content: string, filePath: string): Promise<RefactoringSuggestion[]> {
    const suggestions: RefactoringSuggestion[] = [];
    const lines = content.split('\n');

    // 1. PEP8 스타일 검사
    lines.forEach((line, index) => {
      // 라인 길이
      if (line.length > 79) {
        suggestions.push({
          type: 'readability',
          severity: 'low',
          message: `Line exceeds 79 characters (PEP8)`,
          line: index + 1,
          column: 80
        });
      }

      // 들여쓰기 검사
      if (line.match(/^\t/)) {
        suggestions.push({
          type: 'readability',
          severity: 'medium',
          message: 'Use spaces instead of tabs for indentation',
          line: index + 1,
          column: 0
        });
      }

      // 클래스명 검사
      const classMatch = line.match(/^class\s+([a-z_]\w*)/);
      if (classMatch) {
        suggestions.push({
          type: 'readability',
          severity: 'medium',
          message: `Class name '${classMatch[1]}' should use CapWords convention`,
          line: index + 1,
          column: line.indexOf(classMatch[1])
        });
      }
    });

    return suggestions;
  }

  // 일반 리팩토링 제안
  private async suggestGeneralRefactoring(content: string, filePath: string): Promise<RefactoringSuggestion[]> {
    const suggestions: RefactoringSuggestion[] = [];
    const lines = content.split('\n');

    // 1. 긴 라인 검사
    lines.forEach((line, index) => {
      if (line.length > 120) {
        suggestions.push({
          type: 'readability',
          severity: 'low',
          message: 'Line is too long',
          line: index + 1,
          column: 121
        });
      }
    });

    // 2. TODO/FIXME 검사
    lines.forEach((line, index) => {
      const todoMatch = line.match(/TODO|FIXME|XXX|HACK/i);
      if (todoMatch) {
        suggestions.push({
          type: 'best-practice',
          severity: 'low',
          message: `Found ${todoMatch[0]} comment`,
          line: index + 1,
          column: line.indexOf(todoMatch[0])
        });
      }
    });

    return suggestions;
  }

  // 프로젝트 전체 자동 포맷팅
  async autoFormatProject(directory: string, options: RefactoringOptions = {}): Promise<{
    formattedFiles: string[];
    errors: Array<{ file: string; error: string }>;
  }> {
    const formattedFiles: string[] = [];
    const errors: Array<{ file: string; error: string }> = [];

    const files = await this.findCodeFiles(directory);

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const ext = path.extname(file).toLowerCase();
        let formatted = content;

        if (['.js', '.jsx', '.ts', '.tsx', '.json'].includes(ext) && options.enablePrettier !== false) {
          formatted = await prettier.format(content, {
            filepath: file,
            ...options.prettierConfig
          });
        }

        if (formatted !== content) {
          await fs.writeFile(file, formatted);
          formattedFiles.push(file);
        }
      } catch (error: any) {
        errors.push({
          file,
          error: error.message
        });
      }
    }

    return { formattedFiles, errors };
  }

  // 코드 품질 분석
  async analyzeCodeQuality(filePath: string): Promise<CodeQualityReport> {
    const suggestions = await this.suggestRefactoring(filePath);
    const content = await fs.readFile(filePath, 'utf-8');

    // 메트릭 계산
    const complexity = await this.calculateProjectComplexity(content);
    const duplicateCode = await this.calculateDuplicateCodePercentage(content);
    const maintainability = this.calculateMaintainabilityIndex(complexity, duplicateCode);

    // 점수 계산 (0-100)
    const score = Math.max(0, 100 - suggestions.length * 5 - (complexity > 10 ? 10 : 0) - duplicateCode);

    return {
      score: Math.round(score),
      issues: suggestions,
      metrics: {
        complexity,
        maintainability,
        duplicateCode
      }
    };
  }

  // 코드 파일 찾기
  private async findCodeFiles(directory: string): Promise<string[]> {
    const { glob } = await import('glob');
    
    return glob('**/*.{js,jsx,ts,tsx,py,java,go,rs,c,cpp,cs,rb,php,swift}', {
      cwd: path.resolve(directory),
      ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**'],
      absolute: true
    });
  }

  // 프로젝트 복잡도 계산
  private async calculateProjectComplexity(content: string): Promise<number> {
    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      });

      let totalComplexity = 0;
      let functionCount = 0;

      traverseFn(ast, {
        FunctionDeclaration(path: any) {
          totalComplexity += calculateCyclomaticComplexity(path.node);
          functionCount++;
        },
        ArrowFunctionExpression(path: any) {
          totalComplexity += calculateCyclomaticComplexity(path.node);
          functionCount++;
        }
      });

      return functionCount > 0 ? Math.round(totalComplexity / functionCount) : 0;
    } catch {
      return 0;
    }
  }

  // 중복 코드 비율 계산
  private async calculateDuplicateCodePercentage(content: string): Promise<number> {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    const lineHashes = new Map<string, number>();

    lines.forEach(line => {
      const normalized = line.trim();
      lineHashes.set(normalized, (lineHashes.get(normalized) || 0) + 1);
    });

    let duplicateLines = 0;
    for (const count of lineHashes.values()) {
      if (count > 1) {
        duplicateLines += count - 1;
      }
    }

    return lines.length > 0 ? Math.round((duplicateLines / lines.length) * 100) : 0;
  }

  // 유지보수성 지수 계산
  private calculateMaintainabilityIndex(complexity: number, duplicateCode: number): number {
    // 간단한 유지보수성 지수 계산
    const baseScore = 100;
    const complexityPenalty = Math.min(complexity * 2, 30);
    const duplicationPenalty = Math.min(duplicateCode, 30);

    return Math.max(0, Math.round(baseScore - complexityPenalty - duplicationPenalty));
  }
}

// 순환 복잡도 계산 헬퍼 함수
function calculateCyclomaticComplexity(node: any): number {
  let complexity = 1;
  const visited = new WeakSet();

  function visit(n: any) {
    if (!n || visited.has(n)) return;
    visited.add(n);

    if (t.isIfStatement(n) || 
        t.isWhileStatement(n) || 
        t.isForStatement(n) || 
        t.isForInStatement(n) || 
        t.isForOfStatement(n) || 
        t.isConditionalExpression(n) ||
        t.isCatchClause(n)) {
      complexity++;
    }

    if (t.isLogicalExpression(n) && (n.operator === '&&' || n.operator === '||')) {
      complexity++;
    }

    if (t.isSwitchCase(n) && n.test !== null) {
      complexity++;
    }

    // 재귀적으로 자식 노드 방문
    for (const key in n) {
      if (key === 'type' || key === 'loc') continue;
      const child = n[key];
      if (Array.isArray(child)) {
        child.forEach(visit);
      } else if (child && typeof child === 'object') {
        visit(child);
      }
    }
  }

  visit(node);
  return complexity;
}