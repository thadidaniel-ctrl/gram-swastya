const { createClient } = require('redis');
const config = require('./index');
const logger = require('../utils/logger');

let redisClient = null;

async function initRedis() {
  if (redisClient) return redisClient;

  try {
    redisClient = createClient({
      url: config.redis.url,
    });

    redisClient.on('error', err => {
      logger.error('Redis Client Error', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
    });

    await redisClient.connect();
    logger.info('Redis initialized successfully');
    return redisClient;
  } catch (error) {
    logger.error('Redis initialization failed:', error.message);
    // Return a mock client for development without Redis
    return createMockRedisClient();
  }
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
    async del(key) {
      store.delete(key);
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

function getRedisClient() {
  return redisClient;
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis,
  redisClient: () => redisClient,
};
