const mongoose = require('mongoose');

const doseTimeSchema = new mongoose.Schema(
  {
    time: { type: String, required: true },
    label: String,
    isEnabled: { type: Boolean, default: true },
  },
  { _id: false }
);

const doseLogSchema = new mongoose.Schema(
  {
    scheduledTime: { type: Date, required: true },
    takenTime: Date,
    status: {
      type: String,
      enum: ['taken', 'missed', 'skipped', 'snoozed'],
      default: 'missed',
    },
    notes: String,
  },
  { _id: true, timestamps: true }
);

const medicineSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },

    name: { type: String, required: true },
    genericName: { type: String, required: true },
    strength: { type: String, required: true },
    form: {
      type: String,
      enum: ['tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'patch'],
      required: true,
    },

    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'custom', 'as_needed'],
      default: 'daily',
    },
    doseTimes: [doseTimeSchema],
    intervalDays: { type: Number, default: 1 },

    startDate: { type: Date, required: true },
    endDate: Date,

    instructions: String,
    prescribedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },

    totalQuantity: { type: Number, default: 0 },
    remainingQuantity: { type: Number, default: 0 },
    lowStockThreshold: { type: Number, default: 5 },

    doseLogs: [doseLogSchema],

    enableReminders: { type: Boolean, default: true },
    enableSmsReminders: { type: Boolean, default: false },

    pharmacy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy' },
    substitutions: [
      {
        medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        reason: String,
        priceDifference: Number,
      },
    ],

    isActive: { type: Boolean, default: true },
    isSynced: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

medicineSchema.virtual('isLowStock').get(function () {
  return this.remainingQuantity > 0 && this.remainingQuantity <= this.lowStockThreshold;
});

medicineSchema.virtual('isOutOfStock').get(function () {
  return this.remainingQuantity <= 0;
});

medicineSchema.virtual('needsRefill').get(function () {
  return this.isLowStock || this.isOutOfStock;
});

medicineSchema.methods.getAdherenceRate = function (days = 30) {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const logs = this.doseLogs.filter(log => log.scheduledTime >= cutoff && log.status !== 'skipped');

  if (logs.length === 0) return 0;

  const taken = logs.filter(log => log.status === 'taken').length;
  return Math.round((taken / logs.length) * 100);
};

module.exports = mongoose.model('Medicine', medicineSchema);
