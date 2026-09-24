const { Appointment, Patient, Prescription, MedicalFileStorage } = require('../models');
const logger = require('../utils/logger');

class DoctorPatientsController {
  async getPatients(req, res) {
    try {
      const doctorId = req.user._id;
      const { page = 1, limit = 20, search, status } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const now = new Date();

      const matchStage = { doctor: doctorId };

      if (status) {
        matchStage.status = status;
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'patients',
            localField: 'patient',
            foreignField: '_id',
            as: 'patientInfo',
          },
        },
        { $unwind: { path: '$patientInfo', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$patientInfo._id',
            name: { $first: '$patientInfo.name' },
            phone: { $first: '$patientInfo.phone' },
            age: { $first: '$patientInfo.age' },
            gender: { $first: '$patientInfo.gender' },
            bloodType: { $first: '$patientInfo.bloodType' },
            isActive: { $first: '$patientInfo.isActive' },
            appointments: { $push: '$$ROOT' },
            lastAppointment: { $max: '$scheduledAt' },
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            phone: 1,
            age: 1,
            gender: 1,
            bloodType: 1,
            isActive: 1,
            totalAppointments: { $size: '$appointments' },
            upcomingAppointments: {
              $size: {
                $filter: {
                  input: '$appointments',
                  as: 'apt',
                  cond: {
                    $and: [
                      { $gt: ['$$apt.scheduledAt', now] },
                      { $in: ['$$apt.status', ['scheduled', 'confirmed']] },
                    ],
                  },
                },
              },
            },
            lastAppointment: 1,
            latestAppointmentStatus: {
              $arrayElemAt: [
                {
                  $map: {
                    input: {
                      $filter: {
                        input: '$appointments',
                        as: 'apt',
                        cond: { $eq: ['$$apt.scheduledAt', '$lastAppointment'] },
                      },
                    },
                    as: 'apt',
                    in: '$$apt.status',
                  },
                },
                0,
              ],
            },
          },
        },
        { $sort: { lastAppointment: -1 } },
      ];

      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        pipeline.push({
          $match: {
            $or: [{ name: searchRegex }, { phone: searchRegex }],
          },
        });
      }

      const totalPipeline = [...pipeline, { $count: 'total' }];
      const [patients, totalResult] = await Promise.all([
        Appointment.aggregate([...pipeline, { $skip: skip }, { $limit: limitNum }]),
        Appointment.aggregate(totalPipeline),
      ]);

      const total = totalResult[0]?.total || 0;

      const enrichedPatients = await Promise.all(
        patients.map(async p => {
          const [prescriptionCount, sharedFilesCount] = await Promise.all([
            Prescription.countDocuments({ doctor: doctorId, patient: p._id }),
            MedicalFileStorage.countDocuments({
              isDeleted: false,
              patientId: p._id,
              'sharedWith.doctorId': doctorId,
              'sharedWith.expiresAt': { $gt: now },
            }),
          ]);

          return {
            id: p._id,
            name: p.name,
            phone: p.phone,
            age: p.age,
            gender: p.gender,
            bloodType: p.bloodType,
            isActive: p.isActive,
            totalAppointments: p.totalAppointments,
            upcomingAppointments: p.upcomingAppointments,
            lastAppointment: p.lastAppointment,
            latestAppointmentStatus: p.latestAppointmentStatus,
            pendingPrescriptions: prescriptionCount,
            sharedFilesCount,
            healthStatus: this.calculateHealthStatus(p.upcomingAppointments, prescriptionCount),
          };
        })
      );

      res.json({
        success: true,
        patients: enrichedPatients,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error('Doctor patients error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch patients' });
    }
  }

  calculateHealthStatus(upcomingAppointments, pendingPrescriptions) {
    if (upcomingAppointments === 0 && pendingPrescriptions === 0) return 'stable';
    if (upcomingAppointments > 2 || pendingPrescriptions > 3) return 'attention';
    return 'monitoring';
  }

  async getPatientDetail(req, res) {
    try {
      const doctorId = req.user._id;
      const { patientId } = req.params;

      const [hasAppointment, hasSharedFile] = await Promise.all([
        Appointment.exists({ doctor: doctorId, patient: patientId }),
        MedicalFileStorage.exists({
          patientId,
          isDeleted: false,
          'sharedWith.doctorId': doctorId,
        }),
      ]);

      if (!hasAppointment && !hasSharedFile) {
        return res.status(403).json({
          success: false,
          message: 'You do not have access to this patient',
        });
      }

      const [patient, appointments, prescriptions, sharedFiles] = await Promise.all([
        Patient.findById(patientId).select('-passwordHash').lean(),
        Appointment.find({ doctor: doctorId, patient: patientId })
          .sort({ scheduledAt: -1 })
          .limit(10)
          .lean(),
        Prescription.find({ doctor: doctorId, patient: patientId })
          .sort({ createdAt: -1 })
          .limit(10)
          .lean(),
        MedicalFileStorage.find({
          isDeleted: false,
          patientId,
          'sharedWith.doctorId': doctorId,
        })
          .select('fileName category uploadedAt sharedWith')
          .sort({ uploadedAt: -1 })
          .limit(20)
          .lean(),
      ]);

      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      const upcomingAppointments = appointments.filter(
        a => new Date(a.scheduledAt) > new Date() && ['scheduled', 'confirmed'].includes(a.status)
      );

      res.json({
        success: true,
        patient: {
          ...patient,
          age: patient.age,
        },
        appointments: {
          upcoming: upcomingAppointments,
          past: appointments.filter(a => !upcomingAppointments.includes(a)),
        },
        prescriptions,
        sharedFiles,
      });
    } catch (error) {
      logger.error('Doctor patient detail error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch patient details' });
    }
  }
}

module.exports = new DoctorPatientsController();
