import * as babel from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';
import * as t from '@babel/types';
import { promises as fs } from 'fs';
import * as path from 'path';
import { LanguageSpecificFeatureManager, LanguageSpecificFeatures } from './LanguageSpecificAnalyzers.js';
import { CodeModifierManager, TextBasedModification } from './CodeModifiers.js';

// ES Module compatibility
const traverse = (_traverse as any).default || _traverse;
const generate = (_generate as any).default || _generate;

export interface CodeModification {
  type: 'rename' | 'addImport' | 'removeImport' | 'addFunction' | 'updateFunction' | 'addProperty';
  target?: string;
  newName?: string;
  importPath?: string;
  importName?: string;
  functionCode?: string;
  propertyName?: string;
  propertyValue?: string;
}

interface LanguageAnalyzer {
  analyze(content: string, filePath: string): Promise<CodeAnalysis>;
  canHandle(filePath: string): boolean;
}

export interface CodeAnalysis {
  imports: Array<{ name: string; path: string }>;
  exports: Array<{ name: string; type: string }>;
  functions: Array<{ name: string; params: string[]; isAsync: boolean }>;
  classes: Array<{ name: string; methods: string[] }>;
  variables: Array<{ name: string; type: string }>;
  // Language-specific features
  languageSpecific?: LanguageSpecificFeatures;
}

export class ASTProcessor {
  private analyzers: Map<string, LanguageAnalyzer>;
  private languageFeatureManager: LanguageSpecificFeatureManager;
  private codeModifierManager: CodeModifierManager;

  constructor() {
    this.analyzers = new Map();
    this.languageFeatureManager = new LanguageSpecificFeatureManager();
    this.codeModifierManager = new CodeModifierManager();
    this.registerAnalyzers();
  }

  private registerAnalyzers() {
    // JavaScript/TypeScript analyzer
    this.analyzers.set('js/ts', new JSTSAnalyzer());
    // Python analyzer
    this.analyzers.set('python', new PythonAnalyzer());
    // Java analyzer
    this.analyzers.set('java', new JavaAnalyzer());
    // Go analyzer
    this.analyzers.set('go', new GoAnalyzer());
    // Rust analyzer
    this.analyzers.set('rust', new RustAnalyzer());
    // Swift analyzer
    this.analyzers.set('swift', new SwiftAnalyzer());
    // Kotlin analyzer
    this.analyzers.set('kotlin', new KotlinAnalyzer());
    // Scala analyzer
    this.analyzers.set('scala', new ScalaAnalyzer());
    // Elixir analyzer
    this.analyzers.set('elixir', new ElixirAnalyzer());
  }

  private getAnalyzer(filePath: string): LanguageAnalyzer | null {
    for (const [_, analyzer] of this.analyzers) {
      if (analyzer.canHandle(filePath)) {
        return analyzer;
      }
    }
    return null;
  }

  // 범용 파일 분석 메서드
  async analyzeFile(filePath: string): Promise<CodeAnalysis> {
    const analyzer = this.getAnalyzer(filePath);
    if (!analyzer) {
      // 지원하지 않는 언어의 경우 기본 분석 제공
      return this.performBasicAnalysis(filePath);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    const analysis = await analyzer.analyze(content, filePath);
    
    // Add language-specific features
    analysis.languageSpecific = await this.languageFeatureManager.analyzeFile(filePath);
    
    return analysis;
  }

  // 기본 분석 (정규식 기반)
  private async performBasicAnalysis(filePath: string): Promise<CodeAnalysis> {
    const content = await fs.readFile(filePath, 'utf-8');
    const ext = path.extname(filePath).toLowerCase();
    
    const result: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: []
    };

    // 언어별 기본 패턴
    const patterns = this.getLanguagePatterns(ext);
    
    // Import 분석
    if (patterns.import) {
      const importMatches = content.matchAll(patterns.import);
      for (const match of importMatches) {
        result.imports.push({
          name: match[1] || match[2] || 'unknown',
          path: match[3] || match[1] || ''
        });
      }
    }

    // Function 분석
    if (patterns.function) {
      const functionMatches = content.matchAll(patterns.function);
      for (const match of functionMatches) {
        const name = match[1] || match[2];
        const params = match[3] ? match[3].split(',').map(p => p.trim()) : [];
        result.functions.push({
          name,
          params,
          isAsync: match[0].includes('async') || match[0].includes('coroutine')
        });
      }
    }

    // Class 분석
    if (patterns.class) {
      const classMatches = content.matchAll(patterns.class);
      for (const match of classMatches) {
        const className = match[1];
        const methods: string[] = [];
        
        // 클래스 내부의 메서드 찾기
        if (patterns.method) {
          const classBody = this.extractClassBody(content, match.index!);
          const methodMatches = classBody.matchAll(patterns.method);
          for (const methodMatch of methodMatches) {
            methods.push(methodMatch[1] || methodMatch[2]);
          }
        }
        
        result.classes.push({ name: className, methods });
      }
    }

    // Add language-specific features even for basic analysis
    result.languageSpecific = await this.languageFeatureManager.analyzeFile(filePath);

    return result;
  }

