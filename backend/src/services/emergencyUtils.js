const { google } = require('googleapis');
const config = require('../config');
const logger = require('../utils/logger');

const EARTH_RADIUS_KM = 6371;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineDistance(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

function estimateDurationMinutes(distanceKm, avgSpeedKmh = 40) {
  return Math.ceil((distanceKm / avgSpeedKmh) * 60);
}

function getPriorityFromEmergencyType(type) {
  const priorityMap = {
    cardiac: 'critical',
    stroke: 'critical',
    trauma: 'high',
    respiratory: 'high',
    maternal: 'high',
    pediatric: 'high',
    general: 'medium',
  };
  return priorityMap[type] || 'medium';
}

function getRequiredAmbulanceType(emergencyType) {
  const typeMap = {
    cardiac: 'als',
    stroke: 'als',
    trauma: 'als',
    respiratory: 'als',
    maternal: 'bls',
    pediatric: 'bls',
    general: 'bls',
  };
  return typeMap[emergencyType] || 'bls';
}

let googleMapsClient = null;

function initGoogleMaps() {
  if (googleMapsClient) return googleMapsClient;

  const apiKey = config.googleMaps?.apiKey || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    logger.warn('Google Maps API key not configured. Using haversine distance fallback.');
    return null;
  }

  googleMapsClient = google.maps({ version: '3.56', auth: apiKey });
  logger.info('Google Maps client initialized');
  return googleMapsClient;
}

async function getRouteDistanceAndDuration(origin, destination, mode = 'driving') {
  const client = initGoogleMaps();
  if (!client) {
    const distance = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return {
      distanceKm: distance,
      durationMinutes: estimateDurationMinutes(distance),
      source: 'haversine',
    };
  }

  try {
    const response = await client.distancematrix({
      params: {
        origins: [`${origin.lat},${origin.lng}`],
        destinations: [`${destination.lat},${destination.lng}`],
        mode,
        units: 'metric',
        avoid: 'tolls',
      },
    });

    const element = response.data.rows[0]?.elements[0];
    if (element?.status === 'OK') {
      return {
        distanceKm: element.distance.value / 1000,
        durationMinutes: Math.ceil(element.duration.value / 60),
        source: 'google_maps',
      };
    }

    logger.warn('Google Maps route not found, falling back to haversine');
    const distance = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return {
      distanceKm: distance,
      durationMinutes: estimateDurationMinutes(distance),
      source: 'haversine',
    };
  } catch (error) {
    logger.error('Google Maps API error:', error.message);
    const distance = haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    return {
      distanceKm: distance,
      durationMinutes: estimateDurationMinutes(distance),
      source: 'haversine',
    };
  }
}

async function findNearestAmbulances(emergencyLat, emergencyLng, maxDistanceKm = 50, limit = 5) {
  const { Ambulance } = require('../models');

  const ambulances = await Ambulance.find({
    status: 'available',
    isActive: true,
    type: { $in: ['bls', 'als'] },
    currentLocation: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [emergencyLng, emergencyLat],
        },
        $maxDistance: maxDistanceKm * 1000,
      },
    },
  })
    .populate('facility', 'name address.coordinates')
    .limit(limit * 2)
    .lean();

  return ambulances;
}

async function findNearestHospital(emergencyLat, emergencyLng, maxDistanceKm = 50) {
  const { Facility } = require('../models');

  const hospital = await Facility.findOne({
    'address.coordinates': {
      $near: {
        $geometry: { type: 'Point', coordinates: [emergencyLng, emergencyLat] },
        $maxDistance: maxDistanceKm * 1000,
      },
    },
    isActive: true,
    services: 'emergency',
    type: { $in: ['hospital', 'dh', 'chc'] },
  }).lean();

  return hospital;
}

function formatPhoneNumber(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('91') && cleaned.length === 12) {
    return `+${cleaned}`;
  }
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }
  return phone;
}

async function sendSMS(phone, message) {
  const { sendSMS: twilioSendSMS } = require('./smsService');
  return twilioSendSMS(phone, message);
}

module.exports = {
  haversineDistance,
  estimateDurationMinutes,
  getPriorityFromEmergencyType,
  getRequiredAmbulanceType,
  getRouteDistanceAndDuration,
  findNearestAmbulances,
  findNearestHospital,
  formatPhoneNumber,
  sendSMS,
};
