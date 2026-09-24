const { Ambulance, AmbulanceBooking, Patient } = require('../models');
const logger = require('../utils/logger');
const {
  haversineDistance,
  estimateDurationMinutes,
  getPriorityFromEmergencyType,
  getRequiredAmbulanceType,
  getRouteDistanceAndDuration,
  findNearestAmbulances,
  findNearestHospital,
  formatPhoneNumber,
  sendSMS,
} = require('../services/emergencyUtils');
const { sendToSubscription } = require('../services/webPushService');
const { sendToToken } = require('../services/pushNotificationService');
const { emitToCall, emitToPatient } = require('../services/emergencySocketService');

class EmergencyController {
  async callAmbulance(req, res) {
    try {
      const patientId = req.user._id;
      const { lat, lng, address, emergencyType = 'general', description, contactPhone } = req.body;

      if (!lat || !lng) {
        return res.status(400).json({ success: false, message: 'Location (lat, lng) is required' });
      }

      const patient = await Patient.findById(patientId)
        .select('name phone emergencyContact fcmToken webPushSubscription')
        .lean();
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      const emergencyLat = parseFloat(lat);
      const emergencyLng = parseFloat(lng);
      const priority = getPriorityFromEmergencyType(emergencyType);
      const requiredAmbulanceType = getRequiredAmbulanceType(emergencyType);

      // 1. Find available ambulances using geospatial query
      const ambulances = await findNearestAmbulances(emergencyLat, emergencyLng, 50, 10);

      if (!ambulances.length) {
        return res.status(503).json({
          success: false,
          message: 'No ambulances currently available in your area',
          code: 'NO_AMBULANCE_AVAILABLE',
        });
      }

      // Filter by required type (ALS for critical emergencies)
      const filteredAmbulances = ambulances.filter(a =>
        requiredAmbulanceType === 'als' ? a.type === 'als' : true
      );
      const availableAmbulances = filteredAmbulances.length ? filteredAmbulances : ambulances;

      // 2. Calculate distances and durations using Google Maps (with fallback)
      const ambulancesWithRoute = await Promise.all(
        availableAmbulances.slice(0, 5).map(async amb => {
          const route = await getRouteDistanceAndDuration(
            { lat: emergencyLat, lng: emergencyLng },
            { lat: amb.currentLocation.lat, lng: amb.currentLocation.lng }
          );
          return { ...amb, ...route };
        })
      );

      // Sort by duration (fastest first)
      ambulancesWithRoute.sort((a, b) => a.durationMinutes - b.durationMinutes);

      const nearest = ambulancesWithRoute[0];

      // 3. Find nearest hospital with emergency services
      const nearestHospital = await findNearestHospital(emergencyLat, emergencyLng, 50);

      const dropLocation = nearestHospital
        ? {
            lat: nearestHospital.address.coordinates.lat,
            lng: nearestHospital.address.coordinates.lng,
            address: nearestHospital.name,
            facility: nearestHospital._id,
          }
        : {
            lat: emergencyLat,
            lng: emergencyLng,
            address: address || 'Emergency location',
          };

      // 4. Create booking
      const booking = await AmbulanceBooking.create({
        patient: patientId,
        ambulance: nearest._id,
        pickupLocation: {
          lat: emergencyLat,
          lng: emergencyLng,
          address: address || 'Emergency location',
        },
        dropLocation,
        emergencyType,
        priority,
        description,
        contactPhone: contactPhone || patient.phone || patient.emergencyContact?.phone,
        estimatedPickupTime: new Date(Date.now() + nearest.durationMinutes * 60000),
        estimatedArrivalTime: new Date(Date.now() + nearest.durationMinutes * 60000 * 2),
        distanceKm: nearest.distanceKm,
        durationMinutes: nearest.durationMinutes,
        status: 'assigned',
        assignedAt: new Date(),
      });

      // 5. Update ambulance status and link booking
      await Ambulance.findByIdAndUpdate(nearest._id, {
        status: 'en_route',
        currentBooking: booking._id,
      });

      // 6. Send notifications to driver (multi-channel: Push -> Web Push -> SMS)
      await this.notifyDriver(nearest, {
        bookingId: booking.bookingId,
        emergencyType,
        priority,
        pickupLat: emergencyLat,
        pickupLng: emergencyLng,
        pickupAddress: address || 'Emergency location',
        dropLat: dropLocation.lat,
        dropLng: dropLocation.lng,
        dropAddress: dropLocation.address,
        patientName: patient.name,
        patientPhone: patient.phone,
        distanceKm: nearest.distanceKm,
        etaMinutes: nearest.durationMinutes,
      });

      // 7. Send confirmation to patient
      await this.notifyPatient(patient, {
        bookingId: booking.bookingId,
        emergencyType,
        ambulanceNumber: nearest.vehicleNumber,
        driverName: nearest.driver?.name,
        driverPhone: nearest.driver?.phone,
        etaMinutes: nearest.durationMinutes,
        hospitalName: nearestHospital?.name,
      });

      // 8. Emit real-time events via WebSocket
      emitToCall(booking.bookingId, 'call_created', {
        callId: booking.bookingId,
        status: 'assigned',
        ambulance: {
          vehicleNumber: nearest.vehicleNumber,
          driverName: nearest.driver?.name,
          driverPhone: nearest.driver?.phone,
          currentLocation: nearest.currentLocation,
          distanceKm: nearest.distanceKm,
          etaMinutes: nearest.durationMinutes,
        },
        hospital: nearestHospital ? { name: nearestHospital.name } : null,
        estimatedPickupTime: booking.estimatedPickupTime,
        estimatedArrivalTime: booking.estimatedArrivalTime,
      });

      emitToPatient(patientId, 'emergency_dispatched', {
        callId: booking.bookingId,
        etaMinutes: nearest.durationMinutes,
      });

      // 9. Return response
      res.status(201).json({
        success: true,
        message: 'Ambulance dispatched successfully',
        data: {
          callId: booking.bookingId,
          bookingId: booking._id,
          ambulance: {
            vehicleNumber: nearest.vehicleNumber,
            driverName: nearest.driver?.name,
            driverPhone: nearest.driver?.phone,
            currentLocation: nearest.currentLocation,
            distanceKm: nearest.distanceKm,
            etaMinutes: nearest.durationMinutes,
          },
          hospital: nearestHospital
            ? {
                name: nearestHospital.name,
                distanceKm: nearest.distanceKm,
              }
            : null,
          estimatedPickupTime: booking.estimatedPickupTime,
          estimatedArrivalTime: booking.estimatedArrivalTime,
          status: 'assigned',
        },
      });
    } catch (error) {
      logger.error('Emergency call error:', error);
      res.status(500).json({ success: false, message: 'Failed to dispatch ambulance' });
    }
  }

