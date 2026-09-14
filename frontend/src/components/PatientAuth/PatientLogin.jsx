import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePatientAuth } from '../../contexts/PatientAuthContext';
import { useAuth } from '../../contexts/AuthContext';

export default function PatientLogin() {
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
          <h1>Welcome Back</h1>
          <p>Sign in to access your health dashboard</p>
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
                📱 Phone
              </button>
              <button
                type="button"
                className={method === 'email' ? 'active' : ''}
                onClick={() => setMethod('email')}
              >
                ✉️ Email
              </button>
            </div>

            {method === 'phone' && (
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="+91 98765 43210"
                  required
                  disabled={isLoading}
                />
                <small>Enter 10-digit mobile number</small>
              </div>
            )}

            {method === 'email' && (
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="auth-form">
            <div className="form-group">
              <label>Enter 6-Digit OTP</label>
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
                <>Resend in {countdown}s</>
              ) : (
                <button type="button" className="btn-link" onClick={() => setStep('contact')}>
                  Resend OTP
                </button>
              )}
            </div>

            <button type="submit" className="btn btn-primary btn-full" disabled={isLoading || otp.length !== 6}>
              {isLoading ? 'Verifying...' : 'Verify & Login'}
            </button>
          </form>
        )}

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
          <p><Link to="/doctor/login">Doctor Login</Link></p>
        </div>
      </div>
    </div>
  );
}