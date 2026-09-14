import 'dart:math';
import 'package:json_annotation/json_annotation.dart';
import 'package:flutter/material.dart';

part 'medicine_reminder.g.dart';

enum FrequencyType { daily, weekly, monthly, custom, asNeeded }
enum DoseStatus { taken, missed, skipped, snoozed }
enum InteractionSeverity { minor, moderate, major, contraindicated }

@JsonSerializable()
class Medicine {
  final String id;
  final String patientId;
  final String name;
  final String genericName;
  final String strength;
  final String form;
  final FrequencyType frequencyType;
  final List<DoseTime> doseTimes;
  final int intervalDays;
  final DateTime startDate;
  final DateTime? endDate;
  final String instructions;
  final String prescribedBy;
  final String? prescriptionId;
  final int totalQuantity;
  final int remainingQuantity;
  final int lowStockThreshold;
  final bool enableReminders;
  final bool enableSmsReminders;
  final String? pharmacyId;
  final List<String> substitutionIds;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isActive;
  final bool isSynced;

  const Medicine({
    required this.id,
    required this.patientId,
    required this.name,
    required this.genericName,
    required this.strength,
    required this.form,
    required this.frequencyType,
    required this.doseTimes,
    this.intervalDays = 1,
    required this.startDate,
    this.endDate,
    this.instructions = '',
    this.prescribedBy = '',
    this.prescriptionId,
    this.totalQuantity = 0,
    this.remainingQuantity = 0,
    this.lowStockThreshold = 5,
    this.enableReminders = true,
    this.enableSmsReminders = false,
    this.pharmacyId,
    this.substitutionIds = const [],
    required this.createdAt,
    required this.updatedAt,
    this.isActive = true,
    this.isSynced = false,
  });

  factory Medicine.fromJson(Map<String, dynamic> json) => _$MedicineFromJson(json);
  Map<String, dynamic> toJson() => _$MedicineToJson(this);

  bool get isLowStock => remainingQuantity <= lowStockThreshold && remainingQuantity > 0;
  bool get isOutOfStock => remainingQuantity <= 0;
  bool get needsRefill => isLowStock || isOutOfStock;

  String getFrequencyLabel(String locale) {
    switch (frequencyType) {
      case FrequencyType.daily:
        return {'en': 'Daily', 'hi': 'दैनिक', 'te': 'ప్రతిరోజు', 'ta': 'தினமும்', 'mr': 'दैनंदिन'}[locale] ?? 'Daily';
      case FrequencyType.weekly:
        return {'en': 'Weekly', 'hi': 'साप्ताहिक', 'te': 'సాప్తాహిక', 'ta': 'வாரமும்', 'mr': 'साप्ताहिक'}[locale] ?? 'Weekly';
      case FrequencyType.monthly:
        return {'en': 'Monthly', 'hi': 'मासिक', 'te': 'మాసిక', 'ta': 'மாதமும்', 'mr': 'मासिक'}[locale] ?? 'Monthly';
      case FrequencyType.custom:
        return {'en': 'Every $intervalDays days', 'hi': '$intervalDays दिन में', 'te': '$intervalDays రోజులకు', 'ta': '$intervalDays நாட்களுக்கு', 'mr': '$intervalDays दिवसात'}[locale] ?? 'Custom';
      case FrequencyType.asNeeded:
        return {'en': 'As Needed', 'hi': 'आवश्यकतानुसार', 'te': 'అవసరమైతే', 'ta': 'அதிகரித்தால்', 'mr': 'गरजेनुसार'}[locale] ?? 'As Needed';
    }
  }

