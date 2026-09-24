const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticate, authorize } = require('../middleware/auth');
const geminiService = require('../services/geminiService');
const voiceCache = require('../services/voiceCache');
const { VoiceConversation, Patient } = require('../models');
const logger = require('../utils/logger');

const processVoiceValidation = [
  body('audio_base64').notEmpty().withMessage('audio_base64 is required'),
  body('language').optional().isIn(['en', 'hi', 'te', 'ta', 'mr']).withMessage('Invalid language'),
  body('context').optional().isObject().withMessage('context must be an object'),
];

router.post(
  '/process',
  authenticate,
  authorize('patient'),
  processVoiceValidation,
  async (req, res) => {
    const startTime = Date.now();

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { audio_base64, language = 'en', context = {} } = req.body;
      const patientId = req.user._id;
      const sessionId = req.body.sessionId || `voice_${patientId}_${Date.now()}`;

      // Get patient data for pattern matching
      const patient = await Patient.findById(patientId)
        .select('medicines appointments diagnoses prescriptions allergies')
        .populate('medicines')
        .populate('appointments.doctor', 'profile.fullName profile.specialization')
        .lean();

      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      // For demo: simulate transcription (in production, use STT service)
      const transcript = simulateTranscription(audio_base64, language);

      // Check for cached response
      const cacheKey = voiceCache.generateCacheKey(patientId.toString(), transcript, language);
      const cachedResponse = await voiceCache.getCachedResponse(cacheKey);

      let response;
      let fromCache = false;
      let patternMatched = null;
      let geminiCalled = false;

      if (cachedResponse) {
        response = cachedResponse;
        fromCache = true;
        logger.info(`Cache hit for patient ${patientId}: ${transcript.substring(0, 50)}`);
      } else {
        // Check for common patterns
        const patternResult = voiceCache.detectPattern(transcript, patient);

        if (patternResult.matched) {
          patternMatched = patternResult.patternName;
          const patternResponse = await voiceCache.getPatternResponse(patternMatched, {}, patient);

          if (patternResponse) {
            response = patternResponse;
            // Cache the pattern response
            await voiceCache.setCachedResponse(cacheKey, response, patternResult.pattern.ttl);
            fromCache = true;
            logger.info(`Pattern matched: ${patternMatched} for patient ${patientId}`);
          }
        }

        // Fall back to Gemini if no pattern matched
        if (!response) {
          geminiCalled = true;
          const geminiResponse = await geminiService.processVoiceCommand(transcript, language, {
            patientId: patientId.toString(),
            patientName: patient?.name,
            ...context,
          });

          response = {
            text_response: geminiResponse.text_response || 'I understand. How can I help you?',
            audio_base64: '',
            intent: geminiResponse.intent || 'general',
            entities: geminiResponse.entities || {},
            actions: geminiResponse.actions || [],
            requires_handoff: geminiResponse.requires_handoff || false,
            handoff_reason: geminiResponse.handoff_reason || '',
          };

          // Cache Gemini response for 30 minutes
          await voiceCache.setCachedResponse(cacheKey, response, 1800);
          logger.info(`Gemini called for patient ${patientId}: ${transcript.substring(0, 50)}`);
        }
      }

      // Save conversation to database
      try {
        let conversation = await VoiceConversation.findOne({ sessionId });
        if (!conversation) {
          conversation = new VoiceConversation({
            patient: patientId,
            sessionId,
            language,
          });
        }

        await conversation.addMessage({
          role: 'user',
          text: transcript,
          intent: 'user_query',
        });

        await conversation.addMessage({
          role: 'assistant',
          text: response.text_response,
          intent: response.intent,
          entities: response.entities,
          actions: response.actions,
          requiresHandoff: response.requires_handoff,
          handoffReason: response.handoff_reason,
          fromCache,
          patternMatched,
          cacheKey,
          processingTimeMs: Date.now() - startTime,
        });
      } catch (convError) {
        logger.error('Failed to save voice conversation:', convError);
      }

      const processingTime = Date.now() - startTime;

      res.json({
        success: true,
        ...response,
        _meta: {
          processingTimeMs: processingTime,
          fromCache,
          patternMatched,
          geminiCalled,
          sessionId,
        },
      });
    } catch (error) {
      logger.error('Voice assistant error:', error);
      res.status(500).json({
        success: false,
        message: 'Voice processing failed',
        _meta: { processingTimeMs: Date.now() - startTime },
      });
    }
  }
);

