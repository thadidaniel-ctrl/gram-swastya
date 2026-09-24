const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const addressSchema = new mongoose.Schema(
  {
    village: { type: String, default: '' },
    district: { type: String, default: '' },
    state: { type: String, default: '' },
    pincode: { type: String, default: '' },
  },
  { _id: false }
);

const emergencyContactSchema = new mongoose.Schema(
  {
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    relation: { type: String, default: '' },
  },
  { _id: false }
);

const medicalHistorySchema = new mongoose.Schema(
  {
    condition: { type: String, required: true },
    date: { type: Date, default: Date.now },
    notes: { type: String, default: '' },
  },
  { _id: false }
);

const reminderPreferencesSchema = new mongoose.Schema(
  {
    enableReminders: { type: Boolean, default: true },
    enablePushNotifications: { type: Boolean, default: true },
    dontNotifyBefore: { type: String, default: '22:00' },
  },
  { _id: false }
);

const patientSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    passwordHash: { type: String, select: false },
    name: { type: String, required: true },
    age: { type: Number, required: true },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    address: { type: addressSchema, default: {} },
    bloodType: { type: String, default: '' },
    emergencyContact: { type: emergencyContactSchema, default: {} },
    medicalHistory: { type: [medicalHistorySchema], default: [] },
    allergies: { type: [String], default: [] },
    currentMedications: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    fcmToken: String,
    webPushSubscription: {
      endpoint: String,
      keys: {
        p256dh: String,
        auth: String,
      },
    },
    preferredLanguage: { type: String, enum: ['en', 'hi', 'te', 'ta', 'mr'], default: 'en' },
    reminderPreferences: { type: reminderPreferencesSchema, default: {} },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

patientSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

patientSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

patientSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

patientSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash')) return next();
  this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  next();
});

module.exports = mongoose.model('Patient', patientSchema);
