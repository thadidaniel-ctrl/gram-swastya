const mongoose = require('mongoose');

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ['phc', 'chc', 'dh', 'sc', 'private_clinic', 'hospital'],
      required: true,
    },

    address: {
      village: String,
      district: { type: String, required: true, index: true },
      state: { type: String, required: true },
      pincode: String,
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },

    phone: String,
    email: String,

    services: [
      {
        type: String,
        enum: [
          'general_opd',
          'maternal_care',
          'child_health',
          'immunization',
          'lab',
          'pharmacy',
          'emergency',
          'telemedicine',
        ],
      },
    ],

    operatingHours: {
      monday: { open: String, close: String, isClosed: Boolean },
      tuesday: { open: String, close: String, isClosed: Boolean },
      wednesday: { open: String, close: String, isClosed: Boolean },
      thursday: { open: String, close: String, isClosed: Boolean },
      friday: { open: String, close: String, isClosed: Boolean },
      saturday: { open: String, close: String, isClosed: Boolean },
      sunday: { open: String, close: String, isClosed: Boolean },
    },

    doctors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' }],
    chws: [{ type: mongoose.Schema.Types.ObjectId, ref: 'CHW' }],

    hasAmbulance: { type: Boolean, default: false },
    ambulanceCount: { type: Number, default: 0 },

    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

facilitySchema.index({ 'address.coordinates': '2dsphere' });
facilitySchema.index({ type: 1, 'address.district': 1 });

module.exports = mongoose.model('Facility', facilitySchema);
