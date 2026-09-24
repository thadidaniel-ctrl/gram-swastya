const mongoose = require('mongoose');

const fileAccessLogSchema = new mongoose.Schema(
  {
    // File & Patient Info
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalFileStorage',
      required: true,
    },
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },

    // Access Information
    accessType: {
      type: String,
      enum: [
        'upload',
        'download',
        'delete',
        'share',
        'restore',
        'preview',
        'update',
        'move',
        'cleanup',
      ],
      required: true,
    },
    accessedBy: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    userType: {
      type: String,
      enum: ['patient', 'doctor', 'system'],
      required: true,
    },

    // Access Details
    ipAddress: { type: String },
    userAgent: { type: String },

    // Metadata
    timestamp: { type: Date, default: Date.now },
    duration: { type: Number }, // seconds, if applicable
    success: { type: Boolean, default: true },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

fileAccessLogSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

fileAccessLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Indexes
fileAccessLogSchema.index({ patientId: 1, timestamp: -1 });
fileAccessLogSchema.index({ fileId: 1 });

module.exports = mongoose.model('FileAccessLog', fileAccessLogSchema);
