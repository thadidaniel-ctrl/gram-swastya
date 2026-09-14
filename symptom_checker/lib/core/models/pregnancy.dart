import 'package:json_annotation/json_annotation.dart';

part 'pregnancy.g.dart';

enum PregnancyStatus { confirmed, ongoing, delivered, miscarriage, terminated }
enum Trimester { first, second, third }
enum DeliveryType { normal, c_section, assisted, not_delivered }
enum ChildGender { male, female, other }

@JsonSerializable()
class Pregnancy {
  final String id;
  final String patientId;
  final String? anmId;
  final PregnancyStatus status;
  final DateTime lmpDate; // Last Menstrual Period
  final DateTime? eddDate; // Estimated Date of Delivery
  final DateTime? deliveryDate;
  final DeliveryType? deliveryType;
  final String? facilityName;
  final String? doctorName;
  final int gravida;
  final int para;
  final int abortions;
  final int livingChildren;
  final List<String> riskFactors;
  final List<PrenatalVisit> visits;
  final List<PregnancySymptom> symptoms;
  final List<DangerSign> dangerSigns;
  final BirthPlan? birthPlan;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isSynced;

  const Pregnancy({
    required this.id,
    required this.patientId,
    this.anmId,
    this.status = PregnancyStatus.confirmed,
    required this.lmpDate,
    this.eddDate,
    this.deliveryDate,
    this.deliveryType,
    this.facilityName,
    this.doctorName,
    this.gravida = 1,
    this.para = 0,
    this.abortions = 0,
    this.livingChildren = 0,
    this.riskFactors = const [],
    this.visits = const [],
    this.symptoms = const [],
    this.dangerSigns = const [],
    this.birthPlan,
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
  });

  factory Pregnancy.fromJson(Map<String, dynamic> json) => _$PregnancyFromJson(json);
  Map<String, dynamic> toJson() => _$PregnancyToJson(this);

  int get currentWeek {
    final now = DateTime.now();
    if (now.isBefore(lmpDate)) return 0;
    final diff = now.difference(lmpDate).inDays;
    return (diff / 7).floor();
  }

  int get currentDay => DateTime.now().difference(lmpDate).inDays % 7;

  Trimester get currentTrimester {
    final week = currentWeek;
    if (week <= 13) return Trimester.first;
    if (week <= 27) return Trimester.second;
    return Trimester.third;
  }

  DateTime get calculatedEdd => eddDate ?? lmpDate.add(const Duration(days: 280));

  int get daysUntilEdd => calculatedEdd.difference(DateTime.now()).inDays;

  bool get isOverdue => daysUntilEdd < 0 && status == PregnancyStatus.ongoing;

  String getTrimesterLabel(String locale) {
    switch (currentTrimester) {
      case Trimester.first:
        return {'en': 'First Trimester', 'hi': 'पहली तिमाही', 'te': 'మొదటి త్రైమాసికం', 'ta': 'முதல் காலம்', 'mr': 'पहिला त्रैमासिक'}[locale] ?? 'First Trimester';
      case Trimester.second:
        return {'en': 'Second Trimester', 'hi': 'दूसरी तिमाही', 'te': 'రెండవ త్రైమాసికం', 'ta': 'இரண்டாவது காலம்', 'mr': 'दुसरा त्रैमासिक'}[locale] ?? 'Second Trimester';
      case Trimester.third:
        return {'en': 'Third Trimester', 'hi': 'तीसरी तिमाही', 'te': 'మూడవ త్రైమాసికం', 'ta': 'மூன்றாவது காலம்', 'mr': 'तीसरा त्रैमासिक'}[locale] ?? 'Third Trimester';
    }
  }

