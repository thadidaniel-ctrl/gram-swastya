import 'package:json_annotation/json_annotation.dart';

part 'vaccination_record.g.dart';

@JsonSerializable()
class VaccinationRecord {
  final String id;
  final String patientId;
  final String vaccineName;
  final String vaccineCode;
  final DateTime administeredDate;
  final DateTime? nextDueDate;
  final String doseNumber;
  final String administeredBy;
  final String facilityName;
  final String batchNumber;
  final String? qrCodeData;
  final String notes;
  final DateTime createdAt;
  final bool isSynced;

  const VaccinationRecord({
    required this.id,
    required this.patientId,
    required this.vaccineName,
    required this.vaccineCode,
    required this.administeredDate,
    this.nextDueDate,
    required this.doseNumber,
    required this.administeredBy,
    required this.facilityName,
    required this.batchNumber,
    this.qrCodeData,
    this.notes = '',
    required this.createdAt,
    this.isSynced = false,
  });

  factory VaccinationRecord.fromJson(Map<String, dynamic> json) => _$VaccinationRecordFromJson(json);
  Map<String, dynamic> toJson() => _$VaccinationRecordToJson(this);

  String generateQrData() {
    return '''{
      "vaccine": "$vaccineName",
      "code": "$vaccineCode",
      "date": "${administeredDate.toIso8601String()}",
      "dose": "$doseNumber",
      "facility": "$facilityName",
      "batch": "$batchNumber",
      "patient": "$patientId"
    }''';
  }
}