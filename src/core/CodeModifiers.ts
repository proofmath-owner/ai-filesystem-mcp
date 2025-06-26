import { promises as fs } from 'fs';
import * as path from 'path';

export interface TextBasedModification {
  type: 'replace' | 'insertBefore' | 'insertAfter' | 'delete' | 'replacePattern';
  target?: string;
  replacement?: string;
  pattern?: RegExp | string;
  content?: string;
  line?: number;
}

export abstract class LanguageCodeModifier {
  abstract canHandle(filePath: string): boolean;
  abstract modify(content: string, modifications: TextBasedModification[]): Promise<string>;
  
  protected findLineNumber(content: string, target: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(target)) {
        return i;
      }
    }
    return -1;
  }

  protected insertAtLine(content: string, lineNumber: number, text: string, position: 'before' | 'after'): string {
    const lines = content.split('\n');
    if (lineNumber < 0 || lineNumber >= lines.length) {
      throw new Error(`Line number ${lineNumber} out of range`);
    }

    if (position === 'before') {
      lines.splice(lineNumber, 0, text);
    } else {
      lines.splice(lineNumber + 1, 0, text);
    }

    return lines.join('\n');
  }
}

// Python Code Modifier
export class PythonCodeModifier extends LanguageCodeModifier {
  canHandle(filePath: string): boolean {
    return ['.py', '.pyw'].includes(path.extname(filePath).toLowerCase());
  }

  async modify(content: string, modifications: TextBasedModification[]): Promise<string> {
    let result = content;

    for (const mod of modifications) {
      switch (mod.type) {
        case 'replace':
          result = this.replaceSymbol(result, mod.target!, mod.replacement!);
          break;
        case 'insertBefore':
          result = this.insertBefore(result, mod.target!, mod.content!);
          break;
        case 'insertAfter':
          result = this.insertAfter(result, mod.target!, mod.content!);
          break;
        case 'delete':
          result = this.deleteElement(result, mod.target!);
          break;
        case 'replacePattern':
          result = this.replacePattern(result, mod.pattern!, mod.replacement!);
          break;
      }
    }

    return result;
  }

  private replaceSymbol(content: string, target: string, replacement: string): string {
    // Replace function/class/variable names
    const patterns = [
      new RegExp(`\\bdef\\s+${target}\\b`, 'g'),
      new RegExp(`\\bclass\\s+${target}\\b`, 'g'),
      new RegExp(`\\b${target}\\s*=`, 'g'),
      new RegExp(`\\b${target}\\s*\\(`, 'g'),
      new RegExp(`\\.${target}\\b`, 'g')
    ];

    let result = content;
    for (const pattern of patterns) {
      result = result.replace(pattern, (match) => {
        return match.replace(target, replacement);
      });
    }

    return result;
  }

  private insertBefore(content: string, target: string, newContent: string): string {
    const targetPatterns = [
      `def ${target}`,
      `class ${target}`,
      `${target} =`
    ];

    for (const pattern of targetPatterns) {
      const index = content.indexOf(pattern);
      if (index !== -1) {
        // Find the beginning of the line
        let lineStart = content.lastIndexOf('\n', index) + 1;
        const indent = content.substring(lineStart, index).match(/^\s*/)?.[0] || '';
        return content.substring(0, lineStart) + indent + newContent + '\n' + content.substring(lineStart);
      }
    }

    return content;
  }

  private insertAfter(content: string, target: string, newContent: string): string {
    const functionMatch = content.match(new RegExp(`def\\s+${target}\\s*\\([^)]*\\):[^]*?(?=\\n(?:def|class|$))`, 's'));
    const classMatch = content.match(new RegExp(`class\\s+${target}[^:]*:[^]*?(?=\\n(?:def|class|$))`, 's'));

    if (functionMatch) {
      const endIndex = functionMatch.index! + functionMatch[0].length;
      return content.substring(0, endIndex) + '\n\n' + newContent + content.substring(endIndex);
    } else if (classMatch) {
      const endIndex = classMatch.index! + classMatch[0].length;
      return content.substring(0, endIndex) + '\n\n' + newContent + content.substring(endIndex);
    }

    return content;
  }

