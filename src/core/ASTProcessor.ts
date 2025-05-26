import * as ts from 'typescript';
import { promises as fs } from 'fs';

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

export class ASTProcessor {
  // TypeScript/JavaScript 파일 분석
  async analyzeFile(filePath: string): Promise<{
    imports: Array<{ name: string; path: string }>;
    exports: Array<{ name: string; type: string }>;
    functions: Array<{ name: string; params: string[]; isAsync: boolean }>;
    classes: Array<{ name: string; methods: string[] }>;
    variables: Array<{ name: string; type: string }>;
  }> {
    const content = await fs.readFile(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const result = {
      imports: [] as Array<{ name: string; path: string }>,
      exports: [] as Array<{ name: string; type: string }>,
      functions: [] as Array<{ name: string; params: string[]; isAsync: boolean }>,
      classes: [] as Array<{ name: string; methods: string[] }>,
      variables: [] as Array<{ name: string; type: string }>
    };

    const visit = (node: ts.Node) => {
      // Import 분석
      if (ts.isImportDeclaration(node)) {
        const importPath = (node.moduleSpecifier as ts.StringLiteral).text;
        if (node.importClause) {
          if (node.importClause.name) {
            result.imports.push({
              name: node.importClause.name.text,
              path: importPath
            });
          }
          if (node.importClause.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
            node.importClause.namedBindings.elements.forEach(element => {
              result.imports.push({
                name: element.name.text,
                path: importPath
              });
            });
          }
        }
      }

      // Export 분석
      if (ts.isFunctionDeclaration(node) && node.name) {
        const modifiers = (node as any).modifiers as ts.NodeArray<ts.ModifierLike> | undefined;
        if (modifiers && modifiers.some((mod: any) => mod.kind === ts.SyntaxKind.ExportKeyword)) {
          result.exports.push({
            name: node.name.text,
            type: 'function'
          });
        }
      } else if (ts.isClassDeclaration(node) && node.name) {
        const modifiers = (node as any).modifiers as ts.NodeArray<ts.ModifierLike> | undefined;
        if (modifiers && modifiers.some((mod: any) => mod.kind === ts.SyntaxKind.ExportKeyword)) {
          result.exports.push({
            name: node.name.text,
            type: 'class'
          });
        }
      } else if (ts.isVariableStatement(node)) {
        const modifiers = (node as any).modifiers as ts.NodeArray<ts.ModifierLike> | undefined;
        if (modifiers && modifiers.some((mod: any) => mod.kind === ts.SyntaxKind.ExportKeyword)) {
          node.declarationList.declarations.forEach(decl => {
            if (ts.isIdentifier(decl.name)) {
              result.exports.push({
                name: decl.name.text,
                type: 'variable'
              });
            }
          });
        }
      }

      // Function 분석
      if (ts.isFunctionDeclaration(node) && node.name) {
        const params = node.parameters.map(p => p.name.getText());
        const modifiers = (node as any).modifiers as ts.NodeArray<ts.ModifierLike> | undefined;
        const isAsync = modifiers ? modifiers.some((mod: any) => mod.kind === ts.SyntaxKind.AsyncKeyword) : false;
        result.functions.push({
          name: node.name.text,
          params,
          isAsync
        });
      }

      // Class 분석
      if (ts.isClassDeclaration(node) && node.name) {
        const methods: string[] = [];
        node.members.forEach(member => {
          if (ts.isMethodDeclaration(member) && member.name && ts.isIdentifier(member.name)) {
            methods.push(member.name.text);
          }
        });
        result.classes.push({
          name: node.name.text,
          methods
        });
      }

      // Variable 분석
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        result.variables.push({
          name: node.name.text,
          type: node.type ? node.type.getText() : 'any'
        });
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    return result;
  }

  // AST 기반 코드 수정
  async modifyCode(filePath: string, modifications: CodeModification[]): Promise<string> {
    const content = await fs.readFile(filePath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const printer = ts.createPrinter();
    let modifiedSourceFile = sourceFile;

    for (const mod of modifications) {
      switch (mod.type) {
        case 'rename':
          modifiedSourceFile = this.renameSymbol(modifiedSourceFile, mod.target!, mod.newName!);
          break;
        
        case 'addImport':
          modifiedSourceFile = this.addImport(modifiedSourceFile, mod.importName!, mod.importPath!);
          break;
        
        case 'removeImport':
          modifiedSourceFile = this.removeImport(modifiedSourceFile, mod.importName!);
          break;
        
        case 'addFunction':
          modifiedSourceFile = this.addFunction(modifiedSourceFile, mod.functionCode!);
          break;
        
        case 'updateFunction':
          modifiedSourceFile = this.updateFunction(modifiedSourceFile, mod.target!, mod.functionCode!);
          break;
        
        case 'addProperty':
          modifiedSourceFile = this.addProperty(modifiedSourceFile, mod.target!, mod.propertyName!, mod.propertyValue!);
          break;
      }
    }

    return printer.printFile(modifiedSourceFile);
  }

  // 심볼 이름 변경
  private renameSymbol(sourceFile: ts.SourceFile, oldName: string, newName: string): ts.SourceFile {
    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      const visit: ts.Visitor = (node) => {
        if (ts.isIdentifier(node) && node.text === oldName) {
          return ts.factory.createIdentifier(newName);
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit) as ts.SourceFile;
    };

    const result = ts.transform(sourceFile, [transformer]);
    return result.transformed[0];
  }

  // Import 추가
  private addImport(sourceFile: ts.SourceFile, importName: string, importPath: string): ts.SourceFile {
    const importDeclaration = ts.factory.createImportDeclaration(
      undefined,
      ts.factory.createImportClause(
        false,
        undefined,
        ts.factory.createNamedImports([
          ts.factory.createImportSpecifier(false, undefined, ts.factory.createIdentifier(importName))
        ])
      ),
      ts.factory.createStringLiteral(importPath)
    );

    const statements = [importDeclaration, ...sourceFile.statements];
    return ts.factory.updateSourceFile(sourceFile, statements);
  }

  // Import 제거
  private removeImport(sourceFile: ts.SourceFile, importName: string): ts.SourceFile {
    const statements = sourceFile.statements.filter(stmt => {
      if (!ts.isImportDeclaration(stmt)) return true;
      
      const importClause = stmt.importClause;
      if (!importClause || !importClause.namedBindings) return true;
      
      if (ts.isNamedImports(importClause.namedBindings)) {
        const hasImport = importClause.namedBindings.elements.some(
          element => element.name.text === importName
        );
        return !hasImport;
      }
      
      return true;
    });

    return ts.factory.updateSourceFile(sourceFile, statements);
  }

  // 함수 추가
  private addFunction(sourceFile: ts.SourceFile, functionCode: string): ts.SourceFile {
    // 간단한 구현 - 실제로는 더 복잡한 파싱이 필요
    const tempFile = ts.createSourceFile(
      'temp.ts',
      functionCode,
      ts.ScriptTarget.Latest,
      true
    );

    if (tempFile.statements.length > 0 && ts.isFunctionDeclaration(tempFile.statements[0])) {
      const statements = [...sourceFile.statements, tempFile.statements[0]];
      return ts.factory.updateSourceFile(sourceFile, statements);
    }

    return sourceFile;
  }

  // 함수 업데이트
  private updateFunction(sourceFile: ts.SourceFile, functionName: string, newCode: string): ts.SourceFile {
    const tempFile = ts.createSourceFile(
      'temp.ts',
      newCode,
      ts.ScriptTarget.Latest,
      true
    );

    if (tempFile.statements.length === 0 || !ts.isFunctionDeclaration(tempFile.statements[0])) {
      return sourceFile;
    }

    const newFunction = tempFile.statements[0];
    const statements = sourceFile.statements.map(stmt => {
      if (ts.isFunctionDeclaration(stmt) && stmt.name?.text === functionName) {
        return newFunction;
      }
      return stmt;
    });

    return ts.factory.updateSourceFile(sourceFile, statements);
  }

  // 속성 추가 (클래스나 인터페이스에)
  private addProperty(sourceFile: ts.SourceFile, targetName: string, propertyName: string, propertyValue: string): ts.SourceFile {
    const transformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
      const visit: ts.Visitor = (node) => {
        if (ts.isClassDeclaration(node) && node.name?.text === targetName) {
          const property = ts.factory.createPropertyDeclaration(
            undefined,
            ts.factory.createIdentifier(propertyName),
            undefined,
            undefined,
            ts.factory.createIdentifier(propertyValue)
          );
          
          return ts.factory.updateClassDeclaration(
            node,
            node.modifiers,
            node.name,
            node.typeParameters,
            node.heritageClauses,
            [...node.members, property]
          );
        }
        return ts.visitEachChild(node, visit, context);
      };
      return (node) => ts.visitNode(node, visit) as ts.SourceFile;
    };

    const result = ts.transform(sourceFile, [transformer]);
    return result.transformed[0];
  }
}
