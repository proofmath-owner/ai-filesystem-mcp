// Type declarations for Babel imports
declare module '@babel/traverse' {
  export interface NodePath<T = any> {
    node: T;
    isReferencedIdentifier(): boolean;
    isDescendant(): boolean;
    remove(): void;
    replaceWith(node: any): void;
    traverse(visitor: any): void;
  }
  
  export default function traverse(ast: any, visitor: any): void;
}

declare module '@babel/generator' {
  export interface GeneratorOptions {
    retainLines?: boolean;
    retainFunctionParens?: boolean;
    comments?: boolean;
    compact?: boolean | 'auto';
    concise?: boolean;
  }
  
  export interface GeneratorResult {
    code: string;
    map?: any;
  }
  
  export default function generate(ast: any, options?: GeneratorOptions): GeneratorResult;
}