  async notifyDriver(ambulance, data) {
    const driverId = ambulance.driver?.id || ambulance._id; // Use ambulance ID if no separate driver ID
    const driverPhone = formatPhoneNumber(ambulance.driver?.phone);

    // Try FCM first
    if (ambulance.driver?.fcmToken) {
      try {
        const result = await sendToToken(ambulance.driver.fcmToken, {
          title: `🚨 Emergency Dispatch - ${data.priority.toUpperCase()}`,
          body: `${data.emergencyType} emergency at ${data.pickupAddress}. Distance: ${data.distanceKm.toFixed(1)}km, ETA: ${data.etaMinutes}min`,
          data: {
            type: 'EMERGENCY_DISPATCH',
            ...data,
          },
          channelId: 'emergency_channel',
        });
        if (result.status === 'sent') {
          logger.info('Driver notified via FCM', { driverId, bookingId: data.bookingId });
          return;
        }
      } catch (error) {
        logger.warn('FCM notification failed, trying next channel', { error: error.message });
      }
    }

    // Try Web Push
    if (ambulance.driver?.webPushSubscription?.endpoint) {
      try {
        const result = await sendToSubscription(ambulance.driver.webPushSubscription, {
          title: `🚨 Emergency Dispatch - ${data.priority.toUpperCase()}`,
          body: `${data.emergencyType} emergency at ${data.pickupAddress}. Distance: ${data.distanceKm.toFixed(1)}km, ETA: ${data.etaMinutes}min`,
          data: {
            type: 'EMERGENCY_DISPATCH',
            ...data,
          },
          tag: `emergency-${data.bookingId}`,
        });
        if (result.status === 'sent') {
          logger.info('Driver notified via Web Push', { driverId, bookingId: data.bookingId });
          return;
        }
      } catch (error) {
        logger.warn('Web Push notification failed, trying next channel', { error: error.message });
      }
    }

    // Fallback to SMS
    if (driverPhone) {
      try {
        const smsMessage = `🚨 EMERGENCY DISPATCH: ${data.emergencyType.toUpperCase()} at ${data.pickupAddress}. Distance: ${data.distanceKm.toFixed(1)}km. ETA: ${data.etaMinutes}min. Patient: ${data.patientName} (${data.patientPhone}). Call ID: ${data.bookingId}`;
        await sendSMS(driverPhone, smsMessage);
        logger.info('Driver notified via SMS', { driverId, bookingId: data.bookingId });
      } catch (error) {
        logger.error('SMS notification failed', { driverId, error: error.message });
      }
    }
  }

