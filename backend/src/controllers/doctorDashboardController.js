const { MedicalFileStorage, Appointment, Prescription, Patient } = require('../models');
const logger = require('../utils/logger');

class DoctorDashboardController {
  async getDashboard(req, res) {
    try {
      const doctorId = req.user._id;
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const [sharedFileDocs, appointmentStats, prescriptionStats, patientCount] = await Promise.all(
        [
          MedicalFileStorage.find({
            isDeleted: false,
            'sharedWith.doctorId': doctorId,
          })
            .select('sharedWith patientId')
            .lean(),

          Appointment.aggregate([
            { $match: { doctor: doctorId } },
            {
              $facet: {
                upcoming: [
                  {
                    $match: {
                      scheduledAt: { $gt: now },
                      status: { $in: ['scheduled', 'confirmed'] },
                    },
                  },
                  { $count: 'count' },
                ],
                today: [
                  {
                    $match: {
                      scheduledAt: {
                        $gte: new Date(now.setHours(0, 0, 0, 0)),
                        $lt: new Date(now.setHours(23, 59, 59, 999)),
                      },
                      status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
                    },
                  },
                  { $count: 'count' },
                ],
                thisMonth: [
                  {
                    $match: {
                      scheduledAt: { $gte: startOfMonth },
                      status: { $in: ['completed', 'in_progress'] },
                    },
                  },
                  { $count: 'count' },
                ],
                thisWeek: [
                  {
                    $match: {
                      scheduledAt: { $gte: startOfWeek },
                      status: { $in: ['completed', 'in_progress'] },
                    },
                  },
                  { $count: 'count' },
                ],
                pending: [
                  { $match: { status: { $in: ['scheduled', 'confirmed'] } } },
                  { $count: 'count' },
                ],
              },
            },
          ]),

          Prescription.aggregate([
            { $match: { doctor: doctorId } },
            {
              $facet: {
                pending: [{ $match: { dispensedAt: { $exists: false } } }, { $count: 'count' }],
                thisMonth: [{ $match: { createdAt: { $gte: startOfMonth } } }, { $count: 'count' }],
              },
            },
          ]),

          Patient.countDocuments({
            _id: {
              $in: await Appointment.distinct('patient', { doctor: doctorId }),
            },
          }),
        ]
      );

      const activeShares = sharedFileDocs.filter(
        f =>
          Array.isArray(f.sharedWith) &&
          f.sharedWith.some(
            s =>
              s.doctorId &&
              s.doctorId.toString() === doctorId.toString() &&
              (!s.expiresAt || new Date(s.expiresAt) > now)
          )
      );

      const patientIds = new Set(
        activeShares.map(f => f.patientId && f.patientId.toString()).filter(Boolean)
      );

      const upcomingAppointments = appointmentStats[0]?.upcoming[0]?.count || 0;
      const todayAppointments = appointmentStats[0]?.today[0]?.count || 0;
      const thisMonthConsultations = appointmentStats[0]?.thisMonth[0]?.count || 0;
      const thisWeekConsultations = appointmentStats[0]?.thisWeek[0]?.count || 0;
      const pendingAppointments = appointmentStats[0]?.pending[0]?.count || 0;
      const pendingPrescriptions = prescriptionStats[0]?.pending[0]?.count || 0;
      const thisMonthPrescriptions = prescriptionStats[0]?.thisMonth[0]?.count || 0;

      let criticalAlerts = 0;
      const patientsWithUpcoming = await Appointment.distinct('patient', {
        doctor: doctorId,
        scheduledAt: { $gt: now },
        status: { $in: ['scheduled', 'confirmed'] },
      });
      criticalAlerts = patientsWithUpcoming.length;

      res.json({
        success: true,
        doctor: {
          id: req.user._id,
          phone: req.user.phone,
          email: req.user.email,
          profile: req.user.profile,
          clinic: req.user.clinic,
        },
        dashboard: {
          totalPatients: patientCount || patientIds.size,
          sharedFilesCount: activeShares.length,
          pendingPrescriptions,
          thisMonthConsultations,
          thisWeekConsultations,
          upcomingAppointments,
          todayAppointments,
          pendingAppointments,
          thisMonthPrescriptions,
          criticalAlerts,
        },
      });
    } catch (error) {
      logger.error('Doctor dashboard error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
    }
  }

  async getQuickStats(req, res) {
    try {
      const doctorId = req.user._id;
      const now = new Date();

      const [upcomingCount, todayCount] = await Promise.all([
        Appointment.countDocuments({
          doctor: doctorId,
          scheduledAt: { $gt: now },
          status: { $in: ['scheduled', 'confirmed'] },
        }),
        Appointment.countDocuments({
          doctor: doctorId,
          scheduledAt: {
            $gte: new Date(now.setHours(0, 0, 0, 0)),
            $lt: new Date(now.setHours(23, 59, 59, 999)),
          },
          status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
        }),
      ]);

      res.json({
        success: true,
        stats: {
          upcomingAppointments: upcomingCount,
          todayAppointments: todayCount,
        },
      });
    } catch (error) {
      logger.error('Doctor quick stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch quick stats' });
    }
  }
}

module.exports = new DoctorDashboardController();
