const { createClient } = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;
let redisReal = false;
let reconnectTimer = null;

const CONNECT_TIMEOUT_MS = 3000;
const RECONNECT_INTERVAL_MS = 30000;

function attachHandlers(client) {
  client.on('error', err => {
    logger.error('Redis Client Error', err.message);
  });
  client.on('connect', () => {
    logger.info('Redis connected');
  });
  client.on('end', () => {
    logger.warn('Redis connection ended');
  });
}

function tryConnectReal() {
  const candidate = createClient({
    url: config.redis.url,
    socket: {
      // Bounded backoff so a real client self-heals without hanging boot.
      reconnectStrategy: retries => Math.min(retries * 250, RECONNECT_INTERVAL_MS),
    },
  });

  let errorsLogged = 0;
  const quietError = err => {
    errorsLogged += 1;
    if (errorsLogged === 1) {
      logger.warn('Redis unreachable, retrying in background', err.message);
    }
  };
  candidate.on('error', quietError);

  return new Promise(resolve => {
    const timeout = setTimeout(() => {
      candidate.disconnect();
      resolve(null);
    }, CONNECT_TIMEOUT_MS);

    candidate
      .connect()
      .then(() => {
        clearTimeout(timeout);
        candidate.off('error', quietError);
        attachHandlers(candidate);
        resolve(candidate);
      })
      .catch(() => {
        clearTimeout(timeout);
        candidate.disconnect();
        resolve(null);
      });
  });
}

function swapInRealClient(candidate) {
  const previous = redisClient;
  redisClient = candidate;
  redisReal = true;
  if (previous && previous !== candidate && previous.quit) {
    previous.quit().catch(() => {});
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(async () => {
    if (redisReal) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
      return;
    }
    const candidate = await tryConnectReal();
    if (candidate) {
      swapInRealClient(candidate);
      logger.info('Redis reconnection established; mock client swapped for real Redis');
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  }, RECONNECT_INTERVAL_MS);
  reconnectTimer.unref();
}

async function initRedis() {
  if (redisClient && redisReal) return redisClient;

  const candidate = await tryConnectReal();
  if (candidate) {
    swapInRealClient(candidate);
    logger.info('Redis initialized successfully');
    return redisClient;
  }

  logger.error('Redis initialization failed, using in-memory fallback', {
    message: config.redis.url,
  });
  redisClient = createMockRedisClient();
  redisReal = false;
  scheduleReconnect();
  return redisClient;
}

function isRedisAvailable() {
  return redisReal;
}

function isMockClient() {
  return redisClient ? !redisReal : true;
}

function createMockRedisClient() {
  const store = new Map();
  const timeouts = new Map();

  return {
    async incr(key) {
      const current = store.get(key) || 0;
      const next = current + 1;
      store.set(key, next);
      return next;
    },
    async expire(key, seconds) {
      if (timeouts.has(key)) {
        clearTimeout(timeouts.get(key));
      }
      const timeout = setTimeout(() => {
        store.delete(key);
        timeouts.delete(key);
      }, seconds * 1000);
      timeouts.set(key, timeout);
    },
    async get(key) {
      return store.get(key) || null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async setex(key, seconds, value) {
      await this.set(key, value);
      if (timeouts.has(key)) {
        clearTimeout(timeouts.get(key));
      }
      const timeout = setTimeout(() => {
        store.delete(key);
        timeouts.delete(key);
      }, seconds * 1000);
      timeouts.set(key, timeout);
    },
    async setEx(key, seconds, value) {
      return this.setex(key, seconds, value);
    },
    async keys(pattern) {
      // Simple glob: support '*' wildcard only
      const regex = new RegExp(
        '^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
      );
      return Array.from(store.keys()).filter(k => regex.test(k));
    },
    async del(key) {
      if (Array.isArray(key)) {
        key.forEach(k => store.delete(k));
        if (key.length === 0) return 0;
        return key.length;
      }
      store.delete(key);
    },
    async mget(...keys) {
      return keys.map(key => store.get(key) || null);
    },
    async mset(...args) {
      for (let i = 0; i < args.length; i += 2) {
        store.set(args[i], args[i + 1]);
      }
    },
    async quit() {
      for (const timeout of timeouts.values()) {
        clearTimeout(timeout);
      }
      store.clear();
      timeouts.clear();
    },
  };
}

// Cache helper functions
async function cacheGet(key) {
  const client = getRedisClient();
  if (!client) return null;
  try {
    const value = await client.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    logger.warn('Cache get failed:', error.message);
    return null;
  }
}

async function cacheSet(key, value, ttlSeconds = 300) {
  const client = getRedisClient();
  if (!client) return false;
  try {
    await client.setEx(key, ttlSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.warn('Cache set failed:', error.message);
    return false;
  }
}

async function cacheDel(key) {
  const client = getRedisClient();
  if (!client) return false;
  try {
    await client.del(key);
    return true;
  } catch (error) {
    logger.warn('Cache delete failed:', error.message);
    return false;
  }
}

async function cacheDelPattern(pattern) {
  const client = getRedisClient();
  if (!client) return false;
  try {
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
      await client.del(keys);
    }
    return true;
  } catch (error) {
    logger.warn('Cache delete pattern failed:', error.message);
    return false;
  }
}

function generateCacheKey(prefix, params) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}:${params[k]}`)
    .join(':');
  return `${prefix}:${sortedParams}`;
}

function getRedisClient() {
  return redisClient;
}

// Increment a counter in Redis (returns new value)
async function incr(key) {
  const client = getRedisClient();
  if (!client) return null;
  try {
    return await client.incr(key);
  } catch (error) {
    logger.warn('Redis incr failed:', error.message);
    return null;
  }
}

// Set an expiration (TTL) on a key in seconds
async function expire(key, seconds) {
  const client = getRedisClient();
  if (!client) return false;
  try {
    return await client.expire(key, seconds);
  } catch (error) {
    logger.warn('Redis expire failed:', error.message);
    return false;
  }
}

async function closeRedis() {
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    redisReal = false;
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis,
  redisClient: () => redisClient,
  isRedisAvailable,
  isMockClient,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPattern,
  generateCacheKey,
  incr,
  expire,
};