  Pregnancy copyWith({
    String? id,
    String? patientId,
    String? anmId,
    PregnancyStatus? status,
    DateTime? lmpDate,
    DateTime? eddDate,
    DateTime? deliveryDate,
    DeliveryType? deliveryType,
    String? facilityName,
    String? doctorName,
    int? gravida,
    int? para,
    int? abortions,
    int? livingChildren,
    List<String>? riskFactors,
    List<PrenatalVisit>? visits,
    List<PregnancySymptom>? symptoms,
    List<DangerSign>? dangerSigns,
    BirthPlan? birthPlan,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isSynced,
  }) {
    return Pregnancy(
      id: id ?? this.id,
      patientId: patientId ?? this.patientId,
      anmId: anmId ?? this.anmId,
      status: status ?? this.status,
      lmpDate: lmpDate ?? this.lmpDate,
      eddDate: eddDate ?? this.eddDate,
      deliveryDate: deliveryDate ?? this.deliveryDate,
      deliveryType: deliveryType ?? this.deliveryType,
      facilityName: facilityName ?? this.facilityName,
      doctorName: doctorName ?? this.doctorName,
      gravida: gravida ?? this.gravida,
      para: para ?? this.para,
      abortions: abortions ?? this.abortions,
      livingChildren: livingChildren ?? this.livingChildren,
      riskFactors: riskFactors ?? this.riskFactors,
      visits: visits ?? this.visits,
      symptoms: symptoms ?? this.symptoms,
      dangerSigns: dangerSigns ?? this.dangerSigns,
      birthPlan: birthPlan ?? this.birthPlan,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isSynced: isSynced ?? this.isSynced,
    );
  }

  String getStatusLabel(String locale) {
    switch (status) {
      case PregnancyStatus.confirmed:
        return {'en': 'Confirmed', 'hi': 'पुष्टि', 'te': 'నిఖిల', 'ta': 'உறுதி', 'mr': 'खात्री'}[locale] ?? 'Confirmed';
      case PregnancyStatus.ongoing:
        return {'en': 'Ongoing', 'hi': 'जारी', 'te': 'ప్రగతిలో', 'ta': 'நடைபெறுகின்றது', 'mr': 'प्रगतीत'}[locale] ?? 'Ongoing';
      case PregnancyStatus.delivered:
        return {'en': 'Delivered', 'hi': 'प्रसव हुआ', 'te': 'ప్రసవమైంది', 'ta': 'பிறந்தது', 'mr': 'प्रसव झाले'}[locale] ?? 'Delivered';
      case PregnancyStatus.miscarriage:
        return {'en': 'Miscarriage', 'hi': 'गर्भपात', 'te': 'గర్భపాతం', 'ta': 'கருக்கலைப்பு', 'mr': 'गर्भपात'}[locale] ?? 'Miscarriage';
      case PregnancyStatus.terminated:
        return {'en': 'Terminated', 'hi': 'समाप्त', 'te': 'ముగింపు', 'ta': 'முடிக்கப்பட்டது', 'mr': 'समाप्त'}[locale] ?? 'Terminated';
    }
  }
}

@JsonSerializable()
class PrenatalVisit {
  final String id;
  final String pregnancyId;
  final int weekNumber;
  final DateTime scheduledDate;
  final DateTime? actualDate;
  final String? facilityName;
  final String? providerName;
  final double? weight;
  final double? bpSystolic;
  final double? bpDiastolic;
  final int? fetalHeartRate;
  final int? fundalHeight;
  final String? presentation;
  final String notes;
  final List<String> investigations;
  final List<String> medicationsGiven;
  final bool isCompleted;
  final String? nextVisitDate;
  final DateTime createdAt;

  const PrenatalVisit({
    required this.id,
    required this.pregnancyId,
    required this.weekNumber,
    required this.scheduledDate,
    this.actualDate,
    this.facilityName,
    this.providerName,
    this.weight,
    this.bpSystolic,
    this.bpDiastolic,
    this.fetalHeartRate,
    this.fundalHeight,
    this.presentation,
    this.notes = '',
    this.investigations = const [],
    this.medicationsGiven = const [],
    this.isCompleted = false,
    this.nextVisitDate,
    required this.createdAt,
  });

  factory PrenatalVisit.fromJson(Map<String, dynamic> json) => _$PrenatalVisitFromJson(json);
  Map<String, dynamic> toJson() => _$PrenatalVisitToJson(this);

  String getBpString => bpSystolic != null && bpDiastolic != null ? '${bpSystolic!.toInt()}/${bpDiastolic!.toInt()}' : '--';
  
  bool get isHighBP => bpSystolic != null && bpDiastolic != null && (bpSystolic! >= 140 || bpDiastolic! >= 90);

