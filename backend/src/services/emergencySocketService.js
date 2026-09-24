const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

let io = null;
const driverSockets = new Map();
const patientSockets = new Map();

function initializeSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: config.cors?.origin || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', socket => {
    const { userType, id: userId } = socket.user;

    logger.info(`Socket connected: ${userType} ${userId}`);

    if (userType === 'driver') {
      driverSockets.set(userId, socket.id);
      socket.join(`driver:${userId}`);
    } else if (userType === 'patient') {
      patientSockets.set(userId, socket.id);
      socket.join(`patient:${userId}`);
    }

    socket.on('join_call', callId => {
      socket.join(`call:${callId}`);
      logger.debug(`User ${userId} joined call ${callId}`);
    });

    socket.on('leave_call', callId => {
      socket.leave(`call:${callId}`);
    });

    socket.on('driver_location', async data => {
      if (userType !== 'driver') return;

      const { callId, lat, lng, status } = data;
      if (!callId || !lat || !lng) return;

      try {
        const { AmbulanceBooking, Ambulance } = require('../models');

        const booking = await AmbulanceBooking.findOne({ bookingId: callId }).populate('ambulance');
        if (!booking || !booking.ambulance) return;

        await Ambulance.findByIdAndUpdate(booking.ambulance._id, {
          'currentLocation.lat': parseFloat(lat),
          'currentLocation.lng': parseFloat(lng),
          'currentLocation.updatedAt': new Date(),
          ...(status && { status }),
        });

        if (status) {
          booking.status = status;
          if (status === 'en_route_pickup' && !booking.driverAcceptedAt) {
            booking.driverAcceptedAt = new Date();
          }
          if (status === 'on_scene' && !booking.pickupAt) {
            booking.pickupAt = new Date();
          }
          if (status === 'en_route_hospital' && !booking.departureAt) {
            booking.departureAt = new Date();
          }
          if (status === 'at_hospital' && !booking.arrivalAt) {
            booking.arrivalAt = new Date();
          }
          if (status === 'completed' && !booking.completedAt) {
            booking.completedAt = new Date();
          }
          await booking.save();
        }

        const amb = await Ambulance.findById(booking.ambulance._id).lean();
        let etaMinutes = 0;
        if (amb?.currentLocation?.lat) {
          const { haversineDistance, estimateDurationMinutes } = require('./emergencyUtils');
          const targetLat =
            booking.status === 'en_route_pickup'
              ? booking.pickupLocation.lat
              : booking.dropLocation.lat;
          const targetLng =
            booking.status === 'en_route_pickup'
              ? booking.pickupLocation.lng
              : booking.dropLocation.lng;
          const distance = haversineDistance(
            amb.currentLocation.lat,
            amb.currentLocation.lng,
            targetLat,
            targetLng
          );
          etaMinutes = estimateDurationMinutes(distance);
        }

        io.to(`call:${callId}`).emit('location_update', {
          callId,
          status: booking.status,
          ambulanceLocation: amb?.currentLocation,
          etaMinutes,
          updatedAt: new Date(),
        });

        if (booking.patient) {
          io.to(`patient:${booking.patient}`).emit('call_update', {
            callId,
            status: booking.status,
            etaMinutes,
          });
        }
      } catch (error) {
        logger.error('Driver location update error:', error);
      }
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${userType} ${userId}`);
      if (userType === 'driver') {
        driverSockets.delete(userId);
      } else if (userType === 'patient') {
        patientSockets.delete(userId);
      }
    });
  });

  logger.info('Emergency WebSocket server initialized');
  return io;
}

function getIO() {
  return io;
}

function emitToCall(callId, event, data) {
  if (io) {
    io.to(`call:${callId}`).emit(event, data);
  }
}

function emitToDriver(driverId, event, data) {
  if (io) {
    io.to(`driver:${driverId}`).emit(event, data);
  }
}

function emitToPatient(patientId, event, data) {
  if (io) {
    io.to(`patient:${patientId}`).emit(event, data);
  }
}

function isDriverOnline(driverId) {
  return driverSockets.has(driverId);
}

function isPatientOnline(patientId) {
  return patientSockets.has(patientId);
}

module.exports = {
  initializeSocket,
  getIO,
  emitToCall,
  emitToDriver,
  emitToPatient,
  isDriverOnline,
  isPatientOnline,
};
