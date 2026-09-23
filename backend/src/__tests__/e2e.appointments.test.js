const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../server');
const config = require('../config');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');

const BASE = '/api';

const suffix = Date.now() % 100000;
async function registerPatient() {
  const email = `e2e_${suffix}_${Math.random().toString(36).slice(2, 8)}@test.local`;
  const res = await request(app)
    .post(`${BASE}/patient/auth/register`)
    .send({
      name: 'E2E Patient',
      email,
      phone: `+91900000${String(suffix).padStart(3, '0')}`,
      age: 30,
      gender: 'Male',
      password: 'E2EPass123!',
      bloodType: 'A+',
    });
  return { email, token: res.body.accessToken };
}

describe('E2E integration tests (real MongoDB)', () => {
  let patientToken;
  let patientEmail;
  let doctorId;

  beforeAll(async () => {
    await mongoose.connect(config.mongodb.uri);

    // Register a patient via the real HTTP endpoint
    const patient = await registerPatient();
    patientEmail = patient.email;
    patientToken = patient.token;

    // Create a verified active doctor directly in DB for the appointment
    const doctor = new Doctor({
      profile: {
        firstName: 'E2E',
        lastName: 'Doctor',
        specialization: 'General',
        qualification: 'MBBS',
        experience: 5,
        registrationNumber: `E2E_REG_${Date.now()}`,
      },
      isActive: true,
      isVerified: true,
      consultationFee: 250,
      email: `e2e_doctor_${Date.now()}@test.local`,
      phone: '+919000000002',
    });
    const saved = await doctor.save();
    doctorId = saved._id;
  });

  afterAll(async () => {
    await Appointment.deleteMany({});
    await Doctor.deleteMany({ 'profile.firstName': 'E2E' });
    await Patient.deleteMany({ email: { $regex: /e2e_/ } });
    await mongoose.connection.close();
  });

  const suffix = Date.now() % 100000;
  test('POST /api/patient/auth/register creates a patient and returns a token', async () => {
    const res = await request(app)
      .post(`${BASE}/patient/auth/register`)
      .send({
        name: 'Fresh E2E Patient',
        email: `fresh_${suffix}_${Math.random().toString(36).slice(2, 8)}@test.local`,
        phone: `+91900000${String(suffix + 1).padStart(3, '0')}`,
        age: 25,
        gender: 'Female',
        password: 'FreshPass123!',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.accessToken).toBeDefined();
  });

  test('POST /api/patient/appointments books an appointment with payment', async () => {
    const res = await request(app)
      .post(`${BASE}/patient/appointments`)
      .set('Authorization', `Bearer ${patientToken}`)
      .send({
        doctor: doctorId,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        type: 'video',
        paymentMethod: 'upi',
        notes: 'E2E test appointment',
      });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.appointment.payment).toBeDefined();
    expect(res.body.appointment.payment.amount).toBe(250);
    expect(res.body.appointment.payment.method).toBe('upi');
    expect(res.body.appointment.payment.status).toBe('pending');
    expect(res.body.appointment.meetingId).toBeDefined();
    expect(res.body.appointment.meetingLink).toBeDefined();
  });

  test('GET /api/patient/appointments returns the booked appointment', async () => {
    const res = await request(app)
      .get(`${BASE}/patient/appointments?limit=10`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.appointments.length).toBeGreaterThanOrEqual(1);
  });
});