  private deleteElement(content: string, target: string): string {
    // Delete function
    const functionRegex = new RegExp(`\\n?\\s*def\\s+${target}\\s*\\([^)]*\\):[^]*?(?=\\n(?:def|class|\\S|$))`, 's');
    // Delete class
    const classRegex = new RegExp(`\\n?\\s*class\\s+${target}[^:]*:[^]*?(?=\\n(?:def|class|\\S|$))`, 's');
    // Delete import
    const importRegex = new RegExp(`\\n?.*import.*${target}.*`, 'g');

    return content
      .replace(functionRegex, '')
      .replace(classRegex, '')
      .replace(importRegex, '');
  }

  private replacePattern(content: string, pattern: RegExp | string, replacement: string): string {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    return content.replace(regex, replacement);
  }
}

// Java Code Modifier
export class JavaCodeModifier extends LanguageCodeModifier {
  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.java';
  }

  async modify(content: string, modifications: TextBasedModification[]): Promise<string> {
    let result = content;

    for (const mod of modifications) {
      switch (mod.type) {
        case 'replace':
          result = this.replaceSymbol(result, mod.target!, mod.replacement!);
          break;
        case 'insertBefore':
          result = this.insertBefore(result, mod.target!, mod.content!);
          break;
        case 'insertAfter':
          result = this.insertAfter(result, mod.target!, mod.content!);
          break;
        case 'delete':
          result = this.deleteElement(result, mod.target!);
          break;
        case 'replacePattern':
          result = this.replacePattern(result, mod.pattern!, mod.replacement!);
          break;
      }
    }

    return result;
  }

  private replaceSymbol(content: string, target: string, replacement: string): string {
    const patterns = [
      new RegExp(`\\bclass\\s+${target}\\b`, 'g'),
      new RegExp(`\\binterface\\s+${target}\\b`, 'g'),
      new RegExp(`\\b${target}\\s+\\w+\\s*[=;(]`, 'g'), // Variable declaration
      new RegExp(`\\b${target}\\s*\\(`, 'g'), // Method call
      new RegExp(`\\bnew\\s+${target}\\s*\\(`, 'g'), // Constructor
      new RegExp(`\\.${target}\\s*\\(`, 'g'), // Method call on object
    ];

    let result = content;
    for (const pattern of patterns) {
      result = result.replace(pattern, (match) => {
        return match.replace(target, replacement);
      });
    }

    return result;
  }

  private insertBefore(content: string, target: string, newContent: string): string {
    const patterns = [
      new RegExp(`(\\s*)((?:public|private|protected)\\s+)?(?:static\\s+)?(?:final\\s+)?(?:class|interface)\\s+${target})`),
      new RegExp(`(\\s*)((?:public|private|protected)\\s+)?(?:static\\s+)?(?:final\\s+)?\\w+\\s+${target}\\s*\\()`)
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const indent = match[1] || '';
        const index = match.index!;
        return content.substring(0, index) + indent + newContent + '\n' + content.substring(index);
      }
    }

    return content;
  }

  private insertAfter(content: string, target: string, newContent: string): string {
    // Find the closing brace of a class or method
    const classMatch = content.match(new RegExp(`class\\s+${target}[^{]*\\{`));
    const methodMatch = content.match(new RegExp(`\\w+\\s+${target}\\s*\\([^)]*\\)[^{]*\\{`));

    if (classMatch || methodMatch) {
      const match = classMatch || methodMatch!;
      const startIndex = match.index! + match[0].length;
      const closingBraceIndex = this.findMatchingBrace(content, startIndex - 1);
      
      if (closingBraceIndex !== -1) {
        return content.substring(0, closingBraceIndex + 1) + '\n\n' + newContent + content.substring(closingBraceIndex + 1);
      }
    }

    return content;
  }

  private deleteElement(content: string, target: string): string {
    // Delete class
    const classMatch = content.match(new RegExp(`(?:public\\s+)?(?:abstract\\s+)?(?:final\\s+)?class\\s+${target}[^{]*\\{`));
    if (classMatch) {
      const startIndex = classMatch.index!;
      const closingBraceIndex = this.findMatchingBrace(content, classMatch.index! + classMatch[0].length - 1);
      if (closingBraceIndex !== -1) {
        return content.substring(0, startIndex) + content.substring(closingBraceIndex + 1);
      }
    }

    // Delete method
    const methodMatch = content.match(new RegExp(`(?:public|private|protected)?\\s*(?:static\\s+)?\\w+\\s+${target}\\s*\\([^)]*\\)[^{]*\\{`));
    if (methodMatch) {
      const startIndex = content.lastIndexOf('\n', methodMatch.index!) + 1;
      const closingBraceIndex = this.findMatchingBrace(content, methodMatch.index! + methodMatch[0].length - 1);
      if (closingBraceIndex !== -1) {
        return content.substring(0, startIndex) + content.substring(closingBraceIndex + 2); // +2 to include newline
      }
    }

    // Delete import
    const importRegex = new RegExp(`\\n?import\\s+[^;]*${target}[^;]*;`, 'g');
    return content.replace(importRegex, '');
  }

  private replacePattern(content: string, pattern: RegExp | string, replacement: string): string {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    return content.replace(regex, replacement);
  }

  private findMatchingBrace(content: string, startIndex: number): number {
    let braceCount = 1;
    for (let i = startIndex + 1; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) return i;
      }
    }
    return -1;
  }
}

