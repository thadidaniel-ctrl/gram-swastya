const geminiService = require('../services/geminiService');
const logger = require('../utils/logger');

class SymptomCheckerController {
  async analyze(req, res) {
    try {
      const { symptom_ids, language } = req.body;

      if (!Array.isArray(symptom_ids) || symptom_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'symptom_ids array is required',
        });
      }

      const patientContext = req.user
        ? { patientId: req.user._id, language: language || 'en' }
        : { language: language || 'en' };

      const result = await geminiService.analyzeSymptoms(
        symptom_ids,
        language || 'en',
        patientContext
      );

      res.json({
        success: true,
        conditions: result.conditions || [],
        risk_level: result.riskLevel || 'medium',
        recommendation: result.recommendation || 'clinic',
        red_flags: result.redFlags || [],
        home_care_advice: result.homeCareAdvice || [],
        ai_explanation: result.aiExplanation || '',
        confidence_score: result.confidenceScore || 0.5,
        requires_human_review: Boolean(result.requiresHumanReview),
      });
    } catch (error) {
      logger.error('Symptom checker analysis error:', error);
      res.status(500).json({
        success: false,
        message:
          error.message === 'AI analysis failed'
            ? 'AI analysis is temporarily unavailable'
            : 'Failed to analyze symptoms',
      });
    }
  }
}

module.exports = new SymptomCheckerController();
