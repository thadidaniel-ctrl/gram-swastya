const mongoose = require('mongoose');

const pharmacySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    address: {
      village: String,
      district: { type: String, required: true, index: true },
      state: { type: String, required: true },
      pincode: String,
      coordinates: {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
      },
    },

    phone: String,
    email: String,
    licenseNumber: { type: String, required: true, unique: true },

    operatingHours: {
      monday: { open: String, close: String, isClosed: Boolean },
      tuesday: { open: String, close: String, isClosed: Boolean },
      wednesday: { open: String, close: String, isClosed: Boolean },
      thursday: { open: String, close: String, isClosed: Boolean },
      friday: { open: String, close: String, isClosed: Boolean },
      saturday: { open: String, close: String, isClosed: Boolean },
      sunday: { open: String, close: String, isClosed: Boolean },
    },

    hasHomeDelivery: { type: Boolean, default: false },
    deliveryRadius: { type: Number, default: 10 },
    deliveryFee: { type: Number, default: 0 },

    medicines: [
      {
        name: String,
        genericName: String,
        strength: String,
        form: String,
        price: Number,
        stock: Number,
        manufacturer: String,
        batchNumber: String,
        expiryDate: Date,
      },
    ],

    acceptsOnlinePayment: { type: Boolean, default: false },
    upiId: String,

    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },

    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

pharmacySchema.index({ 'address.coordinates': '2dsphere' });
pharmacySchema.index({ 'address.district': 1 });

module.exports = mongoose.model('Pharmacy', pharmacySchema);
