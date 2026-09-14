const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const logger = require('../utils/logger');

class GeminiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: config.gemini.model,
      generationConfig: {
        temperature: 0.3,
        topK: 32,
        topP: 0.95,
        maxOutputTokens: 2048,
      },
    });
  }

  async analyzeSymptoms(symptomIds, language = 'en', patientContext = {}) {
    try {
      const symptomNames = this.getSymptomNames(symptomIds);
      const prompt = this.buildSymptomPrompt(symptomNames, language, patientContext);

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      return this.parseSymptomResponse(responseText);
    } catch (error) {
      logger.error('Gemini symptom analysis failed:', error);
      throw new Error('AI analysis failed');
    }
  }

  async processVoiceCommand(transcription, language = 'en', context = {}) {
    try {
      const prompt = this.buildVoicePrompt(transcription, language, context);

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();

      return this.parseVoiceResponse(responseText);
    } catch (error) {
      logger.error('Gemini voice processing failed:', error);
      throw new Error('Voice processing failed');
    }
  }

  getSymptomNames(symptomIds) {
    const symptomMap = {
      fever: 'Fever',
      cough: 'Cough',
      difficulty_breathing: 'Difficulty Breathing',
      chest_pain: 'Chest Pain',
      headache: 'Headache',
      dizziness: 'Dizziness',
      abdominal_pain: 'Abdominal Pain',
      diarrhea: 'Diarrhea',
      vomiting: 'Vomiting',
      rash: 'Skin Rash',
      joint_pain: 'Joint Pain',
      fatigue: 'Fatigue',
      sore_throat: 'Sore Throat',
      ear_pain: 'Ear Pain',
      eye_redness: 'Eye Redness',
      urinary_burning: 'Burning Urination',
      swelling_legs: 'Leg Swelling',
      weight_loss: 'Unexplained Weight Loss',
      night_sweats: 'Night Sweats',
      palpitations: 'Palpitations',
    };
    return symptomIds.map(id => symptomMap[id] || id);
  }

  buildSymptomPrompt(symptomNames, language, patientContext) {
    const langNames = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu',
      ta: 'Tamil',
      mr: 'Marathi',
    };

    const targetLang = langNames[language] || 'English';

    return `You are a medical AI assistant for rural healthcare in India.

CHARACTERISTICS:
- Speak in simple, clear ${targetLang}
- Be empathetic and patient (many users are elderly/illiterate)
- Keep explanations SHORT (max 2-3 sentences per point)
- Always flag emergencies immediately

Analyze these symptoms: ${symptomNames.join(', ')}

Patient context: ${JSON.stringify(patientContext)}

Provide a JSON response with:
1. conditions: Array of top 3-5 possible conditions with:
   - condition_id (snake_case)
   - condition_name
   - severity: "low" | "medium" | "high" | "critical"
   - matching_symptoms (number)
   - total_symptoms (number)
   - probability (0-1)
   - icd10_code
   - recommendation: "home_care" | "clinic" | "emergency"
2. risk_level: "low" | "medium" | "high" | "critical"
3. recommendation: "home_care" | "clinic" | "emergency"
4. red_flags: Array of symptoms requiring immediate care
5. home_care_advice: Array of practical home care steps (max 3, simple language)
6. ai_explanation: Simple explanation in ${targetLang} (2-3 sentences max)
7. confidence_score: 0-1
8. requires_human_review: boolean

Consider: Indian rural context, common diseases (dengue, malaria, typhoid, TB, COVID-19), resource limitations.
Language for explanation: ${targetLang}.`;
  }

  buildVoicePrompt(transcription, language, context) {
    const langNames = {
      en: 'English',
      hi: 'Hindi',
      te: 'Telugu',
      ta: 'Tamil',
      mr: 'Marathi',
    };

    const targetLang = langNames[language] || 'English';

    const systemPrompt = `You are VoiceAssist, a voice-based healthcare assistant for GramSwasthya rural platform.

CHARACTERISTICS:
- Speak in simple, clear ${targetLang} (patient's language preference)
- Be empathetic and patient (many users are elderly/illiterate)
- Keep responses SHORT (max 2-3 sentences)
- Always be ready to escalate to emergency

SUPPORTED INTENTS:
1. SYMPTOM_CHECK: "My head is aching" -> Symptom checker
2. BOOK_APPOINTMENT: "I need to see a doctor" -> Appointment booking
3. CHECK_MEDICINES: "What medicines am I taking?" -> Medication list
4. EMERGENCY: "I'm having chest pain" -> Immediate ambulance call
5. HEALTH_RECORDS: "Show my medical history" -> Patient records
6. NAVIGATION: "How do I use this?" -> Feature explanation

ALWAYS END WITH: "Is there anything else I can help you with?"`;

    return `${systemPrompt}

Patient said: "${transcription}"
Language: ${targetLang}
Context: ${JSON.stringify(context)}

Respond in JSON with:
1. text_response: What to say back to patient (in ${targetLang}) - MUST end with "Is there anything else I can help you with?"
2. intent: "symptom_check" | "book_appointment" | "emergency" | "medicine_reminder" | "info" | "pregnancy" | "child_health"
3. entities: Extracted info (symptoms, dates, medicine names, doctor type, etc.)
4. actions: Array of actions to perform:
   - type: "navigate" | "book_appointment" | "call_ambulance" | "show_info" | "set_reminder"
   - payload: action-specific data
   - description: Human-readable description
5. requires_handoff: boolean (true if needs human doctor)
6. handoff_reason: why handoff needed

Keep responses short (2-3 sentences max), empathetic, culturally appropriate.`;
  }

  parseSymptomResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      const parsed = JSON.parse(jsonStr);

      return {
        conditions: parsed.conditions || [],
        riskLevel: parsed.risk_level || 'medium',
        recommendation: parsed.recommendation || 'clinic',
        redFlags: parsed.red_flags || [],
        homeCareAdvice: parsed.home_care_advice || [],
        aiExplanation: parsed.ai_explanation || '',
        confidenceScore: parsed.confidence_score || 0.7,
        requiresHumanReview: parsed.requires_human_review || false,
      };
    } catch (error) {
      logger.error('Failed to parse Gemini response:', error);
      return {
        conditions: [],
        riskLevel: 'medium',
        recommendation: 'clinic',
        redFlags: ['Seek medical attention if symptoms worsen'],
        homeCareAdvice: ['Rest', 'Stay hydrated', 'Monitor symptoms'],
        aiExplanation: text,
        confidenceScore: 0.5,
        requiresHumanReview: true,
      };
    }
  }

  parseVoiceResponse(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error('Failed to parse voice response:', error);
      return {
        text_response: 'I understand. Let me help you with that.',
        intent: 'info',
        entities: {},
        actions: [],
        requires_handoff: false,
        handoff_reason: '',
      };
    }
  }
}

module.exports = new GeminiService();
