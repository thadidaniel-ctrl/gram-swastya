const express = require('express');
const router = express.Router();
const os = require('os');
const mongoose = require('mongoose');
const config = require('../config');
const voiceCache = require('../services/voiceCache');
const { buildDependencyChecks } = require('../utils/dependencyChecker');

const patientAuthRoutes = require('./patientAuthRoutes');
const patientProfileRoutes = require('./patientProfileRoutes');
const voiceAssistantRoutes = require('./voiceAssistant');
const reminderRoutes = require('./reminderRoutes');
const fileStorageRoutes = require('./fileStorage');
const folderRoutes = require('./folders');
const doctorAuthRoutes = require('./doctorAuthRoutes');
const doctorSharedFilesRoutes = require('./doctorSharedFiles');
const doctorDashboardRoutes = require('./doctorDashboard');
const doctorPatientsRoutes = require('./doctorPatients');
const doctorAppointmentsRoutes = require('./doctorAppointments');
const emergencyRoutes = require('./emergency');
const notifyRoutes = require('./notify');
const symptomCheckerRoutes = require('./symptomChecker');
const patientMedicinesRoutes = require('./patientMedicines');
const patientAppointmentsRoutes = require('./patientAppointments');

router.use('/patient/auth', patientAuthRoutes);
router.use('/patient', patientProfileRoutes);
router.use('/patient', reminderRoutes);
router.use('/patient/file-storage', fileStorageRoutes);
router.use('/patient/folders', folderRoutes);
router.use('/voice-assistant', voiceAssistantRoutes);
router.use('/doctor/auth', doctorAuthRoutes);
router.use('/doctor/shared-files', doctorSharedFilesRoutes);
router.use('/doctor', doctorDashboardRoutes);
router.use('/doctor', doctorPatientsRoutes);
router.use('/doctor', doctorAppointmentsRoutes);
router.use('/emergency', emergencyRoutes);
router.use('/notify', notifyRoutes);
router.use('/symptom-checker', symptomCheckerRoutes);
router.use('/patient/medicines', patientMedicinesRoutes);
router.use('/patient/appointments', patientAppointmentsRoutes);

// Health check endpoint with detailed info
router.get('/health', (req, res) => {
  const memUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: config.version || '2.0.0',
    environment: config.nodeEnv,
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB',
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(memUsage.external / 1024 / 1024) + ' MB',
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
    },
    platform: {
      node: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
    },
  });
});

// Readiness check that actually reflects dependency health
router.get('/ready', (req, res) => {
  const { checks, allHealthy } = buildDependencyChecks({
    mongooseReadyState: mongoose.connection.readyState,
    isRedisAvailable: voiceCache.isRedisAvailable(),
    uploadDir: config.upload.localPath,
  });

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// Liveness check for Kubernetes
router.get('/live', (req, res) => {
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

// API version info
router.get('/version', (req, res) => {
  res.json({
    version: config.version || '2.0.0',
    apiVersion: 'v1',
    buildDate: config.buildDate || new Date().toISOString(),
    gitCommit: config.gitCommit || 'unknown',
  });
});

module.exports = router;
