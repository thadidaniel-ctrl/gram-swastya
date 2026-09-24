const {
  Patient,
  Diagnosis,
  Medicine,
  Appointment,
  Prescription,
  Pregnancy,
  Child,
  Doctor,
} = require('../models');
const logger = require('../utils/logger');

const sanitizePatient = patient => {
  return {
    id: patient._id,
    phone: patient.phone,
    email: patient.email,
    name: patient.name,
    age: patient.age,
    gender: patient.gender,
    address: patient.address,
    bloodType: patient.bloodType,
    emergencyContact: patient.emergencyContact,
    allergies: patient.allergies,
    currentMedications: patient.currentMedications,
    medicalHistory: patient.medicalHistory,
    preferredLanguage: patient.preferredLanguage,
    isActive: patient.isActive,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  };
};

class PatientProfileController {
  // GET /api/patient/doctors/directory - List verified doctors for sharing files
  async getDoctorsDirectory(req, res) {
    try {
      const doctors = await Doctor.find({ isActive: true, isVerified: true })
        .select(
          'profile.firstName profile.lastName profile.specialization profile.languages rating consultationFee videoConsultationEnabled'
        )
        .sort({ 'profile.lastName': 1 })
        .lean()
        .limit(200);

      const directory = doctors.map(d => ({
        id: d._id,
        name: `${d.profile.firstName} ${d.profile.lastName}`,
        firstName: d.profile.firstName,
        lastName: d.profile.lastName,
        specialization: d.profile.specialization,
        languages: d.profile.languages || [],
        rating: d.rating || 0,
        consultationFee: d.consultationFee || 0,
        videoConsultationEnabled: Boolean(d.videoConsultationEnabled),
      }));

      res.json({ success: true, data: directory, count: directory.length });
    } catch (error) {
      logger.error('Doctors directory error:', error);
      res.status(500).json({ success: false, message: 'Failed to load doctors' });
    }
  }

