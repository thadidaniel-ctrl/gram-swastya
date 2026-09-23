const { performance } = require('perf_hooks');

let requestCount = 0;
let errorCount = 0;
let totalResponseTime = 0;
const responseTimes = [];

function observability(req, res, next) {
  requestCount++;
  const start = performance.now();
  const done = () => {
    const elapsed = performance.now() - start;
    totalResponseTime += elapsed;
    responseTimes.push(elapsed);
    if (responseTimes.length > 1000) responseTimes.shift();
    if (res.statusCode >= 400) errorCount++;
  };
  res.on('finish', done);
  res.on('close', done);
  req.requestStart = start;
  next();
}

function getMetrics() {
  const avgResponseTime = requestCount > 0 ? totalResponseTime / requestCount : 0;
  const p95ResponseTime =
    responseTimes.length > 0
      ? responseTimes.slice(-Math.ceil(responseTimes.length * 0.05)).reduce((a, b) => a + b, 0) /
        Math.max(1, Math.ceil(responseTimes.length * 0.05))
      : 0;
  const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
  return {
    uptime: process.uptime(),
    requestCount,
    errorCount,
    errorRate: parseFloat(errorRate.toFixed(2)),
    avgResponseTimeMs: parseFloat(avgResponseTime.toFixed(2)),
    p95ResponseTimeMs: parseFloat(p95ResponseTime.toFixed(2)),
    memory: process.memoryUsage(),
  };
}

module.exports = { observability, getMetrics };
