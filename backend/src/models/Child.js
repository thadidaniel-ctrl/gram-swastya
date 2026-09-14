const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema(
  {
    vaccineName: { type: String, required: true },
    vaccineCode: { type: String, required: true },
    doseNumber: { type: Number, required: true },
    administeredDate: Date,
    nextDueDate: Date,
    administeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },
    facility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
    batchNumber: String,
    qrCodeData: String,
    isCompleted: { type: Boolean, default: false },
    notes: String,
  },
  { _id: true, timestamps: true }
);

const milestoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, enum: ['motor', 'cognitive', 'language', 'social'] },
    expectedAgeMonths: { type: Number, required: true },
    achievedDate: Date,
    notes: String,
  },
  { _id: true }
);

const growthRecordSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    weight: { type: Number, required: true },
    height: { type: Number, required: true },
    headCircumference: Number,
    notes: String,
  },
  { _id: true, timestamps: true }
);

const childSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    pregnancy: { type: mongoose.Schema.Types.ObjectId, ref: 'Pregnancy' },

    name: { type: String, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dateOfBirth: { type: Date, required: true },
    birthTime: String,

    birthWeight: Number,
    birthLength: Number,
    deliveryType: { type: String, enum: ['normal', 'c_section', 'assisted'] },
    deliveryFacility: { type: mongoose.Schema.Types.ObjectId, ref: 'Facility' },
    deliveryProvider: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },

    apgarScore1: { type: Number, min: 0, max: 10 },
    apgarScore5: { type: Number, min: 0, max: 10 },

    vaccinations: [vaccinationSchema],
    milestones: [milestoneSchema],
    growthRecords: [growthRecordSchema],

    allergies: [String],
    medicalConditions: [String],

    pediatrician: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor' },

    isSynced: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

childSchema.virtual('ageInDays').get(function () {
  return Math.floor((Date.now() - new Date(this.dateOfBirth).getTime()) / (1000 * 60 * 60 * 24));
});

childSchema.virtual('ageInMonths').get(function () {
  return Math.floor(this.ageInDays / 30.44);
});

childSchema.methods.getNextDueVaccination = function () {
  const now = new Date();
  return (
    this.vaccinations
      .filter(v => v.nextDueDate && new Date(v.nextDueDate) > now && !v.isCompleted)
      .sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate))[0] || null
  );
};

childSchema.methods.getOverdueVaccinations = function () {
  const now = new Date();
  return this.vaccinations.filter(
    v => v.nextDueDate && new Date(v.nextDueDate) < now && !v.isCompleted
  );
};

childSchema.methods.getDueMilestones = function () {
  const ageMonths = this.ageInMonths;
  return this.milestones.filter(m => !m.achievedDate && m.expectedAgeMonths <= ageMonths + 1);
};

childSchema.methods.getDelayedMilestones = function () {
  const ageMonths = this.ageInMonths;
  return this.milestones.filter(m => !m.achievedDate && m.expectedAgeMonths < ageMonths - 1);
};

module.exports = mongoose.model('Child', childSchema);
