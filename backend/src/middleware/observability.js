const { performance } = require('perf_hooks');

let requestCount = 0;
let errorCount = 0;
let totalResponseTime = 0;
const responseTimes = [];

function observability(req, res, next) {
  requestCount++;
  const start = performance.now();
  let finished = false;
  const done = () => {
    if (finished) return;
    finished = true;
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
  const sorted = [...responseTimes].sort((a, b) => a - b);
  const p95ResponseTime =
    sorted.length > 0
      ? sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)]
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
