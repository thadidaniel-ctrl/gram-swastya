const twilio = require('twilio');
const config = require('../config');
const logger = require('../utils/logger');

class SMSService {
  constructor() {
    const { accountSid, authToken } = config.twilio;
    const isValidTwilioSid =
      accountSid && typeof accountSid === 'string' && accountSid.startsWith('AC');

    if (isValidTwilioSid && authToken) {
      try {
        this.client = twilio(accountSid, authToken);
      } catch (error) {
        logger.warn('Failed to initialize Twilio client, SMS will be logged only:', error.message);
        this.client = null;
      }
    } else {
      logger.warn('Twilio credentials not configured or invalid, SMS will be logged only');
      this.client = null;
    }
  }

  async sendOTPSMS(phone, code, purpose, language = 'en') {
    const templates = {
      en: {
        registration: `Welcome to Gram Swasthya! Your verification code is ${code}. Valid for 5 minutes.`,
        login: `Your Gram Swasthya login code is ${code}. Valid for 5 minutes.`,
        password_reset: `Your password reset code is ${code}. Valid for 5 minutes.`,
        phone_verification: `Your verification code is ${code}. Valid for 5 minutes.`,
        appointment: `Your appointment is confirmed. Code: ${code}`,
        medicine_reminder: `Time to take your medicine!`,
        emergency: `EMERGENCY: Ambulance dispatched. ETA: ${code} minutes.`,
      },
      hi: {
        registration: `ग्राम स्वास्थ्य में आपका स्वागत है! आपका सत्यापन कोड ${code} है। 5 मिनट के लिए मान्य।`,
        login: `आपका ग्राम स्वास्थ्य लॉगिन कोड ${code} है। 5 मिनट के लिए मान्य।`,
      },
    };

    const template = templates[language]?.[purpose] || templates.en[purpose];

    try {
      if (!this.client) {
        logger.info(`[SMS MOCK] To: ${phone} - ${template}`);
        return { success: true, mock: true };
      }

      const message = await this.client.messages.create({
        body: template,
        from: config.twilio.phoneNumber,
        to: phone,
      });

      logger.info(`SMS sent to ${phone}: ${message.sid}`);
      return { success: true, messageId: message.sid };
    } catch (error) {
      logger.error('SMS sending failed:', error);
      throw new Error('Failed to send SMS');
    }
  }

  async sendBulkSMS(phones, message) {
    const results = [];
    for (const phone of phones) {
      try {
        const result = await this.sendSMS(phone, message);
        results.push({ phone, ...result });
      } catch (error) {
        results.push({ phone, success: false, error: error.message });
      }
    }
    return results;
  }

  async sendSMS(phone, message) {
    try {
      if (!this.client) {
        logger.info(`[SMS MOCK] To: ${phone} - ${message}`);
        return { success: true, mock: true };
      }

      const result = await this.client.messages.create({
        body: message,
        from: config.twilio.phoneNumber,
        to: phone,
      });

      return { success: true, messageId: result.sid };
    } catch (error) {
      logger.error('SMS sending failed:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new SMSService();
