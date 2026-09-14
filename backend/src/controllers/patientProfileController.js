const {
  Patient,
  Diagnosis,
  Medicine,
  Appointment,
  Prescription,
  Pregnancy,
  Child,
} = require('../models');
const logger = require('../utils/logger');

class PatientProfileController {
  async getProfile(req, res) {
    try {
      const patient = await Patient.findById(req.user._id);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      const healthHistory = await this.getHealthHistory(patient._id);

      res.json({
        success: true,
        patient: this.sanitizePatient(patient),
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
        patient: this.sanitizePatient(patient),
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
      const { allergen, severity, reaction, diagnosedDate } = req.body;

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
        patient: this.sanitizePatient(patient),
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
        patient: this.sanitizePatient(patient),
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
