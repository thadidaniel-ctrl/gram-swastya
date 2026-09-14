import 'dart:convert';
import 'package:http/http.dart' as http;
import '../models/diagnosis_result.dart';
import '../models/patient.dart';
import '../models/medical_history.dart';
import '../models/appointment.dart';
import '../models/prescription.dart';
import '../models/pregnancy.dart';

class ApiService {
  static const String _baseUrl = 'https://api.gramswasthya.org';
  static String? _authToken;

  static void setAuthToken(String token) => _authToken = token;

  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  // POST /api/symptom-checker/analyze
  static Future<DiagnosisApiResponse> analyzeSymptoms({
    required List<String> symptomIds,
    required String language,
    String? patientId,
    bool isChwScreening = false,
    String? chwId,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/api/symptom-checker/analyze'),
      headers: _headers,
      body: jsonEncode({
        'symptom_ids': symptomIds,
        'language': language,
        'patient_id': patientId,
        'is_chw_screening': isChwScreening,
        'chw_id': chwId,
      }),
    );

    return DiagnosisApiResponse.fromJson(jsonDecode(response.body));
  }

  // POST /api/ambulance/book-emergency
  static Future<AmbulanceBookingResponse> bookEmergencyAmbulance({
    required double latitude,
    required double longitude,
    required String patientId,
    required String emergencyType,
    String? description,
    String? contactPhone,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/api/ambulance/book-emergency'),
      headers: _headers,
      body: jsonEncode({
        'location': {'lat': latitude, 'lng': longitude},
        'patient_id': patientId,
        'emergency_type': emergencyType,
        'description': description,
        'contact_phone': contactPhone,
      }),
    );

    return AmbulanceBookingResponse.fromJson(jsonDecode(response.body));
  }

  // GET /api/health-records/:patientId
  static Future<HealthRecordsResponse> getHealthRecords(String patientId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/api/health-records/$patientId'),
      headers: _headers,
    );

    return HealthRecordsResponse.fromJson(jsonDecode(response.body));
  }

  // POST /api/voice-assistant/process
  static Future<VoiceAssistantResponse> processVoiceCommand({
    required String audioBase64,
    required String language,
    String? patientId,
    String? context,
  }) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/api/voice-assistant/process'),
      headers: _headers,
      body: jsonEncode({
        'audio_base64': audioBase64,
        'language': language,
        'patient_id': patientId,
        'context': context,
      }),
    );

    return VoiceAssistantResponse.fromJson(jsonDecode(response.body));
  }

  // Additional helper methods
  static Future<Patient?> syncPatient(Patient patient) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/api/patients/sync'),
      headers: _headers,
      body: jsonEncode(patient.toJson()),
    );
    if (response.statusCode == 200) {
      return Patient.fromJson(jsonDecode(response.body));
    }
    return null;
  }

  static Future<List<DiagnosisResult>> syncDiagnoses(String patientId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/api/diagnoses/$patientId/sync'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as List;
      return data.map((d) => DiagnosisResult.fromJson(d)).toList();
    }
    return [];
  }

  static Future<bool> pushDiagnosis(DiagnosisResult diagnosis) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/api/diagnoses'),
      headers: _headers,
      body: jsonEncode(diagnosis.toJson()),
    );
    return response.statusCode == 201;
  }

  static Future<List<MedicalRecord>> syncMedicalRecords(String patientId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/api/medical-records/$patientId'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as List;
      return data.map((d) => MedicalRecord.fromJson(d)).toList();
    }
    return [];
  }

  static Future<List<Appointment>> syncAppointments(String patientId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/api/appointments/$patientId'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as List;
      return data.map((d) => Appointment.fromJson(d)).toList();
    }
    return [];
  }

  static Future<List<Prescription>> syncPrescriptions(String patientId) async {
    final response = await http.get(
      Uri.parse('$_baseUrl/api/prescriptions/$patientId'),
      headers: _headers,
    );
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body) as List;
      return data.map((d) => Prescription.fromJson(d)).toList();
    }
    return [];
  }

  static Future<Pregnancy?> syncPregnancy(Pregnancy pregnancy) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/api/pregnancies/sync'),
      headers: _headers,
      body: jsonEncode(pregnancy.toJson()),
    );
    if (response.statusCode == 200) {
      return Pregnancy.fromJson(jsonDecode(response.body));
    }
    return null;
  }
}

