const mongoose = require('mongoose');

const prenatalVisitSchema = new mongoose.Schema(
  {
    weekNumber: { type: Number, required: true },
    scheduledDate: { type: Date, required: true },
    actualDate: Date,
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },

    vitals: {
      weight: Number,
      bpSystolic: Number,
      bpDiastolic: Number,
      fetalHeartRate: Number,
      fundalHeight: Number,
      presentation: String,
    },

    investigations: [String],
    medicationsGiven: [String],
    notes: String,
    isCompleted: { type: Boolean, default: false },
    nextVisitDate: Date,
  },
  { _id: true, timestamps: true }
);

const symptomSchema = new mongoose.Schema(
  {
    weekNumber: Number,
    date: Date,
    symptom: String,
    severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
    notes: String,
  },
  { _id: true }
);

const dangerSignSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    sign: { type: String, required: true },
    description: String,
    actionTaken: String,
    isResolved: { type: Boolean, default: false },
    resolvedDate: Date,
  },
  { _id: true }
);

const birthPlanSchema = new mongoose.Schema(
  {
    preferredFacility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
    preferredProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    transportPlan: String,
    bloodDonor: {
      name: String,
      phone: String,
      bloodGroup: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
    },
    itemsPrepared: [String],
    itemsNeeded: [String],
    notes: String,
  },
  { _id: true, timestamps: true }
);

const pregnancySchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    chw: { type: mongoose.Schema.Types.ObjectId, ref: 'CHW' },

    status: {
      type: String,
      enum: ['confirmed', 'ongoing', 'delivered', 'miscarriage', 'terminated'],
      default: 'confirmed',
    },

    lmpDate: { type: Date, required: true },
    eddDate: Date,
    deliveryDate: Date,
    deliveryType: { type: String, enum: ['normal', 'c_section', 'assisted'] },
    deliveryFacility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
    deliveryProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },

    gravida: { type: Number, default: 1 },
    para: { type: Number, default: 0 },
    abortions: { type: Number, default: 0 },
    livingChildren: { type: Number, default: 0 },

    riskFactors: [String],
    isHighRisk: { type: Boolean, default: false },

    prenatalVisits: [prenatalVisitSchema],
    symptoms: [symptomSchema],
    dangerSigns: [dangerSignSchema],
    birthPlan: birthPlanSchema,

    isSynced: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

pregnancySchema.virtual('currentWeek').get(function () {
  if (!this.lmpDate) return 0;
  const diff = Date.now() - new Date(this.lmpDate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
});

pregnancySchema.virtual('currentTrimester').get(function () {
  const week = this.currentWeek;
  if (week <= 13) return 'first';
  if (week <= 27) return 'second';
  return 'third';
});

pregnancySchema.virtual('daysUntilEDD').get(function () {
  if (!this.eddDate) return null;
  const diff = new Date(this.eddDate).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

pregnancySchema.pre('save', function (next) {
  if (this.lmpDate && !this.eddDate) {
    this.eddDate = new Date(new Date(this.lmpDate).getTime() + 280 * 24 * 60 * 60 * 1000);
  }

  const highRiskFactors = [
    'age_gt_35',
    'age_lt_18',
    'previous_cs',
    'multiple_pregnancy',
    'hypertension',
    'diabetes',
    'heart_disease',
    'previous_preterm',
    'previous_stillbirth',
    'bleeding',
    'anemia_severe',
  ];

  this.isHighRisk = this.riskFactors.some(f => highRiskFactors.includes(f));

  next();
});

module.exports = mongoose.model('Pregnancy', pregnancySchema);
