import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const CATEGORY_OPTIONS = {
  video: { label: 'Video Call', icon: '📹' },
  audio: { label: 'Audio Call', icon: '📞' },
  in_person: { label: 'In-Person', icon: '🏥' },
};

const PAYMENT_METHODS = [
  { value: 'upi', label: 'UPI' },
  { value: 'net_banking', label: 'Net Banking' },
  { value: 'cash', label: 'Cash' },
  { value: 'insurance', label: 'Insurance' },
];

const STATUS_BADGES = {
  scheduled: 'badge-success',
  confirmed: 'badge-info',
  in_progress: 'badge-warning',
  completed: 'badge-neutral',
  cancelled: 'badge-error',
  no_show: 'badge-neutral',
  rescheduled: 'badge-warning',
};

const PAYMENT_BADGES = {
  pending: 'badge-warning',
  completed: 'badge-success',
  failed: 'badge-error',
  refunded: 'badge-neutral',
};

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (_err) {
    return new Date(iso).toString();
  }
}

export default function Appointments() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [filter, setFilter] = useState('upcoming');

  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedType, setSelectedType] = useState('video');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');

  const selectedDoctorDetails = doctors.find(d => d.id === selectedDoctor) || null;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [doctorRes, appointmentRes] = await Promise.all([
        api.getDoctorList(),
        api.getAppointments({ limit: 100 }),
      ]);
      setDoctors(doctorRes?.doctors || []);
      setAppointments(appointmentRes?.appointments || []);
    } catch (_err) {
      showToast('Failed to load appointments. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBook = async (e) => {
    e.preventDefault();
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      showToast('Please select a doctor, date, and time', 'error');
      return;
    }

    const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      showToast('Please choose a future date and time', 'error');
      return;
    }

    setBooking(true);
    try {
      await api.bookAppointment({
        doctor: selectedDoctor,
        scheduledAt: scheduledAt.toISOString(),
        type: selectedType,
        paymentMethod,
        notes: notes || undefined,
      });
      showToast('Appointment booked successfully', 'success');
      setSelectedDoctor('');
      setSelectedDate('');
      setSelectedTime('');
      setNotes('');
      loadData();
    } catch (err) {
      showToast(err?.message || 'Failed to book appointment', 'error');
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = async (appointment) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await api.cancelAppointment(appointment.id, 'Cancelled by patient');
      showToast('Appointment cancelled', 'success');
      loadData();
    } catch (_err) {
      showToast('Failed to cancel appointment', 'error');
    }
  };

  const displayAppointments = appointments.filter(a => {
    if (filter === 'upcoming') return a.isUpcoming;
    if (filter === 'cancelled') return a.status === 'cancelled';
    if (filter === 'past') return !a.isUpcoming && a.status !== 'cancelled';
    return true;
  });

  const todayMin = new Date().toISOString().split('T')[0];

  return (
    <div className="dashboard">
      <div className="page-header mb-6">
        <h1 className="page-title">📅 {t('appointments.title')}</h1>
        <p className="page-subtitle">{t('appointments.selectSlot')}</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <section className="card p-6">
          <h2 className="mb-4 font-semibold text-lg">{t('appointments.bookAppointment')}</h2>
          <form onSubmit={handleBook}>
            <div className="mb-4">
              <label className="font-medium" htmlFor="appt-doctor">{t('appointments.doctor')}</label>
              <select
                id="appt-doctor"
                className="input"
                value={selectedDoctor}
                onChange={e => setSelectedDoctor(e.target.value)}
              >
                <option value="">{t('appointments.selectDoctor')}</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} — {d.specialization}
                    {d.consultationFee ? ` (₹${d.consultationFee})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="font-medium" htmlFor="appt-date">{t('appointments.date')}</label>
                <input
                  id="appt-date"
                  type="date"
                  className="input"
                  min={todayMin}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                />
              </div>
              <div>
                <label className="font-medium" htmlFor="appt-time">{t('appointments.time')}</label>
                <input
                  id="appt-time"
                  type="time"
                  className="input"
                  value={selectedTime}
                  onChange={e => setSelectedTime(e.target.value)}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="font-medium">{t('appointments.consultationType')}</label>
              <div className="flex gap-3">
                {Object.entries(CATEGORY_OPTIONS).map(([key, opt]) => (
                  <button
                    key={key}
                    type="button"
                    className={`btn btn-sm ${selectedType === key ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setSelectedType(key)}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="font-medium" htmlFor="appt-payment">{t('appointments.paymentMethod')}</label>
              <select
                id="appt-payment"
                className="input"
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {selectedDoctorDetails?.consultationFee > 0 && (
              <div className="mb-4">
                <span className="font-medium">{t('appointments.consultationFee')}: </span>
                <span className="badge badge-brand">₹{selectedDoctorDetails.consultationFee}</span>
              </div>
            )}

            <div className="mb-4">
              <label className="font-medium" htmlFor="appt-notes">{t('appointments.notes')}</label>
              <textarea
                id="appt-notes"
                className="input"
                rows="3"
                maxLength={500}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any symptoms or details to share with the doctor"
              />
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={booking || loading}>
              {booking ? 'Booking…' : 'Book Appointment'}
            </button>
          </form>
        </section>

        <section className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg">{t('appointments.myAppointments')}</h2>
            <div className="flex gap-2">
              {['upcoming', 'past', 'cancelled'].map(f => (
                <button
                  key={f}
                  className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="text-secondary">Loading appointments…</p>
          ) : displayAppointments.length === 0 ? (
            <p className="text-secondary">No {filter} appointments found.</p>
          ) : (
            <ul className="flex flex-col gap-4">
              {displayAppointments.map(a => {
                const cat = CATEGORY_OPTIONS[a.type] || CATEGORY_OPTIONS.video;
                return (
                  <li key={a.id} className="card p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{a.doctor?.name || 'Doctor'}</p>
                        <p className="text-secondary">{a.doctor?.specialization || 'Consultation'}</p>
                      </div>
                      <span className={`badge ${STATUS_BADGES[a.status] || 'badge-neutral'}`}>
                        {a.status}
                      </span>
                    </div>
                    <p className="mt-2">
                      {cat.icon} {formatDateTime(a.scheduledAt)} · {a.duration} min
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {a.payment && (
                        <span className={`badge ${PAYMENT_BADGES[a.payment.status] || 'badge-neutral'}`}>
                          {t('appointments.payment')}: {a.payment.status}
                          {a.payment.amount ? ` · ₹${a.payment.amount}` : ''}
                        </span>
                      )}
                      {a.isUpcoming && a.meetingLink && (
                        <a
                          className="badge badge-info"
                          href={a.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          🔗 {t('appointments.joinMeeting')}
                        </a>
                      )}
                    </div>
                    {a.isUpcoming && (
                      <div className="mt-3">
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleCancel(a)}
                        >
                          {t('appointments.cancelAppointment')}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}