// Response Models
class DiagnosisApiResponse {
  final String diagnosisId;
  final List<ConditionMatchApi> conditions;
  final String riskLevel; // low, medium, high, critical
  final String recommendation; // home_care, clinic, emergency
  final List<String> redFlags;
  final List<String> homeCareAdvice;
  final String aiExplanation;
  final double confidenceScore;
  final bool requiresHumanReview;

  DiagnosisApiResponse({
    required this.diagnosisId,
    required this.conditions,
    required this.riskLevel,
    required this.recommendation,
    required this.redFlags,
    required this.homeCareAdvice,
    required this.aiExplanation,
    required this.confidenceScore,
    required this.requiresHumanReview,
  });

  factory DiagnosisApiResponse.fromJson(Map<String, dynamic> json) {
    return DiagnosisApiResponse(
      diagnosisId: json['diagnosis_id'] ?? '',
      conditions: (json['conditions'] as List? ?? [])
          .map((c) => ConditionMatchApi.fromJson(c))
          .toList(),
      riskLevel: json['risk_level'] ?? 'low',
      recommendation: json['recommendation'] ?? 'home_care',
      redFlags: List<String>.from(json['red_flags'] ?? []),
      homeCareAdvice: List<String>.from(json['home_care_advice'] ?? []),
      aiExplanation: json['ai_explanation'] ?? '',
      confidenceScore: (json['confidence_score'] as num?)?.toDouble() ?? 0.0,
      requiresHumanReview: json['requires_human_review'] ?? false,
    );
  }
}

class ConditionMatchApi {
  final String conditionId;
  final String conditionName;
  final String severity;
  final int matchingSymptoms;
  final int totalSymptoms;
  final double probability;
  final String icd10Code;

  ConditionMatchApi({
    required this.conditionId,
    required this.conditionName,
    required this.severity,
    required this.matchingSymptoms,
    required this.totalSymptoms,
    required this.probability,
    required this.icd10Code,
  });

  factory ConditionMatchApi.fromJson(Map<String, dynamic> json) {
    return ConditionMatchApi(
      conditionId: json['condition_id'] ?? '',
      conditionName: json['condition_name'] ?? '',
      severity: json['severity'] ?? 'low',
      matchingSymptoms: json['matching_symptoms'] ?? 0,
      totalSymptoms: json['total_symptoms'] ?? 0,
      probability: (json['probability'] as num?)?.toDouble() ?? 0.0,
      icd10Code: json['icd10_code'] ?? '',
    );
  }
}

class AmbulanceBookingResponse {
  final String bookingId;
  final String ambulanceId;
  final String driverName;
  final String driverPhone;
  final String vehicleNumber;
  final int etaMinutes;
  final double distanceKm;
  final String status; // assigned, en_route, arrived, completed
  final String hospitalName;
  final double hospitalLat;
  final double hospitalLng;

  AmbulanceBookingResponse({
    required this.bookingId,
    required this.ambulanceId,
    required this.driverName,
    required this.driverPhone,
    required this.vehicleNumber,
    required this.etaMinutes,
    required this.distanceKm,
    required this.status,
    required this.hospitalName,
    required this.hospitalLat,
    required this.hospitalLng,
  });

