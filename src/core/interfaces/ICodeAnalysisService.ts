import { CodeModification } from '../services/code/CodeAnalysisService.js';

export interface ICodeAnalysisService {
  analyzeCode(path: string): Promise<any>;
  modifyCode(path: string, modifications: CodeModification[]): Promise<{
    appliedModifications: string[];
    backupPath: string;
  }>;
  suggestRefactoring(
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
  }>>;
  formatCode(
    path: string,
    options?: {
      style?: 'prettier' | 'eslint' | 'standard' | 'custom';
      config?: Record<string, any>;
      fix?: boolean;
    }
  ): Promise<{
    modified: boolean;
    changes: Array<{ line: number; description: string }>;
  }>;
  analyzeQuality(path: string): Promise<any>;
}
