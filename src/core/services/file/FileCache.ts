import { CacheManager } from '../../managers/CacheManager.js';

export class FileCache {
  private prefix = 'file:';

  constructor(private cacheManager: CacheManager) {}

  get(path: string): string | undefined {
    return this.cacheManager.get(this.prefix + path);
  }

  set(path: string, content: string): void {
    this.cacheManager.set(this.prefix + path, content);
  }

  has(path: string): boolean {
    return this.cacheManager.has(this.prefix + path);
  }

  delete(path: string): void {
    this.cacheManager.delete(this.prefix + path);
  }

  clear(): void {
    // Would need to iterate through all keys with prefix
    // For now, just clear all
    this.cacheManager.clear();
  }
}
