const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    const hasCredentials = Boolean(config.email.user && config.email.password);

    if (!hasCredentials) {
      logger.warn('SMTP credentials not configured, emails will be logged only');
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    });
  }

  async sendOTPEmail(email, code, purpose, language = 'en') {
    const templates = {
      en: {
        registration: {
          subject: 'Welcome to Gram Swasthya - Verify Your Email',
          body: `Your verification code is: <strong>${code}</strong>. Valid for 5 minutes.`,
        },
        login: {
          subject: 'Gram Swasthya - Login Code',
          body: `Your login code is: <strong>${code}</strong>. Valid for 5 minutes.`,
        },
        password_reset: {
          subject: 'Gram Swasthya - Password Reset',
          body: `Your password reset code is: <strong>${code}</strong>. Valid for 5 minutes.`,
        },
        email_verification: {
          subject: 'Gram Swasthya - Email Verification',
          body: `Your verification code is: <strong>${code}</strong>. Valid for 5 minutes.`,
        },
      },
      hi: {
        registration: {
          subject: 'ग्राम स्वास्थ्य में आपका स्वागत है - अपना ईमेल सत्यापित करें',
          body: `आपका सत्यापन कोड है: <strong>${code}</strong>। 5 मिनट के लिए मान्य।`,
        },
      },
    };

    const template = templates[language]?.[purpose] || templates.en[purpose];

    try {
      if (!this.transporter) {
        logger.info(
          `[EMAIL MOCK] To: ${email} - ${template.subject}: ${template.body.replace(/<[^>]*>/g, ' ')}`
        );
        return true;
      }

      await this.transporter.sendMail({
        from: config.email.from,
        to: email,
        subject: template.subject,
        html: this.wrapTemplate(template.body, language),
      });
      logger.info(`OTP email sent to ${email} for ${purpose}`);
      return true;
    } catch (error) {
      logger.error('Email sending failed:', error);
      throw new Error('Failed to send email');
    }
  }

  async sendAppointmentConfirmation(email, appointment, _language = 'en') {
    // Implementation for appointment emails
    return true;
  }

  async sendHealthReport(email, report, _language = 'en') {
    // Implementation for health report emails
    return true;
  }

  async sendFileSharedEmail(
    doctorEmail,
    doctorName,
    patientName,
    fileName,
    category,
    expiresAt,
    message,
    viewUrl
  ) {
    const expiresText = expiresAt
      ? `This access expires on ${new Date(expiresAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}.`
      : 'This access does not expire.';

    const content = `
      <h2 style="color: #2E7D32; margin-top: 0;">Medical File Shared with You</h2>
      <p>Dear Dr. ${doctorName},</p>
      <p><strong>${patientName}</strong> has shared a medical file with you for review.</p>
      
      <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <h3 style="color: #333; margin-top: 0;">${fileName}</h3>
        <p style="margin: 8px 0; color: #666;"><strong>Category:</strong> ${category}</p>
        <p style="margin: 8px 0; color: #666;"><strong>Shared by:</strong> ${patientName}</p>
        <p style="margin: 8px 0; color: #666;"><strong>Access:</strong> View-only</p>
        <p style="margin: 8px 0; color: #666;"><strong>Expiry:</strong> ${expiresText}</p>
      </div>

      ${
        message
          ? `
        <div style="background: #e8f5e9; border-left: 4px solid #4CAF50; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; color: #2E7D32;"><strong>Message from patient:</strong></p>
          <p style="margin: 8px 0 0; color: #333;">${message}</p>
        </div>
      `
          : ''
      }

      <div style="text-align: center; margin: 30px 0;">
        <a href="${viewUrl}" style="background: linear-gradient(135deg, #2E7D32, #4CAF50); color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          👁️ View File
        </a>
      </div>

      <p style="color: #666; font-size: 13px;">
        This is a secure, view-only link. You cannot download or modify the file.
      </p>
    `;

    try {
      if (!this.transporter) {
        logger.info(`[EMAIL MOCK] To: ${doctorEmail} - Medical file shared: ${fileName}`);
        return true;
      }

      await this.transporter.sendMail({
        from: config.email.from,
        to: doctorEmail,
        subject: `📋 Medical File Shared: ${fileName}`,
        html: this.wrapTemplate(content, 'en'),
      });
      logger.info(`File share email sent to ${doctorEmail} for file ${fileName}`);
      return true;
    } catch (error) {
      logger.error('File share email sending failed:', error);
      return false;
    }
  }

  wrapTemplate(content, language) {
    const dir = ['hi', 'mr'].includes(language) ? 'rtl' : 'ltr';
    return `
      <!DOCTYPE html>
      <html dir="${dir}">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #2E7D32, #4CAF50); padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0;">Gram Swasthya</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          ${content}
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #666; font-size: 12px; text-align: center;">
            This is an automated message from Gram Swasthya. Please do not reply.
          </p>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