// Go Code Modifier
export class GoCodeModifier extends LanguageCodeModifier {
  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.go';
  }

  async modify(content: string, modifications: TextBasedModification[]): Promise<string> {
    let result = content;

    for (const mod of modifications) {
      switch (mod.type) {
        case 'replace':
          result = this.replaceSymbol(result, mod.target!, mod.replacement!);
          break;
        case 'insertBefore':
          result = this.insertBefore(result, mod.target!, mod.content!);
          break;
        case 'insertAfter':
          result = this.insertAfter(result, mod.target!, mod.content!);
          break;
        case 'delete':
          result = this.deleteElement(result, mod.target!);
          break;
        case 'replacePattern':
          result = this.replacePattern(result, mod.pattern!, mod.replacement!);
          break;
      }
    }

    return result;
  }

  private replaceSymbol(content: string, target: string, replacement: string): string {
    const patterns = [
      new RegExp(`\\bfunc\\s+${target}\\b`, 'g'),
      new RegExp(`\\btype\\s+${target}\\b`, 'g'),
      new RegExp(`\\b${target}\\s*:=`, 'g'),
      new RegExp(`\\bvar\\s+${target}\\b`, 'g'),
      new RegExp(`\\bconst\\s+${target}\\b`, 'g'),
      new RegExp(`\\b${target}\\s*\\(`, 'g'),
      new RegExp(`\\.${target}\\s*\\(`, 'g')
    ];

    let result = content;
    for (const pattern of patterns) {
      result = result.replace(pattern, (match) => {
        return match.replace(target, replacement);
      });
    }

    return result;
  }

  private insertBefore(content: string, target: string, newContent: string): string {
    const patterns = [
      `func ${target}`,
      `type ${target}`,
      `var ${target}`,
      `const ${target}`
    ];

    for (const pattern of patterns) {
      const index = content.indexOf(pattern);
      if (index !== -1) {
        const lineStart = content.lastIndexOf('\n', index) + 1;
        return content.substring(0, lineStart) + newContent + '\n' + content.substring(lineStart);
      }
    }

    return content;
  }

  private insertAfter(content: string, target: string, newContent: string): string {
    const functionMatch = content.match(new RegExp(`func\\s+(?:\\([^)]+\\)\\s+)?${target}\\s*\\([^)]*\\)[^{]*\\{`));
    const structMatch = content.match(new RegExp(`type\\s+${target}\\s+struct\\s*\\{`));

    if (functionMatch) {
      const closingBraceIndex = this.findMatchingBrace(content, functionMatch.index! + functionMatch[0].length - 1);
      if (closingBraceIndex !== -1) {
        return content.substring(0, closingBraceIndex + 1) + '\n\n' + newContent + content.substring(closingBraceIndex + 1);
      }
    } else if (structMatch) {
      const closingBraceIndex = this.findMatchingBrace(content, structMatch.index! + structMatch[0].length - 1);
      if (closingBraceIndex !== -1) {
        return content.substring(0, closingBraceIndex + 1) + '\n\n' + newContent + content.substring(closingBraceIndex + 1);
      }
    }

    return content;
  }

  private deleteElement(content: string, target: string): string {
    // Delete function
    const functionMatch = content.match(new RegExp(`\\n?func\\s+(?:\\([^)]+\\)\\s+)?${target}\\s*\\([^)]*\\)[^{]*\\{`));
    if (functionMatch) {
      const startIndex = functionMatch.index!;
      const closingBraceIndex = this.findMatchingBrace(content, functionMatch.index! + functionMatch[0].length - 1);
      if (closingBraceIndex !== -1) {
        return content.substring(0, startIndex) + content.substring(closingBraceIndex + 1);
      }
    }

    // Delete struct
    const structMatch = content.match(new RegExp(`\\n?type\\s+${target}\\s+struct\\s*\\{`));
    if (structMatch) {
      const startIndex = structMatch.index!;
      const closingBraceIndex = this.findMatchingBrace(content, structMatch.index! + structMatch[0].length - 1);
      if (closingBraceIndex !== -1) {
        return content.substring(0, startIndex) + content.substring(closingBraceIndex + 1);
      }
    }

    // Delete import
    const importRegex = new RegExp(`\\n?import\\s+[^\\n]*"[^"]*${target}[^"]*"`, 'g');
    return content.replace(importRegex, '');
  }

  private replacePattern(content: string, pattern: RegExp | string, replacement: string): string {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    return content.replace(regex, replacement);
  }

  private findMatchingBrace(content: string, startIndex: number): number {
    let braceCount = 1;
    for (let i = startIndex + 1; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) return i;
      }
    }
    return -1;
  }
}

