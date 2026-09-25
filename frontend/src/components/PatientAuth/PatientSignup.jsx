import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatientAuth } from '../../contexts/PatientAuthContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function PatientSignup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = usePatientAuth();
  const { loginPatient } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    age: '',
    gender: '',
    bloodType: '',
    address: {
      village: '',
      district: '',
      state: '',
      pincode: '',
    },
    emergencyContact: {
      name: '',
      phone: '',
      relation: '',
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [emailValid, setEmailValid] = useState(true);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    // Validate email on change
    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(value) || value === '';
      setEmailValid(isValid);
    }
  };

  const validateStep = () => {
    if (step === 1) {
      return formData.name && formData.phone && formData.age && formData.gender && emailValid;
    }
    if (step === 2) {
      return formData.password && formData.password === formData.confirmPassword && formData.password.length >= 8;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    if (!validateStep()) return;

    if (step < 3) {
      setStep(step + 1);
      return;
    }

    try {
      const response = await register({
        phone: formData.phone,
        email: formData.email ? formData.email.toLowerCase() : undefined,
        password: formData.password,
        name: formData.name,
        age: parseInt(formData.age),
        gender: formData.gender,
        bloodType: formData.bloodType,
        address: formData.address,
        emergencyContact: formData.emergencyContact,
      });

      if (response.success) {
        loginPatient(response.patient, response.accessToken, response.refreshToken);
        navigate('/dashboard');
      }
    } catch (err) {
      // Error handled by context
    }
  };

  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length > 10) {
      return `+${cleaned}`;
    }
    return cleaned;
  };

  const steps = [
    { num: 1, label: 'Basic Info' },
    { num: 2, label: 'Security' },
    { num: 3, label: 'Details' },
  ];

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="step-indicator">
            {steps.map((s, i) => (
              <div key={s.num} className={`step ${i + 1 <= step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}`}>
                <span className="step-number">{i + 1 < step ? '✓' : s.num}</span>
                <span className="step-label">{s.label}</span>
              </div>
            ))}
          </div>
          <h1>{step === 1 ? 'Basic Information' : step === 2 ? 'Security' : 'Additional Details'}</h1>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          {step === 1 && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>{t('auth.phoneNumber')} *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
                    placeholder="+91 98765 43210"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Age *</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    min="1"
                    max="120"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Gender *</label>
                  <select name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="">Select</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>{t('common.email')}</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com (optional)"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="form-group">
                <label>Password *</label>
                <div className="password-input">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                <small>Must be at least 8 characters</small>
              </div>
              <div className="form-group">
                <label>Confirm Password *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                />
                {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                  <span className="error-text">Passwords do not match</span>
                )}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="form-group">
                <label>Blood Type</label>
                <select name="bloodType" value={formData.bloodType} onChange={handleChange}>
                  <option value="">Select</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <fieldset>
                <legend>Address</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label>Village</label>
                    <input type="text" name="address.village" value={formData.address.village} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>District</label>
                    <input type="text" name="address.district" value={formData.address.district} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>State</label>
                    <input type="text" name="address.state" value={formData.address.state} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Pincode</label>
                    <input type="text" name="address.pincode" value={formData.address.pincode} onChange={handleChange} placeholder="123456" maxLength={6} />
                  </div>
                </div>
              </fieldset>
              <fieldset>
                <legend>Emergency Contact</legend>
                <div className="form-row">
                  <div className="form-group">
                    <label>Name</label>
                    <input type="text" name="emergencyContact.name" value={formData.emergencyContact.name} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input type="tel" name="emergencyContact.phone" value={formData.emergencyContact.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Relation</label>
                  <input type="text" name="emergencyContact.relation" value={formData.emergencyContact.relation} onChange={handleChange} placeholder="e.g., Mother, Father, Spouse" />
                </div>
              </fieldset>
            </>
          )}

          <div className="form-navigation">
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)}>
                {t('common.back')}
              </button>
            )}
            {step < 3 ? (
              <button type="submit" className="btn btn-primary" disabled={isLoading || !validateStep()}>
                {t('common.next')}
              </button>
            ) : (
              <button type="submit" className="btn btn-primary" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">{t('auth.login')}</Link></p>
        </div>
      </div>
    </div>
  );
}