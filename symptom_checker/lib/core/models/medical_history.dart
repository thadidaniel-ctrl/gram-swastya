import 'package:json_annotation/json_annotation.dart';

part 'medical_history.g.dart';

@JsonSerializable()
class MedicalRecord {
  final String id;
  final String patientId;
  final String recordType;
  final DateTime date;
  final String title;
  final String description;
  final String? doctorId;
  final String? doctorName;
  final String? facilityName;
  final List<String> attachments;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final bool isSynced;

  const MedicalRecord({
    required this.id,
    required this.patientId,
    required this.recordType,
    required this.date,
    required this.title,
    required this.description,
    this.doctorId,
    this.doctorName,
    this.facilityName,
    this.attachments = const [],
    this.metadata = const {},
    required this.createdAt,
    this.isSynced = false,
  });

  factory MedicalRecord.fromJson(Map<String, dynamic> json) => _$MedicalRecordFromJson(json);
  Map<String, dynamic> toJson() => _$MedicalRecordToJson(this);
}

@JsonSerializable()
class Allergy {
  final String id;
  final String patientId;
  final String allergen;
  final String allergenType;
  final String severity;
  final String reaction;
  final DateTime diagnosedDate;
  final String? diagnosedBy;
  final String notes;
  final bool isActive;
  final DateTime createdAt;
  final bool isSynced;

  const Allergy({
    required this.id,
    required this.patientId,
    required this.allergen,
    required this.allergenType,
    required this.severity,
    required this.reaction,
    required this.diagnosedDate,
    this.diagnosedBy,
    this.notes = '',
    this.isActive = true,
    required this.createdAt,
    this.isSynced = false,
  });

  factory Allergy.fromJson(Map<String, dynamic> json) => _$AllergyFromJson(json);
  Map<String, dynamic> toJson() => _$AllergyToJson(this);

  String getSeverityLabel(String locale) {
    final labels = {
      'mild': {'en': 'Mild', 'hi': 'हल्का', 'te': 'మృదువైన', 'ta': 'மிதமான', 'mr': 'हलके'},
      'moderate': {'en': 'Moderate', 'hi': 'मध्यम', 'te': 'మధ్యమ', 'ta': 'மத்தியம்', 'mr': 'मध्यम'},
      'severe': {'en': 'Severe', 'hi': 'गंभीर', 'te': 'గంభీర్', 'ta': 'கடுமையான', 'mr': 'गंभीर'},
      'life_threatening': {'en': 'Life Threatening', 'hi': 'जानलेवा', 'te': 'జీవุกో Konzert', 'ta': 'உயிர் அபாயம்', 'mr': 'जीवनघातक'},
    };
    return labels[severity]?[locale] ?? labels[severity]?['en'] ?? severity;
  }
}

@JsonSerializable()
class MedicineHistory {
  final String id;
  final String patientId;
  final String medicineName;
  final String genericName;
  final String dosage;
  final String frequency;
  final DateTime startDate;
  final DateTime? endDate;
  final String prescribedBy;
  final String indication;
  final String status;
  final List<String> sideEffects;
  final String notes;
  final DateTime createdAt;
  final bool isSynced;

  const MedicineHistory({
    required this.id,
    required this.patientId,
    required this.medicineName,
    required this.genericName,
    required this.dosage,
    required this.frequency,
    required this.startDate,
    this.endDate,
    required this.prescribedBy,
    required this.indication,
    this.status = 'active',
    this.sideEffects = const [],
    this.notes = '',
    required this.createdAt,
    this.isSynced = false,
  });

  factory MedicineHistory.fromJson(Map<String, dynamic> json) => _$MedicineHistoryFromJson(json);
  Map<String, dynamic> toJson() => _$MedicineHistoryToJson(this);

  bool get isActive => endDate == null || endDate!.isAfter(DateTime.now());
}