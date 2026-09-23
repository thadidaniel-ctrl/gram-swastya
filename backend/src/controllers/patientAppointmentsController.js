const { Appointment, Doctor } = require('../models');
const { buildPayment, buildMeeting } = require('../services/appointmentService');
const { createPaymentGateway } = require('../services/paymentGateway');
const logger = require('../utils/logger');

const BOOKABLE_STATUSES = ['scheduled', 'confirmed'];
const paymentGateway = createPaymentGateway(process.env.PAYMENT_GATEWAY || 'mock');

class PatientAppointmentsController {
  async bookAppointment(req, res) {
    try {
      const patientId = req.user._id;
      const {
        doctor,
        scheduledAt: scheduledAtRaw,
        duration = 15,
        type = 'video',
        notes,
        paymentMethod,
      } = req.body;

      const doctorDoc = await Doctor.findById(doctor)
        .select('isActive isVerified consultationFee profile.firstName profile.lastName')
        .lean();
      if (!doctorDoc || !doctorDoc.isActive || !doctorDoc.isVerified) {
        return res
          .status(400)
          .json({ success: false, message: 'Selected doctor is not available for booking' });
      }

      const scheduledAt = new Date(scheduledAtRaw);
      if (Number.isNaN(scheduledAt.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid appointment time' });
      }
      if (scheduledAt <= new Date()) {
        return res
          .status(400)
          .json({ success: false, message: 'Appointment time must be in the future' });
      }

      const durationNum = Math.min(120, Math.max(10, parseInt(duration, 10) || 15));
      const slotEnd = new Date(scheduledAt.getTime() + durationNum * 60 * 1000);

      const conflict = await Appointment.exists({
        doctor,
        scheduledAt: { $lt: slotEnd },
        $or: [
          { scheduledAt: { $gt: new Date(scheduledAt.getTime() - durationNum * 60 * 1000) } },
          { scheduledAt: { $gte: scheduledAt } },
        ],
        status: { $in: BOOKABLE_STATUSES },
      });

      if (conflict) {
        return res.status(409).json({
          success: false,
          message: 'The doctor already has an appointment in this time slot',
        });
      }

      const meeting = buildMeeting(type);
      const gatewayPayment = await paymentGateway
        .createPayment(buildPayment(doctorDoc, paymentMethod).amount, 'INR', {
          patientId,
          doctor,
          appointmentType: type,
        })
        .catch(err => {
          logger.error('Payment gateway error:', err.message);
          return null;
        });
      const appointment = await Appointment.create({
        patient: patientId,
        doctor,
        scheduledAt,
        duration: durationNum,
        type,
        status: 'scheduled',
        payment: buildPayment(doctorDoc, paymentMethod),
        paymentGatewayId: gatewayPayment?.id || null,
        ...(meeting ? { meetingId: meeting.meetingId, meetingLink: meeting.meetingLink } : {}),
        notes: notes ? { patient: notes } : undefined,
      });

      const populated = await Appointment.findById(appointment._id)
        .populate('doctor', 'profile.firstName profile.lastName profile.specialization')
        .lean();

      res.status(201).json({
        success: true,
        message: 'Appointment booked successfully',
        appointment: {
          id: populated._id,
          doctor: populated.doctor
            ? {
                id: populated.doctor._id,
                name: `${populated.doctor.profile.firstName} ${populated.doctor.profile.lastName}`.trim(),
                specialization: populated.doctor.profile.specialization,
              }
            : null,
          scheduledAt: populated.scheduledAt,
          duration: populated.duration,
          type: populated.type,
          status: populated.status,
          payment: populated.payment,
          paymentGatewayId: populated.paymentGatewayId,
          meetingId: populated.meetingId,
          meetingLink: populated.meetingLink,
          notes: populated.notes,
          createdAt: populated.createdAt,
        },
      });
    } catch (error) {
      logger.error('Patient appointment booking error:', error);
      res.status(500).json({ success: false, message: 'Failed to book appointment' });
    }
  }

  async getAppointments(req, res) {
    try {
      const patientId = req.user._id;
      const { page = 1, limit = 20, status, upcoming } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const matchStage = { patient: patientId };

      if (status) {
        matchStage.status = status;
      } else if (upcoming === 'true') {
        matchStage.scheduledAt = { $gt: new Date() };
        matchStage.status = { $in: BOOKABLE_STATUSES };
      }

      const pipeline = [
        { $match: matchStage },
        {
          $lookup: {
            from: 'doctors',
            localField: 'doctor',
            foreignField: '_id',
            as: 'doctorInfo',
          },
        },
        { $unwind: { path: '$doctorInfo', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            doctor: {
              id: '$doctorInfo._id',
              name: {
                $trim: {
                  input: {
                    $concat: ['$doctorInfo.profile.firstName', ' ', '$doctorInfo.profile.lastName'],
                  },
                },
              },
              specialization: '$doctorInfo.profile.specialization',
              rating: '$doctorInfo.rating',
              consultationFee: '$doctorInfo.consultationFee',
            },
            scheduledAt: 1,
            duration: 1,
            type: 1,
            status: 1,
            meetingLink: 1,
            meetingId: 1,
            notes: 1,
            payment: 1,
            cancellationReason: 1,
            cancelledAt: 1,
            cancelledBy: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
        { $sort: { scheduledAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
      ];

      const totalPipeline = [{ $match: matchStage }, { $count: 'total' }];

      const [appointments, totalResult] = await Promise.all([
        Appointment.aggregate(pipeline),
        Appointment.aggregate(totalPipeline),
      ]);

      res.json({
        success: true,
        appointments: appointments.map(a => ({
          id: a._id,
          doctor: a.doctor,
          scheduledAt: a.scheduledAt,
          duration: a.duration,
          type: a.type,
          status: a.status,
          meetingLink: a.meetingLink,
          meetingId: a.meetingId,
          notes: a.notes,
          payment: a.payment,
          cancellationReason: a.cancellationReason,
          cancelledAt: a.cancelledAt,
          cancelledBy: a.cancelledBy,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          isUpcoming: new Date(a.scheduledAt) > new Date() && BOOKABLE_STATUSES.includes(a.status),
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalResult[0]?.total || 0,
          totalPages: Math.ceil((totalResult[0]?.total || 0) / limitNum),
        },
      });
    } catch (error) {
      logger.error('Patient appointments error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
  }

  async getAppointmentDetail(req, res) {
    try {
      const patientId = req.user._id;
      const { appointmentId } = req.params;

      const appointment = await Appointment.findOne({ _id: appointmentId, patient: patientId })
        .populate(
          'doctor',
          'profile.firstName profile.lastName profile.specialization profile.languages rating consultationFee'
        )
        .populate('prescription')
        .lean();

      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      res.json({
        success: true,
        appointment: {
          id: appointment._id,
          doctor: appointment.doctor
            ? {
                id: appointment.doctor._id,
                name: `${appointment.doctor.profile.firstName} ${appointment.doctor.profile.lastName}`.trim(),
                specialization: appointment.doctor.profile.specialization,
                languages: appointment.doctor.profile.languages || [],
                rating: appointment.doctor.rating || 0,
                consultationFee: appointment.doctor.consultationFee || 0,
              }
            : null,
          scheduledAt: appointment.scheduledAt,
          duration: appointment.duration,
          type: appointment.type,
          status: appointment.status,
          meetingLink: appointment.meetingLink,
          meetingId: appointment.meetingId,
          notes: appointment.notes,
          payment: appointment.payment,
          cancellationReason: appointment.cancellationReason,
          createdAt: appointment.createdAt,
          updatedAt: appointment.updatedAt,
        },
      });
    } catch (error) {
      logger.error('Patient appointment detail error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch appointment details' });
    }
  }

  async cancelAppointment(req, res) {
    try {
      const patientId = req.user._id;
      const { appointmentId } = req.params;
      const { reason } = req.body;

      const appointment = await Appointment.findOne({ _id: appointmentId, patient: patientId });

      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      if (!BOOKABLE_STATUSES.includes(appointment.status)) {
        return res.status(400).json({
          success: false,
          message: `Appointment cannot be cancelled in "${appointment.status}" state`,
        });
      }

      if (appointment.scheduledAt <= new Date()) {
        return res
          .status(400)
          .json({ success: false, message: 'Past appointments cannot be cancelled' });
      }

      appointment.status = 'cancelled';
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = 'patient';
      if (reason) appointment.cancellationReason = reason;

      await appointment.save();

      res.json({
        success: true,
        message: 'Appointment cancelled',
        appointment: {
          id: appointment._id,
          status: appointment.status,
          cancelledAt: appointment.cancelledAt,
          cancelledBy: appointment.cancelledBy,
        },
      });
    } catch (error) {
      logger.error('Patient appointment cancellation error:', error);
      res.status(500).json({ success: false, message: 'Failed to cancel appointment' });
    }
  }
}

module.exports = new PatientAppointmentsController();
