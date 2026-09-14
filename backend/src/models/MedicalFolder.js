const mongoose = require('mongoose');

const medicalFolderSchema = new mongoose.Schema(
  {
    // Ownership
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },

    // Folder Info
    folderName: { type: String, required: true, trim: true, maxlength: 100 },
    color: { type: String, default: '#4287F5', match: /^#[0-9A-Fa-f]{6}$/ },
    description: { type: String, maxlength: 500 },

    // Hierarchy
    parentFolderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalFolder',
      default: null,
    },

    // Status
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },

    // Metadata
    fileCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

medicalFolderSchema.virtual('id').get(function () {
  return this._id.toHexString();
});

medicalFolderSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

// Indexes
medicalFolderSchema.index({ patientId: 1, isDeleted: 1 });
medicalFolderSchema.index({ patientId: 1, parentFolderId: 1 });
// Unique folder name per parent
medicalFolderSchema.index({ patientId: 1, parentFolderId: 1, folderName: 1 }, { unique: true });

module.exports = mongoose.model('MedicalFolder', medicalFolderSchema);
