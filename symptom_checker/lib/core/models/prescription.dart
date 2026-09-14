import 'package:json_annotation/json_annotation.dart';

part 'prescription.g.dart';

@JsonSerializable()
class Prescription {
  final String id;
  final String appointmentId;
  final String patientId;
  final String doctorId;
  final DateTime issuedAt;
  final List<Medication> medications;
  final List<String> instructions;
  final List<String> followUpInstructions;
  final DateTime? followUpDate;
  final String? labTests;
  final String notes;
  final bool isSynced;
  final String? pdfUrl;

  const Prescription({
    required this.id,
    required this.appointmentId,
    required this.patientId,
    required this.doctorId,
    required this.issuedAt,
    required this.medications,
    this.instructions = const [],
    this.followUpInstructions = const [],
    this.followUpDate,
    this.labTests,
    this.notes = '',
    this.isSynced = false,
    this.pdfUrl,
  });

  factory Prescription.fromJson(Map<String, dynamic> json) => _$PrescriptionFromJson(json);
  Map<String, dynamic> toJson() => _$PrescriptionToJson(this);
}

@JsonSerializable()
class Medication {
  final String id;
  final String name;
  final String genericName;
  final String dosage;
  final String frequency;
  final String duration;
  final String route;
  final String instructions;
  final bool isGeneric;
  final double? price;

  const Medication({
    required this.id,
    required this.name,
    required this.genericName,
    required this.dosage,
    required this.frequency,
    required this.duration,
    required this.route,
    this.instructions = '',
    this.isGeneric = true,
    this.price,
  });

  factory Medication.fromJson(Map<String, dynamic> json) => _$MedicationFromJson(json);
  Map<String, dynamic> toJson() => _$MedicationToJson(this);

  String getDisplayString(String locale) {
    final freqLabels = {
      'en': {'OD': 'Once daily', 'BD': 'Twice daily', 'TDS': 'Three times daily', 'QID': 'Four times daily', 'SOS': 'As needed'},
      'hi': {'OD': 'दिन में एक बार', 'BD': 'दिन में दो बार', 'TDS': 'दिन में तीन बार', 'QID': 'दिन में चार बार', 'SOS': 'आवश्यकतानुसार'},
      'te': {'OD': 'రోజు ఒకసారి', 'BD': 'రోజు రెండుసారి', 'TDS': 'రోజు మూడుసారి', 'QID': 'రోజు నాలుగుసారి', 'SOS': 'అవసరమైతే'},
      'ta': {'OD': 'நாளில் ஒரு முறை', 'BD': 'நாளில் இரண்டு முறை', 'TDS': 'நாளில் மூன்று முறை', 'QID': 'நாளில் நான்கு முறை', 'SOS': 'அதிகரித்தால்'},
      'mr': {'OD': 'दिवसात एकदा', 'BD': 'दिवसात दोनदा', 'TDS': 'दिवसात तीनदा', 'QID': 'दिवसात चारदा', 'SOS': 'गरजेनुसार'},
    };
    final freq = freqLabels[locale]?[frequency] ?? freqLabels['en']?[frequency] ?? frequency;
    return '$name $dosage - $freq for $duration';
  }
}