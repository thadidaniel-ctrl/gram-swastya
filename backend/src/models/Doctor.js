const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const availabilitySchema = new mongoose.Schema(
  {
    dayOfWeek: { type: Number, min: 0, max: 6, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    maxAppointments: { type: Number, default: 4 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false }
);

const doctorSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    email: { type: String, sparse: true, unique: true },
    passwordHash: { type: String, select: false },

    profile: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      qualification: { type: String, required: true },
      specialization: { type: String, required: true },
      subSpecialization: String,
      experience: { type: Number, required: true, min: 0 },
      registrationNumber: { type: String, required: true, unique: true },
      registrationCouncil: String,
      photo: String,
      bio: String,
      languages: [{ type: String, enum: ['en', 'hi', 'te', 'ta', 'mr'] }],
    },

    clinic: {
      name: String,
      address: {
        village: String,
        district: String,
        state: String,
        pincode: String,
        coordinates: { lat: Number, lng: Number },
      },
      phone: String,
    },

    consultationFee: { type: Number, required: true },
    videoConsultationEnabled: { type: Boolean, default: true },
    acceptsOnlinePayment: { type: Boolean, default: true },

    availability: [availabilitySchema],

    isVerified: { type: Boolean, default: false },
    verificationDocuments: [
      {
        type: String,
        url: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'] },
      },
    ],

    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0 },

    isPhoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,

    fcmToken: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

doctorSchema.virtual('fullName').get(function () {
  return `Dr. ${this.profile?.firstName} ${this.profile?.lastName}`;
});

doctorSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

doctorSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

doctorSchema.index({
  'profile.specialization': 1,
  'profile.languages': 1,
  'clinic.address.coordinates': '2dsphere',
});

module.exports = mongoose.model('Doctor', doctorSchema);
