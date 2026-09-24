const { Appointment } = require('../models');
const logger = require('../utils/logger');

class DoctorAppointmentsController {
  async getAppointments(req, res) {
    try {
      const doctorId = req.user._id;
      const { page = 1, limit = 20, status, startDate, endDate, type, search } = req.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const skip = (pageNum - 1) * limitNum;

      const matchStage = { doctor: doctorId };

      if (status) {
        matchStage.status = status;
      }

      if (type) {
        matchStage.type = type;
      }

      if (startDate || endDate) {
        matchStage.scheduledAt = {};
        if (startDate) matchStage.scheduledAt.$gte = new Date(startDate);
        if (endDate) matchStage.scheduledAt.$lte = new Date(endDate);
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
          $project: {
            _id: 1,
            patient: {
              id: '$patientInfo._id',
              name: '$patientInfo.name',
              phone: '$patientInfo.phone',
              age: '$patientInfo.age',
              gender: '$patientInfo.gender',
            },
            scheduledAt: 1,
            duration: 1,
            type: 1,
            status: 1,
            meetingLink: 1,
            meetingId: 1,
            meetingPassword: 1,
            notes: 1,
            payment: 1,
            cancellationReason: 1,
            cancelledAt: 1,
            cancelledBy: 1,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      ];

      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), 'i');
        pipeline.push({
          $match: {
            $or: [{ 'patient.name': searchRegex }, { 'patient.phone': searchRegex }],
          },
        });
      }

      const totalPipeline = [...pipeline, { $count: 'total' }];

      const [appointments, totalResult] = await Promise.all([
        Appointment.aggregate([
          ...pipeline,
          { $sort: { scheduledAt: -1 } },
          { $skip: skip },
          { $limit: limitNum },
        ]),
        Appointment.aggregate(totalPipeline),
      ]);

      const total = totalResult[0]?.total || 0;

      res.json({
        success: true,
        appointments: appointments.map(a => ({
          id: a._id,
          patient: a.patient,
          scheduledAt: a.scheduledAt,
          duration: a.duration,
          type: a.type,
          status: a.status,
          meetingLink: a.meetingLink,
          meetingId: a.meetingId,
          meetingPassword: a.meetingPassword,
          notes: a.notes,
          payment: a.payment,
          cancellationReason: a.cancellationReason,
          cancelledAt: a.cancelledAt,
          cancelledBy: a.cancelledBy,
          createdAt: a.createdAt,
          updatedAt: a.updatedAt,
          isUpcoming:
            new Date(a.scheduledAt) > new Date() && ['scheduled', 'confirmed'].includes(a.status),
          canJoin:
            a.status === 'confirmed' &&
            new Date(a.scheduledAt).getTime() - Date.now() <= 15 * 60 * 1000 &&
            new Date(a.scheduledAt).getTime() - Date.now() >= -30 * 60 * 1000,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      logger.error('Doctor appointments error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch appointments' });
    }
  }

  async getAppointmentDetail(req, res) {
    try {
      const doctorId = req.user._id;
      const { appointmentId } = req.params;

      const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctorId })
        .populate('patient', 'name phone age gender address bloodType')
        .populate('prescription')
        .lean();

      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      res.json({
        success: true,
        appointment: {
          ...appointment,
          isUpcoming:
            new Date(appointment.scheduledAt) > new Date() &&
            ['scheduled', 'confirmed'].includes(appointment.status),
          canJoin:
            appointment.status === 'confirmed' &&
            new Date(appointment.scheduledAt).getTime() - Date.now() <= 15 * 60 * 1000 &&
            new Date(appointment.scheduledAt).getTime() - Date.now() >= -30 * 60 * 1000,
        },
      });
    } catch (error) {
      logger.error('Doctor appointment detail error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch appointment details' });
    }
  }

  async updateAppointmentStatus(req, res) {
    try {
      const doctorId = req.user._id;
      const { appointmentId } = req.params;
      const { status, notes, cancellationReason } = req.body;

      const validStatuses = ['confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: 'Invalid status' });
      }

      const appointment = await Appointment.findOne({ _id: appointmentId, doctor: doctorId });

      if (!appointment) {
        return res.status(404).json({ success: false, message: 'Appointment not found' });
      }

      appointment.status = status;
      if (notes) appointment.notes.doctor = notes;
      if (cancellationReason) appointment.cancellationReason = cancellationReason;
      if (status === 'cancelled') {
        appointment.cancelledAt = new Date();
        appointment.cancelledBy = 'doctor';
      }

      await appointment.save();

      res.json({
        success: true,
        appointment: {
          id: appointment._id,
          status: appointment.status,
          notes: appointment.notes,
          cancellationReason: appointment.cancellationReason,
          cancelledAt: appointment.cancelledAt,
        },
      });
    } catch (error) {
      logger.error('Doctor appointment status update error:', error);
      res.status(500).json({ success: false, message: 'Failed to update appointment status' });
    }
  }

  async getUpcomingAppointments(req, res) {
    try {
      const doctorId = req.user._id;
      const { limit = 5 } = req.query;
      const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
      const now = new Date();

      const appointments = await Appointment.find({
        doctor: doctorId,
        scheduledAt: { $gt: now },
        status: { $in: ['scheduled', 'confirmed'] },
      })
        .sort({ scheduledAt: 1 })
        .limit(limitNum)
        .populate('patient', 'name phone age gender')
        .lean();

      res.json({
        success: true,
        appointments: appointments.map(a => ({
          id: a._id,
          patient: a.patient,
          scheduledAt: a.scheduledAt,
          duration: a.duration,
          type: a.type,
          status: a.status,
          meetingLink: a.meetingLink,
          meetingId: a.meetingId,
          meetingPassword: a.meetingPassword,
          canJoin:
            a.status === 'confirmed' &&
            new Date(a.scheduledAt).getTime() - Date.now() <= 15 * 60 * 1000 &&
            new Date(a.scheduledAt).getTime() - Date.now() >= -30 * 60 * 1000,
        })),
      });
    } catch (error) {
      logger.error('Doctor upcoming appointments error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch upcoming appointments' });
    }
  }
}

module.exports = new DoctorAppointmentsController();