router.get('/conversations', authenticate, authorize('patient'), async (req, res) => {
  try {
    const conversations = await VoiceConversation.find({ patient: req.user._id })
      .sort({ startedAt: -1 })
      .limit(20)
      .select('sessionId language startedAt endedAt totalMessages cacheHits geminiCalls isActive')
      .lean();

    res.json({ success: true, conversations });
  } catch (error) {
    logger.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' });
  }
});

router.get('/conversations/:sessionId', authenticate, authorize('patient'), async (req, res) => {
  try {
    const conversation = await VoiceConversation.findOne({
      sessionId: req.params.sessionId,
      patient: req.user._id,
    }).lean();

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    res.json({ success: true, conversation });
  } catch (error) {
    logger.error('Get conversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' });
  }
});

router.delete('/conversations/:sessionId', authenticate, authorize('patient'), async (req, res) => {
  try {
    await VoiceConversation.findOneAndDelete({
      sessionId: req.params.sessionId,
      patient: req.user._id,
    });
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (error) {
    logger.error('Delete conversation error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete conversation' });
  }
});

router.post(
  '/sync',
  authenticate,
  authorize('patient'),
  [
    body('conversations')
      .isArray({ min: 1, max: 200 })
      .withMessage('conversations must be a non-empty array'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const patientId = req.user._id;
      const { conversations } = req.body;

      let synced = 0;
      const failed = [];

      for (const entry of conversations) {
        const {
          sessionId,
          userMessage,
          assistantResponse,
          intent,
          fromCache,
          patternMatched,
          timestamp,
        } = entry;

        if (!sessionId || !userMessage || !assistantResponse) {
          failed.push({
            sessionId: sessionId || 'unknown',
            reason: 'missing userMessage or assistantResponse',
          });
          continue;
        }

        try {
          let conversation = await VoiceConversation.findOne({ sessionId, patient: patientId });
          if (!conversation) {
            conversation = new VoiceConversation({
              patient: patientId,
              sessionId,
              language: entry.language || 'en',
              startedAt: timestamp ? new Date(timestamp) : new Date(),
            });
          }

          const existingTexts = conversation.messages.map(m => m.text);
          const msgTimestamp = timestamp !== undefined ? new Date(timestamp) : new Date();

          if (!existingTexts.includes(userMessage)) {
            await conversation.addMessage({
              role: 'user',
              text: userMessage,
              intent: 'user_query',
              timestamp: msgTimestamp,
            });
          }
          if (!existingTexts.includes(assistantResponse)) {
            await conversation.addMessage({
              role: 'assistant',
              text: assistantResponse,
              intent: intent || 'general',
              fromCache: Boolean(fromCache),
              patternMatched: patternMatched || null,
              timestamp: msgTimestamp,
            });
          }

          synced += 1;
        } catch (convError) {
          logger.error('Sync conversation save error:', convError);
          failed.push({ sessionId, reason: 'save failed' });
        }
      }

      res.json({
        success: true,
        synced,
        failed,
        remaining: conversations.length - synced,
      });
    } catch (error) {
      logger.error('Voice sync error:', error);
      res.status(500).json({ success: false, message: 'Voice sync failed' });
    }
  }
);

// Health check for voice service
router.get('/health', async (req, res) => {
  res.json({
    success: true,
    service: 'voice-assistant',
    cache: voiceCache.isRedisAvailable() ? 'connected' : 'disconnected',
    patterns: Object.keys(voiceCache.COMMON_PATTERNS),
  });
});

function simulateTranscription(audioBase64, language) {
  // In production: use Google Speech-to-Text, Whisper, etc.
  // For demo, return sample transcriptions based on audio length
  const samples = {
    en: [
      'What medicines do I need to take today?',
      'When is my next appointment?',
      'Show my health records',
      'I have chest pain and difficulty breathing',
      'Book appointment with cardiologist',
      'Call ambulance emergency',
      'Set reminder for blood pressure medicine',
    ],
    hi: [
      'आज मुझे कौन सी दवाई लेनी है?',
      'मेरा अगला अपॉइंटमेंट कब है?',
      'मेरे स्वास्थ्य रिकॉर्ड दिखाओ',
      'मेरी छाती में दर्द है',
    ],
    te: ['నాకు ఈరోజు ఏ మందులు తీసుకోవాలి?', 'నా.listenoid ఇంటరవ్యూ ఎప్పుడు?'],
    ta: ['இன்று எனக்கு எந்த மருந்துகள்?', 'என் அடுத்த நேர்காணல் எப்போது?'],
    mr: ['आज मी कोणती औषध घ्यावी?', 'माझं पुढील अपॉइंटमेंट केव्हा आहे?'],
  };

  const langSamples = samples[language] || samples.en;
  return langSamples[Math.floor(Math.random() * langSamples.length)];
}

module.exports = router;
