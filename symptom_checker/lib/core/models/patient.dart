import 'package:json_annotation/json_annotation.dart';

part 'patient.g.dart';

@JsonSerializable()
class Patient {
  final String id;
  final String name;
  final DateTime dateOfBirth;
  final String gender;
  final String phone;
  final String address;
  final String? bloodGroup;
  final String? emergencyContact;
  final String? emergencyPhone;
  final List<String> allergies;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isSynced;
  final String? syncedAt;

  const Patient({
    required this.id,
    required this.name,
    required this.dateOfBirth,
    required this.gender,
    required this.phone,
    required this.address,
    this.bloodGroup,
    this.emergencyContact,
    this.emergencyPhone,
    this.allergies = const [],
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
    this.syncedAt,
  });

  factory Patient.fromJson(Map<String, dynamic> json) => _$PatientFromJson(json);
  Map<String, dynamic> toJson() => _$PatientToJson(this);

  int get age => DateTime.now().difference(dateOfBirth).inDays ~/ 365;

  Patient copyWith({
    String? name,
    DateTime? dateOfBirth,
    String? gender,
    String? phone,
    String? address,
    String? bloodGroup,
    String? emergencyContact,
    String? emergencyPhone,
    List<String>? allergies,
    DateTime? updatedAt,
    bool? isSynced,
    String? syncedAt,
  }) {
    return Patient(
      id: id,
      name: name ?? this.name,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      phone: phone ?? this.phone,
      address: address ?? this.address,
      bloodGroup: bloodGroup ?? this.bloodGroup,
      emergencyContact: emergencyContact ?? this.emergencyContact,
      emergencyPhone: emergencyPhone ?? this.emergencyPhone,
      allergies: allergies ?? this.allergies,
      createdAt: createdAt,
      updatedAt: updatedAt ?? DateTime.now(),
      isSynced: isSynced ?? this.isSynced,
      syncedAt: syncedAt ?? this.syncedAt,
    );
  }
}