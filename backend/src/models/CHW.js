const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const chwSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, sparse: true, unique: true },
    passwordHash: { type: String, select: false },

    profile: {
      firstName: { type: String, required: true },
      lastName: { type: String, required: true },
      gender: { type: String, enum: ['male', 'female', 'other'] },
      dateOfBirth: Date,
      photo: String,
    },

    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility', required: true },
    assignedVillages: [String],
    assignedPopulation: Number,

    languages: [{ type: String, enum: ['en', 'hi', 'te', 'ta', 'mr'] }],

    qualifications: [String],
    trainingCompleted: [
      {
        name: String,
        completedAt: Date,
        expiryDate: Date,
      },
    ],

    isActive: { type: Boolean, default: true },
    isPhoneVerified: { type: Boolean, default: false },
    lastLogin: Date,

    fcmToken: String,

    performance: {
      screeningsDone: { type: Number, default: 0 },
      referralsMade: { type: Number, default: 0 },
      followUpsCompleted: { type: Number, default: 0 },
      lastScreeningAt: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

chwSchema.virtual('fullName').get(function () {
  return `${this.profile?.firstName} ${this.profile?.lastName}`;
});

chwSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

chwSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

module.exports = mongoose.model('CHW', chwSchema);