// Rust Code Modifier
export class RustCodeModifier extends LanguageCodeModifier {
  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.rs';
  }

  async modify(content: string, modifications: TextBasedModification[]): Promise<string> {
    let result = content;

    for (const mod of modifications) {
      switch (mod.type) {
        case 'replace':
          result = this.replaceSymbol(result, mod.target!, mod.replacement!);
          break;
        case 'insertBefore':
          result = this.insertBefore(result, mod.target!, mod.content!);
          break;
        case 'insertAfter':
          result = this.insertAfter(result, mod.target!, mod.content!);
          break;
        case 'delete':
          result = this.deleteElement(result, mod.target!);
          break;
        case 'replacePattern':
          result = this.replacePattern(result, mod.pattern!, mod.replacement!);
          break;
      }
    }

    return result;
  }

  private replaceSymbol(content: string, target: string, replacement: string): string {
    const patterns = [
      new RegExp(`\\bfn\\s+${target}\\b`, 'g'),
      new RegExp(`\\bstruct\\s+${target}\\b`, 'g'),
      new RegExp(`\\benum\\s+${target}\\b`, 'g'),
      new RegExp(`\\btrait\\s+${target}\\b`, 'g'),
      new RegExp(`\\blet\\s+(?:mut\\s+)?${target}\\b`, 'g'),
      new RegExp(`\\bconst\\s+${target}\\b`, 'g'),
      new RegExp(`\\bstatic\\s+${target}\\b`, 'g'),
      new RegExp(`\\b${target}\\s*\\(`, 'g'),
      new RegExp(`\\.${target}\\s*\\(`, 'g'),
      new RegExp(`${target}::`, 'g')
    ];

    let result = content;
    for (const pattern of patterns) {
      result = result.replace(pattern, (match) => {
        return match.replace(target, replacement);
      });
    }

    return result;
  }

  private insertBefore(content: string, target: string, newContent: string): string {
    const patterns = [
      `fn ${target}`,
      `struct ${target}`,
      `enum ${target}`,
      `trait ${target}`,
      `impl ${target}`,
      `impl<`,  // For generic impls
      `pub fn ${target}`,
      `pub struct ${target}`
    ];

    for (const pattern of patterns) {
      const index = content.indexOf(pattern);
      if (index !== -1) {
        const lineStart = content.lastIndexOf('\n', index) + 1;
        return content.substring(0, lineStart) + newContent + '\n' + content.substring(lineStart);
      }
    }

    return content;
  }

  private insertAfter(content: string, target: string, newContent: string): string {
    const functionMatch = content.match(new RegExp(`(?:pub\\s+)?(?:async\\s+)?fn\\s+${target}\\s*(?:<[^>]+>)?\\s*\\([^)]*\\)[^{]*\\{`));
    const structMatch = content.match(new RegExp(`(?:pub\\s+)?struct\\s+${target}[^{;]*[{;]`));
    const implMatch = content.match(new RegExp(`impl(?:<[^>]+>)?\\s+(?:\\w+\\s+for\\s+)?${target}[^{]*\\{`));

    if (functionMatch) {
      const closingBraceIndex = this.findMatchingBrace(content, functionMatch.index! + functionMatch[0].length - 1);
      if (closingBraceIndex !== -1) {
        return content.substring(0, closingBraceIndex + 1) + '\n\n' + newContent + content.substring(closingBraceIndex + 1);
      }
    } else if (implMatch) {
      const closingBraceIndex = this.findMatchingBrace(content, implMatch.index! + implMatch[0].length - 1);
      if (closingBraceIndex !== -1) {
        return content.substring(0, closingBraceIndex + 1) + '\n\n' + newContent + content.substring(closingBraceIndex + 1);
      }
    } else if (structMatch) {
      if (structMatch[0].endsWith(';')) {
        // Tuple struct
        const endIndex = structMatch.index! + structMatch[0].length;
        return content.substring(0, endIndex) + '\n\n' + newContent + content.substring(endIndex);
      } else {
        // Regular struct
        const closingBraceIndex = this.findMatchingBrace(content, structMatch.index! + structMatch[0].length - 1);
        if (closingBraceIndex !== -1) {
          return content.substring(0, closingBraceIndex + 1) + '\n\n' + newContent + content.substring(closingBraceIndex + 1);
        }
      }
    }

    return content;
  }

  private deleteElement(content: string, target: string): string {
    // Delete function
    const functionMatch = content.match(new RegExp(`\\n?(?:pub\\s+)?(?:async\\s+)?fn\\s+${target}\\s*(?:<[^>]+>)?\\s*\\([^)]*\\)[^{]*\\{`));
    if (functionMatch) {
      const startIndex = functionMatch.index!;
      const closingBraceIndex = this.findMatchingBrace(content, functionMatch.index! + functionMatch[0].length - 1);
      if (closingBraceIndex !== -1) {
        return content.substring(0, startIndex) + content.substring(closingBraceIndex + 1);
      }
    }

    // Delete struct/enum/trait
    const typeMatch = content.match(new RegExp(`\\n?(?:pub\\s+)?(?:struct|enum|trait)\\s+${target}[^{;]*[{;]`));
    if (typeMatch) {
      const startIndex = typeMatch.index!;
      if (typeMatch[0].endsWith(';')) {
        return content.substring(0, startIndex) + content.substring(startIndex + typeMatch[0].length);
      } else {
        const closingBraceIndex = this.findMatchingBrace(content, typeMatch.index! + typeMatch[0].length - 1);
        if (closingBraceIndex !== -1) {
          return content.substring(0, startIndex) + content.substring(closingBraceIndex + 1);
        }
      }
    }

    // Delete use statement
    const useRegex = new RegExp(`\\n?use\\s+[^;]*${target}[^;]*;`, 'g');
    return content.replace(useRegex, '');
  }

  private replacePattern(content: string, pattern: RegExp | string, replacement: string): string {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    return content.replace(regex, replacement);
  }

  private findMatchingBrace(content: string, startIndex: number): number {
    let braceCount = 1;
    for (let i = startIndex + 1; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) return i;
      }
    }
    return -1;
  }
}

