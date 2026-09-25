import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDoctorAuth } from '../../contexts/DoctorAuthContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function DoctorLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, isLoading, error, clearError } = useDoctorAuth();
  const { loginDoctor } = useAuth();

  const [method, setMethod] = useState('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [step, setStep] = useState('contact');

  const handleSendOTP = async (e) => {
    e.preventDefault();
    clearError();
    
    try {
      const response = await sendOTP({
        phone: method === 'phone' ? phone : undefined,
        email: method === 'email' ? email : undefined,
        purpose: 'login',
      });
      
      setTempToken(response.tempToken);
      setStep('otp');
    } catch (err) {
      // Error handled by context
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    clearError();
    
    if (otp.length !== 6) return;
    
    try {
      const response = await verifyOTP({ tempToken, otp });
      if (response.success) {
        loginDoctor(response.doctor, response.accessToken, response.refreshToken);
        navigate('/doctor/dashboard');
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

  return (
    <div className="auth-container">
      <div className="auth-card doctor">
        <div className="auth-header">
          <div className="logo-doctor">👨‍⚕️</div>
          <h1>{t('auth.doctorPortal')}</h1>
          <p>{t('auth.doctorSubtitle')}</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {step === 'contact' && (
          <form onSubmit={handleSendOTP} className="auth-form">
            <div className="method-tabs">
              <button
                type="button"
                className={method === 'phone' ? 'active' : ''}
                onClick={() => setMethod('phone')}
              >
                📱 {t('common.phone')}
              </button>
              <button
                type="button"
                className={method === 'email' ? 'active' : ''}
                onClick={() => setMethod('email')}
              >
                ✉️ {t('common.email')}
              </button>
            </div>

            {method === 'phone' && (
              <div className="form-group">
                <label>{t('auth.registeredPhone')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder={t('auth.phonePlaceholder')}
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {method === 'email' && (
              <div className="form-group">
                <label>{t('auth.registeredEmail')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.doctorEmailPlaceholder')}
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
              {isLoading ? t('common.sending') : t('auth.sendOtp')}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <div className="form-group">
              <label>{t('auth.enterOtp')}</label>
              <div className="otp-inputs">
                {Array.from({ length: 6 }, (_, i) => (
                  <input
                    key={i}
                    type="text"
                    maxLength={1}
                    value={otp[i] || ''}
                    onChange={(e) => {
                      const newOtp = otp.split('');
                      newOtp[i] = e.target.value;
                      setOtp(newOtp.join(''));
                      if (e.target.value && i < 5) {
                        e.target.nextElementSibling?.focus();
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !e.target.value && i > 0) {
                        e.target.previousElementSibling?.focus();
                      }
                    }}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading || otp.length !== 6}>
              {isLoading ? t('common.verifying') : t('auth.verifyAndLogin')}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <button type="button" className="btn-link" onClick={() => setStep('contact')}>
            {t('auth.backToContact')}
          </button>
        </div>
      </div>
    </div>
  );
}