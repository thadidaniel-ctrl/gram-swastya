const fs = require('fs');

function checkUploadsWritable(uploadDir) {
  try {
    fs.accessSync(uploadDir, fs.constants.W_OK);
    return 'ok';
  } catch (_err) {
    return 'down';
  }
}

function buildDependencyChecks({ mongooseReadyState, isRedisAvailable, uploadDir }) {
  const checks = {
    database: mongooseReadyState === 1 ? 'ok' : 'down',
    redis: isRedisAvailable ? 'ok' : 'down',
    uploads: checkUploadsWritable(uploadDir),
  };

  const allHealthy = Object.values(checks).every(v => v === 'ok');

  return { checks, allHealthy };
}

module.exports = { buildDependencyChecks, checkUploadsWritable };
