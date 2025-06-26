import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import { Transaction } from './Transaction.js';
import { GitIntegration } from './GitIntegration.js';
import { FileWatcher, FileChangeEvent } from './FileWatcher.js';
import { ASTProcessor, CodeModification } from './ASTProcessor.js';
import { FileUtils } from './FileUtils.js';
import { CacheManager } from './CacheManager.js';
import { DiffManager } from './DiffManager.js';
import { CompressionManager } from './CompressionManager.js';
import { PermissionManager } from './PermissionManager.js';
import { AdvancedSearchManager } from './AdvancedSearchManager.js';
import { RefactoringManager } from './RefactoringManager.js';
import { IntegrationManager } from './IntegrationManager.js';
import { MonitoringManager } from './MonitoringManager.js';
import { ErrorHandlingManager } from './ErrorHandlingManager.js';
import { BatchManager } from './BatchManager.js';
import { SecurityManager } from './SecurityManager.js';

interface FileUpdate {
  oldText: string;
  newText: string;
}

interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

interface ProjectAnalysis {
  totalFiles: number;
  filesByExtension: Record<string, number>;
  totalLines: number;
  directories: Set<string>;
  possibleEntryPoints: string[];
  dependencies?: Record<string, string[]>;
}

export class FileSystemManager {
  private git: GitIntegration;
  private watcher: FileWatcher;
  private astProcessor: ASTProcessor;
  private fileUtils: FileUtils;
  private cacheManager: CacheManager;
  private diffManager: DiffManager;
  private compressionManager: CompressionManager;
  private permissionManager: PermissionManager;
  private searchManager: AdvancedSearchManager;
  private refactoringManager: RefactoringManager;
  private integrationManager: IntegrationManager;
  private monitoringManager: MonitoringManager;
  private errorManager: ErrorHandlingManager;
  private batchManager: BatchManager;
  private securityManager: SecurityManager;
  private cache = new Map<string, { content: string; timestamp: number }>();
  private cacheTimeout = 5000; // 5 seconds

  constructor() {
    this.git = new GitIntegration();
    this.watcher = new FileWatcher();
    this.astProcessor = new ASTProcessor();
    this.fileUtils = new FileUtils();
    this.cacheManager = new CacheManager();
    this.diffManager = new DiffManager();
    this.compressionManager = new CompressionManager();
    this.permissionManager = new PermissionManager();
    this.searchManager = new AdvancedSearchManager();
    this.refactoringManager = new RefactoringManager();
    this.integrationManager = new IntegrationManager();
    this.monitoringManager = new MonitoringManager();
    this.errorManager = new ErrorHandlingManager();
    this.batchManager = new BatchManager();
    this.securityManager = new SecurityManager();
  }

  // === 기존 기능들 (optimized) ===

  // 파일 읽기 (캐시 지원)
  async readFile(filePath: string): Promise<{ content: [{ type: string; text: string }] }> {
    const startTime = Date.now();
    
    try {
      const absolutePath = path.resolve(filePath);
      
      // 캐시 확인
      const cached = await this.cacheManager.get(absolutePath);
      if (cached) {
        await this.monitoringManager.logOperation({
          type: 'read',
          path: absolutePath,
          success: true,
          metadata: { duration: Date.now() - startTime, size: Buffer.byteLength(cached) }
        });
        
        return {
          content: [{ type: 'text', text: cached }]
        };
      }

      const content = await fs.readFile(absolutePath, 'utf-8');
      
      // 캐시에 저장
      await this.cacheManager.set(absolutePath, content);
      
      await this.monitoringManager.logOperation({
        type: 'read',
        path: absolutePath,
        success: true,
        metadata: { duration: Date.now() - startTime, size: Buffer.byteLength(content) }
      });
      
      return {
        content: [{ type: 'text', text: content }]
      };
    } catch (error: any) {
      await this.monitoringManager.logOperation({
        type: 'read',
        path: filePath,
        success: false,
        error: error.message,
        metadata: { duration: Date.now() - startTime }
      });
      
      // 에러 분석 및 복구 제안
      const errorContext = {
        operation: 'read',
        path: filePath,
        error,
        timestamp: new Date()
      };
      
      const recovery = await this.errorManager.analyzeError(errorContext);
      if (recovery.suggestions.length > 0) {
        const suggestionText = recovery.suggestions
          .map(s => `${s.type.toUpperCase()}: ${s.message}\n${s.action ? `Action: ${s.action}` : ''}`)
          .join('\n\n');
        
        throw new Error(`${error.message}\n\n${suggestionText}`);
      }
      
      throw error;
    }
  }

