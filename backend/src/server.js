const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const config = require('./config');
const connectDB = require('./config/database');
const routes = require('./routes');
const { authenticate } = require('./middleware/auth');
const logger = require('./utils/logger');
const voiceCache = require('./services/voiceCache');
const pushNotificationService = require('./services/pushNotificationService');
const medicineReminder = require('./services/medicineReminder');
const fileCleanupService = require('./services/fileCleanupService');
const redis = require('./config/redis');
const { Patient, Doctor, Facility, Ambulance } = require('./models');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(cors(config.cors));

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(
  morgan('combined', {
    stream: { write: msg => logger.info(msg.trim()) },
  })
);

const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

app.use((req, res, next) => {
  req.requestId = require('crypto').randomUUID();
  next();
});

app.use('/api', routes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path,
    method: req.method,
  });

  const status = err.statusCode || 500;
  const message = config.nodeEnv === 'production' ? 'Internal server error' : err.message;

  res.status(status).json({
    success: false,
    message,
    requestId: req.requestId,
  });
});

const startServer = async () => {
  try {
    await connectDB();
    await redis.initRedis();
    voiceCache.initRedis();
    pushNotificationService.initFirebase(config);
    medicineReminder.startMedicineReminderCron();
    fileCleanupService.startCleanupScheduler();

    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    const gracefulShutdown = async signal => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      medicineReminder.stopMedicineReminderCron();
      fileCleanupService.stopCleanupScheduler();
      server.close(async () => {
        await mongoose.connection.close();
        await redis.closeRedis();
        logger.info('Server closed');
        process.exit(0);
      });

      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    process.on('unhandledRejection', reason => {
      logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', error => {
      logger.error('Uncaught Exception:', error);
      process.exit(1);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
