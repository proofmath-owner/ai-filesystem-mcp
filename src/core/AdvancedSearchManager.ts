import { promises as fs } from 'fs';
import * as path from 'path';
import { glob } from 'glob';
import { minimatch } from 'minimatch';
import natural from 'natural';
import { parse } from '@babel/parser';
import * as traverse from '@babel/traverse';
import * as t from '@babel/types';

const TfIdf = natural.TfIdf;
const tokenizer = new natural.WordTokenizer();

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  regex?: boolean;
  fuzzy?: boolean;
  fuzzyThreshold?: number; // 0-1, 낮을수록 더 유사해야 함
}

export interface DateSearchOptions {
  after?: Date;
  before?: Date;
  modifiedOnly?: boolean; // true면 수정일, false면 생성일
}

export interface SizeSearchOptions {
  min?: number;
  max?: number;
}

export interface SearchResult {
  path: string;
  score: number;
  matches?: Array<{
    line: number;
    column: number;
    text: string;
    context: string;
  }>;
  metadata?: {
    size: number;
    modified: Date;
    created: Date;
  };
}

export class AdvancedSearchManager {
  private tfidf: any;
  private documentIndex = new Map<string, string>();

  constructor() {
    this.tfidf = new TfIdf();
  }

  // 날짜 기반 검색
  async searchByDate(directory: string, options: DateSearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const files = await glob('**/*', {
      cwd: path.resolve(directory),
      ignore: ['**/node_modules/**', '**/.git/**'],
      absolute: true
    });

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        if (!stats.isFile()) continue;

        const dateToCheck = options.modifiedOnly ? stats.mtime : stats.birthtime || stats.ctime;
        
        let matchesDate = true;
        if (options.after && dateToCheck < options.after) matchesDate = false;
        if (options.before && dateToCheck > options.before) matchesDate = false;

        if (matchesDate) {
          results.push({
            path: file,
            score: 1,
            metadata: {
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime || stats.ctime
            }
          });
        }
      } catch (error) {
        // 파일 접근 불가시 스킵
      }
    }

    // 날짜순 정렬 (최신순)
    results.sort((a, b) => {
      const dateA = options.modifiedOnly ? a.metadata!.modified : a.metadata!.created;
      const dateB = options.modifiedOnly ? b.metadata!.modified : b.metadata!.created;
      return dateB.getTime() - dateA.getTime();
    });

    return results;
  }

  // 크기 기반 검색
  async searchBySize(directory: string, options: SizeSearchOptions): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const files = await glob('**/*', {
      cwd: path.resolve(directory),
      ignore: ['**/node_modules/**', '**/.git/**'],
      absolute: true
    });

    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        if (!stats.isFile()) continue;

        let matchesSize = true;
        if (options.min !== undefined && stats.size < options.min) matchesSize = false;
        if (options.max !== undefined && stats.size > options.max) matchesSize = false;

        if (matchesSize) {
          results.push({
            path: file,
            score: 1,
            metadata: {
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime || stats.ctime
            }
          });
        }
      } catch (error) {
        // 파일 접근 불가시 스킵
      }
    }

    // 크기순 정렬 (큰 것부터)
    results.sort((a, b) => b.metadata!.size - a.metadata!.size);

    return results;
  }

  // 퍼지 검색 (유사 파일명)
  async fuzzySearch(pattern: string, directory: string, threshold: number = 0.3): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const startTime = Date.now();
    const MAX_DURATION = 5000; // 5초 제한
    
    const files = await glob('**/*', {
      cwd: path.resolve(directory),
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
      absolute: true,
      nodir: true,  // 디렉토리 제외
      maxDepth: 5   // 최대 깊이 제한
    });

    // 파일 수 제한
    const limitedFiles = files.slice(0, 1000);

    for (const file of limitedFiles) {
      // 시간 제한 체크
      if (Date.now() - startTime > MAX_DURATION) {
        console.warn('Fuzzy search timeout - returning partial results');
        break;
      }
      try {
        const fileName = path.basename(file);
        const similarity = this.calculateSimilarity(pattern.toLowerCase(), fileName.toLowerCase());
        
        if (similarity >= threshold) {
          const stats = await fs.stat(file);
          if (stats.isFile()) {
            results.push({
              path: file,
              score: similarity,
              metadata: {
                size: stats.size,
                modified: stats.mtime,
                created: stats.birthtime || stats.ctime
              }
            });
          }
        }
      } catch (error) {
        // Skip files that can't be accessed
        continue;
      }
    }

    // 유사도순 정렬 후 상위 50개만 반환
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, 50);
  }

  // 의미론적 검색
  async semanticSearch(query: string, directory: string): Promise<SearchResult[]> {
    const startTime = Date.now();
    const MAX_DURATION = 10000; // 10초 제한
    
    try {
      // 쿼리 분석
      const intent = this.analyzeSearchIntent(query);
      
      // 인덱싱 (타임아웃 포함)
      const indexPromise = this.indexDirectory(directory);
      const indexTimeout = new Promise<void>((_, reject) => {
        setTimeout(() => reject(new Error('Indexing timeout')), 5000);
      });
      
      await Promise.race([indexPromise, indexTimeout]).catch(err => {
        console.warn('Directory indexing interrupted:', err.message);
      });
      
      // 시간 체크
      if (Date.now() - startTime > MAX_DURATION || this.documentIndex.size === 0) {
        console.warn('Semantic search timeout or no files indexed');
        return [];
      }
    
    // TF-IDF 기반 검색
    this.tfidf.addDocument(query);
    const results: SearchResult[] = [];
    
    for (const [filePath, content] of this.documentIndex) {
      // 시간 제한 체크
      if (Date.now() - startTime > MAX_DURATION) {
        console.warn('Semantic search timeout - returning partial results');
        break;
      }
      try {
        const scores = this.tfidf.tfidf(query, this.documentIndex.size);
        const score = scores[Array.from(this.documentIndex.keys()).indexOf(filePath)];
        
        if (score > 0) {
          const stats = await fs.stat(filePath);
          results.push({
            path: filePath,
            score,
            metadata: {
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime || stats.ctime
            }
          });
        }
      } catch (error) {
        // TF-IDF 계산 중 오류 발생 시 스킵
        continue;
      }
    }
    
    // 추가 필터 적용
    if (intent.fileTypes.length > 0) {
      return results.filter(r => {
        const ext = path.extname(r.path).toLowerCase();
        return intent.fileTypes.includes(ext);
      });
    }
    
    // 점수순 정렬
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, 50); // 상위 50개만
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  // 검색 의도 분석
  private analyzeSearchIntent(query: string): {
    keywords: string[];
    fileTypes: string[];
    dateHints: { after?: Date; before?: Date };
    sizeHints: { min?: number; max?: number };
  } {
    const keywords: string[] = [];
    const fileTypes: string[] = [];
    const dateHints: { after?: Date; before?: Date } = {};
    const sizeHints: { min?: number; max?: number } = {};
    
    // 파일 타입 추출
    const typePatterns = {
      'config files': ['.json', '.yaml', '.yml', '.ini', '.conf', '.config'],
      'configuration': ['.json', '.yaml', '.yml', '.ini', '.conf', '.config'],
      'code files': ['.js', '.ts', '.py', '.java', '.go', '.rs'],
      'source code': ['.js', '.ts', '.py', '.java', '.go', '.rs'],
      'documentation': ['.md', '.rst', '.txt', '.doc', '.docx'],
      'database': ['.sql', '.db', '.sqlite'],
      'images': ['.jpg', '.jpeg', '.png', '.gif', '.svg'],
      'styles': ['.css', '.scss', '.sass', '.less']
    };
    
    for (const [pattern, extensions] of Object.entries(typePatterns)) {
      if (query.toLowerCase().includes(pattern)) {
        fileTypes.push(...extensions);
      }
    }
    
    // 날짜 힌트 추출
    const recentPattern = /recent|latest|newest|today|yesterday/i;
    const oldPattern = /old|oldest|ancient|archive/i;
    
    if (recentPattern.test(query)) {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      dateHints.after = weekAgo;
    }
    
    if (oldPattern.test(query)) {
      const yearAgo = new Date();
      yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      dateHints.before = yearAgo;
    }
    
    // 크기 힌트 추출
    const largePattern = /large|big|huge/i;
    const smallPattern = /small|tiny|mini/i;
    
    if (largePattern.test(query)) {
      sizeHints.min = 1024 * 1024; // 1MB 이상
    }
    
    if (smallPattern.test(query)) {
      sizeHints.max = 1024 * 100; // 100KB 이하
    }
    
    // 키워드 추출 (불용어 제거)
    const tokens = tokenizer.tokenize(query);
    const stopWords = ['find', 'search', 'look', 'for', 'all', 'the', 'a', 'an', 'in', 'on', 'at'];
    keywords.push(...tokens!.filter(t => !stopWords.includes(t.toLowerCase())));
    
    return { keywords, fileTypes, dateHints, sizeHints };
  }

  // 디렉토리 인덱싱
  private async indexDirectory(directory: string): Promise<void> {
    const startTime = Date.now();
    const MAX_INDEX_DURATION = 5000; // 5초 제한
    
    const files = await glob('**/*', {
      cwd: path.resolve(directory),
      ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/build/**'],
      absolute: true,
      nodir: true,  // 디렉토리 제외
      maxDepth: 3   // 최대 깊이 제한
    });
    
    this.documentIndex.clear();
    this.tfidf = new TfIdf();
    
    // 파일 수 제한 (성능상 이유)
    const limitedFiles = files.slice(0, 200);
    
    for (const file of limitedFiles) {
      // 시간 제한 체크
      if (Date.now() - startTime > MAX_INDEX_DURATION) {
        console.warn('Directory indexing timeout - processed', this.documentIndex.size, 'files');
        break;
      }
      try {
        const stats = await fs.stat(file);
        if (!stats.isFile() || stats.size > 512 * 1024) continue; // 512KB 이상 스킵 (더 작게)
        
        const ext = path.extname(file).toLowerCase();
        if (['.txt', '.md', '.js', '.ts', '.py', '.java', '.go', '.json', '.yaml', '.xml'].includes(ext)) {
          const content = await fs.readFile(file, 'utf-8');
          const fileName = path.basename(file);
          
          // 파일명과 내용을 합쳐서 인덱싱 (내용 크기 제한)
          const truncatedContent = content.length > 10000 ? content.substring(0, 10000) : content;
          const combinedContent = `${fileName} ${truncatedContent}`;
          this.documentIndex.set(file, combinedContent);
          this.tfidf.addDocument(combinedContent);
        }
      } catch (error) {
        // 읽기 실패시 스킵
        continue;
      }
    }
  }

  // 문자열 유사도 계산 (Levenshtein Distance)
  private calculateSimilarity(s1: string, s2: string): number {
    const distance = natural.LevenshteinDistance(s1, s2);
    const maxLength = Math.max(s1.length, s2.length);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  // 고급 텍스트 검색
  async advancedTextSearch(
    pattern: string,
    directory: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const files = await glob('**/*', {
      cwd: path.resolve(directory),
      ignore: ['**/node_modules/**', '**/.git/**'],
      absolute: true
    });
    
    for (const file of files) {
      try {
        const stats = await fs.stat(file);
        if (!stats.isFile()) continue;
        
        const content = await fs.readFile(file, 'utf-8');
        const matches = this.findMatches(content, pattern, options);
        
        if (matches.length > 0) {
          results.push({
            path: file,
            score: matches.length,
            matches,
            metadata: {
              size: stats.size,
              modified: stats.mtime,
              created: stats.birthtime || stats.ctime
            }
          });
        }
      } catch (error) {
        // 읽기 실패시 스킵
      }
    }
    
    // 매치 수로 정렬
    results.sort((a, b) => b.score - a.score);
    
    return results;
  }

  // 텍스트에서 매치 찾기
  private findMatches(
    content: string,
    pattern: string,
    options: SearchOptions
  ): Array<{ line: number; column: number; text: string; context: string }> {
    const matches: Array<{ line: number; column: number; text: string; context: string }> = [];
    const lines = content.split('\n');
    
    let searchPattern: RegExp;
    
    if (options.regex) {
      searchPattern = new RegExp(pattern, options.caseSensitive ? 'g' : 'gi');
    } else if (options.wholeWord) {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchPattern = new RegExp(`\\b${escaped}\\b`, options.caseSensitive ? 'g' : 'gi');
    } else {
      const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      searchPattern = new RegExp(escaped, options.caseSensitive ? 'g' : 'gi');
    }
    
    lines.forEach((line, lineIndex) => {
      const lineMatches = [...line.matchAll(searchPattern)];
      
      lineMatches.forEach(match => {
        matches.push({
          line: lineIndex + 1,
          column: match.index! + 1,
          text: match[0],
          context: line.trim()
        });
      });
    });
    
    return matches;
  }
}