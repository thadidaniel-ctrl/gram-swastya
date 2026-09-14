import 'package:json_annotation/json_annotation.dart';

part 'condition.g.dart';

enum Severity { low, medium, high, critical }
enum Recommendation { homeCare, clinic, emergency }

@JsonSerializable()
class Condition {
  final String id;
  final String name;
  final Severity severity;
  final String category;
  final Map<String, String> translations;
  final List<String> symptoms;
  final Recommendation recommendation;
  final List<String> homeCare;
  final List<String> redFlags;

  const Condition({
    required this.id,
    required this.name,
    required this.severity,
    required this.category,
    required this.translations,
    required this.symptoms,
    required this.recommendation,
    required this.homeCare,
    required this.redFlags,
  });

  factory Condition.fromJson(Map<String, dynamic> json) => _$ConditionFromJson(json);
  Map<String, dynamic> toJson() => _$ConditionToJson(this);

  String getName(String locale) => translations[locale] ?? translations['en'] ?? name;
  
  String getSeverityLabel(String locale) {
    switch (severity) {
      case Severity.low:
        return {'en': 'Low', 'hi': 'कम', 'te': 'తక్కువ', 'ta': 'குறைவு', 'mr': 'कम'}[locale] ?? 'Low';
      case Severity.medium:
        return {'en': 'Medium', 'hi': 'मध्यम', 'te': 'మధ్యమ', 'ta': 'மத்தியம்', 'mr': 'मध्यम'}[locale] ?? 'Medium';
      case Severity.high:
        return {'en': 'High', 'hi': 'उच्च', 'te': 'అధిక', 'ta': 'அதிகம்', 'mr': 'उच्च'}[locale] ?? 'High';
      case Severity.critical:
        return {'en': 'Critical', 'hi': 'गंभीर', 'te': 'గంభీర్', 'ta': 'கடுமையான', 'mr': 'गंभीर'}[locale] ?? 'Critical';
    }
  }

  String getRecommendationLabel(String locale) {
    switch (recommendation) {
      case Recommendation.homeCare:
        return {'en': 'Home Care', 'hi': 'घरेलू देखभाल', 'te': 'ఇంటి догల', 'ta': 'வீட்டு பராமரிப்பு', 'mr': 'घरगुती काळजी'}[locale] ?? 'Home Care';
      case Recommendation.clinic:
        return {'en': 'Visit Clinic', 'hi': 'क्लिनिक जाएं', 'te': 'క్లినిక్ వెళ్ళండి', 'ta': 'கிளինிக்கு செல்லுங்கள்', 'mr': 'क्लिनिकला जा'}[locale] ?? 'Visit Clinic';
      case Recommendation.emergency:
        return {'en': 'Emergency', 'hi': 'आपातकाल', 'te': 'అత్యవసరం', 'ta': 'அவசரம्', 'mr': 'आपत्कालीन'}[locale] ?? 'Emergency';
    }
  }
}