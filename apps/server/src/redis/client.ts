import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const redis = env.REDIS_URL
  ? new Redis(env.REDIS_URL, { lazyConnect: true })
  : new Redis({ lazyConnect: true });

redis.on('error', (err: any) => {
  // Gracefully log redis error without crashing
  console.warn('[Redis] Client notice:', err.message);
});
