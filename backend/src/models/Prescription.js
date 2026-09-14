const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    genericName: String,
    strength: { type: String, required: true },
    form: String,
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    route: { type: String, default: 'oral' },
    instructions: String,
    isGeneric: { type: Boolean, default: true },
    quantity: Number,
  },
  { _id: true }
);

const prescriptionSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },

    medications: [medicationSchema],

    instructions: [String],
    followUpInstructions: [String],
    followUpDate: Date,
    labTests: [String],
    diagnosis: String,
    notes: String,

    pdfUrl: String,
    isDigital: { type: Boolean, default: true },

    dispensedAt: Date,
    dispensedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pharmacy' },
    dispensedMedications: [
      {
        medication: { type: mongoose.Schema.Types.ObjectId, ref: 'Medicine' },
        quantity: Number,
        batchNumber: String,
      },
    ],

    isSynced: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

prescriptionSchema.index({ patient: 1, createdAt: -1 });
prescriptionSchema.index({ doctor: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