  async notifyPatient(patient, data) {
    // Try FCM
    if (patient.fcmToken) {
      try {
        await sendToToken(patient.fcmToken, {
          title: 'Ambulance Dispatched',
          body: `Your ambulance (${data.ambulanceNumber}) is on the way. ETA: ${data.etaMinutes}min. Driver: ${data.driverName}`,
          data: {
            type: 'AMBULANCE_DISPATCHED',
            ...data,
          },
        });
        return;
      } catch (error) {
        logger.warn('Patient FCM failed', { error: error.message });
      }
    }

    // Try Web Push
    if (patient.webPushSubscription?.endpoint) {
      try {
        await sendToSubscription(patient.webPushSubscription, {
          title: 'Ambulance Dispatched',
          body: `Your ambulance (${data.ambulanceNumber}) is on the way. ETA: ${data.etaMinutes}min. Driver: ${data.driverName}`,
          data: { type: 'AMBULANCE_DISPATCHED', ...data },
          tag: `ambulance-${data.bookingId}`,
        });
        return;
      } catch (error) {
        logger.warn('Patient Web Push failed', { error: error.message });
      }
    }

    // SMS fallback
    const patientPhone = formatPhoneNumber(patient.phone || patient.emergencyContact?.phone);
    if (patientPhone) {
      try {
        const smsMessage = `Ambulance ${data.ambulanceNumber} dispatched. Driver: ${data.driverName} (${data.driverPhone}). ETA: ${data.etaMinutes}min. Call ID: ${data.bookingId}`;
        await sendSMS(patientPhone, smsMessage);
      } catch (error) {
        logger.error('Patient SMS failed', { error: error.message });
      }
    }
  }

