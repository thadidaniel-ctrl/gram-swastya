const express = require('express');
const router = express.Router();

const patientAuthRoutes = require('./patientAuthRoutes');
const patientProfileRoutes = require('./patientProfileRoutes');
const voiceAssistantRoutes = require('./voiceAssistant');
const reminderRoutes = require('./reminderRoutes');
const fileStorageRoutes = require('./fileStorage');
const folderRoutes = require('./folders');

router.use('/patient/auth', patientAuthRoutes);
router.use('/patient', patientProfileRoutes);
router.use('/patient', reminderRoutes);
router.use('/patient/file-storage', fileStorageRoutes);
router.use('/patient/folders', folderRoutes);
router.use('/voice-assistant', voiceAssistantRoutes);

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

module.exports = router;
