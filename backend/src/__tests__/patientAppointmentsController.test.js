jest.mock('../models', () => ({
  Doctor: { findById: jest.fn() },
  Appointment: {
    exists: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    findOne: jest.fn(),
    aggregate: jest.fn(),
  },
}));

jest.mock('../utils/logger', () => ({ error: jest.fn(), info: jest.fn(), warn: jest.fn() }));

const { Doctor, Appointment } = require('../models');
const controller = require('../controllers/patientAppointmentsController');

const VALID_DOCTOR_ID = '507f1f77bcf86cd799439011';
const VALID_PATIENT_ID = '507f1f77bcf86cd799439012';

function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function chainFindById(value) {
  const lean = jest.fn().mockResolvedValue(value);
  const select = jest.fn().mockReturnValue({ lean });
  Doctor.findById.mockReturnValue({ select });
  return { select };
}

const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

describe('PatientAppointmentsController.bookAppointment', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('creates an appointment when doctor is available and slot is free', async () => {
    chainFindById({ _id: VALID_DOCTOR_ID, isActive: true, isVerified: true });
    Appointment.exists.mockResolvedValue(null);
    Appointment.create.mockResolvedValue({ _id: 'appt-1' });

    const populated = {
      _id: 'appt-1',
      doctor: {
        _id: VALID_DOCTOR_ID,
        profile: { firstName: 'Asha', lastName: 'Sharma', specialization: 'Cardiology' },
      },
      scheduledAt: new Date(futureDate),
      duration: 15,
      type: 'video',
      status: 'scheduled',
      createdAt: new Date(),
    };
    Appointment.findById.mockReturnValue({ populate: () => ({ lean: () => populated }) });

    const req = {
      user: { _id: VALID_PATIENT_ID },
      body: { doctor: VALID_DOCTOR_ID, scheduledAt: futureDate, type: 'video' },
    };
    const res = mockResponse();

    await controller.bookAppointment(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(Appointment.create).toHaveBeenCalledWith(
      expect.objectContaining({ patient: VALID_PATIENT_ID, doctor: VALID_DOCTOR_ID })
    );
    expect(res.json.mock.calls[0][0].appointment.status).toBe('scheduled');
  });

  it('rejects a doctor that is not active/verified', async () => {
    chainFindById({ _id: VALID_DOCTOR_ID, isActive: false, isVerified: true });

    const req = {
      user: { _id: VALID_PATIENT_ID },
      body: { doctor: VALID_DOCTOR_ID, scheduledAt: futureDate },
    };
    const res = mockResponse();

    await controller.bookAppointment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Appointment.create).not.toHaveBeenCalled();
  });

  it('rejects past appointment times', async () => {
    chainFindById({ _id: VALID_DOCTOR_ID, isActive: true, isVerified: true });

    const req = {
      user: { _id: VALID_PATIENT_ID },
      body: {
        doctor: VALID_DOCTOR_ID,
        scheduledAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
    };
    const res = mockResponse();

    await controller.bookAppointment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Appointment.create).not.toHaveBeenCalled();
  });

  it('rejects invalid date strings', async () => {
    chainFindById({ _id: VALID_DOCTOR_ID, isActive: true, isVerified: true });

    const req = {
      user: { _id: VALID_PATIENT_ID },
      body: { doctor: VALID_DOCTOR_ID, scheduledAt: 'not-a-date' },
    };
    const res = mockResponse();

    await controller.bookAppointment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(Appointment.create).not.toHaveBeenCalled();
  });

  it('returns 409 when the doctor already has a conflicting appointment', async () => {
    chainFindById({ _id: VALID_DOCTOR_ID, isActive: true, isVerified: true });
    Appointment.exists.mockResolvedValue({ _id: 'other-appt' });

    const req = {
      user: { _id: VALID_PATIENT_ID },
      body: { doctor: VALID_DOCTOR_ID, scheduledAt: futureDate },
    };
    const res = mockResponse();

    await controller.bookAppointment(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(Appointment.create).not.toHaveBeenCalled();
  });

  it('queries the overlap window against scheduled/confirmed appointments only', async () => {
    chainFindById({ _id: VALID_DOCTOR_ID, isActive: true, isVerified: true });
    Appointment.exists.mockResolvedValue(null);
    Appointment.create.mockResolvedValue({ _id: 'appt-1' });
    const populated = {
      _id: 'appt-1',
      doctor: null,
      scheduledAt: new Date(futureDate),
      duration: 15,
      type: 'video',
      status: 'scheduled',
      createdAt: new Date(),
    };
    Appointment.findById.mockReturnValue({ populate: () => ({ lean: () => populated }) });

    const req = {
      user: { _id: VALID_PATIENT_ID },
      body: { doctor: VALID_DOCTOR_ID, scheduledAt: futureDate, duration: 30 },
    };
    const res = mockResponse();

    await controller.bookAppointment(req, res);

    const [query] = Appointment.exists.mock.calls[0];
    expect(query.doctor).toBe(VALID_DOCTOR_ID);
    expect(query.status).toEqual({ $in: ['scheduled', 'confirmed'] });
    expect(query.scheduledAt).toBeDefined();
    expect(query.$or[0].scheduledAt.$gt).toBeInstanceOf(Date);
  });

  it('returns 500 on unexpected errors', async () => {
    const lean = jest.fn().mockRejectedValue(new Error('db down'));
    const select = jest.fn().mockReturnValue({ lean });
    Doctor.findById.mockReturnValue({ select });

    const req = {
      user: { _id: VALID_PATIENT_ID },
      body: { doctor: VALID_DOCTOR_ID, scheduledAt: futureDate },
    };
    const res = mockResponse();

    await controller.bookAppointment(req, res);

    expect(select).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('PatientAppointmentsController.cancelAppointment', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('cancels an upcoming appointment as the patient', async () => {
    const futureDateObj = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const appointment = {
      _id: 'appt-1',
      patient: VALID_PATIENT_ID,
      scheduledAt: futureDateObj,
      status: 'scheduled',
      save: jest.fn().mockResolvedValue(true),
    };
    Appointment.findOne.mockResolvedValue(appointment);

    const req = {
      user: { _id: VALID_PATIENT_ID },
      params: { appointmentId: 'appt-1' },
      body: { reason: 'change of plans' },
    };
    const res = mockResponse();

    await controller.cancelAppointment(req, res);

    expect(appointment.status).toBe('cancelled');
    expect(appointment.cancelledBy).toBe('patient');
    expect(appointment.cancellationReason).toBe('change of plans');
    expect(res.json.mock.calls[0][0].appointment.status).toBe('cancelled');
  });

  it('returns 404 if the appointment is not owned by the patient', async () => {
    Appointment.findOne.mockResolvedValue(null);

    const req = {
      user: { _id: VALID_PATIENT_ID },
      params: { appointmentId: 'appt-404' },
      body: {},
    };
    const res = mockResponse();

    await controller.cancelAppointment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejects cancellation of a completed appointment', async () => {
    Appointment.findOne.mockResolvedValue({
      _id: 'appt-1',
      patient: VALID_PATIENT_ID,
      scheduledAt: new Date(Date.now() - 3600 * 1000),
      status: 'completed',
      save: jest.fn(),
    });

    const req = {
      user: { _id: VALID_PATIENT_ID },
      params: { appointmentId: 'appt-1' },
      body: {},
    };
    const res = mockResponse();

    await controller.cancelAppointment(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
