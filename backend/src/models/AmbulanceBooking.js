const mongoose = require('mongoose');

const ambulanceBookingSchema = new mongoose.Schema(
  {
    bookingId: { type: String, required: true, unique: true },

    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    ambulance: { type: mongoose.Schema.Types.ObjectId, ref: 'Ambulance', required: true },

    pickupLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: String,
      landmark: String,
    },

    dropLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: String,
      facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
    },

    emergencyType: {
      type: String,
      enum: ['cardiac', 'trauma', 'maternal', 'pediatric', 'respiratory', 'stroke', 'general'],
      default: 'general',
    },

    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'high',
    },

    description: String,
    contactPhone: String,

    status: {
      type: String,
      enum: [
        'requested',
        'assigned',
        'driver_accepted',
        'en_route_pickup',
        'on_scene',
        'en_route_hospital',
        'at_hospital',
        'completed',
        'cancelled',
      ],
      default: 'requested',
      index: true,
    },

    assignedAt: Date,
    driverAcceptedAt: Date,
    pickupAt: Date,
    departureAt: Date,
    arrivalAt: Date,
    completedAt: Date,

    estimatedPickupTime: Date,
    estimatedArrivalTime: Date,
    actualPickupTime: Date,
    actualArrivalTime: Date,

    distanceKm: Number,
    durationMinutes: Number,

    cancellationReason: String,
    cancelledAt: Date,
    cancelledBy: { type: String, enum: ['patient', 'driver', 'dispatcher', 'system'] },

    feedback: {
      rating: { type: Number, min: 1, max: 5 },
      comment: String,
    },

    isSynced: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ambulanceBookingSchema.virtual('etaMinutes').get(function () {
  if (this.status === 'en_route_pickup' && this.estimatedPickupTime) {
    return Math.max(
      0,
      Math.ceil((new Date(this.estimatedPickupTime).getTime() - Date.now()) / 60000)
    );
  }
  if (this.status === 'en_route_hospital' && this.estimatedArrivalTime) {
    return Math.max(
      0,
      Math.ceil((new Date(this.estimatedArrivalTime).getTime() - Date.now()) / 60000)
    );
  }
  return this.durationMinutes || 0;
});

ambulanceBookingSchema.pre('save', function (next) {
  if (!this.bookingId) {
    this.bookingId = `AMB-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('AmbulanceBooking', ambulanceBookingSchema);
