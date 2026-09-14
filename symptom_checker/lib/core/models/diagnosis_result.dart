import 'package:json_annotation/json_annotation.dart';
import 'condition.dart';

part 'diagnosis_result.g.dart';

@JsonSerializable()
class DiagnosisResult {
  final String id;
  final DateTime timestamp;
  final List<String> selectedSymptomIds;
  final List<ConditionMatch> matches;
  final Recommendation finalRecommendation;
  final String language;
  final bool isChwScreening;
  final String? chwId;
  final String? patientId;

  const DiagnosisResult({
    required this.id,
    required this.timestamp,
    required this.selectedSymptomIds,
    required this.matches,
    required this.finalRecommendation,
    required this.language,
    this.isChwScreening = false,
    this.chwId,
    this.patientId,
  });

  factory DiagnosisResult.fromJson(Map<String, dynamic> json) => _$DiagnosisResultFromJson(json);
  Map<String, dynamic> toJson() => _$DiagnosisResultToJson(this);
}

@JsonSerializable()
class ConditionMatch {
  final String conditionId;
  final String conditionName;
  final Severity severity;
  final int matchingSymptomsCount;
  final int totalSymptomsCount;
  final double confidenceScore;
  final Recommendation recommendation;
  final List<String> matchedSymptoms;
  final List<String> unmatchedSymptoms;

  const ConditionMatch({
    required this.conditionId,
    required this.conditionName,
    required this.severity,
    required this.matchingSymptomsCount,
    required this.totalSymptomsCount,
    required this.confidenceScore,
    required this.recommendation,
    required this.matchedSymptoms,
    required this.unmatchedSymptoms,
  });

  factory ConditionMatch.fromJson(Map<String, dynamic> json) => _$ConditionMatchFromJson(json);
  Map<String, dynamic> toJson() => _$ConditionMatchToJson(this);
}