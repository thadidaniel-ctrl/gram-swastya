import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../services/api';

async function mockFetchOnce(status, body, ok = status >= 200 && status < 300) {
  const fn = vi.fn().mockResolvedValue({
    status,
    ok,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('api client integration wiring', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('bookAmbulance POSTs to /emergency/call (NOT the missing /ambulance/book-emergency)', async () => {
    const fn = await mockFetchOnce(201, {
      success: true,
      data: { callId: 'EMG-123' },
    });

    await api.bookAmbulance({ lat: 28.6, lng: 77.2, emergencyType: 'cardiac', contactPhone: '9999' });

    const [url, config] = fn.mock.calls[0];
    expect(url).toBe('http://localhost:5000/api/emergency/call');
    expect(config.method).toBe('POST');
    expect(JSON.parse(config.body)).toEqual({
      lat: 28.6,
      lng: 77.2,
      emergencyType: 'cardiac',
      contactPhone: '9999',
    });
  });

  it('getHealthRecords reads existing /patient/health-history and unwraps healthHistory', async () => {
    await mockFetchOnce(200, {
      success: true,
      healthHistory: {
        diagnoses: [{ _id: 'd1' }],
        medicines: [{ _id: 'm1', isActive: true }],
        appointments: [],
        prescriptions: [],
        pregnancy: null,
        children: [],
      },
    });

    const result = await api.getHealthRecords();
    const [url] = vi.mocked(fetch).mock.calls[0];

    expect(url).toBe('http://localhost:5000/api/patient/health-history');
    expect(result.diagnoses).toEqual([{ _id: 'd1' }]);
  });

  it('medicine CRUD hits /patient/medicines', async () => {
    const fn = await mockFetchOnce(201, { success: true, medicine: { _id: 'med-1' } });

    await api.createMedicine({ name: 'Paracetamol', doseTimes: [{ time: '08:00', enabled: true }] });

    const [url, config] = fn.mock.calls[0];
    expect(url).toBe('http://localhost:5000/api/patient/medicines');
    expect(config.method).toBe('POST');
    expect(JSON.parse(config.body).name).toBe('Paracetamol');

    await mockFetchOnce(200, { success: true, medicine: { _id: 'med-1' } });
    await api.updateMedicine('med-1', { name: 'Paracetamol +', remainingQuantity: 5 });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/patient/medicines/med-1');

    await mockFetchOnce(200, { success: true });
    await api.deleteMedicine('med-1');
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/patient/medicines/med-1');
  });

  it('doctor pages hit existing /doctor/patients and /doctor/appointments', async () => {
    await mockFetchOnce(200, { success: true, patients: [], pagination: {} });
    await api.getDoctorPatients({ page: 1 });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/api/doctor/patients');

    await mockFetchOnce(200, { success: true, appointments: [], pagination: {} });
    await api.getDoctorAppointments({ page: 1 });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/api/doctor/appointments');
  });

  it('patient appointment booking hits /patient/appointments with payload', async () => {
    const fn = await mockFetchOnce(201, {
      success: true,
      appointment: { id: 'appt-1', status: 'scheduled' },
    });

    await api.bookAppointment({
      doctor: 'doc-1',
      scheduledAt: '2026-10-01T10:00:00.000Z',
      type: 'video',
    });

    const [url, config] = fn.mock.calls[0];
    expect(url).toBe('http://localhost:5000/api/patient/appointments');
    expect(config.method).toBe('POST');
    expect(JSON.parse(config.body).doctor).toBe('doc-1');
  });

  it('patient appointment listing and cancellation hit /patient/appointments', async () => {
    await mockFetchOnce(200, { success: true, appointments: [], pagination: { total: 0 } });
    await api.getAppointments({ page: 1, limit: 10 });
    expect(vi.mocked(fetch).mock.calls[0][0]).toContain('/api/patient/appointments?page=1');

    const fn = await mockFetchOnce(200, { success: true, appointment: { id: 'appt-1' } });
    await api.cancelAppointment('appt-1', 'no longer needed');
    const [url, config] = fn.mock.calls[0];
    expect(url).toBe('http://localhost:5000/api/patient/appointments/appt-1/cancel');
    expect(config.method).toBe('POST');
    expect(JSON.parse(config.body).reason).toBe('no longer needed');
  });
});