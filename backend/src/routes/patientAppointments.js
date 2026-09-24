const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate, sanitize } = require('../middleware/validate');
const { bookAppointmentValidation } = require('../validators/appointmentValidator');
const patientAppointmentsController = require('../controllers/patientAppointmentsController');

router.use(authenticate, authorize('patient'), sanitize);

router.post(
  '/',
  bookAppointmentValidation,
  validate,
  patientAppointmentsController.bookAppointment
);

router.get('/', patientAppointmentsController.getAppointments);

router.get('/:appointmentId', patientAppointmentsController.getAppointmentDetail);

router.post('/:appointmentId/cancel', patientAppointmentsController.cancelAppointment);

module.exports = router;
