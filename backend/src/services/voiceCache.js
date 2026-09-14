const crypto = require('crypto');
const config = require('../config');
const logger = require('../utils/logger');

let redisClient = null;
let isRedisAvailable = false;

const COMMON_PATTERNS = {
  medicines: {
    keywords: [
      'medicine',
      'medication',
      'drug',
      'pill',
      'tablet',
      'dosage',
      'prescription',
      'reminder',
    ],
    intents: ['medicine_reminder', 'medicine_info', 'dosage_info'],
    ttl: 3600, // 1 hour
    generateResponse: (entities, patient) => {
      const meds = patient?.medicines?.filter(m => m.isActive) || [];
      if (meds.length === 0) {
        return {
          text_response: "You don't have any active medicines. Would you like to add one?",
          intent: 'medicine_info',
          entities: { medicines: [] },
          actions: [
            { type: 'navigate', payload: { screen: 'medicines' }, description: 'View medicines' },
          ],
          requires_handoff: false,
        };
      }
      return {
        text_response: `You have ${meds.length} active medicine${meds.length > 1 ? 's' : ''}: ${meds.map(m => `${m.name} ${m.dosage} ${m.frequency}`).join(', ')}.`,
        intent: 'medicine_info',
        entities: {
          medicines: meds.map(m => ({ name: m.name, dosage: m.dosage, frequency: m.frequency })),
        },
        actions: [
          { type: 'navigate', payload: { screen: 'medicines' }, description: 'View all medicines' },
        ],
        requires_handoff: false,
      };
    },
  },
  appointments: {
    keywords: ['appointment', 'book', 'schedule', 'doctor', 'consultation', 'visit', 'meet'],
    intents: ['book_appointment', 'appointment_info', 'doctor_search'],
    ttl: 1800, // 30 minutes
    generateResponse: (entities, patient) => {
      const upcoming =
        patient?.appointments
          ?.filter(
            a =>
              new Date(a.scheduledAt) > new Date() && ['scheduled', 'confirmed'].includes(a.status)
          )
          .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)) || [];

      if (upcoming.length === 0) {
        return {
          text_response: "You don't have any upcoming appointments. Would you like to book one?",
          intent: 'appointment_info',
          entities: { appointments: [] },
          actions: [
            {
              type: 'navigate',
              payload: { screen: 'appointments' },
              description: 'Book appointment',
            },
          ],
          requires_handoff: false,
        };
      }
      const next = upcoming[0];
      return {
        text_response: `Your next appointment is with ${next.doctor?.profile?.fullName || 'Doctor'} on ${new Date(next.scheduledAt).toLocaleString()} for ${next.type} consultation.`,
        intent: 'appointment_info',
        entities: {
          appointments: upcoming.slice(0, 3).map(a => ({
            doctor: a.doctor?.profile?.fullName,
            time: a.scheduledAt,
            type: a.type,
            status: a.status,
          })),
        },
        actions: [
          {
            type: 'navigate',
            payload: { screen: 'appointments' },
            description: 'View all appointments',
          },
        ],
        requires_handoff: false,
      };
    },
  },
  records: {
    keywords: ['record', 'history', 'diagnosis', 'health', 'report', 'vaccination', 'allergy'],
    intents: ['health_records', 'diagnosis_history', 'vaccination_info'],
    ttl: 3600,
    generateResponse: (entities, patient) => {
      return {
        text_response: `You have ${patient?.diagnoses?.length || 0} diagnoses, ${patient?.medicines?.length || 0} medicines, ${patient?.appointments?.length || 0} appointments, and ${patient?.prescriptions?.length || 0} prescriptions in your health records.`,
        intent: 'health_records',
        entities: {
          stats: {
            diagnoses: patient?.diagnoses?.length || 0,
            medicines: patient?.medicines?.length || 0,
            appointments: patient?.appointments?.length || 0,
            prescriptions: patient?.prescriptions?.length || 0,
          },
        },
        actions: [
          { type: 'navigate', payload: { screen: 'records' }, description: 'View health records' },
        ],
        requires_handoff: false,
      };
    },
  },
  emergency: {
    keywords: [
      'emergency',
      'ambulance',
      'urgent',
      'critical',
      'help',
      'hospital',
      'dying',
      'heart attack',
      'stroke',
    ],
    intents: ['emergency', 'call_ambulance'],
    ttl: 600, // 10 minutes
    generateResponse: (entities, patient) => {
      return {
        text_response:
          "This sounds like an emergency! I'm booking an ambulance for you right now. Please stay calm.",
        intent: 'emergency',
        entities: { emergency: true },
        actions: [
          {
            type: 'call_ambulance',
            payload: { emergency_type: 'general', patient_id: patient?.id },
            description: 'Book emergency ambulance',
          },
          {
            type: 'navigate',
            payload: { screen: 'ambulance' },
            description: 'Open ambulance booking',
          },
        ],
        requires_handoff: false,
      };
    },
  },
};

function initRedis() {
  if (!config.redis?.url) {
    logger.warn('Redis URL not configured, caching disabled');
    return false;
  }

  try {
    const { createClient } = require('redis');
    redisClient = createClient({ url: config.redis.url });

    redisClient.on('error', err => {
      logger.error('Redis error:', err);
      isRedisAvailable = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
      isRedisAvailable = true;
    });

    redisClient.connect().catch(err => {
      logger.error('Redis connection failed:', err);
      isRedisAvailable = false;
    });

    return true;
  } catch (error) {
    logger.error('Redis initialization failed:', error);
    return false;
  }
}

function normalizeQuery(text, language = 'en') {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectPattern(query, patient) {
  const normalized = normalizeQuery(query);

  for (const [patternName, pattern] of Object.entries(COMMON_PATTERNS)) {
    const keywordMatch = pattern.keywords.some(kw => normalized.includes(kw));
    const intentMatch = pattern.intents.some(intent =>
      normalized.includes(intent.replace('_', ' '))
    );

    if (keywordMatch || intentMatch) {
      return { patternName, pattern, matched: true };
    }
  }
  return { matched: false };
}

async function getCachedResponse(cacheKey) {
  if (!isRedisAvailable || !redisClient) return null;

  try {
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      logger.debug(`Cache hit: ${cacheKey}`);
      return JSON.parse(cached);
    }
  } catch (error) {
    logger.error('Cache get error:', error);
  }
  return null;
}

async function setCachedResponse(cacheKey, response, ttl) {
  if (!isRedisAvailable || !redisClient) return false;

  try {
    await redisClient.setEx(cacheKey, ttl, JSON.stringify(response));
    logger.debug(`Cache set: ${cacheKey} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    logger.error('Cache set error:', error);
    return false;
  }
}

function generateCacheKey(patientId, query, language) {
  const hash = crypto
    .createHash('sha256')
    .update(`${patientId}:${query}:${language}`)
    .digest('hex');
  return `voice:${patientId}:${hash.substring(0, 16)}`;
}

async function getPatternResponse(patternName, entities, patient) {
  const pattern = COMMON_PATTERNS[patternName];
  if (!pattern || !pattern.generateResponse) return null;

  try {
    return pattern.generateResponse(entities, patient);
  } catch (error) {
    logger.error(`Pattern response generation failed for ${patternName}:`, error);
    return null;
  }
}

module.exports = {
  initRedis,
  detectPattern,
  getCachedResponse,
  setCachedResponse,
  generateCacheKey,
  getPatternResponse,
  COMMON_PATTERNS,
  isRedisAvailable: () => isRedisAvailable,
};