  // 여러 파일 동시 읽기
  async readFiles(filePaths: string[]): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const results = await Promise.all(
        filePaths.map(async (filePath) => {
          const result = await this.readFile(filePath);
          return {
            path: filePath,
            content: result.content[0].text
          };
        })
      );

      const formattedResult = results.map(r => 
        `=== ${r.path} ===\n${r.content}`
      ).join('\n\n');

      return {
        content: [{ type: 'text', text: formattedResult }]
      };
    } catch (error) {
      throw new Error(`Failed to read multiple files: ${error}`);
    }
  }

  // 파일 쓰기 (백업 포함)
  async writeFile(filePath: string, content: string): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const absolutePath = path.resolve(filePath);
      
      // 디렉토리가 없으면 생성
      const dir = path.dirname(absolutePath);
      await fs.mkdir(dir, { recursive: true });
      
      // 기존 파일이 있으면 백업
      try {
        const existing = await fs.readFile(absolutePath, 'utf-8');
        const backupPath = `${absolutePath}.backup.${Date.now()}`;
        await fs.writeFile(backupPath, existing);
      } catch (e) {
        // 파일이 없으면 백업 불필요
      }
      
      // 파일 쓰기
      await fs.writeFile(absolutePath, content, 'utf-8');
      
      // 캐시 무효화
      this.cache.delete(absolutePath);
      this.cacheManager.invalidate(absolutePath);
      
      return {
        content: [{ type: 'text', text: `Successfully wrote to ${filePath}` }]
      };
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  // 파일 검색
  async searchFiles(pattern: string, directory: string = '.'): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const files = await glob(pattern, {
        cwd: path.resolve(directory),
        ignore: ['**/node_modules/**', '**/.git/**']
      });

      return {
        content: [{ 
          type: 'text', 
          text: files.length > 0 
            ? `Found ${files.length} files:\n${files.join('\n')}` 
            : 'No files found matching the pattern'
        }]
      };
    } catch (error) {
      throw new Error(`Failed to search files: ${error}`);
    }
  }

  // 내용 검색
  async searchContent(
    searchPattern: string, 
    directory: string, 
    filePattern: string = '**/*'
  ): Promise<{ content: [{ type: string; text: string }] }> {
    const startTime = Date.now();
    const MAX_DURATION = 5000; // 5초 제한
    const MAX_FILES = 500; // 최대 파일 수 제한
    
    try {
      const files = await glob(filePattern, {
        cwd: path.resolve(directory),
        ignore: ['**/node_modules/**', '**/.git/**', '**/*.min.js', '**/dist/**'],
        nodir: true,  // 디렉토리 제외
        maxDepth: 5   // 최대 깊이 제한
      });

      const results: SearchResult[] = [];
      const regex = new RegExp(searchPattern, 'gi');
      const limitedFiles = files.slice(0, MAX_FILES);

      for (const file of limitedFiles) {
        // 시간 제한 체크
        if (Date.now() - startTime > MAX_DURATION) {
          console.warn('Search content timeout - returning partial results');
          break;
        }
        const filePath = path.join(directory, file);
        try {
          const stats = await fs.stat(filePath);
          // 큰 파일 스킵 (1MB 이상)
          if (stats.size > 1024 * 1024) continue;
          
          const content = await fs.readFile(filePath, 'utf-8');
          const lines = content.split('\n');
          
          // 라인 수 제한
          const maxLines = Math.min(lines.length, 1000);
          
          for (let index = 0; index < maxLines; index++) {
            const line = lines[index];
            const matches = [...line.matchAll(regex)];
            matches.forEach(match => {
              results.push({
                file: filePath,
                line: index + 1,
                column: match.index || 0,
                match: match[0],
                context: line.trim()
              });
            });
            
            // 결과가 너무 많으면 중단
            if (results.length > 1000) break;
          }
        } catch (e) {
          // 파일을 읽을 수 없으면 스킵
          continue;
        }
      }

      const formattedResults = results
        .slice(0, 100) // 최대 100개 결과
        .map(r => `${r.file}:${r.line}:${r.column} - ${r.context}`)
        .join('\n');

      return {
        content: [{ 
          type: 'text', 
          text: results.length > 0 
            ? `Found ${results.length} matches:\n${formattedResults}` 
            : 'No matches found'
        }]
      };
    } catch (error) {
      throw new Error(`Failed to search content: ${error}`);
    }
  }

  // 파일 업데이트 (sed 대체)
  async updateFile(filePath: string, updates: FileUpdate[]): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const result = await this.readFile(filePath);
      let content = result.content[0].text;
      
      // 모든 업데이트 적용
      for (const update of updates) {
        const oldContent = content;
        content = content.replace(update.oldText, update.newText);
        
        if (oldContent === content) {
          throw new Error(`Could not find text to replace: "${update.oldText}"`);
        }
      }
      
      await this.writeFile(filePath, content);
      
      return {
        content: [{ type: 'text', text: `Successfully updated ${filePath} with ${updates.length} changes` }]
      };
    } catch (error) {
      throw new Error(`Failed to update file: ${error}`);
    }
  }

  // 프로젝트 분석
  async analyzeProject(directory: string): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const files = await glob('**/*', {
        cwd: path.resolve(directory),
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**']
      });

      const analysis: ProjectAnalysis = {
        totalFiles: 0,
        filesByExtension: {},
        totalLines: 0,
        directories: new Set<string>(),
        possibleEntryPoints: []
      };

      for (const file of files) {
        const filePath = path.join(directory, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          analysis.directories.add(file);
          continue;
        }

        analysis.totalFiles++;
        
        // 확장자별 분류
        const ext = path.extname(file) || 'no-extension';
        analysis.filesByExtension[ext] = (analysis.filesByExtension[ext] || 0) + 1;
        
        // 엔트리 포인트 찾기
        const basename = path.basename(file);
        if (basename === 'index.js' || basename === 'index.ts' || 
            basename === 'main.js' || basename === 'main.ts' ||
            basename === 'app.js' || basename === 'app.ts') {
          analysis.possibleEntryPoints.push(file);
        }
        
        // 라인 수 계산 (텍스트 파일만)
        if (['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.c', '.cpp', '.go', '.rs'].includes(ext)) {
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            analysis.totalLines += content.split('\n').length;
          } catch (e) {
            // 읽을 수 없는 파일은 스킵
          }
        }
      }

      const report = `
Project Analysis for ${directory}:
- Total files: ${analysis.totalFiles}
- Total lines of code: ${analysis.totalLines}
- Directories: ${analysis.directories.size}

Files by extension:
${Object.entries(analysis.filesByExtension)
  .sort((a, b) => b[1] - a[1])
  .map(([ext, count]) => `  ${ext}: ${count}`)
  .join('\n')}

Possible entry points:
${analysis.possibleEntryPoints.map(ep => `  - ${ep}`).join('\n') || '  None found'}
`;

      return {
        content: [{ type: 'text', text: report }]
      };
    } catch (error) {
      throw new Error(`Failed to analyze project: ${error}`);
    }
  }

  // 트랜잭션 시작
  createTransaction(): Transaction {
    return new Transaction();
  }

  // Git 상태 확인
  async gitStatus(): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const isGitRepo = await this.git.isGitRepository();
      if (!isGitRepo) {
        return {
          content: [{ type: 'text', text: 'Not a git repository' }]
        };
      }

      const status = await this.git.status();
      const report = `
Git Status:
- Branch: ${status.branch}
- Ahead: ${status.ahead}, Behind: ${status.behind}

Modified files: ${status.modified.length}
${status.modified.map(f => `  - ${f}`).join('\n')}

Added files: ${status.added.length}
${status.added.map(f => `  + ${f}`).join('\n')}

Deleted files: ${status.deleted.length}
${status.deleted.map(f => `  - ${f}`).join('\n')}

Untracked files: ${status.untracked.length}
${status.untracked.map(f => `  ? ${f}`).join('\n')}
`;

      return {
        content: [{ type: 'text', text: report }]
      };
    } catch (error) {
      throw new Error(`Failed to get git status: ${error}`);
    }
  }

  // Git 커밋
  async gitCommit(message: string, files?: string[]): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const result = await this.git.commit(message, files);
      if (!result.error) {
        return {
          content: [{ type: 'text', text: `Successfully committed with hash: ${result.commitHash}` }]
        };
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      throw new Error(`Failed to commit: ${error}`);
    }
  }

  // 파일 감시 시작
  async startWatching(paths: string | string[], options?: any): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const watcherId = await this.watcher.watch(paths, options);
      
      // 변경 이벤트 리스너 등록
      this.watcher.on('change', (event: FileChangeEvent) => {
        console.log(`File ${event.type}: ${event.path}`);
      });

      return {
        content: [{ type: 'text', text: `Started watching with ID: ${watcherId}` }]
      };
    } catch (error) {
      throw new Error(`Failed to start watching: ${error}`);
    }
  }

  // 파일 감시 중지
  async stopWatching(watcherId: string): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      await this.watcher.unwatch(watcherId);
      return {
        content: [{ type: 'text', text: `Stopped watching: ${watcherId}` }]
      };
    } catch (error) {
      throw new Error(`Failed to stop watching: ${error}`);
    }
  }

  // 감시 상태 확인
  getWatcherStats(): { content: [{ type: string; text: string }] } {
    const stats = this.watcher.getStats();
    const report = `
Watcher Statistics:
- Active watchers: ${stats.totalWatchers}
- Total changes detected: ${stats.totalChanges}

Changes by type:
${Object.entries(stats.changesByType).map(([type, count]) => `  - ${type}: ${count}`).join('\n')}

Recent changes:
${stats.recentChanges.map(c => `  - ${c.type} ${c.path} at ${c.timestamp.toISOString()}`).join('\n')}
`;

    return {
      content: [{ type: 'text', text: report }]
    };
  }

  // AST 기반 코드 분석
  async analyzeCode(filePath: string): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const analysis = await this.astProcessor.analyzeFile(filePath);
      const report = `
Code Analysis for ${filePath}:

Imports:
${analysis.imports.map(i => `  - ${i.name} from '${i.path}'`).join('\n')}

Exports:
${analysis.exports.map(e => `  - ${e.name} (${e.type})`).join('\n')}

Functions:
${analysis.functions.map(f => `  - ${f.name}(${f.params.join(', ')})${f.isAsync ? ' async' : ''}`).join('\n')}

Classes:
${analysis.classes.map(c => `  - ${c.name}\n    Methods: ${c.methods.join(', ')}`).join('\n')}

Variables:
${analysis.variables.map(v => `  - ${v.name}: ${v.type}`).join('\n')}
`;

      return {
        content: [{ type: 'text', text: report }]
      };
    } catch (error) {
      throw new Error(`Failed to analyze code: ${error}`);
    }
  }

  // AST 기반 코드 수정
  async modifyCode(filePath: string, modifications: CodeModification[]): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const modifiedCode = await this.astProcessor.modifyCode(filePath, modifications);
      await this.writeFile(filePath, modifiedCode);
      
      return {
        content: [{ type: 'text', text: `Successfully modified ${filePath} with ${modifications.length} AST modifications` }]
      };
    } catch (error) {
      throw new Error(`Failed to modify code: ${error}`);
    }
  }

  // 파일 메타데이터 가져오기
  async getFileMetadata(filePath: string, includeHash: boolean = false): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const metadata = await this.fileUtils.getMetadata(filePath, includeHash);
      const report = `
File Metadata for ${filePath}:
- Size: ${metadata.size} bytes
- Created: ${metadata.created.toISOString()}
- Modified: ${metadata.modified.toISOString()}
- Type: ${metadata.isDirectory ? 'Directory' : metadata.isSymbolicLink ? 'Symbolic Link' : 'File'}
- Permissions: ${metadata.permissions}
- MIME Type: ${metadata.mimeType || 'N/A'}
${metadata.hash ? `- SHA256: ${metadata.hash}` : ''}
`;

      return {
        content: [{ type: 'text', text: report }]
      };
    } catch (error) {
      throw new Error(`Failed to get file metadata: ${error}`);
    }
  }

  // 디렉토리 트리 생성
  async getDirectoryTree(dirPath: string, maxDepth: number = 3): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const tree = await this.fileUtils.createDirectoryTree(dirPath, maxDepth);
      
      const formatTree = (node: any, indent: string = ''): string => {
        let result = `${indent}${node.name}${node.type === 'directory' ? '/' : ''}${node.type === 'symlink' ? ` -> ${node.target}` : ''} (${node.size} bytes)\n`;
        if (node.children) {
          for (let i = 0; i < node.children.length; i++) {
            const isLast = i === node.children.length - 1;
            const childIndent = indent + (isLast ? '└─ ' : '├─ ');
            const nextIndent = indent + (isLast ? '   ' : '│  ');
            result += formatTree(node.children[i], childIndent).replace(childIndent, childIndent).replace(new RegExp(`^${indent}`, 'gm'), nextIndent);
          }
        }
        return result;
      };

      return {
        content: [{ type: 'text', text: formatTree(tree) }]
      };
    } catch (error) {
      throw new Error(`Failed to create directory tree: ${error}`);
    }
  }

  // 파일 비교
  async compareFiles(file1: string, file2: string): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const comparison = await this.fileUtils.compareFiles(file1, file2);
      const report = `
File Comparison:
- File 1: ${file1} (${comparison.size1} bytes)
- File 2: ${file2} (${comparison.size2} bytes)
- Identical: ${comparison.identical ? 'Yes' : 'No'}
${comparison.hash1 ? `- Hash 1: ${comparison.hash1}` : ''}
${comparison.hash2 ? `- Hash 2: ${comparison.hash2}` : ''}
`;

      return {
        content: [{ type: 'text', text: report }]
      };
    } catch (error) {
      throw new Error(`Failed to compare files: ${error}`);
    }
  }

  // 중복 파일 찾기
  async findDuplicateFiles(directory: string): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const duplicates = await this.fileUtils.findDuplicates(directory);
      let report = `\nDuplicate Files in ${directory}:\n`;
      
      if (duplicates.size === 0) {
        report += 'No duplicate files found.';
      } else {
        let groupNum = 1;
        for (const [hash, files] of duplicates) {
          report += `\nGroup ${groupNum} (${files.length} files, hash: ${hash.substring(0, 8)}...):\n`;
          files.forEach(file => {
            report += `  - ${file}\n`;
          });
          groupNum++;
        }
      }

      return {
        content: [{ type: 'text', text: report }]
      };
    } catch (error) {
      throw new Error(`Failed to find duplicate files: ${error}`);
    }
  }

  // 심볼릭 링크 생성
  async createSymlink(target: string, linkPath: string): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      await this.fileUtils.createSymlink(target, linkPath);
      return {
        content: [{ type: 'text', text: `Successfully created symbolic link: ${linkPath} -> ${target}` }]
      };
    } catch (error) {
      throw new Error(`Failed to create symbolic link: ${error}`);
    }
  }

  // 파일 이동
  async moveFile(source: string, destination: string): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      await this.fileUtils.moveFile(source, destination);
      // 캐시 무효화
      this.cache.delete(path.resolve(source));
      this.cache.delete(path.resolve(destination));
      this.cacheManager.invalidate(source);
      this.cacheManager.invalidate(destination);
      
      return {
        content: [{ type: 'text', text: `Successfully moved file: ${source} -> ${destination}` }]
      };
    } catch (error) {
      throw new Error(`Failed to move file: ${error}`);
    }
  }

  // === 새로운 기능들 ===

  // 1. 스마트 diff
  async diffFiles(file1: string, file2: string, format: 'unified' | 'side-by-side' | 'inline' = 'unified'): Promise<{ content: [{ type: string; text: string }] }> {
    const result = await this.diffManager.diffFiles(file1, file2, { format });
    
    return {
      content: [{
        type: 'text',
        text: `Diff between ${file1} and ${file2}:\n\nAdditions: ${result.additions}\nDeletions: ${result.deletions}\n\n${result.formatted}`
      }]
    };
  }

  // 2. 파일 압축
  async compressFiles(files: string[], outputPath: string, format: 'zip' | 'tar' | 'tar.gz' = 'zip'): Promise<{ content: [{ type: string; text: string }] }> {
    const result = await this.compressionManager.compressFiles(files, outputPath, format);
    
    return {
      content: [{
        type: 'text',
        text: `Compression complete:\nOriginal size: ${result.size} bytes\nCompressed size: ${result.compressed} bytes\nCompression ratio: ${(result.ratio * 100).toFixed(2)}%\nOutput: ${outputPath}`
      }]
    };
  }

  // 3. 압축 해제
  async extractArchive(archivePath: string, destination: string): Promise<{ content: [{ type: string; text: string }] }> {
    const result = await this.compressionManager.extractArchive(archivePath, destination);
    
    return {
      content: [{
        type: 'text',
        text: `Extraction complete:\nExtracted ${result.files.length} files\nTotal size: ${result.size} bytes\nDestination: ${destination}`
      }]
    };
  }

  // 4. 권한 변경
  async changePermissions(filePath: string, permissions: string): Promise<{ content: [{ type: string; text: string }] }> {
    // 위험한 경로 체크
    if (this.permissionManager.isDangerousPath(filePath)) {
      throw new Error('Cannot change permissions on system files');
    }
    
    await this.permissionManager.changePermissions(filePath, permissions);
    
    return {
      content: [{
        type: 'text',
        text: `Successfully changed permissions of ${filePath} to ${permissions}`
      }]
    };
  }

  // 5. 날짜 기반 검색
  async searchByDate(directory: string, after?: Date, before?: Date): Promise<{ content: [{ type: string; text: string }] }> {
    const results = await this.searchManager.searchByDate(directory, { after, before });
    
    const formatted = results.slice(0, 50).map(r => 
      `${r.path} - Modified: ${r.metadata?.modified.toISOString()} (${r.metadata?.size} bytes)`
    ).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `Found ${results.length} files:\n${formatted}`
      }]
    };
  }

  // 6. 크기 기반 검색
  async searchBySize(directory: string, min?: number, max?: number): Promise<{ content: [{ type: string; text: string }] }> {
    const results = await this.searchManager.searchBySize(directory, { min, max });
    
    const formatted = results.slice(0, 50).map(r => 
      `${r.path} - Size: ${r.metadata?.size} bytes`
    ).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `Found ${results.length} files:\n${formatted}`
      }]
    };
  }

  // 7. 퍼지 검색
  async fuzzySearch(pattern: string, directory: string, threshold: number = 0.7): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const results = await this.searchManager.fuzzySearch(pattern, directory, threshold);
    
    const formatted = results.slice(0, 20).map(r => 
      `${r.path} - Similarity: ${(r.score * 100).toFixed(1)}%`
    ).join('\n');
    
    return {
      content: [{
        type: 'text',
        text: `Found ${results.length} similar files:\n${formatted}`
      }]
    };
    } catch (error) {
      console.error('Fuzzy search error:', error);
      return {
        content: [{
          type: 'text',
          text: 'Fuzzy search failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        }]
      };
    }
  }

  // 8. 의미론적 검색
  async semanticSearch(query: string, directory: string): Promise<{ content: [{ type: string; text: string }] }> {
    try {
      const startTime = Date.now();
      const MAX_DURATION = 15000; // 15초 제한 (의미론적 검색은 더 복잡하므로)
      
      // Promise.race를 사용해 타임아웃 적용
      const searchPromise = this.searchManager.semanticSearch(query, directory);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Semantic search timeout')), MAX_DURATION);
      });
      
      const results = await Promise.race([searchPromise, timeoutPromise]).catch(err => {
        console.warn('Semantic search interrupted:', err.message);
        return [];
      });
      
      if (!Array.isArray(results)) {
        return {
          content: [{
            type: 'text',
            text: 'Semantic search failed: Invalid results'
          }]
        };
      }
      
      const formatted = results.slice(0, 20).map(r => 
        `${r.path} - Score: ${r.score.toFixed(3)}`
      ).join('\n');
      
      return {
        content: [{
          type: 'text',
          text: results.length > 0 
            ? `Semantic search results for "${query}":\n${formatted}` 
            : 'No semantic matches found'
        }]
      };
    } catch (error) {
      console.error('Semantic search error:', error);
      return {
        content: [{
          type: 'text',
          text: 'Semantic search failed: ' + (error instanceof Error ? error.message : 'Unknown error')
        }]
      };
    }
  }

  // 9. 리팩토링 제안
  async suggestRefactoring(filePath: string): Promise<{ content: [{ type: string; text: string }] }> {
    const suggestions = await this.refactoringManager.suggestRefactoring(filePath);
    
    const formatted = suggestions.map(s => 
      `[${s.severity.toUpperCase()}] ${s.type}: ${s.message}\nLine ${s.line}, Column ${s.column}${s.fix ? `\nFix: ${s.fix.action}` : ''}`
    ).join('\n\n');
    
    return {
      content: [{
        type: 'text',
        text: suggestions.length > 0 ? `Refactoring suggestions for ${filePath}:\n\n${formatted}` : 'No refactoring suggestions found.'
      }]
    };
  }

  // 10. 프로젝트 자동 포맷팅
  async autoFormatProject(directory: string): Promise<{ content: [{ type: string; text: string }] }> {
    const result = await this.refactoringManager.autoFormatProject(directory);
    
    return {
      content: [{
        type: 'text',
        text: `Formatting complete:\nFormatted ${result.formattedFiles.length} files\nErrors: ${result.errors.length}\n\nFormatted files:\n${result.formattedFiles.join('\n')}`
      }]
    };
  }

  // 11. 배치 작업
  async batchOperations(operations: any[]): Promise<{ content: [{ type: string; text: string }] }> {
    const batchOps = operations.map(op => 
      this.batchManager.createBatchOperation(op.op, op.files, op.options)
    );
    
    const result = await this.batchManager.executeBatch(batchOps);
    
    return {
      content: [{
        type: 'text',
        text: `Batch operations complete:\nProcessed: ${result.processed}\nFailed: ${result.failed}\nSkipped: ${result.skipped}\nDuration: ${result.duration}ms`
      }]
    };
  }

  // 12. 파일 암호화
  async encryptFile(filePath: string, password: string): Promise<{ content: [{ type: string; text: string }] }> {
    const result = await this.securityManager.encryptFile(filePath, { password });
    
    return {
      content: [{
        type: 'text',
        text: `File encrypted successfully:\nEncrypted file: ${result.encryptedPath}\nSalt: ${result.salt}\nIV: ${result.iv}`
      }]
    };
  }

  // 13. 파일 복호화
  async decryptFile(encryptedPath: string, password: string): Promise<{ content: [{ type: string; text: string }] }> {
    const result = await this.securityManager.decryptFile(encryptedPath, password);
    
    return {
      content: [{
        type: 'text',
        text: `File decrypted successfully:\nDecrypted file: ${result.decryptedPath}`
      }]
    };
  }

  // 14. 민감 정보 스캔
  async scanSecrets(directory: string): Promise<{ content: [{ type: string; text: string }] }> {
    const result = await this.securityManager.scanSecrets(directory);
    
    const formatted = `
Secret Scan Results:
Total secrets found: ${result.summary.total}

By Severity:
${Object.entries(result.summary.bySeverity).map(([sev, count]) => `- ${sev}: ${count}`).join('\n')}

By Type:
${Object.entries(result.summary.byType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

Top 10 Issues:
${result.results.slice(0, 10).map(r => 
  `[${r.severity.toUpperCase()}] ${r.type} in ${r.file}:${r.line}`
).join('\n')}
`;
    
    return {
      content: [{
        type: 'text',
        text: formatted
      }]
    };
  }

  // 15. 시스템 상태 모니터링
  async getFileSystemStats(): Promise<{ content: [{ type: string; text: string }] }> {
    const cacheStats = this.cacheManager.getStats();
    const systemStats = await this.monitoringManager.getSystemStats();
    const dashboard = this.monitoringManager.getDashboardSummary();
    
    const formatted = `
File System Statistics:

Cache Performance:
- Size: ${cacheStats.size} bytes
- Items: ${cacheStats.itemCount}
- Hit Rate: ${(cacheStats.hitRate * 100).toFixed(2)}%
- Watched Files: ${cacheStats.watchedFiles}

System Stats:
${systemStats ? `- Disk Usage: ${systemStats.diskUsage.percentage}% (${systemStats.diskUsage.used}/${systemStats.diskUsage.total} bytes)
- Read Operations: ${systemStats.ioStats.readOps}
- Write Operations: ${systemStats.ioStats.writeOps}` : 'System stats not available'}

Operation Summary:
- Total Operations: ${dashboard.totalOperations}
- Success Rate: ${(dashboard.successRate * 100).toFixed(2)}%
- Errors: ${dashboard.errors.totalErrors}
`;
    
    return {
      content: [{
        type: 'text',
        text: formatted
      }]
    };
  }

  // 16. 클라우드 동기화
  async syncWithCloud(localPath: string, remotePath: string, cloudType: 's3' | 'gcs' = 's3'): Promise<{ content: [{ type: string; text: string }] }> {
    const result = await this.integrationManager.syncWithCloud(localPath, remotePath, {
      type: cloudType
    });
    
    return {
      content: [{
        type: 'text',
        text: `Cloud sync complete:\nUploaded: ${result.uploaded} files\nDownloaded: ${result.downloaded} files\nErrors: ${result.errors.length}`
      }]
    };
  }

  // 17. 보안 감사
  async securityAudit(directory: string): Promise<{ content: [{ type: string; text: string }] }> {
    const audit = await this.securityManager.generateSecurityAudit(directory);
    
    return {
      content: [{
        type: 'text',
        text: audit.report
      }]
    };
  }

  // 18. 코드 품질 분석
  async analyzeCodeQuality(filePath: string): Promise<{ content: [{ type: string; text: string }] }> {
    const report = await this.refactoringManager.analyzeCodeQuality(filePath);
    
    const formatted = `
Code Quality Report for ${filePath}:
Score: ${report.score}/100

Metrics:
- Cyclomatic Complexity: ${report.metrics.complexity}
- Maintainability Index: ${report.metrics.maintainability}
- Duplicate Code: ${report.metrics.duplicateCode}%

Issues Found: ${report.issues.length}
${report.issues.slice(0, 5).map(i => `- [${i.severity}] ${i.message}`).join('\n')}
`;
    
    return {
      content: [{
        type: 'text',
        text: formatted
      }]
    };
  }

  // 클린업
  async cleanup(): Promise<void> {
    this.cacheManager.destroy();
    this.monitoringManager.destroy();
    await this.watcher.close();
  }
}