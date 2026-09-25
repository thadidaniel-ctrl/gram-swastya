import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatientAuth } from '../../contexts/PatientAuthContext';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export default function PatientLogin() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { sendOTP, verifyOTP, isLoading, error, clearError } = usePatientAuth();
  const { loginPatient } = useAuth();

  const [method, setMethod] = useState('phone');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [step, setStep] = useState('contact');
  const [countdown, setCountdown] = useState(0);

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
      startCountdown(response.expiresIn);
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
        loginPatient(response.patient, response.accessToken, response.refreshToken);
        if (response.requiresRegistration) {
          navigate('/signup');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err) {
      // Error handled by context
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

  const formatPhone = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length > 10) {
      return `+${cleaned}`;
    }
    if (cleaned.length > 10) {
      return `+91 ${cleaned.slice(-10).replace(/(\d{5})(\d{5})/, '$1 $2')}`;
    }
    return cleaned;
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>{t('auth.welcomeBack')}</h1>
          <p>{t('auth.welcomeBackSubtitle')}</p>
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
                <label>{t('auth.phoneNumber')}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder={t('auth.phonePlaceholder')}
                  required
                  disabled={isLoading}
                />
                <small>{t('auth.phoneHint')}</small>
              </div>
            )}

            {method === 'email' && (
              <div className="form-group">
                <label>{t('common.email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
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

            <div className="otp-timer">
              {countdown > 0 ? (
                <>{t('auth.resendIn', { seconds: countdown })}</>
              ) : (
                <button type="button" className="btn-link" onClick={() => setStep('contact')}>
                  {t('auth.resendOtp')}
                </button>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading || otp.length !== 6}>
              {isLoading ? t('common.verifying') : t('auth.verifyAndLogin')}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>{t('auth.noAccount')} <Link to="/signup">{t('auth.signUp')}</Link></p>
          <p><Link to="/doctor/login">{t('auth.doctorLogin')}</Link></p>
        </div>
      </div>
    </div>
  );
}