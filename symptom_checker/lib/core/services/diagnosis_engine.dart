import 'dart:convert';
import 'package:flutter/services.dart';
import '../models/symptom.dart';
import '../models/condition.dart';
import '../models/diagnosis_result.dart';

class DiagnosisEngine {
  static List<Condition> _conditions = [];
  static List<Symptom> _symptoms = [];
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;
    
    final conditionsJson = await rootBundle.loadString('assets/translations/conditions.json');
    final symptomsJson = await rootBundle.loadString('assets/translations/symptoms.json');
    
    final conditionsData = jsonDecode(conditionsJson)['conditions'] as List;
    final symptomsData = jsonDecode(symptomsJson)['symptoms'] as List;
    
    _conditions = conditionsData.map((c) => Condition.fromJson(c)).toList();
    _symptoms = symptomsData.map((s) => Symptom.fromJson(s)).toList();
    _initialized = true;
  }

  static List<Symptom> getAllSymptoms() => List.from(_symptoms);
  
  static List<Symptom> getSymptomsByCategory(String category) {
    return _symptoms.where((s) => s.category == category).toList();
  }

  static List<String> getCategories() {
    return _symptoms.map((s) => s.category).toSet().toList()..sort();
  }

  static Symptom? getSymptomById(String id) {
    try {
      return _symptoms.firstWhere((s) => s.id == id);
    } catch (_) {
      return null;
    }
  }

  static DiagnosisResult diagnose({
    required List<String> selectedSymptomIds,
    required String language,
    bool isChwScreening = false,
    String? chwId,
    String? patientId,
  }) {
    if (!_initialized) {
      throw StateError('DiagnosisEngine not initialized. Call initialize() first.');
    }

    final matches = <ConditionMatch>[];
    
    for (final condition in _conditions) {
      final matchedSymptoms = condition.symptoms
          .where((s) => selectedSymptomIds.contains(s))
          .toList();
      
      if (matchedSymptoms.isEmpty) continue;
      
      final matchingCount = matchedSymptoms.length;
      final totalCount = condition.symptoms.length;
      final confidence = matchingCount / totalCount;
      
      final unmatchedSymptoms = condition.symptoms
          .where((s) => !selectedSymptomIds.contains(s))
          .toList();

      matches.add(ConditionMatch(
        conditionId: condition.id,
        conditionName: condition.getName(language),
        severity: condition.severity,
        matchingSymptomsCount: matchingCount,
        totalSymptomsCount: totalCount,
        confidenceScore: confidence,
        recommendation: condition.recommendation,
        matchedSymptoms: matchedSymptoms,
        unmatchedSymptoms: unmatchedSymptoms,
      ));
    }

    matches.sort((a, b) {
      final severityOrder = {
        Severity.critical: 4,
        Severity.high: 3,
        Severity.medium: 2,
        Severity.low: 1,
      };
      final severityDiff = severityOrder[b.severity]! - severityOrder[a.severity]!;
      if (severityDiff != 0) return severityDiff;
      return b.confidenceScore.compareTo(a.confidenceScore);
    });

    Recommendation finalRec = Recommendation.homeCare;
    if (matches.isNotEmpty) {
      final topSeverity = matches.first.severity;
      if (topSeverity == Severity.critical) {
        finalRec = Recommendation.emergency;
      } else if (topSeverity == Severity.high) {
        finalRec = Recommendation.emergency;
      } else if (topSeverity == Severity.medium) {
        finalRec = Recommendation.clinic;
      }
    }

    return DiagnosisResult(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      timestamp: DateTime.now(),
      selectedSymptomIds: selectedSymptomIds,
      matches: matches,
      finalRecommendation: finalRec,
      language: language,
      isChwScreening: isChwScreening,
      chwId: chwId,
      patientId: patientId,
    );
  }

  static List<String> getRedFlagsForConditions(List<ConditionMatch> matches, String language) {
    final redFlags = <String>{};
    for (final match in matches) {
      final condition = _conditions.firstWhere((c) => c.id == match.conditionId);
      for (final flag in condition.redFlags) {
        final symptom = getSymptomById(flag);
        if (symptom != null) {
          redFlags.add(symptom.getName(language));
        } else {
          redFlags.add(flag);
        }
      }
    }
    return redFlags.toList();
  }

  static List<String> getHomeCareForTopMatch(List<ConditionMatch> matches, String language) {
    if (matches.isEmpty) return [];
    final condition = _conditions.firstWhere((c) => c.id == matches.first.conditionId);
    return condition.homeCare.map((hc) => 
      {'en': hc, 'hi': hc, 'te': hc, 'ta': hc, 'mr': hc}[language] ?? hc
    ).toList();
  }
}