// Swift Code Modifier
export class SwiftCodeModifier extends LanguageCodeModifier {
  canHandle(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.swift';
  }

  async modify(content: string, modifications: TextBasedModification[]): Promise<string> {
    let result = content;

    for (const mod of modifications) {
      switch (mod.type) {
        case 'replace':
          result = this.replaceSymbol(result, mod.target!, mod.replacement!);
          break;
        case 'insertBefore':
          result = this.insertBefore(result, mod.target!, mod.content!);
          break;
        case 'insertAfter':
          result = this.insertAfter(result, mod.target!, mod.content!);
          break;
        case 'delete':
          result = this.deleteElement(result, mod.target!);
          break;
        case 'replacePattern':
          result = this.replacePattern(result, mod.pattern!, mod.replacement!);
          break;
      }
    }

    return result;
  }

  private replaceSymbol(content: string, target: string, replacement: string): string {
    const patterns = [
      new RegExp(`\\bfunc\\s+${target}\\b`, 'g'),
      new RegExp(`\\bclass\\s+${target}\\b`, 'g'),
      new RegExp(`\\bstruct\\s+${target}\\b`, 'g'),
      new RegExp(`\\benum\\s+${target}\\b`, 'g'),
      new RegExp(`\\bprotocol\\s+${target}\\b`, 'g'),
      new RegExp(`\\bvar\\s+${target}\\b`, 'g'),
      new RegExp(`\\blet\\s+${target}\\b`, 'g'),
      new RegExp(`\\b${target}\\s*\\(`, 'g'),
      new RegExp(`\\.${target}\\s*[\\({]`, 'g')
    ];

    let result = content;
    for (const pattern of patterns) {
      result = result.replace(pattern, (match) => {
        return match.replace(target, replacement);
      });
    }

    return result;
  }

