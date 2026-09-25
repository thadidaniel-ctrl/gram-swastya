jest.mock('redis', () => ({
  createClient: jest.fn(),
}));

const { createClient } = require('redis');
const redisStore = require('../config/redis');

function buildFakeRealClient() {
  const store = new Map();
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    quit: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    off: jest.fn(),
    get: jest.fn(async key => store.get(key) || null),
    setEx: jest.fn(async (key, _s, value) => {
      store.set(key, value);
    }),
    keys: jest.fn(async () => Array.from(store.keys())),
    del: jest.fn(async key => {
      store.delete(key);
      return Array.isArray(key) ? key.length : 1;
    }),
  };
}

describe('redis fallback + self-heal', () => {
  beforeAll(async () => {
    await redisStore.closeRedis();
    jest.clearAllMocks();
  });

  it('uses the mocked in-memory client when Redis is unreachable', async () => {
    createClient.mockReturnValue({
      connect: jest.fn().mockRejectedValue(new Error('ECONNREFUSED')),
      disconnect: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
    });

    const client = await redisStore.initRedis();
    expect(client.incr).toBeDefined();
    expect(redisStore.isRedisAvailable()).toBe(false);
    expect(redisStore.isMockClient()).toBe(true);

    await expect(redisStore.cacheGet('missing')).resolves.toBeNull();
    await redisStore.cacheSet('k', { a: 1 });
    await expect(redisStore.cacheGet('k')).resolves.toEqual({ a: 1 });
    await redisStore.closeRedis();
  });

  it('adopts a real client when it connects and serves cache calls', async () => {
    const real = buildFakeRealClient();
    createClient.mockReturnValue(real);

    const client = await redisStore.initRedis();
    expect(client).toBe(real);
    expect(redisStore.isRedisAvailable()).toBe(true);
    expect(redisStore.isMockClient()).toBe(false);

    await redisStore.cacheSet('sk', { ok: true });
    expect(real.setEx).toHaveBeenCalled();
    await redisStore.closeRedis();
  });
});
