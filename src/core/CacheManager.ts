import { LRUCache } from 'lru-cache';
import { promises as fs } from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

interface CacheEntry {
  content: string;
  size: number;
  hash: string;
  timestamp: number;
}

export class CacheManager {
  private cache: LRUCache<string, CacheEntry>;
  private fileWatchMap = new Map<string, NodeJS.Timeout>();
  
  constructor() {
    // LRU 캐시 설정 - 최대 100MB, 항목당 최대 10MB
    this.cache = new LRUCache<string, CacheEntry>({
      maxSize: 100 * 1024 * 1024, // 100MB
      sizeCalculation: (value) => value.size,
      ttl: 1000 * 60 * 5, // 기본 5분
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
  }

  // 동적 TTL 계산 - 파일 크기에 따라 캐시 시간 조정
  private calculateTTL(size: number): number {
    if (size < 1024) return 1000 * 60 * 10; // 1KB 미만: 10분
    if (size < 1024 * 100) return 1000 * 60 * 5; // 100KB 미만: 5분
    if (size < 1024 * 1024) return 1000 * 60 * 2; // 1MB 미만: 2분
    return 1000 * 60; // 1MB 이상: 1분
  }

  // 파일 변경 감지 설정
  private watchFile(filePath: string): void {
    if (this.fileWatchMap.has(filePath)) return;
    
    const watcher = setInterval(async () => {
      try {
        const stats = await fs.stat(filePath);
        const cached = this.cache.get(filePath);
        
        if (cached && stats.mtimeMs > cached.timestamp) {
          this.invalidate(filePath);
        }
      } catch (error) {
        // 파일이 삭제된 경우
        this.invalidate(filePath);
        this.unwatchFile(filePath);
      }
    }, 1000); // 1초마다 체크
    
    this.fileWatchMap.set(filePath, watcher);
  }

  // 파일 감시 해제
  private unwatchFile(filePath: string): void {
    const watcher = this.fileWatchMap.get(filePath);
    if (watcher) {
      clearInterval(watcher);
      this.fileWatchMap.delete(filePath);
    }
  }

  // 캐시에서 파일 가져오기
  async get(filePath: string): Promise<string | null> {
    const absolutePath = path.resolve(filePath);
    const cached = this.cache.get(absolutePath);
    
    if (cached) {
      // 파일이 변경되었는지 확인
      try {
        const stats = await fs.stat(absolutePath);
        if (stats.mtimeMs > cached.timestamp) {
          this.invalidate(absolutePath);
          return null;
        }
        return cached.content;
      } catch {
        this.invalidate(absolutePath);
        return null;
      }
    }
    
    return null;
  }

  // 캐시에 파일 저장
  async set(filePath: string, content: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    const stats = await fs.stat(absolutePath);
    const hash = createHash('sha256').update(content).digest('hex');
    
    const entry: CacheEntry = {
      content,
      size: Buffer.byteLength(content),
      hash,
      timestamp: stats.mtimeMs
    };
    
    const ttl = this.calculateTTL(entry.size);
    this.cache.set(absolutePath, entry, { ttl });
    
    // 파일 변경 감지 시작
    this.watchFile(absolutePath);
  }

  // 캐시 무효화
  invalidate(filePath: string): void {
    const absolutePath = path.resolve(filePath);
    this.cache.delete(absolutePath);
    this.unwatchFile(absolutePath);
  }

  // 패턴에 맞는 모든 캐시 무효화
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.invalidate(key);
      }
    }
  }

  // 캐시 상태 정보
  getStats(): {
    size: number;
    itemCount: number;
    hitRate: number;
    watchedFiles: number;
  } {
    const calculatedSize = this.cache.calculatedSize || 0;
    const hits = (this.cache as any).hits || 0;
    const misses = (this.cache as any).misses || 0;
    const hitRate = hits + misses > 0 ? hits / (hits + misses) : 0;
    
    return {
      size: calculatedSize,
      itemCount: this.cache.size,
      hitRate,
      watchedFiles: this.fileWatchMap.size
    };
  }

  // 모든 캐시 클리어
  clear(): void {
    this.cache.clear();
    for (const [path, watcher] of this.fileWatchMap) {
      clearInterval(watcher);
    }
    this.fileWatchMap.clear();
  }

  // 클린업
  destroy(): void {
    this.clear();
  }
}