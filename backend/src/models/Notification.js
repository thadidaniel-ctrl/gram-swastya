const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    medicine: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
    type: {
      type: String,
      enum: ['medicine_reminder', 'appointment_reminder', 'low_stock', 'refill', 'general'],
      default: 'general',
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    read: { type: Boolean, default: false, index: true },
    deliveredAt: { type: Date, default: Date.now },
    deliveredVia: {
      type: String,
      enum: ['fcm', 'webpush'],
      default: 'fcm',
    },
    response: {
      acknowledged: { type: Boolean, default: false },
      acknowledgedAt: Date,
      status: {
        type: String,
        enum: ['taken', 'missed', 'skipped', 'snoozed', null],
        default: null,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

notificationSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

notificationSchema.index({ patient: 1, read: 1 });
notificationSchema.index({ patient: 1, createdAt: -1 });
notificationSchema.index({ medicine: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
