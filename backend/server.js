const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// In-memory stores (replace with real DB)
const ambulances = [
  { id: 'AMB001', lat: 28.6139, lng: 77.2090, driver: 'Rajesh Kumar', phone: '+91-9876543210', vehicle: 'DL-01-AB-1234', status: 'available', hospital: 'AIIMS Delhi', hospitalLat: 28.5672, hospitalLng: 77.2100 },
  { id: 'AMB002', lat: 28.7041, lng: 77.1025, driver: 'Suresh Singh', phone: '+91-9876543211', vehicle: 'DL-01-CD-5678', status: 'available', hospital: 'Safdarjung Hospital', hospitalLat: 28.5638, hospitalLng: 77.2089 },
  { id: 'AMB003', lat: 28.5355, lng: 77.3910, driver: 'Mohan Lal', phone: '+91-9876543212', vehicle: 'UP-14-EF-9012', status: 'available', hospital: 'Max Hospital', hospitalLat: 28.5492, hospitalLng: 77.2676 },
];

const patients = new Map();
const diagnoses = new Map();
const healthRecords = new Map();

// Helper: Calculate distance between two points (Haversine formula)
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Helper: Find nearest available ambulance
function findNearestAmbulance(lat, lng) {
  const available = ambulances.filter(a => a.status === 'available');
  if (available.length === 0) return null;
  
  return available.reduce((nearest, amb) => {
    const dist = getDistance(lat, lng, amb.lat, amb.lng);
    const nearestDist = getDistance(lat, lng, nearest.lat, nearest.lng);
    return dist < nearestDist ? amb : nearest;
  });
}

