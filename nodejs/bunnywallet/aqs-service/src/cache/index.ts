import Redis from 'ioredis';
import { AccountSummary, AccountType, CacheConfig } from '../types';
import { logger } from '../telemetry/logger';
import { recordCacheHit, recordCacheMiss, recordCacheStale, recordRedisConnection } from '../telemetry/metrics';

const CACHE_KEY_PREFIX = 'aqs:account:';

interface CachedAccountData {
  data: AccountSummary;
  cachedAt: number;
}

// TTL by account type (in seconds)
const DEFAULT_TTL_CONFIG: Record<AccountType, CacheConfig> = {
  bank: { ttlSeconds: 30, staleWindowSeconds: 300 },
  creditcard: { ttlSeconds: 60, staleWindowSeconds: 300 },
  loan: { ttlSeconds: 120, staleWindowSeconds: 600 },
  investment: { ttlSeconds: 120, staleWindowSeconds: 600 },
  legacy: { ttlSeconds: 60, staleWindowSeconds: 300 },
  crypto: { ttlSeconds: 30, staleWindowSeconds: 180 },
};

export class AccountCache {
  private redis: Redis;
  private ttlConfig: Record<AccountType, CacheConfig>;

  constructor(redisUrl?: string, ttlConfig?: Partial<Record<AccountType, CacheConfig>>) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
    this.ttlConfig = { ...DEFAULT_TTL_CONFIG, ...ttlConfig };

    this.redis.on('error', (err) => {
      logger.error('Redis connection error', { error: err.message });
      recordRedisConnection(false);
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected');
      recordRedisConnection(true);
    });

    this.redis.on('close', () => {
      logger.warn('Redis connection closed');
      recordRedisConnection(false);
    });

    this.redis.on('ready', () => {
      logger.info('Redis ready');
      recordRedisConnection(true);
    });
  }

  private getCacheKey(accountId: string): string {
    return `${CACHE_KEY_PREFIX}${accountId}`;
  }

  private getTTL(accountType: AccountType): number {
    return this.ttlConfig[accountType]?.ttlSeconds || 60;
  }

  private getStaleWindow(accountType: AccountType): number {
    return this.ttlConfig[accountType]?.staleWindowSeconds || 300;
  }

  async get(accountId: string): Promise<AccountSummary | null> {
    try {
      const key = this.getCacheKey(accountId);
      const value = await this.redis.get(key);

      if (!value) {
        // Record cache miss (we don't know account type yet, so use 'unknown')
        recordCacheMiss('unknown');
        return null;
      }

      const cached: CachedAccountData = JSON.parse(value);
      const now = Date.now();
      const age = now - cached.cachedAt;
      const ttl = this.getTTL(cached.data.accountType) * 1000;
      const staleWindow = this.getStaleWindow(cached.data.accountType) * 1000;

      // Check if data is stale (beyond TTL but within stale window)
      if (age > ttl && age < ttl + staleWindow) {
        cached.data.stale = true;
        recordCacheStale(cached.data.accountType);
      } else if (age >= ttl + staleWindow) {
        // Beyond stale window, treat as expired
        recordCacheMiss(cached.data.accountType);
        return null;
      } else {
        // Fresh cache hit
        recordCacheHit(cached.data.accountType);
      }

      cached.data.lastUpdated = new Date(cached.cachedAt).toISOString();
      return cached.data;
    } catch (error: any) {
      logger.error('Cache get error', { accountId, error: error.message });
      recordCacheMiss('unknown');
      return null;
    }
  }

  async set(accountId: string, data: AccountSummary): Promise<void> {
    try {
      const key = this.getCacheKey(accountId);
      const ttl = this.getTTL(data.accountType);
      const staleWindow = this.getStaleWindow(data.accountType);

      const cached: CachedAccountData = {
        data,
        cachedAt: Date.now(),
      };

      // Set TTL to include stale window
      await this.redis.setex(key, ttl + staleWindow, JSON.stringify(cached));
    } catch (error: any) {
      logger.error('Cache set error', { accountId, error: error.message });
    }
  }

  async invalidate(accountId: string): Promise<void> {
    try {
      const key = this.getCacheKey(accountId);
      await this.redis.del(key);
      logger.info('Cache invalidated', { accountId });
    } catch (error: any) {
      logger.error('Cache invalidate error', { accountId, error: error.message });
    }
  }

  async invalidateAll(): Promise<void> {
    try {
      const pattern = `${CACHE_KEY_PREFIX}*`;
      const stream = this.redis.scanStream({ match: pattern, count: 100 });

      stream.on('data', async (keys: string[]) => {
        if (keys.length) {
          const pipeline = this.redis.pipeline();
          keys.forEach((key) => pipeline.del(key));
          await pipeline.exec();
        }
      });

      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      logger.info('All cache invalidated');
    } catch (error: any) {
      logger.error('Cache invalidate all error', { error: error.message });
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }
}

// Singleton instance
let cacheInstance: AccountCache | null = null;

export function getCache(): AccountCache {
  if (!cacheInstance) {
    cacheInstance = new AccountCache();
  }
  return cacheInstance;
}