  async getProfile(req, res) {
    try {
      const patient = await Patient.findById(req.user._id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      const healthHistory = await this.getHealthHistoryInternal(patient._id);

      res.json({
        success: true,
        patient: sanitizePatient(patient),
        healthHistory,
      });
    } catch (error) {
      logger.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile',
      });
    }
  }

  async updateProfile(req, res) {
    try {
      const allowedUpdates = [
        'name',
        'age',
        'gender',
        'address',
        'bloodType',
        'email',
        'emergencyContact',
        'preferredLanguage',
      ];

      const updates = {};
      allowedUpdates.forEach(field => {
        const value = req.body[field];
        if (value !== undefined) {
          updates[field] = value;
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid fields to update',
        });
      }

      if (updates.email) {
        const existing = await Patient.findOne({
          email: updates.email.toLowerCase(),
          _id: { $ne: req.user._id },
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Email already in use',
          });
        }
        updates.email = updates.email.toLowerCase();
      }

      if (updates.address) {
        updates.address = {
          village: updates.address.village || '',
          district: updates.address.district || '',
          state: updates.address.state || '',
          pincode: updates.address.pincode || '',
        };
      }

      if (updates.emergencyContact) {
        updates.emergencyContact = {
          name: updates.emergencyContact.name || '',
          phone: updates.emergencyContact.phone || '',
          relation: updates.emergencyContact.relation || '',
        };
      }

      const patient = await Patient.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        patient: sanitizePatient(patient),
      });
    } catch (error) {
      logger.error('Update profile error:', error);
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Email already in use',
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
      });
    }
  }

  async getHealthHistory(req, res) {
    try {
      const patientId = req.user._id;

      const [diagnoses, medicines, appointments, prescriptions, pregnancy, children] =
        await Promise.all([
          Diagnosis.find({ patient: patientId }).sort({ createdAt: -1 }).limit(50).lean(),
          Medicine.find({ patient: patientId, isActive: true }).lean(),
          Appointment.find({ patient: patientId })
            .sort({ scheduledAt: -1 })
            .limit(20)
            .populate('doctor', 'profile.fullName profile.specialization')
            .lean(),
          Prescription.find({ patient: patientId })
            .sort({ createdAt: -1 })
            .limit(20)
            .populate('doctor', 'profile.fullName')
            .lean(),
          Pregnancy.findOne({ patient: patientId }).lean(),
          Child.find({ patient: patientId }).lean(),
        ]);

      res.json({
        success: true,
        healthHistory: {
          diagnoses,
          medicines,
          appointments,
          prescriptions,
          pregnancy,
          children,
        },
      });
    } catch (error) {
      logger.error('Get health history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch health history',
      });
    }
  }

  async addAllergy(req, res) {
    try {
      const { allergen } = req.body;

      const patient = await Patient.findByIdAndUpdate(
        req.user._id,
        {
          $push: {
            allergies: allergen,
          },
        },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Allergy added',
        patient: sanitizePatient(patient),
      });
    } catch (error) {
      logger.error('Add allergy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add allergy',
      });
    }
  }

  async removeAllergy(req, res) {
    try {
      const { allergen } = req.params;

      const patient = await Patient.findByIdAndUpdate(
        req.user._id,
        { $pull: { allergies: allergen } },
        { new: true }
      );

      res.json({
        success: true,
        message: 'Allergy removed',
        patient: sanitizePatient(patient),
      });
    } catch (error) {
      logger.error('Remove allergy error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to remove allergy',
      });
    }
  }

  async updateFCMToken(req, res) {
    try {
      const { fcmToken } = req.body;

      await Patient.findByIdAndUpdate(req.user._id, { fcmToken });

      res.json({
        success: true,
        message: 'FCM token updated',
      });
    } catch (error) {
      logger.error('Update FCM token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update FCM token',
      });
    }
  }

  async updateWebPushToken(req, res) {
    try {
      const { webPushEndpoint, webPushSubscription } = req.body;

      if (!webPushEndpoint) {
        return res.status(400).json({
          success: false,
          message: 'webPushEndpoint is required',
        });
      }

      await Patient.findByIdAndUpdate(req.user._id, {
        fcmToken: null,
        webPushSubscription: webPushSubscription || { endpoint: webPushEndpoint },
      });

      res.json({
        success: true,
        message: 'Web Push subscription updated',
      });
    } catch (error) {
      logger.error('Update Web Push token error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update Web Push subscription',
      });
    }
  }

  async getHealthHistoryInternal(patientId) {
    const [diagnoses, medicines, appointments, prescriptions, pregnancy, children] =
      await Promise.all([
        Diagnosis.find({ patient: patientId }).sort({ createdAt: -1 }).limit(10).lean(),
        Medicine.find({ patient: patientId, isActive: true }).lean(),
        Appointment.find({ patient: patientId })
          .sort({ scheduledAt: -1 })
          .limit(10)
          .populate('doctor', 'profile.fullName profile.specialization')
          .lean(),
        Prescription.find({ patient: patientId })
          .sort({ createdAt: -1 })
          .limit(10)
          .populate('doctor', 'profile.fullName')
          .lean(),
        Pregnancy.findOne({ patient: patientId }).lean(),
        Child.find({ patient: patientId }).lean(),
      ]);

    return {
      diagnoses,
      medicines,
      appointments,
      prescriptions,
      pregnancy,
      children,
    };
  }

  sanitizePatient(patient) {
    return {
      id: patient._id,
      phone: patient.phone,
      email: patient.email,
      name: patient.name,
      age: patient.age,
      gender: patient.gender,
      address: patient.address,
      bloodType: patient.bloodType,
      emergencyContact: patient.emergencyContact,
      allergies: patient.allergies,
      currentMedications: patient.currentMedications,
      medicalHistory: patient.medicalHistory,
      preferredLanguage: patient.preferredLanguage,
      isActive: patient.isActive,
      createdAt: patient.createdAt,
      updatedAt: patient.updatedAt,
    };
  }
}

module.exports = new PatientProfileController();