  private getLanguagePatterns(ext: string): any {
    const patterns: any = {
      '.py': {
        import: /(?:from\s+(\S+)\s+)?import\s+([^;\n]+)/g,
        function: /def\s+(\w+)\s*\(([^)]*)\)/g,
        class: /class\s+(\w+)(?:\s*\([^)]*\))?:/g,
        method: /def\s+(\w+)\s*\(self[^)]*\)/g
      },
      '.java': {
        import: /import\s+(?:static\s+)?([^;]+);/g,
        function: /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)?(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[^{]+)?\s*\{/g,
        class: /(?:public\s+)?class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[^{]+)?\s*\{/g,
        method: /(?:public|private|protected)?\s*(?:static\s+)?(?:\w+\s+)?(\w+)\s*\(([^)]*)\)/g
      },
      '.go': {
        import: /import\s+(?:\(\s*([^)]+)\s*\)|"([^"]+)")/g,
        function: /func\s+(?:\(\s*\w+\s+\*?\w+\s*\)\s+)?(\w+)\s*\(([^)]*)\)/g,
        class: /type\s+(\w+)\s+struct\s*\{/g,
        method: /func\s+\(\s*\w+\s+\*?(\w+)\s*\)\s+(\w+)\s*\(([^)]*)\)/g
      },
      '.rs': {
        import: /use\s+([^;]+);/g,
        function: /fn\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)/g,
        class: /(?:pub\s+)?struct\s+(\w+)(?:<[^>]+>)?\s*[{;]/g,
        method: /(?:pub\s+)?fn\s+(\w+)\s*\(&(?:mut\s+)?self[^)]*\)/g
      },
      '.swift': {
        import: /import\s+(\w+)/g,
        function: /func\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)/g,
        class: /class\s+(\w+)(?:\s*:\s*[^{]+)?\s*\{/g,
        method: /func\s+(\w+)\s*\(([^)]*)\)/g
      },
      '.kt': {
        import: /import\s+([^;]+)/g,
        function: /fun\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)/g,
        class: /(?:data\s+)?class\s+(\w+)(?:\s*\([^)]*\))?(?:\s*:\s*[^{]+)?\s*\{/g,
        method: /fun\s+(\w+)\s*\(([^)]*)\)/g
      },
      '.scala': {
        import: /import\s+([^;]+)/g,
        function: /def\s+(\w+)(?:\[[^\]]+\])?\s*(?:\([^)]*\))?/g,
        class: /(?:case\s+)?class\s+(\w+)(?:\[[^\]]+\])?\s*(?:\([^)]*\))?/g,
        method: /def\s+(\w+)(?:\[[^\]]+\])?\s*(?:\([^)]*\))?/g
      },
      '.ex': {
        import: /(?:alias|import|require)\s+([^\s]+)/g,
        function: /def(?:p?)\s+(\w+)(?:\([^)]*\))?\s+do/g,
        class: /defmodule\s+([\w.]+)\s+do/g,
        method: /def(?:p?)\s+(\w+)(?:\([^)]*\))?\s+do/g
      },
      '.rb': {
        import: /require(?:_relative)?\s+['"]([^'"]+)['"]/g,
        function: /def\s+(?:self\.)?(\w+)(?:\s*\(([^)]*)\))?/g,
        class: /class\s+(\w+)(?:\s*<\s*\w+)?/g,
        method: /def\s+(\w+)(?:\s*\(([^)]*)\))?/g
      },
      '.php': {
        import: /(?:use|require|include)(?:_once)?\s+['"]?([^'";]+)['"]?;/g,
        function: /function\s+(\w+)\s*\(([^)]*)\)/g,
        class: /class\s+(\w+)(?:\s+extends\s+\w+)?(?:\s+implements\s+[^{]+)?/g,
        method: /(?:public|private|protected)?\s*function\s+(\w+)\s*\(([^)]*)\)/g
      },
      '.c': {
        import: /#include\s*[<"]([^>"]+)[>"]/g,
        function: /(?:\w+\s+)*(\w+)\s*\(([^)]*)\)\s*\{/g,
        class: /typedef\s+struct\s+(\w+)/g,
        method: null
      },
      '.cpp': {
        import: /#include\s*[<"]([^>"]+)[>"]/g,
        function: /(?:\w+\s+)*(\w+)\s*\(([^)]*)\)\s*\{/g,
        class: /class\s+(\w+)(?:\s*:\s*(?:public|private|protected)\s+\w+)?/g,
        method: /(?:\w+\s+)*(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?\{/g
      },
      '.cs': {
        import: /using\s+([^;]+);/g,
        function: /(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(?:\w+\s+)?(\w+)\s*\(([^)]*)\)/g,
        class: /(?:public\s+)?class\s+(\w+)(?:\s*:\s*[^{]+)?/g,
        method: /(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?(?:\w+\s+)?(\w+)\s*\(([^)]*)\)/g
      }
    };

    return patterns[ext] || {
      import: null,
      function: /function\s+(\w+)|(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>/g,
      class: /class\s+(\w+)/g,
      method: null
    };
  }

  private extractClassBody(content: string, startIndex: number): string {
    let braceCount = 0;
    let inClass = false;
    let classBody = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      
      if (char === '{') {
        braceCount++;
        inClass = true;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0 && inClass) {
          break;
        }
      }
      
      if (inClass) {
        classBody += char;
      }
    }
    
    return classBody;
  }

  // Enhanced code modification method
  async modifyCode(filePath: string, modifications: CodeModification[]): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
    
    // Check if we can use AST-based modification (JS/TS)
    if (['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
      return this.modifyCodeWithAST(filePath, modifications);
    }
    
    // Check if we can use text-based modification for other languages
    if (this.codeModifierManager.canModify(filePath)) {
      return this.modifyCodeWithTextBased(filePath, modifications);
    }
    
    throw new Error(`Code modification is not supported for file type: ${ext}`);
  }

  // AST-based code modification for JS/TS
  private async modifyCodeWithAST(filePath: string, modifications: CodeModification[]): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    
    const parserOptions: babel.ParserOptions = {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'asyncGenerators',
        'dynamicImport'
      ]
    };

    const ast = babel.parse(content, parserOptions);
    
    for (const mod of modifications) {
      switch (mod.type) {
        case 'rename':
          this.renameSymbolBabel(ast, mod.target!, mod.newName!);
          break;
        
        case 'addImport':
          this.addImportBabel(ast, mod.importName!, mod.importPath!);
          break;
        
        case 'removeImport':
          this.removeImportBabel(ast, mod.importName!);
          break;
        
        case 'addFunction':
          this.addFunctionBabel(ast, mod.functionCode!);
          break;
        
        case 'updateFunction':
          this.updateFunctionBabel(ast, mod.target!, mod.functionCode!);
          break;
        
        case 'addProperty':
          this.addPropertyBabel(ast, mod.target!, mod.propertyName!, mod.propertyValue!);
          break;
      }
    }

    const output = generate(ast, {
      retainLines: true,
      retainFunctionParens: true,
      comments: true
    });

    return output.code;
  }

  // Text-based code modification for other languages
  private async modifyCodeWithTextBased(filePath: string, modifications: CodeModification[]): Promise<string> {
    // Convert CodeModification to TextBasedModification
    const textMods: TextBasedModification[] = modifications.map(mod => {
      switch (mod.type) {
        case 'rename':
          return {
            type: 'replace',
            target: mod.target!,
            replacement: mod.newName!
          };
        
        case 'addImport':
          const importStatement = this.generateImportStatement(filePath, mod.importName!, mod.importPath!);
          return {
            type: 'insertBefore',
            target: 'package', // Or first import/class/function
            content: importStatement
          };
        
        case 'removeImport':
          return {
            type: 'delete',
            target: mod.importName!
          };
        
        case 'addFunction':
          return {
            type: 'insertAfter',
            target: 'class', // Or end of file
            content: mod.functionCode!
          };
        
        case 'updateFunction':
          return {
            type: 'replace',
            target: mod.target!,
            replacement: mod.functionCode!
          };
        
        case 'addProperty':
          return {
            type: 'insertAfter',
            target: mod.target!,
            content: `${mod.propertyName!} = ${mod.propertyValue!}`
          };
        
        default:
          throw new Error(`Unsupported modification type: ${mod.type}`);
      }
    });

    return this.codeModifierManager.modifyFile(filePath, textMods);
  }

  private generateImportStatement(filePath: string, importName: string, importPath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    
    switch (ext) {
      case '.py':
        return `from ${importPath} import ${importName}`;
      case '.java':
        return `import ${importPath}.${importName};`;
      case '.go':
        return `import "${importPath}"`;
      case '.rs':
        return `use ${importPath}::${importName};`;
      case '.swift':
        return `import ${importPath}`;
      case '.kt':
        return `import ${importPath}.${importName}`;
      default:
        return `import ${importName} from '${importPath}';`;
    }
  }

  // Get supported file extensions
  getSupportedExtensions(): {
    analysis: string[];
    modification: string[];
  } {
    return {
      analysis: [
        '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
        '.py', '.pyw',
        '.java',
        '.go',
        '.rs',
        '.swift',
        '.kt', '.kts',
        '.scala',
        '.ex', '.exs',
        '.rb',
        '.php',
        '.c', '.cpp', '.cc', '.cxx',
        '.cs'
      ],
      modification: [
        '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
        ...this.codeModifierManager.getSupportedExtensions()
      ]
    };
  }

  // 기존 Babel 메서드들은 그대로 유지
  private renameSymbolBabel(ast: any, oldName: string, newName: string): void {
    traverse(ast, {
      Identifier(path: any) {
        if (path.node.name === oldName && path.isReferencedIdentifier()) {
          path.node.name = newName;
        }
      }
    });
  }

  private addImportBabel(ast: any, importName: string, importPath: string): void {
    const importDeclaration = t.importDeclaration(
      [t.importSpecifier(t.identifier(importName), t.identifier(importName))],
      t.stringLiteral(importPath)
    );

    ast.program.body.unshift(importDeclaration);
  }

  private removeImportBabel(ast: any, importName: string): void {
    traverse(ast, {
      ImportDeclaration(path: any) {
        path.node.specifiers = path.node.specifiers.filter((spec: any) => {
          if (t.isImportSpecifier(spec) || t.isImportDefaultSpecifier(spec)) {
            return spec.local.name !== importName;
          }
          return true;
        });
        
        if (path.node.specifiers.length === 0) {
          path.remove();
        }
      }
    });
  }

  private addFunctionBabel(ast: any, functionCode: string): void {
    const funcAst = babel.parse(functionCode, { sourceType: 'module' });
    if (funcAst.program.body.length > 0) {
      ast.program.body.push(funcAst.program.body[0]);
    }
  }

  private updateFunctionBabel(ast: any, functionName: string, newCode: string): void {
    const funcAst = babel.parse(newCode, { sourceType: 'module' });
    if (funcAst.program.body.length === 0) return;
    
    const newFunc = funcAst.program.body[0];
    
    traverse(ast, {
      FunctionDeclaration(path: any) {
        if (path.node.id && path.node.id.name === functionName) {
          path.replaceWith(newFunc);
        }
      },
      VariableDeclarator(path: any) {
        if (t.isIdentifier(path.node.id) && path.node.id.name === functionName &&
            (t.isArrowFunctionExpression(path.node.init) || t.isFunctionExpression(path.node.init))) {
          if (t.isVariableDeclaration(newFunc) && newFunc.declarations[0]) {
            path.node.init = newFunc.declarations[0].init;
          }
        }
      }
    });
  }

  private addPropertyBabel(ast: any, targetName: string, propertyName: string, propertyValue: string): void {
    traverse(ast, {
      ClassDeclaration(path: any) {
        if (path.node.id && path.node.id.name === targetName) {
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

// JavaScript/TypeScript Analyzer (기존 코드 활용)
class JSTSAnalyzer implements LanguageAnalyzer {
  canHandle(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext);
  }

  async analyze(content: string, filePath: string): Promise<CodeAnalysis> {
    const parserOptions: babel.ParserOptions = {
      sourceType: 'module',
      plugins: [
        'jsx',
        'typescript',
        'decorators-legacy',
        'classProperties',
        'asyncGenerators',
        'dynamicImport',
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'optionalCatchBinding',
        'optionalChaining',
        'nullishCoalescingOperator'
      ]
    };

    try {
      const ast = babel.parse(content, parserOptions);
      
      const result: CodeAnalysis = {
        imports: [],
        exports: [],
        functions: [],
        classes: [],
        variables: []
      };

      traverse(ast, {
        ImportDeclaration(path: any) {
          const source = path.node.source.value;
          
          path.node.specifiers.forEach((spec: any) => {
            if (t.isImportDefaultSpecifier(spec)) {
              result.imports.push({
                name: spec.local.name,
                path: source
              });
            } else if (t.isImportSpecifier(spec)) {
              result.imports.push({
                name: spec.local.name,
                path: source
              });
            } else if (t.isImportNamespaceSpecifier(spec)) {
              result.imports.push({
                name: spec.local.name,
                path: source
              });
            }
          });
        },

        ExportNamedDeclaration(path: any) {
          if (path.node.declaration) {
            if (t.isFunctionDeclaration(path.node.declaration) && path.node.declaration.id) {
              result.exports.push({
                name: path.node.declaration.id.name,
                type: 'function'
              });
            } else if (t.isClassDeclaration(path.node.declaration) && path.node.declaration.id) {
              result.exports.push({
                name: path.node.declaration.id.name,
                type: 'class'
              });
            } else if (t.isVariableDeclaration(path.node.declaration)) {
              path.node.declaration.declarations.forEach((decl: any) => {
                if (t.isIdentifier(decl.id)) {
                  result.exports.push({
                    name: decl.id.name,
                    type: 'variable'
                  });
                }
              });
            }
          }
          
          if (path.node.specifiers) {
            path.node.specifiers.forEach((spec: any) => {
              if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
                result.exports.push({
                  name: spec.exported.name,
                  type: 'named'
                });
              }
            });
          }
        },

        FunctionDeclaration(path: any) {
          if (path.node.id) {
            const params = path.node.params.map((param: any) => {
              if (t.isIdentifier(param)) {
                return param.name;
              } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
                return `...${param.argument.name}`;
              }
              return 'unknown';
            });
            
            result.functions.push({
              name: path.node.id.name,
              params,
              isAsync: path.node.async
            });
          }
        },

        ClassDeclaration(path: any) {
          if (path.node.id) {
            const methods: string[] = [];
            
            path.node.body.body.forEach((member: any) => {
              if (t.isClassMethod(member) && t.isIdentifier(member.key)) {
                methods.push(member.key.name);
              }
            });
            
            result.classes.push({
              name: path.node.id.name,
              methods
            });
          }
        }
      });

      return result;
    } catch (error) {
      console.error(`Failed to parse ${filePath}:`, error);
      throw new Error(`Failed to analyze code: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Python Analyzer
class PythonAnalyzer implements LanguageAnalyzer {
  canHandle(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ['.py', '.pyw'].includes(ext);
  }

  async analyze(content: string, filePath: string): Promise<CodeAnalysis> {
    const result: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: []
    };

    // Python imports
    const importRegex = /(?:from\s+(\S+)\s+)?import\s+([^;\n]+)(?:\s+as\s+(\w+))?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const fromModule = match[1];
      const imports = match[2];
      const alias = match[3];
      
      if (fromModule) {
        imports.split(',').forEach(imp => {
          result.imports.push({
            name: imp.trim(),
            path: fromModule
          });
        });
      } else {
        imports.split(',').forEach(imp => {
          result.imports.push({
            name: alias || imp.trim(),
            path: imp.trim()
          });
        });
      }
    }

    // Python functions and methods
    const functionRegex = /^(\s*)def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*([^:]+))?\s*:/gm;
    while ((match = functionRegex.exec(content)) !== null) {
      const indent = match[1].length;
      const name = match[2];
      const params = match[3].split(',').map(p => p.trim()).filter(p => p);
      const isMethod = params.length > 0 && params[0] === 'self';
      const isAsync = content.substring(Math.max(0, match.index - 20), match.index).includes('async');
      
      if (!isMethod || indent === 0) {
        result.functions.push({
          name,
          params: isMethod ? params.slice(1) : params,
          isAsync
        });
      }
    }

    // Python classes
    const classRegex = /^class\s+(\w+)(?:\s*\(([^)]*)\))?\s*:/gm;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const methods: string[] = [];
      
      // Find methods within the class
      const classStartIndex = match.index + match[0].length;
      const methodRegex = /^\s+def\s+(\w+)\s*\(/gm;
      methodRegex.lastIndex = classStartIndex;
      
      let methodMatch;
      let classIndentLevel = -1;
      
      while ((methodMatch = methodRegex.exec(content)) !== null) {
        const line = content.substring(content.lastIndexOf('\n', methodMatch.index) + 1, methodMatch.index);
        const currentIndent = line.length;
        
        if (classIndentLevel === -1) {
          classIndentLevel = currentIndent;
        } else if (currentIndent < classIndentLevel) {
          break; // Out of class scope
        }
        
        if (currentIndent === classIndentLevel) {
          methods.push(methodMatch[1]);
        }
      }
      
      result.classes.push({ name: className, methods });
    }

    // Python variables (module level)
    const variableRegex = /^(\w+)\s*=\s*(.+)$/gm;
    while ((match = variableRegex.exec(content)) !== null) {
      const name = match[1];
      const value = match[2];
      
      // Skip if it's inside a function or class
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const indent = match.index - lineStart;
      
      if (indent === 0 && !name.startsWith('_')) {
        let type = 'any';
        if (value.startsWith('"') || value.startsWith("'")) type = 'string';
        else if (value.match(/^\d+$/)) type = 'number';
        else if (value === 'True' || value === 'False') type = 'boolean';
        else if (value.startsWith('[')) type = 'list';
        else if (value.startsWith('{')) type = 'dict';
        
        result.variables.push({ name, type });
      }
    }

    return result;
  }
}

// Other language analyzers remain the same...
class JavaAnalyzer implements LanguageAnalyzer {
  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.java';
  }

  async analyze(content: string, filePath: string): Promise<CodeAnalysis> {
    const result: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: []
    };

    // Java imports
    const importRegex = /import\s+(?:static\s+)?([^;]+);/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const parts = importPath.split('.');
      result.imports.push({
        name: parts[parts.length - 1],
        path: importPath
      });
    }

    // Java classes
    const classRegex = /(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^{]+))?\s*\{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const methods: string[] = [];
      
      // Find methods within the class
      const classBody = this.extractJavaClassBody(content, match.index + match[0].length);
      const methodRegex = /(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:synchronized\s+)?(?:abstract\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\([^)]*\)/g;
      
      let methodMatch;
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        if (methodMatch[1] !== className) { // Skip constructors
          methods.push(methodMatch[1]);
        }
      }
      
      result.classes.push({ name: className, methods });
      
      // In Java, public methods are effectively exports
      methods.forEach(method => {
        if (classBody.includes(`public`) && classBody.includes(method)) {
          result.exports.push({
            name: `${className}.${method}`,
            type: 'method'
          });
        }
      });
    }

    // Java methods (including static methods that might be outside classes)
    const methodRegex = /(?:public|private|protected)?\s*(?:static\s+)?(?:final\s+)?(?:\w+(?:<[^>]+>)?)\s+(\w+)\s*\(([^)]*)\)\s*(?:throws\s+[^{]+)?\s*\{/g;
    while ((match = methodRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2].split(',').map(p => {
        const parts = p.trim().split(/\s+/);
        return parts[parts.length - 1];
      }).filter(p => p);
      
      result.functions.push({
        name,
        params,
        isAsync: false // Java uses CompletableFuture, not async/await
      });
    }

    return result;
  }

  private extractJavaClassBody(content: string, startIndex: number): string {
    let braceCount = 1;
    let classBody = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      classBody += char;
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          break;
        }
      }
    }
    
    return classBody;
  }
}

// Go Analyzer
class GoAnalyzer implements LanguageAnalyzer {
  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.go';
  }

  async analyze(content: string, filePath: string): Promise<CodeAnalysis> {
    const result: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: []
    };

    // Go imports
    const importRegex = /import\s+(?:\(\s*((?:[^)]+\n)+)\s*\)|"([^"]+)")/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      if (match[1]) {
        // Multiple imports
        const imports = match[1].trim().split('\n');
        imports.forEach(imp => {
          const cleanImp = imp.trim().replace(/["']/g, '');
          if (cleanImp) {
            const parts = cleanImp.split('/');
            result.imports.push({
              name: parts[parts.length - 1],
              path: cleanImp
            });
          }
        });
      } else if (match[2]) {
        // Single import
        const parts = match[2].split('/');
        result.imports.push({
          name: parts[parts.length - 1],
          path: match[2]
        });
      }
    }

    // Go functions
    const functionRegex = /func\s+(?:\(\s*\w+\s+\*?\w+\s*\)\s+)?(\w+)\s*\(([^)]*)\)(?:\s*(?:\(([^)]+)\)|\w+))?\s*\{/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2].split(',').map(p => {
        const parts = p.trim().split(/\s+/);
        return parts[0] || '';
      }).filter(p => p);
      
      // Exported functions start with uppercase
      if (name[0] === name[0].toUpperCase()) {
        result.exports.push({
          name,
          type: 'function'
        });
      }
      
      result.functions.push({
        name,
        params,
        isAsync: false // Go uses goroutines, not async/await
      });
    }

    // Go structs (similar to classes)
    const structRegex = /type\s+(\w+)\s+struct\s*\{/g;
    while ((match = structRegex.exec(content)) !== null) {
      const structName = match[1];
      const methods: string[] = [];
      
      // Find methods for this struct
      const methodRegex = new RegExp(`func\\s+\\(\\s*\\w+\\s+\\*?${structName}\\s*\\)\\s+(\\w+)\\s*\\(`, 'g');
      let methodMatch;
      while ((methodMatch = methodRegex.exec(content)) !== null) {
        methods.push(methodMatch[1]);
      }
      
      result.classes.push({ name: structName, methods });
      
      // Exported structs
      if (structName[0] === structName[0].toUpperCase()) {
        result.exports.push({
          name: structName,
          type: 'struct'
        });
      }
    }

    return result;
  }
}

// Rust Analyzer
class RustAnalyzer implements LanguageAnalyzer {
  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.rs';
  }

  async analyze(content: string, filePath: string): Promise<CodeAnalysis> {
    const result: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: []
    };

    // Rust use statements
    const useRegex = /use\s+([^;]+);/g;
    let match;
    while ((match = useRegex.exec(content)) !== null) {
      const usePath = match[1];
      const parts = usePath.split('::');
      result.imports.push({
        name: parts[parts.length - 1].replace(/[{}]/g, ''),
        path: usePath
      });
    }

    // Rust functions
    const functionRegex = /(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?\s*\{/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2].split(',').map(p => {
        const parts = p.trim().split(':');
        return parts[0].trim();
      }).filter(p => p && p !== 'self' && p !== '&self' && p !== '&mut self');
      
      const isAsync = content.substring(Math.max(0, match.index - 20), match.index).includes('async');
      
      // pub functions are exports
      if (content.substring(Math.max(0, match.index - 10), match.index).includes('pub')) {
        result.exports.push({
          name,
          type: 'function'
        });
      }
      
      result.functions.push({
        name,
        params,
        isAsync
      });
    }

    // Rust structs and impls
    const structRegex = /(?:pub\s+)?struct\s+(\w+)(?:<[^>]+>)?\s*[{;]/g;
    while ((match = structRegex.exec(content)) !== null) {
      const structName = match[1];
      const methods: string[] = [];
      
      // Find impl blocks for this struct
      const implRegex = new RegExp(`impl(?:<[^>]+>)?\\s+(?:\\w+\\s+for\\s+)?${structName}(?:<[^>]+>)?\\s*\\{`, 'g');
      let implMatch;
      while ((implMatch = implRegex.exec(content)) !== null) {
        const implBody = this.extractRustImplBody(content, implMatch.index + implMatch[0].length);
        const methodRegex = /(?:pub\s+)?fn\s+(\w+)\s*\(/g;
        let methodMatch;
        while ((methodMatch = methodRegex.exec(implBody)) !== null) {
          if (methodMatch[1] !== 'new') { // new is typically a constructor
            methods.push(methodMatch[1]);
          }
        }
      }
      
      result.classes.push({ name: structName, methods });
      
      // pub structs are exports
      if (content.substring(Math.max(0, match.index - 10), match.index).includes('pub')) {
        result.exports.push({
          name: structName,
          type: 'struct'
        });
      }
    }

    return result;
  }

  private extractRustImplBody(content: string, startIndex: number): string {
    let braceCount = 1;
    let implBody = '';
    
    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];
      implBody += char;
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          break;
        }
      }
    }
    
    return implBody;
  }
}

// Swift Analyzer
class SwiftAnalyzer implements LanguageAnalyzer {
  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.swift';
  }

  async analyze(content: string, filePath: string): Promise<CodeAnalysis> {
    const result: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: []
    };

    // Swift imports
    const importRegex = /import\s+(\w+)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      result.imports.push({
        name: match[1],
        path: match[1]
      });
    }

    // Swift functions
    const functionRegex = /(?:public\s+)?(?:private\s+)?func\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?\s*\{/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2].split(',').map(p => {
        const parts = p.trim().split(':');
        return parts[0].trim();
      }).filter(p => p);
      
      result.functions.push({
        name,
        params,
        isAsync: content.substring(Math.max(0, match.index - 20), match.index).includes('async')
      });

      // public functions are exports
      if (content.substring(Math.max(0, match.index - 10), match.index).includes('public')) {
        result.exports.push({
          name,
          type: 'function'
        });
      }
    }

    // Swift classes and structs
    const classRegex = /(?:public\s+)?(?:class|struct)\s+(\w+)(?:\s*:\s*[^{]+)?\s*\{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const methods: string[] = [];
      
      // Extract class body and find methods
      const classBody = this.extractSwiftClassBody(content, match.index + match[0].length - 1);
      const methodRegex = /func\s+(\w+)\s*\(/g;
      let methodMatch;
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        methods.push(methodMatch[1]);
      }
      
      result.classes.push({ name: className, methods });
      
      // public classes/structs are exports
      if (content.substring(Math.max(0, match.index - 10), match.index).includes('public')) {
        result.exports.push({
          name: className,
          type: 'class'
        });
      }
    }

    return result;
  }

  private extractSwiftClassBody(content: string, startIndex: number): string {
    let braceCount = 1;
    let classBody = '';
    
    for (let i = startIndex + 1; i < content.length; i++) {
      const char = content[i];
      classBody += char;
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          break;
        }
      }
    }
    
    return classBody;
  }
}

// Kotlin Analyzer
class KotlinAnalyzer implements LanguageAnalyzer {
  canHandle(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.kt' || ext === '.kts';
  }

  async analyze(content: string, filePath: string): Promise<CodeAnalysis> {
    const result: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: []
    };

    // Kotlin imports
    const importRegex = /import\s+([^\s]+)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const parts = importPath.split('.');
      result.imports.push({
        name: parts[parts.length - 1],
        path: importPath
      });
    }

    // Kotlin functions
    const functionRegex = /(?:public\s+)?(?:private\s+)?fun\s+(\w+)\s*(?:<[^>]+>)?\s*\(([^)]*)\)(?:\s*:\s*([^{]+))?\s*\{/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2].split(',').map(p => {
        const parts = p.trim().split(':');
        return parts[0].trim();
      }).filter(p => p);
      
      result.functions.push({
        name,
        params,
        isAsync: content.substring(Math.max(0, match.index - 20), match.index).includes('suspend')
      });
    }

    // Kotlin classes
    const classRegex = /(?:public\s+)?(?:data\s+)?(?:sealed\s+)?class\s+(\w+)(?:\s*\([^)]*\))?(?:\s*:\s*[^{]+)?\s*\{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const methods: string[] = [];
      
      // Extract class body and find methods
      const classBody = this.extractKotlinClassBody(content, match.index + match[0].length - 1);
      const methodRegex = /fun\s+(\w+)\s*\(/g;
      let methodMatch;
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        methods.push(methodMatch[1]);
      }
      
      result.classes.push({ name: className, methods });
    }

    return result;
  }

  private extractKotlinClassBody(content: string, startIndex: number): string {
    let braceCount = 1;
    let classBody = '';
    
    for (let i = startIndex + 1; i < content.length; i++) {
      const char = content[i];
      classBody += char;
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          break;
        }
      }
    }
    
    return classBody;
  }
}

// Scala Analyzer
class ScalaAnalyzer implements LanguageAnalyzer {
  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.scala';
  }

  async analyze(content: string, filePath: string): Promise<CodeAnalysis> {
    const result: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: []
    };

    // Scala imports
    const importRegex = /import\s+([^\s]+)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const parts = importPath.split('.');
      result.imports.push({
        name: parts[parts.length - 1].replace(/[{}]/g, ''),
        path: importPath
      });
    }

    // Scala functions/methods
    const functionRegex = /def\s+(\w+)(?:\[[^\]]+\])?\s*(?:\([^)]*\))?(?:\s*:\s*[^=]+)?\s*=/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      result.functions.push({
        name,
        params: [], // Simplified - would need more complex parsing for params
        isAsync: false
      });
    }

    // Scala classes and objects
    const classRegex = /(?:case\s+)?(?:class|object|trait)\s+(\w+)(?:\[[^\]]+\])?(?:\s*\([^)]*\))?(?:\s+extends\s+[^{]+)?\s*\{/g;
    while ((match = classRegex.exec(content)) !== null) {
      const className = match[1];
      const methods: string[] = [];
      
      // Extract class body and find methods
      const classBody = this.extractScalaClassBody(content, match.index + match[0].length - 1);
      const methodRegex = /def\s+(\w+)/g;
      let methodMatch;
      while ((methodMatch = methodRegex.exec(classBody)) !== null) {
        methods.push(methodMatch[1]);
      }
      
      result.classes.push({ name: className, methods });
    }

    return result;
  }

  private extractScalaClassBody(content: string, startIndex: number): string {
    let braceCount = 1;
    let classBody = '';
    
    for (let i = startIndex + 1; i < content.length; i++) {
      const char = content[i];
      classBody += char;
      
      if (char === '{') {
        braceCount++;
      } else if (char === '}') {
        braceCount--;
        if (braceCount === 0) {
          break;
        }
      }
    }
    
    return classBody;
  }
}

// Elixir Analyzer
class ElixirAnalyzer implements LanguageAnalyzer {
  canHandle(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.ex' || ext === '.exs';
  }

  async analyze(content: string, filePath: string): Promise<CodeAnalysis> {
    const result: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [], // Modules in Elixir
      variables: []
    };

    // Elixir imports/aliases
    const importRegex = /(?:alias|import|require)\s+([\w.]+)/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      result.imports.push({
        name: match[1],
        path: match[1]
      });
    }

    // Elixir modules (similar to classes)
    const moduleRegex = /defmodule\s+([\w.]+)\s+do/g;
    while ((match = moduleRegex.exec(content)) !== null) {
      const moduleName = match[1];
      const methods: string[] = [];
      
      // Find functions within module
      const moduleBody = this.extractElixirModuleBody(content, match.index + match[0].length);
      const functionRegex = /def(?:p?)\s+(\w+)(?:\([^)]*\))?\s+do/g;
      let funcMatch;
      while ((funcMatch = functionRegex.exec(moduleBody)) !== null) {
        methods.push(funcMatch[1]);
      }
      
      result.classes.push({ name: moduleName, methods });
    }

    // Top-level functions
    const functionRegex = /def(?:p?)\s+(\w+)(?:\(([^)]*)\))?\s+do/g;
    while ((match = functionRegex.exec(content)) !== null) {
      const name = match[1];
      const params = match[2] ? match[2].split(',').map(p => p.trim()) : [];
      
      result.functions.push({
        name,
        params,
        isAsync: false // Elixir uses processes, not async/await
      });
      
      // defp functions are private, def are public (exports)
      if (match[0].startsWith('def ')) {
        result.exports.push({
          name,
          type: 'function'
        });
      }
    }

    return result;
  }

  private extractElixirModuleBody(content: string, startIndex: number): string {
    let nestLevel = 1;
    let moduleBody = '';
    let i = startIndex;
    
    while (i < content.length && nestLevel > 0) {
      // Look for "do" and "end" keywords
      if (content.substring(i, i + 3) === ' do') {
        nestLevel++;
      } else if (content.substring(i, i + 3) === 'end') {
        nestLevel--;
        if (nestLevel === 0) break;
      }
      
      moduleBody += content[i];
      i++;
    }
    
    return moduleBody;
  }
}
