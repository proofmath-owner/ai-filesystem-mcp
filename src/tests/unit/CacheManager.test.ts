import { CacheManager } from '../../core/CacheManager';

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    cacheManager = new CacheManager({
      maxSize: 100,
      ttl: 5000, // 5 seconds
      cleanupInterval: 1000 // 1 second
    });
  });

  afterEach(async () => {
    await cacheManager.dispose();
  });

  describe('Basic Cache Operations', () => {
    it('should set and get cache values', () => {
      const key = 'test-key';
      const value = { data: 'test data' };

      cacheManager.set(key, value);
      const retrieved = cacheManager.get(key);

      expect(retrieved).toEqual(value);
    });

    it('should return undefined for non-existent keys', () => {
      const result = cacheManager.get('non-existent-key');
      expect(result).toBeUndefined();
    });

    it('should check if key exists', () => {
      const key = 'test-key';
      const value = 'test value';

      expect(cacheManager.has(key)).toBe(false);
      
      cacheManager.set(key, value);
      expect(cacheManager.has(key)).toBe(true);
    });

    it('should delete cache entries', () => {
      const key = 'test-key';
      const value = 'test value';

      cacheManager.set(key, value);
      expect(cacheManager.has(key)).toBe(true);

      const deleted = cacheManager.delete(key);
      expect(deleted).toBe(true);
      expect(cacheManager.has(key)).toBe(false);
    });

    it('should return false when deleting non-existent keys', () => {
      const deleted = cacheManager.delete('non-existent-key');
      expect(deleted).toBe(false);
    });
  });

  describe('Cache Size Management', () => {
    it('should respect max size limit', () => {
      const smallCache = new CacheManager({ maxSize: 3 });

      // Add items up to max size
      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');

      expect(smallCache.size()).toBe(3);
      expect(smallCache.has('key1')).toBe(true);
      expect(smallCache.has('key2')).toBe(true);
      expect(smallCache.has('key3')).toBe(true);

      // Adding one more should evict the least recently used
      smallCache.set('key4', 'value4');

      expect(smallCache.size()).toBe(3);
      expect(smallCache.has('key1')).toBe(false); // Should be evicted
      expect(smallCache.has('key2')).toBe(true);
      expect(smallCache.has('key3')).toBe(true);
      expect(smallCache.has('key4')).toBe(true);

      smallCache.dispose();
    });

    it('should update LRU order on access', () => {
      const smallCache = new CacheManager({ maxSize: 3 });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');

      // Access key1 to move it to most recent
      smallCache.get('key1');

      // Add new item, key2 should be evicted (oldest unaccessed)
      smallCache.set('key4', 'value4');

      expect(smallCache.has('key1')).toBe(true); // Still exists due to recent access
      expect(smallCache.has('key2')).toBe(false); // Should be evicted
      expect(smallCache.has('key3')).toBe(true);
      expect(smallCache.has('key4')).toBe(true);

      smallCache.dispose();
    });

    it('should return current cache size', () => {
      expect(cacheManager.size()).toBe(0);

      cacheManager.set('key1', 'value1');
      expect(cacheManager.size()).toBe(1);

      cacheManager.set('key2', 'value2');
      expect(cacheManager.size()).toBe(2);

      cacheManager.delete('key1');
      expect(cacheManager.size()).toBe(1);
    });
  });

  describe('TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const shortTtlCache = new CacheManager({ ttl: 100 }); // 100ms TTL

      shortTtlCache.set('key1', 'value1');
      expect(shortTtlCache.has('key1')).toBe(true);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(shortTtlCache.has('key1')).toBe(false);
      expect(shortTtlCache.get('key1')).toBeUndefined();

      shortTtlCache.dispose();
    });

    it('should allow custom TTL per entry', async () => {
      cacheManager.set('short', 'value1', { ttl: 100 }); // 100ms
      cacheManager.set('long', 'value2', { ttl: 5000 }); // 5s

      expect(cacheManager.has('short')).toBe(true);
      expect(cacheManager.has('long')).toBe(true);

      // Wait for short TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(cacheManager.has('short')).toBe(false);
      expect(cacheManager.has('long')).toBe(true);
    });

    it('should refresh TTL on access if configured', () => {
      const refreshCache = new CacheManager({ 
        ttl: 200,
        refreshOnAccess: true 
      });

      refreshCache.set('key1', 'value1');
      
      // Access after half TTL
      setTimeout(() => {
        refreshCache.get('key1'); // Should refresh TTL
      }, 100);

      // Check after original TTL would have expired
      setTimeout(() => {
        expect(refreshCache.has('key1')).toBe(true);
      }, 250);

      refreshCache.dispose();
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache hit and miss statistics', () => {
      cacheManager.set('key1', 'value1');

      // Cache hit
      cacheManager.get('key1');
      cacheManager.get('key1');

      // Cache miss
      cacheManager.get('non-existent');
      cacheManager.get('another-miss');

      const stats = cacheManager.getStats();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.hitRate).toBe(0.5); // 2 hits out of 4 total accesses
    });

    it('should track eviction count', () => {
      const smallCache = new CacheManager({ maxSize: 2 });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3'); // Should evict key1

      const stats = smallCache.getStats();
      expect(stats.evictions).toBe(1);

      smallCache.dispose();
    });

    it('should reset statistics', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.get('key1');
      cacheManager.get('non-existent');

      let stats = cacheManager.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);

      cacheManager.resetStats();
      stats = cacheManager.getStats();
      
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.evictions).toBe(0);
    });
  });

  describe('Cache Cleanup', () => {
    it('should automatically clean up expired entries', async () => {
      const autoCleanupCache = new CacheManager({
        ttl: 100,
        cleanupInterval: 50
      });

      autoCleanupCache.set('key1', 'value1');
      autoCleanupCache.set('key2', 'value2');

      expect(autoCleanupCache.size()).toBe(2);

      // Wait for TTL expiration and cleanup
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(autoCleanupCache.size()).toBe(0);

      autoCleanupCache.dispose();
    });

    it('should manually clean expired entries', async () => {
      cacheManager.set('expired', 'value1', { ttl: 50 });
      cacheManager.set('valid', 'value2', { ttl: 5000 });

      // Wait for one entry to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(cacheManager.size()).toBe(2); // Still both in cache

      cacheManager.cleanup();

      expect(cacheManager.size()).toBe(1); // Expired entry removed
      expect(cacheManager.has('expired')).toBe(false);
      expect(cacheManager.has('valid')).toBe(true);
    });
  });

  describe('Cache Clear', () => {
    it('should clear all cache entries', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.set('key2', 'value2');
      cacheManager.set('key3', 'value3');

      expect(cacheManager.size()).toBe(3);

      cacheManager.clear();

      expect(cacheManager.size()).toBe(0);
      expect(cacheManager.has('key1')).toBe(false);
      expect(cacheManager.has('key2')).toBe(false);
      expect(cacheManager.has('key3')).toBe(false);
    });

    it('should reset statistics when clearing', () => {
      cacheManager.set('key1', 'value1');
      cacheManager.get('key1');
      cacheManager.get('non-existent');

      cacheManager.clear();

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Memory Usage', () => {
    it('should calculate approximate memory usage', () => {
      const initialMemory = cacheManager.getMemoryUsage();

      cacheManager.set('key1', 'small value');
      const smallMemory = cacheManager.getMemoryUsage();

      cacheManager.set('key2', 'a'.repeat(1000)); // Larger value
      const largeMemory = cacheManager.getMemoryUsage();

      expect(smallMemory).toBeGreaterThan(initialMemory);
      expect(largeMemory).toBeGreaterThan(smallMemory);
    });
  });

  describe('Error Handling', () => {
    it('should handle circular reference in cached objects', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;

      expect(() => {
        cacheManager.set('circular', circularObj);
      }).not.toThrow();

      const retrieved = cacheManager.get('circular');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('test');
    });

    it('should handle invalid TTL values', () => {
      expect(() => {
        cacheManager.set('key1', 'value1', { ttl: -100 });
      }).not.toThrow();

      expect(() => {
        cacheManager.set('key2', 'value2', { ttl: 0 });
      }).not.toThrow();
    });
  });

  describe('Configuration', () => {
    it('should use default configuration when not provided', () => {
      const defaultCache = new CacheManager();
      
      expect(defaultCache.getConfig().maxSize).toBeGreaterThan(0);
      expect(defaultCache.getConfig().ttl).toBeGreaterThan(0);

      defaultCache.dispose();
    });

    it('should allow runtime configuration updates', () => {
      const config = cacheManager.getConfig();
      expect(config.maxSize).toBe(100);

      cacheManager.updateConfig({ maxSize: 200 });

      const updatedConfig = cacheManager.getConfig();
      expect(updatedConfig.maxSize).toBe(200);
    });
  });
});