  private insertBefore(content: string, target: string, newContent: string): string {
    const patterns = [
      `func ${target}`,
      `class ${target}`,
      `struct ${target}`,
      `enum ${target}`,
      `protocol ${target}`,
      `extension ${target}`,
      `var ${target}`,
      `let ${target}`
    ];

    for (const pattern of patterns) {
      const index = content.indexOf(pattern);
      if (index !== -1) {
        const lineStart = content.lastIndexOf('\n', index) + 1;
        const indent = content.substring(lineStart, index).match(/^\s*/)?.[0] || '';
        return content.substring(0, lineStart) + indent + newContent + '\n' + content.substring(lineStart);
      }
    }

    return content;
  }

  private insertAfter(content: string, target: string, newContent: string): string {
    const blockPatterns = [
      new RegExp(`(?:func|class|struct|enum|protocol|extension)\\s+${target}[^{]*\\{`),
    ];

    for (const pattern of blockPatterns) {
      const match = content.match(pattern);
      if (match) {
        const closingBraceIndex = this.findMatchingBrace(content, match.index! + match[0].length - 1);
        if (closingBraceIndex !== -1) {
          return content.substring(0, closingBraceIndex + 1) + '\n\n' + newContent + content.substring(closingBraceIndex + 1);
        }
      }
    }

    return content;
  }