  String getFormLabel(String locale) {
    final forms = {
      'tablet': {'en': 'Tablet', 'hi': 'गोली', 'te': 'గోళి', 'ta': 'கோளி', 'mr': 'गोळी'},
      'capsule': {'en': 'Capsule', 'hi': 'कैप्सूल', 'te': 'క్యాప్సూల్', 'ta': 'கேப்சூல்', 'mr': 'कॅप्सूल'},
      'syrup': {'en': 'Syrup', 'hi': 'सिरप', 'te': 'సిరప్', 'ta': 'சிரப்', 'mr': 'सिरप'},
      'injection': {'en': 'Injection', 'hi': 'इंजेक्शन', 'te': 'ఇంజెక్షన్', 'ta': 'ஒடுக்குதல்', 'mr': 'इंजेक्शन'},
      'cream': {'en': 'Cream', 'hi': 'क्रीम', 'te': 'క్రీమ్', 'ta': 'கிரீம்', 'mr': 'क्रीम'},
      'drops': {'en': 'Drops', 'hi': 'ड्रॉप्स', 'te': 'డ్రాప్స్', 'ta': 'ட்ரಾಪ்ஸ்', 'mr': 'ड्रॉप्स'},
      'inhaler': {'en': 'Inhaler', 'hi': 'इन्हेलर', 'te': 'ఇన్హెలర్', 'ta': 'இன்ஹேலர்', 'mr': 'इनहेलर'},
      'patch': {'en': 'Patch', 'hi': 'पैच', 'te': 'ప్యాచ్', 'ta': 'பேட்ச்', 'mr': 'पॅच'},
    };
    return forms[form]?[locale] ?? forms[form]?['en'] ?? form;
  }

  String getDisplayString(String locale) {
    return '$name $strength $formLabel - ${getFrequencyLabel(locale)}';
  }

  String get formLabel => getFormLabel('en');

  Medicine copyWith({
    String? id,
    String? patientId,
    String? name,
    String? genericName,
    String? strength,
    String? form,
    FrequencyType? frequencyType,
    List<DoseTime>? doseTimes,
    int? intervalDays,
    DateTime? startDate,
    DateTime? endDate,
    String? instructions,
    String? prescribedBy,
    String? prescriptionId,
    int? totalQuantity,
    int? remainingQuantity,
    int? lowStockThreshold,
    bool? enableReminders,
    bool? enableSmsReminders,
    String? pharmacyId,
    List<String>? substitutionIds,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isActive,
    bool? isSynced,
  }) {
    return Medicine(
      id: id ?? this.id,
      patientId: patientId ?? this.patientId,
      name: name ?? this.name,
      genericName: genericName ?? this.genericName,
      strength: strength ?? this.strength,
      form: form ?? this.form,
      frequencyType: frequencyType ?? this.frequencyType,
      doseTimes: doseTimes ?? this.doseTimes,
      intervalDays: intervalDays ?? this.intervalDays,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      instructions: instructions ?? this.instructions,
      prescribedBy: prescribedBy ?? this.prescribedBy,
      prescriptionId: prescriptionId ?? this.prescriptionId,
      totalQuantity: totalQuantity ?? this.totalQuantity,
      remainingQuantity: remainingQuantity ?? this.remainingQuantity,
      lowStockThreshold: lowStockThreshold ?? this.lowStockThreshold,
      enableReminders: enableReminders ?? this.enableReminders,
      enableSmsReminders: enableSmsReminders ?? this.enableSmsReminders,
      pharmacyId: pharmacyId ?? this.pharmacyId,
      substitutionIds: substitutionIds ?? this.substitutionIds,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isActive: isActive ?? this.isActive,
      isSynced: isSynced ?? this.isSynced,
    );
  }
}

@JsonSerializable()
class DoseTime {
  final String id;
  final TimeOfDay time;
  final String label;
  final bool isEnabled;

  const DoseTime({
    required this.id,
    required this.time,
    this.label = '',
    this.isEnabled = true,
  });

  factory DoseTime.fromJson(Map<String, dynamic> json) => _$DoseTimeFromJson(json);
  Map<String, dynamic> toJson() => _$DoseTimeToJson(this);

  String get formattedTime => '${time.hour.toString().padLeft(2, '0')}:${time.minute.toString().padLeft(2, '0')}';
}

@JsonSerializable()
class DoseLog {
  final String id;
  final String medicineId;
  final String patientId;
  final DateTime scheduledTime;
  final DateTime? takenTime;
  final DoseStatus status;
  final String? notes;
  final bool isSynced;

  const DoseLog({
    required this.id,
    required this.medicineId,
    required this.patientId,
    required this.scheduledTime,
    this.takenTime,
    this.status = DoseStatus.missed,
    this.notes,
    this.isSynced = false,
  });

  factory DoseLog.fromJson(Map<String, dynamic> json) => _$DoseLogFromJson(json);
  Map<String, dynamic> toJson() => _$DoseLogToJson(this);

