import { EventEmitter } from 'events';
import * as crypto from 'crypto';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  size: number;
  accessCount: number;
  lastAccessed: Date;
  created: Date;
  expires?: Date;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface CacheOptions {
  maxSize?: number;          // 최대 메모리 크기 (bytes)
  maxEntries?: number;       // 최대 엔트리 수
  defaultTTL?: number;       // 기본 TTL (milliseconds)
  cleanupInterval?: number;  // 정리 주기 (milliseconds)
  enableMetrics?: boolean;   // 메트릭 활성화
  persistToDisk?: boolean;   // 디스크 영속화
  compressionThreshold?: number; // 압축 임계값 (bytes)
}

export interface CacheMetrics {
  totalEntries: number;
  totalSize: number;
  memoryUsage: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  compressionRatio: number;
  averageAccessTime: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  compressions: number;
  totalRequests: number;
  totalAccessTime: number;
}

class LRUNode<T> {
  key: string;
  entry: CacheEntry<T>;
  prev: LRUNode<T> | null = null;
  next: LRUNode<T> | null = null;

  constructor(key: string, entry: CacheEntry<T>) {
    this.key = key;
    this.entry = entry;
  }
}

export class EnhancedCacheManager<T = any> extends EventEmitter {
  private cache: Map<string, LRUNode<T>> = new Map();
  private lruHead: LRUNode<T> | null = null;
  private lruTail: LRUNode<T> | null = null;
  private totalSize: number = 0;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    compressions: 0,
    totalRequests: 0,
    totalAccessTime: 0
  };
  private cleanupTimer: NodeJS.Timeout | null = null;
  private options: Required<CacheOptions>;
  private tagIndex: Map<string, Set<string>> = new Map(); // tag -> keys

  constructor(options: CacheOptions = {}) {
    super();
    
    this.options = {
      maxSize: options.maxSize || 100 * 1024 * 1024, // 100MB
      maxEntries: options.maxEntries || 10000,
      defaultTTL: options.defaultTTL || 60 * 60 * 1000, // 1 hour
      cleanupInterval: options.cleanupInterval || 5 * 60 * 1000, // 5 minutes
      enableMetrics: options.enableMetrics ?? true,
      persistToDisk: options.persistToDisk ?? false,
      compressionThreshold: options.compressionThreshold || 1024 // 1KB
    };

    if (this.options.cleanupInterval > 0) {
      this.startCleanupTimer();
    }
  }

  // 값 설정 (향상된 버전)
  async set(
    key: string, 
    value: T, 
    ttl?: number,
    tags?: string[],
    metadata?: Record<string, any>
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      // 기존 엔트리 제거
      if (this.cache.has(key)) {
        await this.remove(key);
      }

      // 값 압축 (필요한 경우)
      let finalValue = value;
      let compressed = false;
      const serializedValue = JSON.stringify(value);
      const size = Buffer.byteLength(serializedValue);

      if (size >= this.options.compressionThreshold) {
        finalValue = await this.compressValue(value);
        compressed = true;
        this.stats.compressions++;
      }

      // 엔트리 생성
      const entry: CacheEntry<T> = {
        key,
        value: finalValue,
        size,
        accessCount: 0,
        lastAccessed: new Date(),
        created: new Date(),
        expires: ttl ? new Date(Date.now() + ttl) : undefined,
        tags: tags || [],
        metadata: {
          ...metadata,
          compressed,
          originalSize: size
        }
      };

      // LRU 노드 생성 및 추가
      const node = new LRUNode(key, entry);
      this.cache.set(key, node);
      this.addToHead(node);
      this.totalSize += size;

      // 태그 인덱스 업데이트
      if (tags) {
        for (const tag of tags) {
          if (!this.tagIndex.has(tag)) {
            this.tagIndex.set(tag, new Set());
          }
          this.tagIndex.get(tag)!.add(key);
        }
      }

      // 용량 초과 시 제거
      await this.ensureCapacity();

      // 이벤트 발생
      this.emit('set', { key, size, compressed });

    } finally {
      this.stats.totalAccessTime += Date.now() - startTime;
    }
  }

  // 값 조회 (향상된 버전)
  async get(key: string): Promise<T | null> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const node = this.cache.get(key);
      
      if (!node) {
        this.stats.misses++;
        this.emit('miss', { key });
        return null;
      }

      // TTL 확인
      if (node.entry.expires && node.entry.expires < new Date()) {
        await this.remove(key);
        this.stats.misses++;
        this.emit('expired', { key });
        return null;
      }

      // 접근 정보 업데이트
      node.entry.accessCount++;
      node.entry.lastAccessed = new Date();

      // LRU 순서 업데이트
      this.moveToHead(node);

      this.stats.hits++;
      this.emit('hit', { key, accessCount: node.entry.accessCount });

      // 압축 해제 (필요한 경우)
      let value = node.entry.value;
      if (node.entry.metadata?.compressed) {
        value = await this.decompressValue(value);
      }

      return value;

    } finally {
      this.stats.totalAccessTime += Date.now() - startTime;
    }
  }

  // 다중 키 조회
  async getMultiple(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    
    await Promise.all(keys.map(async (key) => {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    }));

    return results;
  }

  // 조건부 설정
  async setIfNotExists(key: string, value: T, ttl?: number): Promise<boolean> {
    if (this.cache.has(key)) {
      return false;
    }
    await this.set(key, value, ttl);
    return true;
  }

  // TTL 업데이트
  async updateTTL(key: string, ttl: number): Promise<boolean> {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    node.entry.expires = new Date(Date.now() + ttl);
    this.emit('ttl_updated', { key, ttl });
    return true;
  }

  // 태그별 조회
  async getByTag(tag: string): Promise<Map<string, T>> {
    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return new Map();
    }

    return this.getMultiple(Array.from(keys));
  }

  // 태그별 삭제
  async removeByTag(tag: string): Promise<number> {
    const keys = this.tagIndex.get(tag);
    if (!keys) {
      return 0;
    }

    let removedCount = 0;
    for (const key of keys) {
      if (await this.remove(key)) {
        removedCount++;
      }
    }

    this.tagIndex.delete(tag);
    this.emit('tag_cleared', { tag, removedCount });
    return removedCount;
  }

  // 키 존재 확인
  has(key: string): boolean {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    // TTL 확인
    if (node.entry.expires && node.entry.expires < new Date()) {
      this.remove(key);
      return false;
    }

    return true;
  }

  // 키 제거
  async remove(key: string): Promise<boolean> {
    const node = this.cache.get(key);
    if (!node) {
      return false;
    }

    // 태그 인덱스 정리
    if (node.entry.tags) {
      for (const tag of node.entry.tags) {
        const tagKeys = this.tagIndex.get(tag);
        if (tagKeys) {
          tagKeys.delete(key);
          if (tagKeys.size === 0) {
            this.tagIndex.delete(tag);
          }
        }
      }
    }

    // LRU에서 제거
    this.removeFromLRU(node);
    this.cache.delete(key);
    this.totalSize -= node.entry.size;

    this.emit('removed', { key, size: node.entry.size });
    return true;
  }

  // 전체 클리어
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.tagIndex.clear();
    this.lruHead = null;
    this.lruTail = null;
    this.totalSize = 0;

    this.emit('cleared', { entriesRemoved: size });
  }

  // 만료된 엔트리 정리
  async cleanup(): Promise<number> {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, node] of this.cache) {
      if (node.entry.expires && node.entry.expires < now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      await this.remove(key);
    }

    this.emit('cleanup', { expiredCount: expiredKeys.length });
    return expiredKeys.length;
  }

  // 용량 보장
  private async ensureCapacity(): Promise<void> {
    while (
      (this.cache.size > this.options.maxEntries) ||
      (this.totalSize > this.options.maxSize)
    ) {
      await this.evictLRU();
    }
  }

  // LRU 제거
  private async evictLRU(): Promise<void> {
    if (!this.lruTail) {
      return;
    }

    const keyToEvict = this.lruTail.key;
    await this.remove(keyToEvict);
    this.stats.evictions++;
    this.emit('evicted', { key: keyToEvict, reason: 'lru' });
  }

  // LRU 연결 리스트 관리
  private addToHead(node: LRUNode<T>): void {
    node.prev = null;
    node.next = this.lruHead;

    if (this.lruHead) {
      this.lruHead.prev = node;
    }

    this.lruHead = node;

    if (!this.lruTail) {
      this.lruTail = node;
    }
  }

  private removeFromLRU(node: LRUNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.lruHead = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.lruTail = node.prev;
    }
  }

  private moveToHead(node: LRUNode<T>): void {
    this.removeFromLRU(node);
    this.addToHead(node);
  }

  // 압축/해제
  private async compressValue(value: T): Promise<T> {
    try {
      const zlib = require('zlib');
      const { promisify } = require('util');
      const gzip = promisify(zlib.gzip);
      
      const serialized = JSON.stringify(value);
      const compressed = await gzip(Buffer.from(serialized));
      return compressed as any;
    } catch (error) {
      return value; // 압축 실패 시 원본 반환
    }
  }

  private async decompressValue(value: T): Promise<T> {
    try {
      const zlib = require('zlib');
      const { promisify } = require('util');
      const gunzip = promisify(zlib.gunzip);
      
      const decompressed = await gunzip(value as any);
      return JSON.parse(decompressed.toString());
    } catch (error) {
      return value; // 해제 실패 시 원본 반환
    }
  }

  // 정리 타이머
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  // 메트릭 조회
  getMetrics(): CacheMetrics {
    const totalRequests = this.stats.hits + this.stats.misses;
    
    return {
      totalEntries: this.cache.size,
      totalSize: this.totalSize,
      memoryUsage: process.memoryUsage().heapUsed,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      evictionCount: this.stats.evictions,
      compressionRatio: this.stats.compressions > 0 ? this.stats.compressions / this.cache.size : 0,
      averageAccessTime: this.stats.totalRequests > 0 ? this.stats.totalAccessTime / this.stats.totalRequests : 0
    };
  }

  // 상세 통계
  getStats(): CacheStats {
    return { ...this.stats };
  }

  // 키 목록 조회
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // 태그 목록 조회
  getTags(): string[] {
    return Array.from(this.tagIndex.keys());
  }

  // 엔트리 정보 조회
  getEntryInfo(key: string): CacheEntry<T> | null {
    const node = this.cache.get(key);
    return node ? { ...node.entry } : null;
  }

  // 상위 액세스 키 조회
  getTopAccessedKeys(limit: number = 10): Array<{ key: string; accessCount: number }> {
    const entries = Array.from(this.cache.values())
      .map(node => ({
        key: node.key,
        accessCount: node.entry.accessCount
      }))
      .sort((a, b) => b.accessCount - a.accessCount)
      .slice(0, limit);

    return entries;
  }

  // 정리
  async dispose(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    await this.clear();
    this.removeAllListeners();
  }
}

export default EnhancedCacheManager;