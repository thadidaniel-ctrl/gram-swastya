import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/models/medicine_reminder.dart';
import '../../../core/models/patient.dart';
import '../../../core/services/local_storage.dart';
import '../../../core/services/drug_interaction_service.dart';

class MedicineProvider extends ChangeNotifier {
  List<Medicine> _medicines = [];
  List<DoseLog> _doseLogs = [];
  List<DrugInteraction> _interactions = [];
  bool _isLoading = false;
  String? _currentPatientId;

  List<Medicine> get medicines => _medicines.where((m) => m.isActive).toList();
  List<Medicine> get allMedicines => _medicines;
  List<DoseLog> get doseLogs => _doseLogs;
  List<DrugInteraction> get interactions => _interactions;
  bool get isLoading => _isLoading;
  bool get hasInteractions => _interactions.isNotEmpty;
  List<DrugInteraction> get criticalInteractions => _interactions
      .where((i) => i.severity == InteractionSeverity.contraindicated || i.severity == InteractionSeverity.major)
      .toList();

  Future<void> loadMedicines(String patientId) async {
    _currentPatientId = patientId;
    _isLoading = true;
    notifyListeners();

    try {
      final meds = await LocalStorageService.getMedicines(patientId);
      _medicines = meds;
      _doseLogs = await LocalStorageService.getDoseLogs(patientId);
      _checkInteractions();
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  void _checkInteractions() {
    final activeMeds = _medicines.where((m) => m.isActive).toList();
    _interactions = DrugInteractionService.checkInteractions(activeMeds);
    
    if (_currentPatientId != null) {
      final allergies = await LocalStorageService.getAllergies(_currentPatientId!);
      _interactions.addAll(DrugInteractionService.checkWithAllergies(activeMeds, 
          allergies.map((a) => a.allergen).toList()));
    }
  }

  Future<void> addMedicine(Medicine medicine) async {
    _medicines.add(medicine);
    await LocalStorageService.saveMedicine(medicine);
    _checkInteractions();
    _scheduleReminders(medicine);
    notifyListeners();
  }

  Future<void> updateMedicine(Medicine medicine) async {
    final index = _medicines.indexWhere((m) => m.id == medicine.id);
    if (index != -1) {
      _medicines[index] = medicine.copyWith(updatedAt: DateTime.now());
      await LocalStorageService.saveMedicine(_medicines[index]);
      _checkInteractions();
      notifyListeners();
    }
  }

  Future<void> deleteMedicine(String medicineId) async {
    _medicines.removeWhere((m) => m.id == medicineId);
    _doseLogs.removeWhere((log) => log.medicineId == medicineId);
    await LocalStorageService.deleteMedicine(medicineId);
    _checkInteractions();
    notifyListeners();
  }

  Future<void> logDose(DoseLog doseLog) async {
    _doseLogs.add(doseLog);
    await LocalStorageService.saveDoseLog(doseLog);
    
    final medicine = _medicines.firstWhere((m) => m.id == doseLog.medicineId);
    if (doseLog.status == DoseStatus.taken && medicine.remainingQuantity > 0) {
      final updated = medicine.copyWith(
        remainingQuantity: medicine.remainingQuantity - 1,
        updatedAt: DateTime.now(),
      );
      await updateMedicine(updated);
    }
    notifyListeners();
  }

  Future<void> markDoseTaken(String medicineId, DateTime scheduledTime) async {
    final doseLog = DoseLog(
      id: '${medicineId}_${scheduledTime.millisecondsSinceEpoch}',
      medicineId: medicineId,
      patientId: _currentPatientId ?? '',
      scheduledTime: scheduledTime,
      takenTime: DateTime.now(),
      status: DoseStatus.taken,
    );
    await logDose(doseLog);
  }

  Future<void> markDoseMissed(String medicineId, DateTime scheduledTime) async {
    final doseLog = DoseLog(
      id: '${medicineId}_${scheduledTime.millisecondsSinceEpoch}',
      medicineId: medicineId,
      patientId: _currentPatientId ?? '',
      scheduledTime: scheduledTime,
      status: DoseStatus.missed,
    );
    await logDose(doseLog);
  }

  Future<void> markDoseSkipped(String medicineId, DateTime scheduledTime) async {
    final doseLog = DoseLog(
      id: '${medicineId}_${scheduledTime.millisecondsSinceEpoch}',
      medicineId: medicineId,
      patientId: _currentPatientId ?? '',
      scheduledTime: scheduledTime,
      status: DoseStatus.skipped,
    );
    await logDose(doseLog);
  }

  Future<void> snoozeDose(String medicineId, DateTime scheduledTime, Duration snoozeDuration) async {
    final newTime = scheduledTime.add(snoozeDuration);
    final doseLog = DoseLog(
      id: '${medicineId}_${newTime.millisecondsSinceEpoch}',
      medicineId: medicineId,
      patientId: _currentPatientId ?? '',
      scheduledTime: newTime,
      status: DoseStatus.snoozed,
      notes: 'Snoozed from ${scheduledTime.toString()}',
    );
    await logDose(doseLog);
  }

  List<DoseLog> getTodaysDoses(String medicineId) {
    final now = DateTime.now();
    final todayStart = DateTime(now.year, now.month, now.day);
    final todayEnd = todayStart.add(const Duration(days: 1));
    
    return _doseLogs
        .where((log) => log.medicineId == medicineId &&
            log.scheduledTime.isAfter(todayStart) &&
            log.scheduledTime.isBefore(todayEnd))
        .toList();
  }

  List<DoseLog> getPendingDoses() {
    final now = DateTime.now();
    return _doseLogs
        .where((log) => log.status == DoseStatus.missed && log.scheduledTime.isBefore(now))
        .toList()
      ..sort((a, b) => a.scheduledTime.compareTo(b.scheduledTime));
  }

  Map<String, int> getAdherenceStats(String medicineId, {int days = 30}) {
    final cutoff = DateTime.now().subtract(Duration(days: days));
    final logs = _doseLogs
        .where((log) => log.medicineId == medicineId && log.scheduledTime.isAfter(cutoff))
        .toList();
    
    if (logs.isEmpty) return {'taken': 0, 'missed': 0, 'skipped': 0, 'total': 0, 'rate': 0};
    
    final taken = logs.where((l) => l.status == DoseStatus.taken).length;
    final missed = logs.where((l) => l.status == DoseStatus.missed).length;
    final skipped = logs.where((l) => l.status == DoseStatus.skipped).length;
    final total = taken + missed;
    
    return {
      'taken': taken,
      'missed': missed,
      'skipped': skipped,
      'total': total,
      'rate': total > 0 ? ((taken / total) * 100).round() : 0,
    };
  }

  List<Medicine> getLowStockMedicines() {
    return _medicines.where((m) => m.needsRefill && m.isActive).toList();
  }

  List<Medicine> getMedicinesNeedingRefill() {
    return _medicines.where((m) => m.isLowStock && m.isActive).toList();
  }

  List<MedicineSubstitution> getSubstitutionsForMedicine(String medicineGenericName) {
    return DrugInteractionService.getSubstitutions(medicineGenericName);
  }

  void _scheduleReminders(Medicine medicine) {
    // This would integrate with flutter_local_notifications
    // Implementation depends on notification service
  }

  void clearCurrentPatient() {
    _currentPatientId = null;
    _medicines.clear();
    _doseLogs.clear();
    _interactions.clear();
    notifyListeners();
  }
}