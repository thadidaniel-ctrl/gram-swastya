const mongoose = require('mongoose');

const previousVersionSchema = new mongoose.Schema(
  {
    fileKey: { type: String, required: true },
    uploadedAt: { type: Date, required: true },
    uploadedByDoctor: { type: Boolean, default: false },
  },
  { _id: false }
);

const sharedWithSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    sharedAt: { type: Date, default: Date.now },
    accessLevel: { type: String, enum: ['view-only'], default: 'view-only' },
    expiresAt: { type: Date },
  },
  { _id: false }
);

const medicalFileSchema = new mongoose.Schema(
  {
    // Ownership & Identification
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    fileName: { type: String, required: true },
    fileKey: { type: String, required: true, unique: true },

    // File Details
    mimeType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    originalSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now },
    documentDate: { type: Date, index: true },

    // Organization
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalFolder',
      default: null,
    },
    category: {
      type: String,
      enum: [
        'Lab Report',
        'Prescription',
        'Medical Image',
        'Hospital Record',
        'Vaccination',
        'Insurance',
        'Other',
      ],
      default: 'Other',
      index: true,
    },
    tags: [{ type: String }],

    // Status
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
    recoveryExpiresAt: { type: Date },

    // Sharing
    sharedWith: [sharedWithSchema],

    // Versioning
    version: { type: Number, default: 1 },
    previousVersions: [previousVersionSchema],

    // Metadata
    description: { type: String },

    // Security
    encrypted: { type: Boolean, default: true },
    encryptionKey: { type: String }, // reference to AWS Secrets Manager
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

medicalFileSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

medicalFileSchema.virtual('downloadUrl').get(function () {
  return `/api/file-storage/${this._id}/download`;
});

medicalFileSchema.virtual('previewUrl').get(function () {
  return `/api/file-storage/${this._id}/preview`;
});

medicalFileSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Indexes for Performance
medicalFileSchema.index({ patientId: 1, isDeleted: 1 });
medicalFileSchema.index({ patientId: 1, folderId: 1 });
medicalFileSchema.index({ patientId: 1, tags: 1 });
medicalFileSchema.index({ patientId: 1, uploadedAt: -1 });
medicalFileSchema.index({ recoveryExpiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('MedicalFileStorage', medicalFileSchema);
