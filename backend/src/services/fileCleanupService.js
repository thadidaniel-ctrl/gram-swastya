const cron = require('node-cron');
const { MedicalFileStorage, FileAccessLog } = require('../models');
const { deleteFile } = require('./s3Service');
const logger = require('../utils/logger');

let cleanupJob = null;

async function cleanupExpiredFiles() {
  const startTime = Date.now();
  logger.info('Starting file cleanup job');

  try {
    const expiredFiles = await MedicalFileStorage.find({
      isDeleted: true,
      recoveryExpiresAt: { $lt: new Date() },
    });

    if (expiredFiles.length === 0) {
      logger.info('No expired files to clean up');
      return { deletedCount: 0, s3Deleted: 0, errors: [] };
    }

    logger.info(`Found ${expiredFiles.length} expired files to clean up`);

    let s3Deleted = 0;
    const errors = [];

    for (const file of expiredFiles) {
      try {
        // Delete from S3
        if (file.fileKey) {
          await deleteFile(file.fileKey);
          s3Deleted++;
        }

        // Hard delete from MongoDB
        await MedicalFileStorage.findByIdAndDelete(file._id);

        // Log cleanup
        await FileAccessLog.create({
          fileId: file._id,
          patientId: file.patientId,
          accessType: 'cleanup',
          accessedBy: file.patientId,
          userType: 'system',
          ipAddress: 'system',
          userAgent: 'file-cleanup-service',
          success: true,
        });

        logger.info(`Cleaned up expired file: ${file.fileName} (${file._id})`);
      } catch (fileError) {
        const errorMsg = `Failed to clean up file ${file._id}: ${fileError.message}`;
        logger.error(errorMsg);
        errors.push({ fileId: file._id, error: fileError.message });
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`File cleanup completed in ${duration}ms`, {
      totalFound: expiredFiles.length,
      s3Deleted,
      dbDeleted: expiredFiles.length - errors.length,
      errors: errors.length,
    });

    return {
      deletedCount: expiredFiles.length - errors.length,
      s3Deleted,
      errors,
      duration,
    };
  } catch (error) {
    logger.error('File cleanup job failed:', error);
    throw error;
  }
}

function startCleanupScheduler() {
  if (cleanupJob) {
    logger.warn('Cleanup scheduler already running');
    return cleanupJob;
  }

  // Run every hour at minute 0
  cleanupJob = cron.schedule(
    '0 * * * *',
    async () => {
      try {
        await cleanupExpiredFiles();
      } catch (error) {
        logger.error('Scheduled cleanup failed:', error);
      }
    },
    {
      scheduled: true,
      timezone: 'Asia/Kolkata',
    }
  );

  logger.info('File cleanup scheduler started (runs hourly)');
  return cleanupJob;
}

function stopCleanupScheduler() {
  if (cleanupJob) {
    cleanupJob.stop();
    cleanupJob = null;
    logger.info('File cleanup scheduler stopped');
  }
}

module.exports = {
  cleanupExpiredFiles,
  startCleanupScheduler,
  stopCleanupScheduler,
};
