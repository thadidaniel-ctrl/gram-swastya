import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/api';

const EMERGENCY_TYPES = [
  { value: 'cardiac', label: '💓 Cardiac Emergency', priority: 'critical' },
  { value: 'trauma', label: '🩸 Trauma/Accident', priority: 'high' },
  { value: 'maternal', label: '🤰 Maternal Emergency', priority: 'critical' },
  { value: 'pediatric', label: '👶 Pediatric Emergency', priority: 'high' },
  { value: 'respiratory', label: '🫁 Respiratory Distress', priority: 'high' },
  { value: 'stroke', label: '🧠 Stroke', priority: 'critical' },
  { value: 'general', label: '🏥 General Emergency', priority: 'medium' },
];

export default function AmbulanceBooking() {
  const { patient } = useAuth();
  const [step, setStep] = useState('type');
  const [emergencyType, setEmergencyType] = useState('');
  const [description, setDescription] = useState('');
  const [contactPhone, setContactPhone] = useState(patient?.phone || '');
  const [location, setLocation] = useState({ lat: null, lng: null, address: '' });
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(null);

  useEffect(() => {
    if (step === 'location' && !location.lat) {
      getCurrentLocation();
    }
  }, [step]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          address: 'Current GPS Location'
        });
      },
      (err) => {
        setError('Unable to get location. Please enable GPS.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleBook = async () => {
    if (!location.lat || !emergencyType) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.bookAmbulance({
        location: { lat: location.lat, lng: location.lng },
        patient_id: patient?.id,
        emergency_type: emergencyType,
        description,
        contact_phone: contactPhone,
      });
      
      setBooking(response);
      setStep('confirmed');
      startCountdown(response.eta_minutes * 60);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const startCountdown = (seconds) => {
    setCountdown(seconds);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="ambulance-booking">
      <div className="booking-header">
        <h2>🚑 Emergency Ambulance</h2>
        <p>Book nearest ambulance with real-time tracking</p>
      </div>

      <div className="booking-steps">
        {['type', 'details', 'location', 'confirmed'].map(s => (
          <div key={s} className={`step ${step === s ? 'active' : ''} ${['type', 'details', 'location'].indexOf(step) > ['type', 'details', 'location'].indexOf(s) ? 'completed' : ''}`}>
            <span className="step-number">{['type', 'details', 'location', 'confirmed'].indexOf(s) + 1}</span>
            <span className="step-label">{s.charAt(0).toUpperCase() + s.slice(1)}</span>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {step === 'type' && (
        <div className="booking-content">
          <h3>What type of emergency?</h3>
          <div className="emergency-grid">
            {EMERGENCY_TYPES.map(type => (
              <button
                key={type.value}
                className={`emergency-card ${emergencyType === type.value ? 'selected' : ''}`}
                onClick={() => setEmergencyType(type.value)}
              >
                <div className="emergency-icon">{type.label.split(' ')[0]}</div>
                <div className="emergency-info">
                  <span className="emergency-label">{type.label.split(' ').slice(1).join(' ')}</span>
                  <span className={`priority-badge priority-${type.priority}`}>{type.priority.toUpperCase()}</span>
                </div>
              </button>
            ))}
          </div>
          <button className="btn btn-primary btn-full" onClick={() => setStep('details')} disabled={!emergencyType}>
            Continue
          </button>
        </div>
      )}

      {step === 'details' && (
        <div className="booking-content">
          <h3>Emergency Details</h3>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe symptoms, condition, any known medical history..."
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Contact Phone</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={e => setContactPhone(e.target.value)}
              placeholder="+91 98765 43210"
            />
          </div>
          <div className="form-navigation">
            <button className="btn btn-secondary" onClick={() => setStep('type')}>Back</button>
            <button className="btn btn-primary" onClick={() => setStep('location')}>Continue</button>
          </div>
        </div>
      )}

      {step === 'location' && (
        <div className="booking-content">
          <h3>Pickup Location</h3>
          <div className="location-card">
            {location.lat ? (
              <>
                <div className="location-status success">
                  ✅ Location acquired
                </div>
                <div className="location-coords">
                  Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
                </div>
                <div className="location-address">{location.address}</div>
              </>
            ) : (
              <>
                <div className="location-status pending">
                  📍 Getting GPS location...
                </div>
                <button className="btn btn-secondary" onClick={getCurrentLocation}>Retry</button>
              </>
            )}
          </div>
          <div className="form-navigation">
            <button className="btn btn-secondary" onClick={() => setStep('details')}>Back</button>
            <button className="btn btn-primary btn-lg" onClick={handleBook} disabled={loading || !location.lat}>
              {loading ? 'Booking...' : '🚑 Book Ambulance Now'}
            </button>
          </div>
        </div>
      )}

      {step === 'confirmed' && booking && (
        <div className="booking-content confirmed">
          <div className="success-icon">✅</div>
          <h3>Ambulance Booked!</h3>
          
          <div className="booking-details">
            <div className="detail-row">
              <span className="detail-label">Booking ID</span>
              <span className="detail-value">{booking.booking_id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Ambulance</span>
              <span className="detail-value">{booking.vehicle_number} ({booking.ambulance_id})</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Driver</span>
              <span className="detail-value">{booking.driver_name} • {booking.driver_phone}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Hospital</span>
              <span className="detail-value">{booking.hospital_name}</span>
            </div>
            <div className="detail-row highlight">
              <span className="detail-label">ETA</span>
              <span className="detail-value eta">{countdown !== null ? formatTime(countdown) : `${booking.eta_minutes} min`} • {booking.distance_km} km</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Status</span>
              <span className={`detail-value status-${booking.status}`}>{booking.status.replace('_', ' ').toUpperCase()}</span>
            </div>
          </div>

          <div className="booking-actions">
            <a href={`tel:${booking.driver_phone}`} className="btn btn-primary btn-full">📞 Call Driver</a>
            <button className="btn btn-secondary btn-full" onClick={() => { setStep('type'); setBooking(null); }}>New Booking</button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}