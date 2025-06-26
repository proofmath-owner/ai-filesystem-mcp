import { LRUCache } from 'lru-cache';

export class CacheManager {
  private cache: LRUCache<string, any>;

  constructor(options?: { max?: number; ttl?: number }) {
    this.cache = new LRUCache({
      max: options?.max || 500,
      ttl: options?.ttl || 1000 * 60 * 60, // 1 hour default
      updateAgeOnGet: true,
      updateAgeOnHas: true,
    });
  }

  get(key: string): any {
    return this.cache.get(key);
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  destroy(): void {
    this.cache.clear();
  }
}
