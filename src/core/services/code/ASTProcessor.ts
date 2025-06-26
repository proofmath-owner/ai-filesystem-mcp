import * as parser from '@babel/parser';
import * as t from '@babel/types';
import * as fs from 'fs/promises';
import * as path from 'path';

// Use require for problematic imports
import traversePkg from '@babel/traverse';
const traverse = (traversePkg as any).default || traversePkg;

export interface CodeAnalysis {
  imports: Array<{
    source: string;
    specifiers: Array<{
      type: 'default' | 'named' | 'namespace';
      name: string;
      alias?: string;
    }>;
  }>;
  exports: Array<{
    type: 'default' | 'named';
    name: string;
    alias?: string;
  }>;
  functions: Array<{
    name: string;
    params: string[];
    async: boolean;
    generator: boolean;
    line: number;
  }>;
  classes: Array<{
    name: string;
    extends?: string;
    methods: Array<{
      name: string;
      static: boolean;
      async: boolean;
      line: number;
    }>;
    line: number;
  }>;
  variables: Array<{
    name: string;
    kind: 'const' | 'let' | 'var';
    line: number;
  }>;
}

export class ASTProcessor {
  async analyzeCode(filePath: string): Promise<CodeAnalysis> {
    const absolutePath = path.resolve(filePath);
    const content = await fs.readFile(absolutePath, 'utf-8');
    const fileExtension = filePath.split('.').pop()?.toLowerCase();
    
    // Determine parser options based on file extension
    const isTypeScript = fileExtension === 'ts' || fileExtension === 'tsx';
    const isJSX = fileExtension === 'jsx' || fileExtension === 'tsx';
    
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

    const analysis: CodeAnalysis = {
      imports: [],
      exports: [],
      functions: [],
      classes: [],
      variables: []
    };

    traverse(ast, {
      ImportDeclaration(path: any) {
        const importData = {
          source: path.node.source.value,
          specifiers: path.node.specifiers.map((spec: any) => {
            if (t.isImportDefaultSpecifier(spec)) {
              return { type: 'default' as const, name: spec.local.name };
            } else if (t.isImportNamespaceSpecifier(spec)) {
              return { type: 'namespace' as const, name: spec.local.name };
            } else if (t.isImportSpecifier(spec)) {
              return {
                type: 'named' as const,
                name: t.isIdentifier(spec.imported) ? spec.imported.name : 'unknown',
                alias: spec.local.name
              };
            }
            return { type: 'default' as const, name: 'unknown' };
          })
        };
        analysis.imports.push(importData);
      },

      ExportNamedDeclaration(path: any) {
        if (path.node.declaration) {
          // Handle export const/let/var
          if (t.isVariableDeclaration(path.node.declaration)) {
            path.node.declaration.declarations.forEach((decl: any) => {
              if (t.isIdentifier(decl.id)) {
                analysis.exports.push({
                  type: 'named',
                  name: decl.id.name
                });
              }
            });
          }
          // Handle export function/class
          else if (t.isFunctionDeclaration(path.node.declaration) || t.isClassDeclaration(path.node.declaration)) {
            if (path.node.declaration.id) {
              analysis.exports.push({
                type: 'named',
                name: path.node.declaration.id.name
              });
            }
          }
        }
        // Handle export { ... }
        else if (path.node.specifiers) {
          path.node.specifiers.forEach((spec: any) => {
            if (t.isExportSpecifier(spec) && t.isIdentifier(spec.exported)) {
              analysis.exports.push({
                type: 'named',
                name: t.isIdentifier(spec.local) ? spec.local.name : 'unknown',
                alias: spec.exported.name
              });
            }
          });
        }
      },

      ExportDefaultDeclaration(path: any) {
        analysis.exports.push({
          type: 'default',
          name: 'default'
        });
      },

      FunctionDeclaration(path: any) {
        if (path.node.id) {
          analysis.functions.push({
            name: path.node.id.name,
            params: path.node.params.map((param: any) => {
              if (t.isIdentifier(param)) return param.name;
              if (t.isRestElement(param) && t.isIdentifier(param.argument)) return `...${param.argument.name}`;
              return 'unknown';
            }),
            async: path.node.async || false,
            generator: path.node.generator || false,
            line: path.node.loc?.start.line || 0
          });
        }
      },

      ClassDeclaration(path: any) {
        if (path.node.id) {
          const methods: any[] = [];
          
          path.traverse({
            ClassMethod(methodPath: any) {
              if (t.isIdentifier(methodPath.node.key)) {
                methods.push({
                  name: methodPath.node.key.name,
                  static: methodPath.node.static || false,
                  async: methodPath.node.async || false,
                  line: methodPath.node.loc?.start.line || 0
                });
              }
            }
          });

          analysis.classes.push({
            name: path.node.id.name,
            extends: path.node.superClass && t.isIdentifier(path.node.superClass) 
              ? path.node.superClass.name 
              : undefined,
            methods,
            line: path.node.loc?.start.line || 0
          });
        }
      },

      VariableDeclaration(path: any) {
        if (!path.isDescendant()) return; // Skip nested declarations
        
        path.node.declarations.forEach((decl: any) => {
          if (t.isIdentifier(decl.id)) {
            analysis.variables.push({
              name: decl.id.name,
              kind: path.node.kind,
              line: path.node.loc?.start.line || 0
            });
          }
        });
      }
    });

    return analysis;
  }

  async extractDependencies(filePath: string): Promise<string[]> {
    const analysis = await this.analyzeCode(filePath);
    return analysis.imports.map(imp => imp.source);
  }
}
