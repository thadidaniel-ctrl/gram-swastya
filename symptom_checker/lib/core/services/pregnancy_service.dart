import 'dart:convert';
import 'package:flutter/services.dart';
import '../models/pregnancy.dart';

class PregnancyService {
  static Map<String, dynamic>? _pregnancyData;
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;
    final jsonString = await rootBundle.loadString('assets/translations/pregnancy_data.json');
    _pregnancyData = jsonDecode(jsonString);
    _initialized = true;
  }

  static List<PrenatalVisit> getStandardVisitSchedule() {
    if (!_initialized) throw StateError('PregnancyService not initialized');
    
    final schedule = _pregnancyData!['prenatal_schedule'] as List;
    return schedule.map((v) => PrenatalVisit(
      id: 'schedule_${v['week']}',
      pregnancyId: '',
      weekNumber: v['week'],
      scheduledDate: DateTime.now(), // Will be calculated based on LMP
      notes: v['notes'],
      investigations: List<String>.from(v['investigations'] ?? []),
      medicationsGiven: List<String>.from(v['medications'] ?? []),
      createdAt: DateTime.now(),
    )).toList();
  }

  static List<PrenatalVisit> calculateVisitDates(DateTime lmpDate) {
    final schedule = getStandardVisitSchedule();
    return schedule.map((visit) {
      final scheduledDate = lmpDate.add(Duration(days: visit.weekNumber * 7));
      return PrenatalVisit(
        id: visit.id,
        pregnancyId: '',
        weekNumber: visit.weekNumber,
        scheduledDate: scheduledDate,
        notes: visit.notes,
        investigations: visit.investigations,
        medicationsGiven: visit.medicationsGiven,
        createdAt: DateTime.now(),
      );
    }).toList();
  }

  static List<DangerSign> getDangerSigns() {
    if (!_initialized) throw StateError('PregnancyService not initialized');
    
    final signs = _pregnancyData!['danger_signs'] as List;
    return signs.map((s) => DangerSign(
      id: 'danger_${s['id']}',
      pregnancyId: '',
      date: DateTime.now(),
      sign: s['sign'],
      description: s['description'],
      actionTaken: s['action'],
      createdAt: DateTime.now(),
    )).toList();
  }

  static List<String> getTrimesterSymptoms(int trimester) {
    if (!_initialized) throw StateError('PregnancyService not initialized');
    
    final key = trimester == 1 ? 'first_trimester_symptoms' : 
                trimester == 2 ? 'second_trimester_symptoms' : 'third_trimester_symptoms';
    return List<String>.from(_pregnancyData![key] ?? []);
  }

  static List<String> getTrimesterPrecautions(int trimester) {
    if (!_initialized) throw StateError('PregnancyService not initialized');
    
    final key = trimester == 1 ? 'first_trimester_precautions' : 
                trimester == 2 ? 'second_trimester_precautions' : 'third_trimester_precautions';
    return List<String>.from(_pregnancyData![key] ?? []);
  }

  static List<Milestone> getStandardMilestones() {
    if (!_initialized) throw StateError('PregnancyService not initialized');
    
    final milestones = _pregnancyData!['child_milestones'] as List;
    return milestones.map((m) => Milestone(
      id: 'milestone_${m['name'].toString().toLowerCase().replaceAll(' ', '_')}',
      childId: '',
      name: m['name'],
      category: m['category'],
      expectedAgeMonths: m['age_months'],
      createdAt: DateTime.now(),
    )).toList();
  }

  static List<VaccinationRecord> getVaccinationSchedule(DateTime dob) {
    if (!_initialized) throw StateError('PregnancyService not initialized');
    
    final schedule = _pregnancyData!['vaccination_schedule'] as List;
    return schedule.map((v) {
      DateTime? dueDate;
      if (v['at_birth'] == true) {
        dueDate = dob;
      } else if (v['age_weeks'] != null) {
        dueDate = dob.add(Duration(days: v['age_weeks'] * 7));
      } else if (v['age_months'] != null) {
        dueDate = DateTime(dob.year, dob.month + v['age_months'], dob.day);
      }
      
      return VaccinationRecord(
        id: 'vacc_${v['code']}_${v['dose']}',
        childId: '',
        vaccineName: v['name'],
        vaccineCode: v['code'],
        doseNumber: v['dose'],
        nextDueDate: dueDate,
        administeredBy: '',
        facilityName: '',
        batchNumber: '',
        createdAt: DateTime.now(),
      );
    }).toList();
  }

  static List<String> getBirthPlanItems() {
    if (!_initialized) return BirthPlan.getDefaultItemsNeeded();
    return List<String>.from(_pregnancyData!['birth_plan_items'] ?? BirthPlan.getDefaultItemsNeeded());
  }

  static String getWeekInfo(int week, String locale) {
    if (!_initialized) return '';
    final weeks = _pregnancyData!['week_by_week'] as List;
    final weekData = weeks.firstWhere(
      (w) => w['week'] == week,
      orElse: () => null,
    );
    if (weekData == null) return '';
    return weekData[locale] ?? weekData['en'] ?? '';
  }

  static Map<String, dynamic> getFetalDevelopment(int week) {
    if (!_initialized) return {};
    final weeks = _pregnancyData!['week_by_week'] as List;
    final weekData = weeks.firstWhere(
      (w) => w['week'] == week,
      orElse: () => null,
    );
    if (weekData == null) return {};
    return {
      'size': weekData['size'],
      'weight': weekData['weight'],
      'development': weekData['development'],
    };
  }

  static bool isHighRiskPregnancy(Pregnancy pregnancy) {
    final riskFactors = [
      'age_gt_35',
      'age_lt_18',
      'previous_cs',
      'multiple_pregnancy',
      'hypertension',
      'diabetes',
      'heart_disease',
      'previous_preterm',
      'previous_stillbirth',
      'bleeding',
      'anemia_severe',
    ];
    
    for (final factor in riskFactors) {
      if (pregnancy.riskFactors.contains(factor)) return true;
    }
    
    // Check for high BP in visits
    for (final visit in pregnancy.visits) {
      if (visit.isHighBP) return true;
    }
    
    return false;
  }
}