  bool get isTaken => status == DoseStatus.taken;
  bool get isMissed => status == DoseStatus.missed;
}

@JsonSerializable()
class DrugInteraction {
  final String id;
  final String medicineId1;
  final String medicineName1;
  final String medicineId2;
  final String medicineName2;
  final InteractionSeverity severity;
  final String description;
  final String mechanism;
  final String management;
  final List<String> references;
  final DateTime createdAt;

  const DrugInteraction({
    required this.id,
    required this.medicineId1,
    required this.medicineName1,
    required this.medicineId2,
    required this.medicineName2,
    required this.severity,
    required this.description,
    required this.mechanism,
    required this.management,
    this.references = const [],
    required this.createdAt,
  });

  factory DrugInteraction.fromJson(Map<String, dynamic> json) => _$DrugInteractionFromJson(json);
  Map<String, dynamic> toJson() => _$DrugInteractionToJson(this);

  Color get severityColor {
    switch (severity) {
      case InteractionSeverity.minor: return Colors.green;
      case InteractionSeverity.moderate: return Colors.orange;
      case InteractionSeverity.major: return Colors.deepOrange;
      case InteractionSeverity.contraindicated: return Colors.red;
    }
  }

  String getSeverityLabel(String locale) {
    switch (severity) {
      case InteractionSeverity.minor:
        return {'en': 'Minor', 'hi': 'मामूली', 'te': 'మ�ેజర్', 'ta': 'மಿತமான', 'mr': 'मामूली'}[locale] ?? 'Minor';
      case InteractionSeverity.moderate:
        return {'en': 'Moderate', 'hi': 'मध्यम', 'te': 'మధ్యమ', 'ta': 'மத்தியம்', 'mr': 'मध्यम'}[locale] ?? 'Moderate';
      case InteractionSeverity.major:
        return {'en': 'Major', 'hi': 'गंभीर', 'te': 'గంభీర', 'ta': 'கடுமையான', 'mr': 'गंभीर'}[locale] ?? 'Major';
      case InteractionSeverity.contraindicated:
        return {'en': 'Contraindicated', 'hi': 'निषिद्ध', 'te': 'నిషేధిత', 'ta': 'தடையப்பட்ட', 'mr': 'निषिद्ध'}[locale] ?? 'Contraindicated';
    }
  }
}

@JsonSerializable()
class MedicineSubstitution {
  final String id;
  final String originalMedicineId;
  final String originalMedicineName;
  final String substituteId;
  final String substituteName;
  final String substituteGeneric;
  final String substituteStrength;
  final String reason;
  final double priceDifference;
  final bool isGenericEquivalent;
  final String notes;

  const MedicineSubstitution({
    required this.id,
    required this.originalMedicineId,
    required this.originalMedicineName,
    required this.substituteId,
    required this.substituteName,
    required this.substituteGeneric,
    required this.substituteStrength,
    this.reason = '',
    this.priceDifference = 0,
    this.isGenericEquivalent = true,
    this.notes = '',
  });

  factory MedicineSubstitution.fromJson(Map<String, dynamic> json) => _$MedicineSubstitutionFromJson(json);
  Map<String, dynamic> toJson() => _$MedicineSubstitutionToJson(this);
}

@JsonSerializable()
class Pharmacy {
  final String id;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final String phone;
  final List<String> operatingHours;
  final bool hasHomeDelivery;
  final List<String> availableMedicines;
  final double rating;
  final int reviewCount;
  final String imageUrl;

  const Pharmacy({
    required this.id,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    required this.phone,
    this.operatingHours = const [],
    this.hasHomeDelivery = false,
    this.availableMedicines = const [],
    this.rating = 0,
    this.reviewCount = 0,
    this.imageUrl = '',
  });

  factory Pharmacy.fromJson(Map<String, dynamic> json) => _$PharmacyFromJson(json);
  Map<String, dynamic> toJson() => _$PharmacyToJson(this);

  double distanceFrom(double lat, double lng) {
    const double earthRadius = 6371;
    final dLat = _toRadians(latitude - lat);
    final dLng = _toRadians(longitude - lng);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(_toRadians(lat)) * cos(_toRadians(latitude)) *
        sin(dLng / 2) * sin(dLng / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return earthRadius * c;
  }

  double _toRadians(double deg) => deg * (pi / 180);
}