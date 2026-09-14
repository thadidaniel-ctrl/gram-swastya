import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/models/pregnancy.dart';
import '../../../core/models/patient.dart';
import '../../../core/services/local_storage.dart';
import '../../../core/services/pregnancy_service.dart';

class PregnancyProvider extends ChangeNotifier {
  Pregnancy? _currentPregnancy;
  List<Child> _children = [];
  List<ANMContact> _anmContacts = [];
  bool _isLoading = false;

  Pregnancy? get currentPregnancy => _currentPregnancy;
  List<Child> get children => _children;
  List<ANMContact> get anmContacts => _anmContacts;
  bool get isLoading => _isLoading;
  bool get isPregnant => _currentPregnancy?.status == PregnancyStatus.ongoing || 
                          _currentPregnancy?.status == PregnancyStatus.confirmed;

  Future<void> loadPregnancyData(String patientId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final pregnancy = await LocalStorageService.getPregnancy(patientId);
      _currentPregnancy = pregnancy;
      
      _children = await LocalStorageService.getChildren(patientId);
      _anmContacts = await LocalStorageService.getANMContacts();
      
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> createPregnancy(Pregnancy pregnancy) async {
    _currentPregnancy = pregnancy;
    await LocalStorageService.savePregnancy(pregnancy);
    
    // Generate visit schedule
    final visits = PregnancyService.calculateVisitDates(pregnancy.lmpDate);
    for (final visit in visits) {
      await LocalStorageService.savePrenatalVisit(visit.copyWith(pregnancyId: pregnancy.id));
    }
    
    notifyListeners();
  }

  Future<void> updatePregnancy(Pregnancy pregnancy) async {
    _currentPregnancy = pregnancy.copyWith(updatedAt: DateTime.now());
    await LocalStorageService.savePregnancy(_currentPregnancy!);
    notifyListeners();
  }

  Future<void> addPrenatalVisit(PrenatalVisit visit) async {
    if (_currentPregnancy != null) {
      final updatedVisits = [..._currentPregnancy!.visits, visit];
      await updatePregnancy(_currentPregnancy!.copyWith(visits: updatedVisits));
    }
  }

  Future<void> updatePrenatalVisit(PrenatalVisit visit) async {
    if (_currentPregnancy != null) {
      final updatedVisits = _currentPregnancy!.visits.map((v) => v.id == visit.id ? visit : v).toList();
      await updatePregnancy(_currentPregnancy!.copyWith(visits: updatedVisits));
    }
  }

  Future<void> addSymptom(PregnancySymptom symptom) async {
    if (_currentPregnancy != null) {
      final updated = [..._currentPregnancy!.symptoms, symptom];
      await updatePregnancy(_currentPregnancy!.copyWith(symptoms: updated));
    }
  }

  Future<void> addDangerSign(DangerSign sign) async {
    if (_currentPregnancy != null) {
      final updated = [..._currentPregnancy!.dangerSigns, sign];
      await updatePregnancy(_currentPregnancy!.copyWith(dangerSigns: updated));
    }
  }

  Future<void> createBirthPlan(BirthPlan plan) async {
    if (_currentPregnancy != null) {
      await updatePregnancy(_currentPregnancy!.copyWith(birthPlan: plan));
    }
  }

  Future<void> addChild(Child child) async {
    _children.add(child);
    await LocalStorageService.saveChild(child);
    notifyListeners();
  }

  Future<void> updateChild(Child child) async {
    final index = _children.indexWhere((c) => c.id == child.id);
    if (index != -1) {
      _children[index] = child.copyWith(updatedAt: DateTime.now());
      await LocalStorageService.saveChild(_children[index]);
      notifyListeners();
    }
  }

  Future<void> addVaccination(String childId, VaccinationRecord vaccine) async {
    final child = _children.firstWhere((c) => c.id == childId);
    final updated = [...child.vaccinations, vaccine];
    await updateChild(child.copyWith(vaccinations: updated));
  }

  Future<void> addMilestone(String childId, Milestone milestone) async {
    final child = _children.firstWhere((c) => c.id == childId);
    final updated = [...child.milestones, milestone];
    await updateChild(child.copyWith(milestones: updated));
  }

  Future<void> addGrowthRecord(String childId, GrowthRecord record) async {
    final child = _children.firstWhere((c) => c.id == childId);
    final updated = [...child.growthRecords, record];
    await updateChild(child.copyWith(growthRecords: updated));
  }

  List<PrenatalVisit> getUpcomingVisits() {
    if (_currentPregnancy == null) return [];
    final now = DateTime.now();
    return _currentPregnancy!.visits
        .where((v) => !v.isCompleted && v.scheduledDate.isAfter(now))
        .toList()
      ..sort((a, b) => a.scheduledDate.compareTo(b.scheduledDate));
  }

  List<PrenatalVisit> getPastVisits() {
    if (_currentPregnancy == null) return [];
    return _currentPregnacy!.visits
        .where((v) => v.isCompleted || v.scheduledDate.isBefore(DateTime.now()))
        .toList()
      ..sort((a, b) => b.scheduledDate.compareTo(a.scheduledDate));
  }

  List<DangerSign> getUnresolvedDangerSigns() {
    if (_currentPregnancy == null) return [];
    return _currentPregnancy!.dangerSigns.where((d) => !d.resolved).toList();
  }

  VaccinationRecord? getNextDueVaccination(String childId) {
    final child = _children.firstWhere((c) => c.id == childId);
    return child.getNextDueVaccination();
  }

  List<Milestone> getDueMilestones(String childId) {
    final child = _children.firstWhere((c) => c.id == childId);
    final ageMonths = child.ageInMonths;
    return child.milestones
        .where((m) => !m.isAchieved && m.expectedAgeMonths <= ageMonths + 1)
        .toList();
  }

  List<Milestone> getDelayedMilestones(String childId) {
    final child = _children.firstWhere((c) => c.id == childId);
    return child.milestones.where((m) => m.isDelayed).toList();
  }

  void clearData() {
    _currentPregnancy = null;
    _children.clear();
    _anmContacts.clear();
    notifyListeners();
  }
}