  async getCallStatus(req, res) {
    try {
      const { callId } = req.params;
      const patientId = req.user._id;

      const booking = await AmbulanceBooking.findOne({ bookingId: callId, patient: patientId })
        .populate('ambulance', 'vehicleNumber driver currentLocation status')
        .populate('dropLocation.facility', 'name address.coordinates')
        .lean();

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Emergency call not found' });
      }

      let ambulanceLocation = null;
      let etaMinutes = booking.etaMinutes;

      if (booking.ambulance) {
        ambulanceLocation = {
          lat: booking.ambulance.currentLocation?.lat,
          lng: booking.ambulance.currentLocation?.lng,
          updatedAt: booking.ambulance.currentLocation?.updatedAt,
          status: booking.ambulance.status,
        };

        // Recalculate ETA based on current ambulance location
        if (booking.status === 'en_route_pickup' || booking.status === 'en_route_hospital') {
          const targetLat =
            booking.status === 'en_route_pickup'
              ? booking.pickupLocation.lat
              : booking.dropLocation.lat;
          const targetLng =
            booking.status === 'en_route_pickup'
              ? booking.pickupLocation.lng
              : booking.dropLocation.lng;

          if (ambulanceLocation.lat && ambulanceLocation.lng) {
            const distance = haversineDistance(
              ambulanceLocation.lat,
              ambulanceLocation.lng,
              targetLat,
              targetLng
            );
            etaMinutes = estimateDurationMinutes(distance);
          }
        }
      }

      const statusMessages = {
        requested: 'Finding nearest ambulance...',
        assigned: 'Ambulance assigned, driver being notified',
        driver_accepted: 'Driver accepted, heading to pickup',
        en_route_pickup: 'Ambulance en route to pickup location',
        on_scene: 'Ambulance at pickup location',
        en_route_hospital: 'Patient loaded, heading to hospital',
        at_hospital: 'Arrived at hospital',
        completed: 'Emergency completed',
        cancelled: 'Emergency cancelled',
      };

      res.json({
        success: true,
        data: {
          callId: booking.bookingId,
          status: booking.status,
          statusMessage: statusMessages[booking.status] || booking.status,
          emergencyType: booking.emergencyType,
          priority: booking.priority,
          pickupLocation: booking.pickupLocation,
          dropLocation: booking.dropLocation,
          ambulance: booking.ambulance
            ? {
                vehicleNumber: booking.ambulance.vehicleNumber,
                driverName: booking.ambulance.driver?.name,
                driverPhone: booking.ambulance.driver?.phone,
                currentLocation: ambulanceLocation,
              }
            : null,
          etaMinutes,
          distanceKm: booking.distanceKm,
          durationMinutes: booking.durationMinutes,
          timestamps: {
            assignedAt: booking.assignedAt,
            driverAcceptedAt: booking.driverAcceptedAt,
            pickupAt: booking.pickupAt,
            departureAt: booking.departureAt,
            arrivalAt: booking.arrivalAt,
            completedAt: booking.completedAt,
          },
        },
      });
    } catch (error) {
      logger.error('Get emergency status error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch emergency status' });
    }
  }

  async getActiveCalls(req, res) {
    try {
      const patientId = req.user._id;

      const activeStatuses = [
        'requested',
        'assigned',
        'driver_accepted',
        'en_route_pickup',
        'on_scene',
        'en_route_hospital',
        'at_hospital',
      ];

      const calls = await AmbulanceBooking.find({
        patient: patientId,
        status: { $in: activeStatuses },
      })
        .populate('ambulance', 'vehicleNumber driver currentLocation status')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      res.json({
        success: true,
        data: calls.map(call => ({
          callId: call.bookingId,
          status: call.status,
          emergencyType: call.emergencyType,
          priority: call.priority,
          pickupLocation: call.pickupLocation,
          dropLocation: call.dropLocation,
          ambulance: call.ambulance
            ? {
                vehicleNumber: call.ambulance.vehicleNumber,
                driverName: call.ambulance.driver?.name,
                currentLocation: call.ambulance.currentLocation,
                status: call.ambulance.status,
              }
            : null,
          etaMinutes: call.etaMinutes,
          createdAt: call.createdAt,
        })),
      });
    } catch (error) {
      logger.error('Get active calls error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch active calls' });
    }
  }

  async driverUpdateLocation(req, res) {
    try {
      const { callId } = req.params;
      const { lat, lng, status } = req.body;

      if (!lat || !lng) {
        return res.status(400).json({ success: false, message: 'Location required' });
      }

      const booking = await AmbulanceBooking.findOne({ bookingId: callId }).populate('ambulance');
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      // Update ambulance location
      await Ambulance.findByIdAndUpdate(booking.ambulance._id, {
        'currentLocation.lat': parseFloat(lat),
        'currentLocation.lng': parseFloat(lng),
        'currentLocation.updatedAt': new Date(),
        ...(status && { status }),
      });

      // Update booking status if provided
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

      // Recalculate ETA using Google Maps
      const amb = await Ambulance.findById(booking.ambulance._id).lean();
      let etaMinutes = 0;
      let distanceKm = 0;

      if (amb?.currentLocation?.lat) {
        const targetLat =
          booking.status === 'en_route_pickup'
            ? booking.pickupLocation.lat
            : booking.dropLocation.lat;
        const targetLng =
          booking.status === 'en_route_pickup'
            ? booking.pickupLocation.lng
            : booking.dropLocation.lng;

        const route = await getRouteDistanceAndDuration(
          { lat: amb.currentLocation.lat, lng: amb.currentLocation.lng },
          { lat: targetLat, lng: targetLng }
        );
        distanceKm = route.distanceKm;
        etaMinutes = route.durationMinutes;
      }

      // Emit real-time update via WebSocket
      emitToCall(callId, 'location_update', {
        callId,
        status: booking.status,
        ambulanceLocation: amb?.currentLocation,
        etaMinutes,
        distanceKm,
        updatedAt: new Date(),
      });

      if (booking.patient) {
        emitToPatient(booking.patient.toString(), 'call_update', {
          callId,
          status: booking.status,
          etaMinutes,
        });
      }

      res.json({
        success: true,
        data: {
          callId: booking.bookingId,
          status: booking.status,
          etaMinutes,
          distanceKm,
          ambulanceLocation: amb?.currentLocation,
        },
      });
    } catch (error) {
      logger.error('Driver location update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update location' });
    }
  }

  async driverAcceptCall(req, res) {
    try {
      const { callId } = req.params;
      const booking = await AmbulanceBooking.findOne({ bookingId: callId }).populate('ambulance');

      if (!booking) {
        return res.status(404).json({ success: false, message: 'Booking not found' });
      }

      if (booking.status !== 'assigned') {
        return res.status(400).json({ success: false, message: 'Call not in assigned state' });
      }

      booking.status = 'driver_accepted';
      booking.driverAcceptedAt = new Date();
      await booking.save();

      await Ambulance.findByIdAndUpdate(booking.ambulance._id, {
        status: 'en_route',
      });

      // Emit real-time update
      emitToCall(callId, 'status_update', {
        callId,
        status: 'driver_accepted',
        message: 'Driver accepted, heading to pickup',
      });

      if (booking.patient) {
        emitToPatient(booking.patient.toString(), 'call_update', {
          callId,
          status: 'driver_accepted',
        });
      }

      res.json({
        success: true,
        message: 'Call accepted, proceed to pickup location',
        data: {
          callId: booking.bookingId,
          pickupLocation: booking.pickupLocation,
        },
      });
    } catch (error) {
      logger.error('Driver accept call error:', error);
      res.status(500).json({ success: false, message: 'Failed to accept call' });
    }
  }
}

module.exports = new EmergencyController();
