const mongoose = require('mongoose');

const conditionMatchSchema = new mongoose.Schema(
  {
    conditionId: String,
    conditionName: String,
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    matchingSymptoms: Number,
    totalSymptoms: Number,
    probability: Number,
    icd10Code: String,
    recommendation: { type: String, enum: ['home_care', 'clinic', 'emergency'] },
  },
  { _id: false }
);

const diagnosisSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    chw: { type: mongoose.Schema.Types.ObjectId, ref: 'CHW' },

    symptomIds: [{ type: String, required: true }],
    symptoms: [
      {
        id: String,
        name: String,
        category: String,
      },
    ],

    conditions: [conditionMatchSchema],

    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    recommendation: { type: String, enum: ['home_care', 'clinic', 'emergency'], required: true },

    redFlags: [String],
    homeCareAdvice: [String],
    aiExplanation: String,
    confidenceScore: { type: Number, min: 0, max: 1 },
    requiresHumanReview: { type: Boolean, default: false },

    source: { type: String, enum: ['rule_based', 'gemini_ai', 'hybrid'], default: 'hybrid' },
    language: { type: String, enum: ['en', 'hi', 'te', 'ta', 'mr'], default: 'en' },

    followUpAction: {
      type: String,
      enum: ['none', 'book_appointment', 'call_ambulance', 'visit_phc'],
    },
    followUpCompleted: { type: Boolean, default: false },

    isSynced: { type: Boolean, default: false },
    syncedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

diagnosisSchema.index({ patient: 1, createdAt: -1 });
diagnosisSchema.index({ riskLevel: 1, createdAt: -1 });

module.exports = mongoose.model('Diagnosis', diagnosisSchema);