// POST /api/symptom-checker/analyze
app.post('/api/symptom-checker/analyze', async (req, res) => {
  try {
    const { symptom_ids, language, patient_id, is_chw_screening, chw_id } = req.body;
    
    if (!symptom_ids || !Array.isArray(symptom_ids) || symptom_ids.length === 0) {
      return res.status(400).json({ error: 'symptom_ids array is required' });
    }

    // Build prompt for Gemini
    const symptomNames = symptom_ids.map(id => {
      const symptoms = {
        fever: 'Fever', cough: 'Cough', difficulty_breathing: 'Difficulty Breathing',
        chest_pain: 'Chest Pain', headache: 'Headache', dizziness: 'Dizziness',
        abdominal_pain: 'Abdominal Pain', diarrhea: 'Diarrhea', vomiting: 'Vomiting',
        rash: 'Skin Rash', joint_pain: 'Joint Pain', fatigue: 'Fatigue',
        sore_throat: 'Sore Throat', ear_pain: 'Ear Pain', eye_redness: 'Eye Redness',
        urinary_burning: 'Burning Urination', swelling_legs: 'Leg Swelling',
        weight_loss: 'Unexplained Weight Loss', night_sweats: 'Night Sweats',
        palpitations: 'Palpitations'
      };
      return symptoms[id] || id;
    }).join(', ');

    const prompt = `You are a medical AI assistant for rural healthcare in India. 
    Analyze these symptoms: ${symptomNames}
    
    Provide a JSON response with:
    1. Top 3-5 possible conditions with ICD-10 codes
    2. Risk level: low/medium/high/critical
    3. Recommendation: home_care/clinic/emergency
    4. Red flags (symptoms requiring immediate care)
    4. Home care advice
    5. AI explanation in simple language
    6. Confidence score (0-1)
    7. Whether human doctor review is needed
    
    Consider: Indian context, common diseases (dengue, malaria, typhoid, TB), resource limitations.
    Language: ${language || 'en'}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Parse JSON from response
    let aiResponse;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      aiResponse = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      // Fallback if JSON parsing fails
      aiResponse = {
        conditions: [],
        risk_level: 'medium',
        recommendation: 'clinic',
        red_flags: ['Seek medical attention if symptoms worsen'],
        home_care_advice: ['Rest', 'Stay hydrated', 'Monitor symptoms'],
        ai_explanation: responseText,
        confidence_score: 0.7,
        requires_human_review: true
      };
    }

    const diagnosisId = `diag_${Date.now()}`;
    const response = {
      diagnosis_id: diagnosisId,
      conditions: aiResponse.conditions || [],
      risk_level: aiResponse.risk_level || 'medium',
      recommendation: aiResponse.recommendation || 'clinic',
      red_flags: aiResponse.red_flags || [],
      home_care_advice: aiResponse.home_care_advice || [],
      ai_explanation: aiResponse.ai_explanation || '',
      confidence_score: aiResponse.confidence_score || 0.7,
      requires_human_review: aiResponse.requires_human_review || false
    };

    // Store for patient
    if (patient_id) {
      if (!diagnoses.has(patient_id)) diagnoses.set(patient_id, []);
      diagnoses.get(patient_id).push({ ...response, timestamp: new Date(), symptom_ids });
    }

    res.json(response);
  } catch (error) {
    console.error('Symptom analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze symptoms' });
  }
});

// POST /api/ambulance/book-emergency
app.post('/api/ambulance/book-emergency', (req, res) => {
  try {
    const { location, patient_id, emergency_type, description, contact_phone } = req.body;
    
    if (!location || !location.lat || !location.lng) {
      return res.status(400).json({ error: 'Location with lat/lng is required' });
    }

    const ambulance = findNearestAmbulance(location.lat, location.lng);
    
    if (!ambulance) {
      return res.status(503).json({ 
        error: 'No ambulances available',
        message: 'All ambulances are currently busy. Please call 108 directly.'
      });
    }

    // Assign ambulance
    ambulance.status = 'en_route';
    const distance = getDistance(location.lat, location.lng, ambulance.lat, ambulance.lng);
    const etaMinutes = Math.ceil(distance * 2.5); // Rough estimate: 2.5 min per km

    const bookingId = `BOOK_${Date.now()}`;
    
    // Simulate arrival after ETA
    setTimeout(() => {
      ambulance.status = 'available';
    }, etaMinutes * 60 * 1000);

    const response = {
      booking_id: bookingId,
      ambulance_id: ambulance.id,
      driver_name: ambulance.driver,
      driver_phone: ambulance.phone,
      vehicle_number: ambulance.vehicle,
      eta_minutes: etaMinutes,
      distance_km: Math.round(distance * 10) / 10,
      status: 'assigned',
      hospital_name: ambulance.hospital,
      hospital_lat: ambulance.hospitalLat,
      hospital_lng: ambulance.hospitalLng
    };

    res.json(response);
  } catch (error) {
    console.error('Ambulance booking error:', error);
    res.status(500).json({ error: 'Failed to book ambulance' });
  }
});

// GET /api/health-records/:patientId
app.get('/api/health-records/:patientId', (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Mock patient data - replace with real DB queries
    const patient = patients.get(patientId) || {
      id: patientId,
      name: 'Patient Name',
      age: 30,
      gender: 'female',
      phone: '+91-9876543210',
      address: 'Village, District, State',
      blood_group: 'O+',
      emergency_contact: 'Emergency Contact',
      allergies: []
    };

    const response = {
      patient,
      vaccinations: [
        { id: '1', vaccine_name: 'COVID-19 Covishield', vaccine_code: 'COVISHIELD', administered_date: '2023-01-15', dose_number: 1, facility_name: 'PHC Village', batch_number: 'COV-001', qr_code_data: '{"vaccine":"Covishield","date":"2023-01-15"}' },
        { id: '2', vaccine_name: 'COVID-19 Covishield', vaccine_code: 'COVISHIELD', administered_date: '2023-03-15', dose_number: 2, facility_name: 'PHC Village', batch_number: 'COV-002', qr_code_data: '{"vaccine":"Covishield","date":"2023-03-15"}' }
      ],
      diagnoses: diagnoses.get(patientId) || [],
      medical_records: [],
      allergies: [],
      medicine_history: [],
      appointments: [],
      prescriptions: [],
      pregnancy: null,
      children: [],
      last_synced_at: new Date().toISOString()
    };

    res.json(response);
  } catch (error) {
    console.error('Health records error:', error);
    res.status(500).json({ error: 'Failed to fetch health records' });
  }
});

// POST /api/voice-assistant/process
app.post('/api/voice-assistant/process', async (req, res) => {
  try {
    const { audio_base64, language, patient_id, context } = req.body;
    
    if (!audio_base64) {
      return res.status(400).json({ error: 'audio_base64 is required' });
    }

    // In production, you would:
    // 1. Decode base64 audio
    // 2. Send to speech-to-text (Google Speech-to-Text, Whisper, etc.)
    // 3. Process with Gemini
    // 4. Generate response audio with TTS
    
    // For demo, we'll simulate the flow
    const mockTranscription = 'I have fever and headache for two days';
    
    const prompt = `You are a healthcare voice assistant for rural India. 
    Patient said: "${mockTranscription}"
    Language: ${language || 'en'}
    Context: ${context || 'general consultation'}
    
    Respond in JSON with:
    1. text_response: What to say back to patient
    2. intent: symptom_check/book_appointment/emergency/medicine_reminder/info
    3. entities: extracted info (symptoms, dates, medicine names, etc.)
    4. actions: array of actions to perform
    5. requires_handoff: true if needs human doctor
    6. handoff_reason: why handoff needed
    
    Keep responses short, empathetic, in ${language || 'English'}.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    let aiResponse;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      aiResponse = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);
    } catch (e) {
      aiResponse = {
        text_response: 'I understand you have fever and headache. Let me help you check your symptoms.',
        intent: 'symptom_check',
        entities: { symptoms: ['fever', 'headache'], duration: '2 days' },
        actions: [{ type: 'navigate', payload: { screen: 'symptom_checker' }, description: 'Open symptom checker' }],
        requires_handoff: false,
        handoff_reason: ''
      };
    }

    const response = {
      text_response: aiResponse.text_response || 'How can I help you?',
      audio_base64: '', // In production: generate TTS audio
      intent: aiResponse.intent || 'general',
      entities: aiResponse.entities || {},
      actions: aiResponse.actions || [],
      requires_handoff: aiResponse.requires_handoff || false,
      handoff_reason: aiResponse.handoff_reason || ''
    };

    res.json(response);
  } catch (error) {
    console.error('Voice assistant error:', error);
    res.status(500).json({ error: 'Failed to process voice command' });
  }
});

// Additional endpoints
app.post('/api/patients/sync', (req, res) => {
  const patient = req.body;
  patients.set(patient.id, { ...patient, updatedAt: new Date() });
  res.json({ ...patient, synced: true });
});

app.get('/api/diagnoses/:patientId/sync', (req, res) => {
  res.json(diagnoses.get(req.params.patientId) || []);
});

app.post('/api/diagnoses', (req, res) => {
  const diagnosis = { ...req.body, id: `diag_${Date.now()}`, createdAt: new Date() };
  const patientId = diagnosis.patient_id;
  if (!diagnoses.has(patientId)) diagnoses.set(patientId, []);
  diagnoses.get(patientId).push(diagnosis);
  res.status(201).json(diagnosis);
});

app.post('/api/pregnancies/sync', (req, res) => {
  const pregnancy = req.body;
  res.json({ ...pregnancy, synced: true });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gram Swasthya API server running on port ${PORT}`);
});