jest.mock('fs', () => ({
  accessSync: jest.fn(),
  constants: { W_OK: 2 },
}));

const fs = require('fs');
const { buildDependencyChecks, checkUploadsWritable } = require('../utils/dependencyChecker');

describe('buildDependencyChecks (readiness probe)', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('reports all ok when DB connected, redis up, uploads writable', () => {
    fs.accessSync.mockImplementation(() => undefined);
    const { checks, allHealthy } = buildDependencyChecks({
      mongooseReadyState: 1,
      isRedisAvailable: true,
      uploadDir: '/tmp/uploads',
    });

    expect(checks).toEqual({ database: 'ok', redis: 'ok', uploads: 'ok' });
    expect(allHealthy).toBe(true);
  });

  it('reports down when DB is disconnected', () => {
    const { checks, allHealthy } = buildDependencyChecks({
      mongooseReadyState: 0,
      isRedisAvailable: true,
      uploadDir: '/tmp/uploads',
    });
    expect(checks.database).toBe('down');
    expect(allHealthy).toBe(false);
  });

  it('reports down when redis is unavailable', () => {
    const { checks, allHealthy } = buildDependencyChecks({
      mongooseReadyState: 1,
      isRedisAvailable: false,
      uploadDir: '/tmp/uploads',
    });
    expect(checks.redis).toBe('down');
    expect(allHealthy).toBe(false);
  });

  it('reports down when upload dir is not writable', () => {
    fs.accessSync.mockImplementation(() => {
      throw new Error('EACCES');
    });

    const { checks, allHealthy } = buildDependencyChecks({
      mongooseReadyState: 1,
      isRedisAvailable: true,
      uploadDir: '/readonly/uploads',
    });
    expect(checks.uploads).toBe('down');
    expect(allHealthy).toBe(false);
  });

  it('checkUploadsWritable swallows fs exceptions', () => {
    fs.accessSync.mockImplementation(() => {
      throw new Error('ENOENT');
    });
    expect(checkUploadsWritable('/missing')).toBe('down');

    fs.accessSync.mockImplementation(() => undefined);
    expect(checkUploadsWritable('/tmp')).toBe('ok');
  });
});
