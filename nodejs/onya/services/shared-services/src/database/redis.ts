import { createClient, RedisClientType } from 'redis';
import { logger } from '../shared/utils/logger';
import { config } from '../shared/utils/config';

class RedisService {
  private static instance: RedisService;
  private client: RedisClientType;
  private isConnected: boolean = false;

  private constructor() {
    this.client = createClient({
      url: config.REDIS_URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    // Redis event handlers
    this.client.on('connect', () => {
      logger.info('Redis client connecting...');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      logger.info('Redis client connected and ready');
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', { error: error.message });
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis client connection ended');
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  public async connect(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.client.connect();
        logger.info('Redis connected successfully');
      }
    } catch (error) {
      logger.error('Failed to connect to Redis', { error });
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.disconnect();
        logger.info('Redis disconnected');
      }
    } catch (error) {
      logger.error('Failed to disconnect from Redis', { error });
      throw error;
    }
  }

  public getClient(): RedisClientType {
    return this.client;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      logger.error('Redis health check failed', { error });
      return false;
    }
  }

  // Cache Operations
  public async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
      
      logger.debug('Redis SET operation', { key, ttl: ttlSeconds });
    } catch (error) {
      logger.error('Redis SET failed', { error, key });
      throw error;
    }
  }

  public async get(key: string): Promise<any | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;
      
      const parsed = JSON.parse(value);
      logger.debug('Redis GET operation', { key, found: true });
      return parsed;
    } catch (error) {
      logger.error('Redis GET failed', { error, key });
      throw error;
    }
  }

  public async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
      logger.debug('Redis DEL operation', { key });
    } catch (error) {
      logger.error('Redis DEL failed', { error, key });
      throw error;
    }
  }

  public async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS failed', { error, key });
      throw error;
    }
  }

  public async expire(key: string, ttlSeconds: number): Promise<void> {
    try {
      await this.client.expire(key, ttlSeconds);
      logger.debug('Redis EXPIRE operation', { key, ttl: ttlSeconds });
    } catch (error) {
      logger.error('Redis EXPIRE failed', { error, key });
      throw error;
    }
  }

  // Session Management
  public async setSession(sessionId: string, sessionData: any, ttlSeconds: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    await this.set(key, sessionData, ttlSeconds);
  }

  public async getSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    return await this.get(key);
  }

  public async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.del(key);
  }

  public async extendSession(sessionId: string, ttlSeconds: number = 3600): Promise<void> {
    const key = `session:${sessionId}`;
    await this.expire(key, ttlSeconds);
  }

  // Rate Limiting
  public async checkRateLimit(
    identifier: string,
    windowSeconds: number,
    maxRequests: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);

    try {
      // Remove expired entries
      await this.client.zRemRangeByScore(key, 0, windowStart);
      
      // Count current requests in window
      const currentRequests = await this.client.zCard(key);
      
      if (currentRequests >= maxRequests) {
        // Get the oldest entry to determine reset time
        const oldestEntries = await this.client.zRange(key, 0, 0);
        const resetTime = oldestEntries.length > 0 
          ? parseInt(oldestEntries[0]) + (windowSeconds * 1000)
          : now + (windowSeconds * 1000);

        return {
          allowed: false,
          remaining: 0,
          resetTime,
        };
      }

      // Add current request
      await this.client.zAdd(key, { score: now, value: `${now}-${Math.random()}` });
      await this.client.expire(key, windowSeconds);

      return {
        allowed: true,
        remaining: maxRequests - currentRequests - 1,
        resetTime: now + (windowSeconds * 1000),
      };
    } catch (error) {
      logger.error('Rate limit check failed', { error, identifier });
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + (windowSeconds * 1000),
      };
    }
  }

  // Caching with automatic JSON serialization
  public async cacheGet<T>(key: string): Promise<T | null> {
    return await this.get(key) as T | null;
  }

  public async cacheSet<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, value, ttlSeconds);
  }

  // List operations for real-time features
  public async pushToList(key: string, value: any): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.client.lPush(key, serializedValue);
      logger.debug('Redis LPUSH operation', { key });
    } catch (error) {
      logger.error('Redis LPUSH failed', { error, key });
      throw error;
    }
  }

  public async popFromList(key: string): Promise<any | null> {
    try {
      const value = await this.client.rPop(key);
      if (!value) return null;
      return JSON.parse(value);
    } catch (error) {
      logger.error('Redis RPOP failed', { error, key });
      throw error;
    }
  }

  // Pub/Sub for real-time messaging
  public async publish(channel: string, message: any): Promise<void> {
    try {
      const serializedMessage = JSON.stringify(message);
      await this.client.publish(channel, serializedMessage);
      logger.debug('Redis PUBLISH operation', { channel });
    } catch (error) {
      logger.error('Redis PUBLISH failed', { error, channel });
      throw error;
    }
  }

  public async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    try {
      const subscriber = this.client.duplicate();
      await subscriber.connect();
      
      await subscriber.subscribe(channel, (message) => {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch (error) {
          logger.error('Failed to parse Redis message', { error, channel, message });
        }
      });

      logger.info('Subscribed to Redis channel', { channel });
    } catch (error) {
      logger.error('Redis SUBSCRIBE failed', { error, channel });
      throw error;
    }
  }

  // Pattern-based operations
  public async getKeys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error('Redis KEYS failed', { error, pattern });
      throw error;
    }
  }

  public async flushPattern(pattern: string): Promise<void> {
    try {
      const keys = await this.getKeys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        logger.info('Flushed Redis keys', { pattern, count: keys.length });
      }
    } catch (error) {
      logger.error('Redis pattern flush failed', { error, pattern });
      throw error;
    }
  }

  // Statistics and monitoring
  public async getStats(): Promise<{
    connected: boolean;
    memoryUsage: string;
    keyCount: number;
    clients: number;
  }> {
    try {
      const info = await this.client.info('memory');
      const keyCount = await this.client.dbSize();
      
      const memoryMatch = info.match(/used_memory_human:(.+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1].trim() : 'unknown';
      
      const clientsInfo = await this.client.info('clients');
      const clientsMatch = clientsInfo.match(/connected_clients:(\d+)/);
      const clients = clientsMatch ? parseInt(clientsMatch[1]) : 0;

      return {
        connected: this.isConnected,
        memoryUsage,
        keyCount,
        clients,
      };
    } catch (error) {
      logger.error('Failed to get Redis stats', { error });
      return {
        connected: this.isConnected,
        memoryUsage: 'unknown',
        keyCount: 0,
        clients: 0,
      };
    }
  }
}

// Export singleton instance
export const redis = RedisService.getInstance();
export default redis;