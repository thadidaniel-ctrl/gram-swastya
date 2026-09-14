const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true, index: true },

    scheduledAt: { type: Date, required: true, index: true },
    duration: { type: Number, default: 15 },

    type: {
      type: String,
      enum: ['video', 'audio', 'in_person'],
      default: 'video',
    },

    status: {
      type: String,
      enum: [
        'scheduled',
        'confirmed',
        'in_progress',
        'completed',
        'cancelled',
        'no_show',
        'rescheduled',
      ],
      default: 'scheduled',
      index: true,
    },

    meetingLink: String,
    meetingId: String,
    meetingPassword: String,

    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },

    payment: {
      amount: { type: Number, default: 0 },
      method: { type: String, enum: ['upi', 'net_banking', 'cash', 'insurance'], default: 'cash' },
      transactionId: String,
      status: {
        type: String,
        enum: ['pending', 'completed', 'failed', 'refunded'],
        default: 'pending',
      },
      paidAt: Date,
    },

    cancellationReason: String,
    cancelledAt: Date,
    cancelledBy: { type: String, enum: ['patient', 'doctor', 'system'] },

    remindersSent: [
      {
        type: { type: String, enum: ['sms', 'push', 'email'] },
        sentAt: { type: Date, default: Date.now },
        status: { type: String, enum: ['sent', 'delivered', 'failed'] },
      },
    ],

    notes: {
      patient: String,
      doctor: String,
    },

    isSynced: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

appointmentSchema.virtual('isUpcoming').get(function () {
  return this.scheduledAt > new Date() && ['scheduled', 'confirmed'].includes(this.status);
});

appointmentSchema.virtual('canJoin').get(function () {
  if (this.status !== 'confirmed') return false;
  const diff = new Date(this.scheduledAt).getTime() - Date.now();
  return diff <= 15 * 60 * 1000 && diff >= -30 * 60 * 1000;
});

appointmentSchema.index({ patient: 1, scheduledAt: 1 });
appointmentSchema.index({ doctor: 1, scheduledAt: 1 });
appointmentSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
