import 'package:flutter/material.dart';
import '../../core/models/symptom.dart';
import '../../core/services/diagnosis_engine.dart';
import '../../core/services/local_storage.dart';
import '../../core/models/diagnosis_result.dart';

class SymptomProvider extends ChangeNotifier {
  List<String> _selectedSymptomIds = [];
  String _currentLanguage = 'en';
  bool _isChwMode = false;
  String? _chwId;
  String? _patientId;
  DiagnosisResult? _lastResult;
  bool _isLoading = false;

  List<String> get selectedSymptomIds => _selectedSymptomIds;
  String get currentLanguage => _currentLanguage;
  bool get isChwMode => _isChwMode;
  String? get chwId => _chwId;
  String? get patientId => _patientId;
  DiagnosisResult? get lastResult => _lastResult;
  bool get isLoading => _isLoading;

  List<Symptom> get allSymptoms => DiagnosisEngine.getAllSymptoms();
  List<String> get categories => DiagnosisEngine.getCategories();

  void setLanguage(String language) {
    _currentLanguage = language;
    notifyListeners();
  }

  void toggleChwMode(bool value, {String? chwId}) {
    _isChwMode = value;
    _chwId = value ? chwId : null;
    notifyListeners();
  }

  void setPatientId(String? patientId) {
    _patientId = patientId;
    notifyListeners();
  }

  void toggleSymptom(String symptomId) {
    if (_selectedSymptomIds.contains(symptomId)) {
      _selectedSymptomIds.remove(symptomId);
    } else {
      _selectedSymptomIds.add(symptomId);
    }
    notifyListeners();
  }

  void clearSymptoms() {
    _selectedSymptomIds.clear();
    notifyListeners();
  }

  void setSymptoms(List<String> symptomIds) {
    _selectedSymptomIds = List.from(symptomIds);
    notifyListeners();
  }

  Future<DiagnosisResult?> diagnose() async {
    if (_selectedSymptomIds.isEmpty) return null;
    
    _isLoading = true;
    notifyListeners();

    try {
      final result = DiagnosisEngine.diagnose(
        selectedSymptomIds: _selectedSymptomIds,
        language: _currentLanguage,
        isChwScreening: _isChwMode,
        chwId: _chwId,
        patientId: _patientId,
      );
      
      _lastResult = result;
      
      if (_patientId != null) {
        await LocalStorageService.saveDiagnosis(result);
      }
      
      _isLoading = false;
      notifyListeners();
      return result;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  List<Symptom> getSelectedSymptoms() {
    return _selectedSymptomIds
        .map((id) => DiagnosisEngine.getSymptomById(id))
        .whereType<Symptom>()
        .toList();
  }

  List<Symptom> getSymptomsByCategory(String category) {
    return DiagnosisEngine.getSymptomsByCategory(category);
  }
}