  private deleteElement(content: string, target: string): string {
    // Delete functions, classes, structs, etc.
    const blockPatterns = [
      new RegExp(`\\n?(?:public\\s+)?(?:private\\s+)?(?:internal\\s+)?(?:func|class|struct|enum|protocol|extension)\\s+${target}[^{]*\\{`),
    ];

    for (const pattern of blockPatterns) {
      const match = content.match(pattern);
      if (match) {
        const startIndex = match.index!;
        const closingBraceIndex = this.findMatchingBrace(content, match.index! + match[0].length - 1);
        if (closingBraceIndex !== -1) {
          return content.substring(0, startIndex) + content.substring(closingBraceIndex + 1);
        }
      }
    }

    // Delete variables
    const varRegex = new RegExp(`\\n?\\s*(?:var|let)\\s+${target}[^\\n]*`, 'g');
    content = content.replace(varRegex, '');

    // Delete imports
    const importRegex = new RegExp(`\\n?import\\s+${target}`, 'g');
    return content.replace(importRegex, '');
  }

  private replacePattern(content: string, pattern: RegExp | string, replacement: string): string {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    return content.replace(regex, replacement);
  }

  private findMatchingBrace(content: string, startIndex: number): number {
    let braceCount = 1;
    for (let i = startIndex + 1; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) return i;
      }
    }
    return -1;
  }
}

// Kotlin Code Modifier
export class KotlinCodeModifier extends LanguageCodeModifier {
  canHandle(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    return ext === '.kt' || ext === '.kts';
  }

  async modify(content: string, modifications: TextBasedModification[]): Promise<string> {
    let result = content;

    for (const mod of modifications) {
      switch (mod.type) {
        case 'replace':
          result = this.replaceSymbol(result, mod.target!, mod.replacement!);
          break;
        case 'insertBefore':
          result = this.insertBefore(result, mod.target!, mod.content!);
          break;
        case 'insertAfter':
          result = this.insertAfter(result, mod.target!, mod.content!);
          break;
        case 'delete':
          result = this.deleteElement(result, mod.target!);
          break;
        case 'replacePattern':
          result = this.replacePattern(result, mod.pattern!, mod.replacement!);
          break;
      }
    }

    return result;
  }

  private replaceSymbol(content: string, target: string, replacement: string): string {
    const patterns = [
      new RegExp(`\\bfun\\s+${target}\\b`, 'g'),
      new RegExp(`\\bclass\\s+${target}\\b`, 'g'),
      new RegExp(`\\binterface\\s+${target}\\b`, 'g'),
      new RegExp(`\\bobject\\s+${target}\\b`, 'g'),
      new RegExp(`\\bdata\\s+class\\s+${target}\\b`, 'g'),
      new RegExp(`\\bsealed\\s+class\\s+${target}\\b`, 'g'),
      new RegExp(`\\bval\\s+${target}\\b`, 'g'),
      new RegExp(`\\bvar\\s+${target}\\b`, 'g'),
      new RegExp(`\\b${target}\\s*\\(`, 'g'),
      new RegExp(`\\.${target}\\s*[\\({]`, 'g')
    ];

    let result = content;
    for (const pattern of patterns) {
      result = result.replace(pattern, (match) => {
        return match.replace(target, replacement);
      });
    }

    return result;
  }

  private insertBefore(content: string, target: string, newContent: string): string {
    const patterns = [
      `fun ${target}`,
      `class ${target}`,
      `interface ${target}`,
      `object ${target}`,
      `data class ${target}`,
      `sealed class ${target}`,
      `val ${target}`,
      `var ${target}`
    ];

    for (const pattern of patterns) {
      const index = content.indexOf(pattern);
      if (index !== -1) {
        const lineStart = content.lastIndexOf('\n', index) + 1;
        const indent = content.substring(lineStart, index).match(/^\s*/)?.[0] || '';
        return content.substring(0, lineStart) + indent + newContent + '\n' + content.substring(lineStart);
      }
    }

    return content;
  }