  factory AmbulanceBookingResponse.fromJson(Map<String, dynamic> json) {
    return AmbulanceBookingResponse(
      bookingId: json['booking_id'] ?? '',
      ambulanceId: json['ambulance_id'] ?? '',
      driverName: json['driver_name'] ?? '',
      driverPhone: json['driver_phone'] ?? '',
      vehicleNumber: json['vehicle_number'] ?? '',
      etaMinutes: json['eta_minutes'] ?? 0,
      distanceKm: (json['distance_km'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? 'assigned',
      hospitalName: json['hospital_name'] ?? '',
      hospitalLat: (json['hospital_lat'] as num?)?.toDouble() ?? 0.0,
      hospitalLng: (json['hospital_lng'] as num?)?.toDouble() ?? 0.0,
    );
  }
}

class HealthRecordsResponse {
  final Patient patient;
  final List<VaccinationRecordApi> vaccinations;
  final List<DiagnosisResult> diagnoses;
  final List<MedicalRecord> medicalRecords;
  final List<Allergy> allergies;
  final List<MedicineHistory> medicineHistory;
  final List<Appointment> appointments;
  final List<Prescription> prescriptions;
  final Pregnancy? pregnancy;
  final List<Child> children;
  final String lastSyncedAt;

  HealthRecordsResponse({
    required this.patient,
    required this.vaccinations,
    required this.diagnoses,
    required this.medicalRecords,
    required this.allergies,
    required this.medicineHistory,
    required this.appointments,
    required this.prescriptions,
    this.pregnancy,
    required this.children,
    required this.lastSyncedAt,
  });

  factory HealthRecordsResponse.fromJson(Map<String, dynamic> json) {
    return HealthRecordsResponse(
      patient: Patient.fromJson(json['patient']),
      vaccinations: (json['vaccinations'] as List? ?? [])
          .map((v) => VaccinationRecordApi.fromJson(v))
          .toList(),
      diagnoses: (json['diagnoses'] as List? ?? [])
          .map((d) => DiagnosisResult.fromJson(d))
          .toList(),
      medicalRecords: (json['medical_records'] as List? ?? [])
          .map((m) => MedicalRecord.fromJson(m))
          .toList(),
      allergies: (json['allergies'] as List? ?? [])
          .map((a) => Allergy.fromJson(a))
          .toList(),
      medicineHistory: (json['medicine_history'] as List? ?? [])
          .map((m) => MedicineHistory.fromJson(m))
          .toList(),
      appointments: (json['appointments'] as List? ?? [])
          .map((a) => Appointment.fromJson(a))
          .toList(),
      prescriptions: (json['prescriptions'] as List? ?? [])
          .map((p) => Prescription.fromJson(p))
          .toList(),
      pregnancy: json['pregnancy'] != null ? Pregnancy.fromJson(json['pregnancy']) : null,
      children: (json['children'] as List? ?? [])
          .map((c) => Child.fromJson(c))
          .toList(),
      lastSyncedAt: json['last_synced_at'] ?? '',
    );
  }
}

class VaccinationRecordApi {
  final String id;
  final String vaccineName;
  final String vaccineCode;
  final DateTime administeredDate;
  final int doseNumber;
  final String facilityName;
  final String batchNumber;
  final String qrCodeData;

  VaccinationRecordApi({
    required this.id,
    required this.vaccineName,
    required this.vaccineCode,
    required this.administeredDate,
    required this.doseNumber,
    required this.facilityName,
    required this.batchNumber,
    required this.qrCodeData,
  });

  factory VaccinationRecordApi.fromJson(Map<String, dynamic> json) {
    return VaccinationRecordApi(
      id: json['id'] ?? '',
      vaccineName: json['vaccine_name'] ?? '',
      vaccineCode: json['vaccine_code'] ?? '',
      administeredDate: DateTime.parse(json['administered_date']),
      doseNumber: json['dose_number'] ?? 1,
      facilityName: json['facility_name'] ?? '',
      batchNumber: json['batch_number'] ?? '',
      qrCodeData: json['qr_code_data'] ?? '',
    );
  }
}

class VoiceAssistantResponse {
  final String textResponse;
  final String audioBase64;
  final String intent;
  final Map<String, dynamic> entities;
  final List<VoiceAction> actions;
  final bool requiresHandoff;
  final String handoffReason;

  VoiceAssistantResponse({
    required this.textResponse,
    required this.audioBase64,
    required this.intent,
    required this.entities,
    required this.actions,
    this.requiresHandoff = false,
    this.handoffReason = '',
  });

  factory VoiceAssistantResponse.fromJson(Map<String, dynamic> json) {
    return VoiceAssistantResponse(
      textResponse: json['text_response'] ?? '',
      audioBase64: json['audio_base64'] ?? '',
      intent: json['intent'] ?? '',
      entities: Map<String, dynamic>.from(json['entities'] ?? {}),
      actions: (json['actions'] as List? ?? [])
          .map((a) => VoiceAction.fromJson(a))
          .toList(),
      requiresHandoff: json['requires_handoff'] ?? false,
      handoffReason: json['handoff_reason'] ?? '',
    );
  }
}

class VoiceAction {
  final String type; // navigate, book_appointment, call_ambulance, show_info, etc.
  final Map<String, dynamic> payload;
  final String description;

  VoiceAction({
    required this.type,
    required this.payload,
    required this.description,
  });

  factory VoiceAction.fromJson(Map<String, dynamic> json) {
    return VoiceAction(
      type: json['type'] ?? '',
      payload: Map<String, dynamic>.from(json['payload'] ?? {}),
      description: json['description'] ?? '',
    );
  }
}