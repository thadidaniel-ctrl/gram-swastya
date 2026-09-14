import 'package:json_annotation/json_annotation.dart';

part 'symptom.g.dart';

@JsonSerializable()
class Symptom {
  final String id;
  final String icon;
  final String category;
  final Map<String, String> translations;

  const Symptom({
    required this.id,
    required this.icon,
    required this.category,
    required this.translations,
  });

  factory Symptom.fromJson(Map<String, dynamic> json) => _$SymptomFromJson(json);
  Map<String, dynamic> toJson() => _$SymptomToJson(this);

  String getName(String locale) => translations[locale] ?? translations['en'] ?? id;
}