  private insertAfter(content: string, target: string, newContent: string): string {
    const blockPatterns = [
      new RegExp(`(?:fun|class|interface|object)\\s+${target}[^{]*\\{`),
    ];

    for (const pattern of blockPatterns) {
      const match = content.match(pattern);
      if (match) {
        const closingBraceIndex = this.findMatchingBrace(content, match.index! + match[0].length - 1);
        if (closingBraceIndex !== -1) {
          return content.substring(0, closingBraceIndex + 1) + '\n\n' + newContent + content.substring(closingBraceIndex + 1);
        }
      }
    }

    return content;
  }

  private deleteElement(content: string, target: string): string {
    // Delete functions, classes, interfaces, etc.
    const blockPatterns = [
      new RegExp(`\\n?(?:public\\s+)?(?:private\\s+)?(?:internal\\s+)?(?:fun|class|interface|object|data\\s+class|sealed\\s+class)\\s+${target}[^{]*\\{`),
    ];

    for (const pattern of blockPatterns) {
      const match = content.match(pattern);
      if (match) {
        const startIndex = match.index!;
        const closingBraceIndex = this.findMatchingBrace(content, match.index! + match[0].length - 1);
        if (closingBraceIndex !== -1) {
          return content.substring(0, startIndex) + content.substring(closingBraceIndex + 1);
        }
      }
    }

    // Delete properties
    const propRegex = new RegExp(`\\n?\\s*(?:val|var)\\s+${target}[^\\n]*`, 'g');
    content = content.replace(propRegex, '');

    // Delete imports
    const importRegex = new RegExp(`\\n?import\\s+[^\\n]*${target}[^\\n]*`, 'g');
    return content.replace(importRegex, '');
  }

  private replacePattern(content: string, pattern: RegExp | string, replacement: string): string {
    const regex = typeof pattern === 'string' ? new RegExp(pattern, 'g') : pattern;
    return content.replace(regex, replacement);
  }

  private findMatchingBrace(content: string, startIndex: number): number {
    let braceCount = 1;
    for (let i = startIndex + 1; i < content.length; i++) {
      if (content[i] === '{') braceCount++;
      else if (content[i] === '}') {
        braceCount--;
        if (braceCount === 0) return i;
      }
    }
    return -1;
  }
}

// Code Modifier Manager
export class CodeModifierManager {
  private modifiers: LanguageCodeModifier[] = [];

  constructor() {
    this.registerModifiers();
  }

  private registerModifiers() {
    this.modifiers.push(
      new PythonCodeModifier(),
      new JavaCodeModifier(),
      new GoCodeModifier(),
      new RustCodeModifier(),
      new SwiftCodeModifier(),
      new KotlinCodeModifier()
    );
  }

  async modifyFile(filePath: string, modifications: TextBasedModification[]): Promise<string> {
    const modifier = this.modifiers.find(m => m.canHandle(filePath));
    if (!modifier) {
      throw new Error(`No code modifier available for file type: ${path.extname(filePath)}`);
    }

    const content = await fs.readFile(filePath, 'utf-8');
    return modifier.modify(content, modifications);
  }

  canModify(filePath: string): boolean {
    return this.modifiers.some(m => m.canHandle(filePath));
  }

  getSupportedExtensions(): string[] {
    const extensions = new Set<string>();
    const testFiles = [
      'test.py', 'test.java', 'test.go', 'test.rs', 'test.swift', 'test.kt',
      'test.js', 'test.ts', 'test.jsx', 'test.tsx'
    ];

    for (const file of testFiles) {
      if (this.canModify(file)) {
        extensions.add(path.extname(file));
      }
    }

    return Array.from(extensions);
  }
}
