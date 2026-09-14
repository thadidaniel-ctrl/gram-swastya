const mongoose = require('mongoose');

const ambulanceSchema = new mongoose.Schema(
  {
    vehicleNumber: { type: String, required: true, unique: true },
    type: {
      type: String,
      enum: ['bls', 'als', 'patient_transport', 'mortuary'],
      default: 'bls',
    },

    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },

    driver: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      licenseNumber: String,
      licenseExpiry: Date,
    },

    currentLocation: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      updatedAt: { type: Date, default: Date.now },
    },

    status: {
      type: String,
      enum: [
        'available',
        'en_route',
        'on_scene',
        'transporting',
        'at_hospital',
        'maintenance',
        'offline',
      ],
      default: 'available',
      index: true,
    },

    equipment: [
      {
        name: String,
        quantity: Number,
        condition: { type: String, enum: ['good', 'needs_repair', 'missing'] },
      },
    ],

    currentBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'AmbulanceBooking' },

    isActive: { type: Boolean, default: true },
    lastMaintenanceDate: Date,
    nextMaintenanceDate: Date,

    gpsDeviceId: String,
    simNumber: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ambulanceSchema.index({ currentLocation: '2dsphere' });
ambulanceSchema.index({ facility: 1, status: 1 });

module.exports = mongoose.model('Ambulance', ambulanceSchema);
