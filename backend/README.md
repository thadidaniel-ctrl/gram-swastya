# Gram Swasthya 2.0 - Backend API

## API Endpoints

### 1. Symptom Analysis with Gemini AI
**POST** `/api/symptom-checker/analyze`

Analyzes symptoms using Google Gemini AI and returns possible conditions with risk assessment.

**Request:**
```json
{
  "symptom_ids": ["fever", "cough", "difficulty_breathing"],
  "language": "en",
  "patient_id": "patient_123",
  "is_chw_screening": false,
  "chw_id": "chw_001"
}
```

**Response:**
```json
{
  "diagnosis_id": "diag_1700000000000",
  "conditions": [
    {
      "condition_id": "covid19",
      "condition_name": "COVID-19",
      "severity": "high",
      "matching_symptoms": 3,
      "total_symptoms": 5,
      "probability": 0.85,
      "icd10_code": "U07.1"
    }
  ],
  "risk_level": "high",
  "recommendation": "emergency",
  "red_flags": ["Difficulty breathing", "Chest pain", "Oxygen < 94%"],
  "home_care_advice": ["Isolate immediately", "Monitor oxygen levels", "Contact health worker"],
  "ai_explanation": "Based on your symptoms...",
  "confidence_score": 0.85,
  "requires_human_review": true
}
```

### 2. Emergency Ambulance Booking
**POST** `/api/emergency/call`

Finds nearest available ambulance and assigns it to the emergency.

**Request:**
```json
{
  "location": { "lat": 28.6139, "lng": 77.2090 },
  "patient_id": "patient_123",
  "emergency_type": "cardiac",
  "description": "Chest pain, difficulty breathing",
  "contact_phone": "+91-9876543210"
}
```

**Response:**
```json
{
  "booking_id": "BOOK_1700000000000",
  "ambulance_id": "AMB001",
  "driver_name": "Rajesh Kumar",
  "driver_phone": "+91-9876543210",
  "vehicle_number": "DL-01-AB-1234",
  "eta_minutes": 8,
  "distance_km": 3.2,
  "status": "assigned",
  "hospital_name": "AIIMS Delhi",
  "hospital_lat": 28.5672,
  "hospital_lng": 77.2100
}
```

### 3. Get Patient Health Records
**GET** `/api/health-records/:patientId`

Returns complete health records for a patient.

**Response:**
```json
{
  "patient": { "id": "...", "name": "...", "age": 30, ... },
  "vaccinations": [...],
  "diagnoses": [...],
  "medical_records": [...],
  "allergies": [...],
  "medicine_history": [...],
  "appointments": [...],
  "prescriptions": [...],
  "pregnancy": null,
  "children": [],
  "last_synced_at": "2024-01-15T10:30:00Z"
}
```

### 4. Voice Assistant Processing
**POST** `/api/voice-assistant/process`

Processes voice commands using Gemini NLP, returns response and actions.

**Request:**
```json
{
  "audio_base64": "base64_encoded_audio",
  "language": "hi",
  "patient_id": "patient_123",
  "context": "symptom_check"
}
```

**Response:**
```json
{
  "text_response": "आपको बुखार और सिरदर्द है। मैं लक्षण जांच में मदद करता हूं।",
  "audio_base64": "",
  "intent": "symptom_check",
  "entities": { "symptoms": ["fever", "headache"], "duration": "2 days" },
  "actions": [
    { "type": "navigate", "payload": { "screen": "symptom_checker" }, "description": "Open symptom checker" }
  ],
  "requires_handoff": false,
  "handoff_reason": ""
}
```

## Setup

1. **Install dependencies:**
```bash
cd backend
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

3. **Run server:**
```bash
npm run dev  # Development with nodemon
npm start    # Production
```

## Frontend Integration

The Flutter app uses `ApiService` class to call these endpoints:

```dart
// Symptom analysis
final result = await ApiService.analyzeSymptoms(
  symptomIds: ['fever', 'cough'],
  language: 'en',
  patientId: 'patient_123',
);

// Emergency ambulance
final ambulance = await ApiService.bookEmergencyAmbulance(
  latitude: 28.6139,
  longitude: 77.2090,
  patientId: 'patient_123',
  emergencyType: 'cardiac',
);

// Health records
final records = await ApiService.getHealthRecords('patient_123');

// Voice assistant
final voiceResponse = await ApiService.processVoiceCommand(
  audioBase64: base64Audio,
  language: 'hi',
  patientId: 'patient_123',
);
```

## Deployment

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["node", "src/server.js"]
```

### Environment Variables for Production
- `NODE_ENV=production`, `PORT=5000`
- `MONGODB_URI` — connection string (MongoDB Atlas/self-hosted)
- `REDIS_URL` — optional; app falls back to an in-memory mock if Redis is unavailable
- `JWT_SECRET`, `JWT_ACCESS_EXPIRY`, `JWT_REFRESH_EXPIRY`
- Twilio (`TWILIO_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) for OTP SMS
- Gemini (`GEMINI_API_KEY`) for symptom/voice analysis
- AWS S3 (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET`) for file storage
- `STRIPE_SECRET_KEY` + `PAYMENT_GATEWAY=stripe` for real payments (defaults to a mock adapter)
- `MEETING_BASE_URL` for video-consultation meeting links

## Gemini AI Prompt Engineering

The symptom analysis uses a carefully crafted prompt that includes:
- Indian healthcare context
- Common rural diseases (dengue, malaria, typhoid, TB)
- Resource limitations awareness
- Multi-language support
- Safety-first approach with human review flags

## Security Considerations

Implemented:
- JWT authentication (7-day access / 30-day refresh) with token refresh on all protected routes
- Global + auth-specific rate limiting (express-rate-limit), `trust proxy` for LB/WAF deployments
- Helmet security headers, CORS allowlist, Mongo-sanitization (`express-mongo-sanitize`) and XSS-clean middleware
- Request body size limits, structured error handling with request IDs
- OTP generation uses `crypto.randomInt` (not `Math.random`)
- File-upload validation: MIME + extension + magic-byte verification
- Graceful shutdown with forced-exit timeout

Recommended:
- HIPAA/GDPR compliance review for health data at rest and in transit (TLS)
- Log aggregation on structured (JSON) production logs
- Regular dependency audits (`npm audit`) and secret rotation