  PrenatalVisit copyWith({
    String? id,
    String? pregnancyId,
    int? weekNumber,
    DateTime? scheduledDate,
    DateTime? actualDate,
    String? facilityName,
    String? providerName,
    double? weight,
    double? bpSystolic,
    double? bpDiastolic,
    int? fetalHeartRate,
    int? fundalHeight,
    String? presentation,
    String? notes,
    List<String>? investigations,
    List<String>? medicationsGiven,
    bool? isCompleted,
    String? nextVisitDate,
    DateTime? createdAt,
  }) {
    return PrenatalVisit(
      id: id ?? this.id,
      pregnancyId: pregnancyId ?? this.pregnancyId,
      weekNumber: weekNumber ?? this.weekNumber,
      scheduledDate: scheduledDate ?? this.scheduledDate,
      actualDate: actualDate ?? this.actualDate,
      facilityName: facilityName ?? this.facilityName,
      providerName: providerName ?? this.providerName,
      weight: weight ?? this.weight,
      bpSystolic: bpSystolic ?? this.bpSystolic,
      bpDiastolic: bpDiastolic ?? this.bpDiastolic,
      fetalHeartRate: fetalHeartRate ?? this.fetalHeartRate,
      fundalHeight: fundalHeight ?? this.fundalHeight,
      presentation: presentation ?? this.presentation,
      notes: notes ?? this.notes,
      investigations: investigations ?? this.investigations,
      medicationsGiven: medicationsGiven ?? this.medicationsGiven,
      isCompleted: isCompleted ?? this.isCompleted,
      nextVisitDate: nextVisitDate ?? this.nextVisitDate,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

@JsonSerializable()
class PregnancySymptom {
  final String id;
  final String pregnancyId;
  final int weekNumber;
  final DateTime date;
  final String symptom;
  final String severity;
  final String notes;
  final DateTime createdAt;

  const PregnancySymptom({
    required this.id,
    required this.pregnancyId,
    required this.weekNumber,
    required this.date,
    required this.symptom,
    this.severity = 'mild',
    this.notes = '',
    required this.createdAt,
  });

  factory PregnancySymptom.fromJson(Map<String, dynamic> json) => _$PregnancySymptomFromJson(json);
  Map<String, dynamic> toJson() => _$PregnancySymptomToJson(this);
}

@JsonSerializable()
class DangerSign {
  final String id;
  final String pregnancyId;
  final DateTime date;
  final String sign;
  final String description;
  final String actionTaken;
  final bool resolved;
  final DateTime? resolvedDate;
  final DateTime createdAt;

  const DangerSign({
    required this.id,
    required this.pregnancyId,
    required this.date,
    required this.sign,
    required this.description,
    this.actionTaken = '',
    this.resolved = false,
    this.resolvedDate,
    required this.createdAt,
  });

  factory DangerSign.fromJson(Map<String, dynamic> json) => _$DangerSignFromJson(json);
  Map<String, dynamic> toJson() => _$DangerSignToJson(this);
}

@JsonSerializable()
class BirthPlan {
  final String id;
  final String pregnancyId;
  final String preferredFacility;
  final String preferredProvider;
  final String transportPlan;
  final String bloodDonorName;
  final String bloodDonorPhone;
  final String bloodGroup;
  final String emergencyContact;
  final String emergencyPhone;
  final List<String> itemsPrepared;
  final List<String> itemsNeeded;
  final String notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  const BirthPlan({
    required this.id,
    required this.pregnancyId,
    this.preferredFacility = '',
    this.preferredProvider = '',
    this.transportPlan = '',
    this.bloodDonorName = '',
    this.bloodDonorPhone = '',
    this.bloodGroup = '',
    this.emergencyContact = '',
    this.emergencyPhone = '',
    this.itemsPrepared = const [],
    this.itemsNeeded = const [],
    this.notes = '',
    required this.createdAt,
    required this.updatedAt,
  });

  factory BirthPlan.fromJson(Map<String, dynamic> json) => _$BirthPlanFromJson(json);
  Map<String, dynamic> toJson() => _$BirthPlanToJson(this);

  static List<String> getDefaultItemsNeeded() => [
    'Clean clothes for mother and baby',
    'Sanitary pads',
    'Baby clothes and blankets',
    'Important documents (ID, insurance)',
    'Money for emergencies',
    'Phone and charger',
    'Snacks and water',
  ];

  BirthPlan copyWith({
    String? id,
    String? pregnancyId,
    String? preferredFacility,
    String? preferredProvider,
    String? transportPlan,
    String? bloodDonorName,
    String? bloodDonorPhone,
    String? bloodGroup,
    String? emergencyContact,
    String? emergencyPhone,
    List<String>? itemsPrepared,
    List<String>? itemsNeeded,
    String? notes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return BirthPlan(
      id: id ?? this.id,
      pregnancyId: pregnancyId ?? this.pregnancyId,
      preferredFacility: preferredFacility ?? this.preferredFacility,
      preferredProvider: preferredProvider ?? this.preferredProvider,
      transportPlan: transportPlan ?? this.transportPlan,
      bloodDonorName: bloodDonorName ?? this.bloodDonorName,
      bloodDonorPhone: bloodDonorPhone ?? this.bloodDonorPhone,
      bloodGroup: bloodGroup ?? this.bloodGroup,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      emergencyPhone: emergencyPhone ?? this.emergencyPhone,
      itemsPrepared: itemsPrepared ?? this.itemsPrepared,
      itemsNeeded: itemsNeeded ?? this.itemsNeeded,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

@JsonSerializable()
class Child {
  final String id;
  final String patientId; // Mother's ID
  final String? pregnancyId;
  final String name;
  final ChildGender gender;
  final DateTime dateOfBirth;
  final double? birthWeight;
  final double? birthLength;
  final String? birthTime;
  final DeliveryType? deliveryType;
  final String? facilityName;
  final String? doctorName;
  final int apgarScore1;
  final int apgarScore5;
  final List<VaccinationRecord> vaccinations;
  final List<Milestone> milestones;
  final List<GrowthRecord> growthRecords;
  final List<String> allergies;
  final List<String> medicalConditions;
  final String? pediatricianName;
  final String? pediatricianPhone;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isSynced;

  const Child({
    required this.id,
    required this.patientId,
    this.pregnancyId,
    required this.name,
    required this.gender,
    required this.dateOfBirth,
    this.birthWeight,
    this.birthLength,
    this.birthTime,
    this.deliveryType,
    this.facilityName,
    this.doctorName,
    this.apgarScore1 = 0,
    this.apgarScore5 = 0,
    this.vaccinations = const [],
    this.milestones = const [],
    this.growthRecords = const [],
    this.allergies = const [],
    this.medicalConditions = const [],
    this.pediatricianName,
    this.pediatricianPhone,
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
  });

  factory Child.fromJson(Map<String, dynamic> json) => _$ChildFromJson(json);
  Map<String, dynamic> toJson() => _$ChildToJson(this);

  int get ageInDays => DateTime.now().difference(dateOfBirth).inDays;
  int get ageInWeeks => ageInDays ~/ 7;
  int get ageInMonths => (ageInDays / 30.44).floor();

  VaccinationRecord? getNextDueVaccination() {
    final now = DateTime.now();
    final upcoming = vaccinations
        .where((v) => v.nextDueDate != null && v.nextDueDate!.isAfter(now))
        .toList()
      ..sort((a, b) => a.nextDueDate!.compareTo(b.nextDueDate!));
    return upcoming.isNotEmpty ? upcoming.first : null;
  }

  List<VaccinationRecord> getOverdueVaccinations() {
    final now = DateTime.now();
    return vaccinations
        .where((v) => v.nextDueDate != null && v.nextDueDate!.isBefore(now) && v.administeredDate == null)
        .toList();
  }

  Child copyWith({
    String? id,
    String? patientId,
    String? pregnancyId,
    String? name,
    ChildGender? gender,
    DateTime? dateOfBirth,
    double? birthWeight,
    double? birthLength,
    String? birthTime,
    DeliveryType? deliveryType,
    String? facilityName,
    String? doctorName,
    int? apgarScore1,
    int? apgarScore5,
    List<VaccinationRecord>? vaccinations,
    List<Milestone>? milestones,
    List<GrowthRecord>? growthRecords,
    List<String>? allergies,
    List<String>? medicalConditions,
    String? pediatricianName,
    String? pediatricianPhone,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isSynced,
  }) {
    return Child(
      id: id ?? this.id,
      patientId: patientId ?? this.patientId,
      pregnancyId: pregnancyId ?? this.pregnancyId,
      name: name ?? this.name,
      gender: gender ?? this.gender,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      birthWeight: birthWeight ?? this.birthWeight,
      birthLength: birthLength ?? this.birthLength,
      birthTime: birthTime ?? this.birthTime,
      deliveryType: deliveryType ?? this.deliveryType,
      facilityName: facilityName ?? this.facilityName,
      doctorName: doctorName ?? this.doctorName,
      apgarScore1: apgarScore1 ?? this.apgarScore1,
      apgarScore5: apgarScore5 ?? this.apgarScore5,
      vaccinations: vaccinations ?? this.vaccinations,
      milestones: milestones ?? this.milestones,
      growthRecords: growthRecords ?? this.growthRecords,
      allergies: allergies ?? this.allergies,
      medicalConditions: medicalConditions ?? this.medicalConditions,
      pediatricianName: pediatricianName ?? this.pediatricianName,
      pediatricianPhone: pediatricianPhone ?? this.pediatricianPhone,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isSynced: isSynced ?? this.isSynced,
    );
  }
}

@JsonSerializable()
class Milestone {
  final String id;
  final String childId;
  final String name;
  final String category;
  final int expectedAgeMonths;
  final DateTime? achievedDate;
  final String notes;
  final DateTime createdAt;

  const Milestone({
    required this.id,
    required this.childId,
    required this.name,
    required this.category,
    required this.expectedAgeMonths,
    this.achievedDate,
    this.notes = '',
    required this.createdAt,
  });

  factory Milestone.fromJson(Map<String, dynamic> json) => _$MilestoneFromJson(json);
  Map<String, dynamic> toJson() => _$MilestoneToJson(this);

  bool get isAchieved => achievedDate != null;
  bool get isDelayed {
    if (isAchieved) return false;
    return DateTime.now().difference(DateTime(DateTime.now().year, DateTime.now().month, 1)).inDays > expectedAgeMonths * 30;
  }

String getCategoryLabel(String locale) {
    final labels = {
      'motor': {'en': 'Motor', 'hi': 'मोटर', 'te': 'మోటర్', 'ta': 'மோட்டார்', 'mr': 'मोटर'},
      'cognitive': {'en': 'Cognitive', 'hi': 'संज्ञानात्मक', 'te': 'జ్ఞానాత్మక', 'ta': 'அறிவுசார்', 'mr': 'संज्ञानात्मक'},
      'language': {'en': 'Language', 'hi': 'भाषा', 'te': 'భాషా', 'ta': 'மொழி', 'mr': 'भाषा'},
      'social': {'en': 'Social', 'hi': 'सामाजिक', 'te': 'సామాజిక', 'ta': 'சமூக', 'mr': 'सामाजिक'},
    };
    return labels[category]?[locale] ?? labels[category]?['en'] ?? category;
  }

  Milestone copyWith({
    String? id,
    String? childId,
    String? name,
    String? category,
    int? expectedAgeMonths,
    DateTime? achievedDate,
    String? notes,
    DateTime? createdAt,
  }) {
    return Milestone(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      name: name ?? this.name,
      category: category ?? this.category,
      expectedAgeMonths: expectedAgeMonths ?? this.expectedAgeMonths,
      achievedDate: achievedDate ?? this.achievedDate,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

@JsonSerializable()
class GrowthRecord {
  final String id;
  final String childId;
  final DateTime date;
  final double weight;
  final double height;
  final double? headCircumference;
  final String notes;
  final DateTime createdAt;

  const GrowthRecord({
    required this.id,
    required this.childId,
    required this.date,
    required this.weight,
    required this.height,
    this.headCircumference,
    this.notes = '',
    required this.createdAt,
  });

  factory GrowthRecord.fromJson(Map<String, dynamic> json) => _$GrowthRecordFromJson(json);
  Map<String, dynamic> toJson() => _$GrowthRecordToJson(this);

  GrowthRecord copyWith({
    String? id,
    String? childId,
    DateTime? date,
    double? weight,
    double? height,
    double? headCircumference,
    String? notes,
    DateTime? createdAt,
  }) {
    return GrowthRecord(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      date: date ?? this.date,
      weight: weight ?? this.weight,
      height: height ?? this.height,
      headCircumference: headCircumference ?? this.headCircumference,
      notes: notes ?? this.notes,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

@JsonSerializable()
class VaccinationRecord {
  final String id;
  final String childId;
  final String vaccineName;
  final String vaccineCode;
  final int doseNumber;
  final DateTime? administeredDate;
  final DateTime? nextDueDate;
  final String administeredBy;
  final String facilityName;
  final String batchNumber;
  final String notes;
  final bool isCompleted;
  final DateTime createdAt;
  final bool isSynced;

  const VaccinationRecord({
    required this.id,
    required this.childId,
    required this.vaccineName,
    required this.vaccineCode,
    required this.doseNumber,
    this.administeredDate,
    this.nextDueDate,
    required this.administeredBy,
    required this.facilityName,
    required this.batchNumber,
    this.notes = '',
    this.isCompleted = false,
    required this.createdAt,
    this.isSynced = false,
  });

  factory VaccinationRecord.fromJson(Map<String, dynamic> json) => _$VaccinationRecordFromJson(json);
  Map<String, dynamic> toJson() => _$VaccinationRecordToJson(this);

  bool get isOverdue => nextDueDate != null && nextDueDate!.isBefore(DateTime.now()) && !isCompleted;
  bool get isDueSoon => nextDueDate != null && nextDueDate!.difference(DateTime.now()).inDays <= 7 && !isCompleted;

  VaccinationRecord copyWith({
    String? id,
    String? childId,
    String? vaccineName,
    String? vaccineCode,
    int? doseNumber,
    DateTime? administeredDate,
    DateTime? nextDueDate,
    String? administeredBy,
    String? facilityName,
    String? batchNumber,
    String? notes,
    bool? isCompleted,
    DateTime? createdAt,
    bool? isSynced,
  }) {
    return VaccinationRecord(
      id: id ?? this.id,
      childId: childId ?? this.childId,
      vaccineName: vaccineName ?? this.vaccineName,
      vaccineCode: vaccineCode ?? this.vaccineCode,
      doseNumber: doseNumber ?? this.doseNumber,
      administeredDate: administeredDate ?? this.administeredDate,
      nextDueDate: nextDueDate ?? this.nextDueDate,
      administeredBy: administeredBy ?? this.administeredBy,
      facilityName: facilityName ?? this.facilityName,
      batchNumber: batchNumber ?? this.batchNumber,
      notes: notes ?? this.notes,
      isCompleted: isCompleted ?? this.isCompleted,
      createdAt: createdAt ?? this.createdAt,
      isSynced: isSynced ?? this.isSynced,
    );
  }
}

@JsonSerializable()
class ANMContact {
  final String id;
  final String name;
  final String phone;
  final String email;
  final String area;
  final String facility;
  final double latitude;
  final double longitude;
  final List<String> services;
  final String languages;
  final bool isAvailable;
  final DateTime updatedAt;

  const ANMContact({
    required this.id,
    required this.name,
    required this.phone,
    required this.email,
    required this.area,
    required this.facility,
    required this.latitude,
    required this.longitude,
    this.services = const [],
    this.languages = '',
    this.isAvailable = true,
    required this.updatedAt,
  });

  factory ANMContact.fromJson(Map<String, dynamic> json) => _$ANMContactFromJson(json);
  Map<String, dynamic> toJson() => _$ANMContactToJson(this);

  ANMContact copyWith({
    String? id,
    String? name,
    String? phone,
    String? email,
    String? area,
    String? facility,
    double? latitude,
    double? longitude,
    List<String>? services,
    String? languages,
    bool? isAvailable,
    DateTime? updatedAt,
  }) {
    return ANMContact(
      id: id ?? this.id,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      email: email ?? this.email,
      area: area ?? this.area,
      facility: facility ?? this.facility,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      services: services ?? this.services,
      languages: languages ?? this.languages,
      isAvailable: isAvailable ?? this.isAvailable,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}