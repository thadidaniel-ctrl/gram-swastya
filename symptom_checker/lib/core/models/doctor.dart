import 'package:json_annotation/json_annotation.dart';

part 'doctor.g.dart';

@JsonSerializable()
class Doctor {
  final String id;
  final String name;
  final String qualification;
  final String specialty;
  final String subSpecialty;
  final List<String> languages;
  final double rating;
  final int reviewCount;
  final String profileImageUrl;
  final String clinicName;
  final String clinicAddress;
  final double consultationFee;
  final bool acceptsOnlinePayment;
  final bool videoConsultationEnabled;
  final List<AvailabilitySlot> availability;
  final String bio;
  final int yearsExperience;
  final bool isVerified;
  final DateTime createdAt;

  const Doctor({
    required this.id,
    required this.name,
    required this.qualification,
    required this.specialty,
    required this.subSpecialty,
    required this.languages,
    required this.rating,
    required this.reviewCount,
    required this.profileImageUrl,
    required this.clinicName,
    required this.clinicAddress,
    required this.consultationFee,
    this.acceptsOnlinePayment = true,
    this.videoConsultationEnabled = true,
    required this.availability,
    this.bio = '',
    required this.yearsExperience,
    this.isVerified = true,
    required this.createdAt,
  });

  factory Doctor.fromJson(Map<String, dynamic> json) => _$DoctorFromJson(json);
  Map<String, dynamic> toJson() => _$DoctorToJson(this);

  String getSpecialtyLabel(String locale) {
    final specialties = {
      'general_medicine': {'en': 'General Medicine', 'hi': 'सामान्य चिकित्सा', 'te': 'సాధారణ చికిత్స', 'ta': 'பொது மருத்துவம்', 'mr': 'सामान्य औषध'},
      'pediatrics': {'en': 'Pediatrics', 'hi': 'बाल रोग', 'te': 'శిశు రోగాలు', 'ta': 'குழந்தை மருத்துவம்', 'mr': 'बालरोग'},
      'gynecology': {'en': 'Gynecology', 'hi': 'स्त्री रोग', 'te': 'స్త్రీ రోగాలు', 'ta': 'மகளிர் மருத்துவம்', 'mr': 'स्त्रीरोग'},
      'cardiology': {'en': 'Cardiology', 'hi': 'हृदय रोग', 'te': 'హృదయ రోగాలు', 'ta': 'இதய மருத்துவம்', 'mr': 'हृदयरोग'},
      'dermatology': {'en': 'Dermatology', 'hi': 'त्वचा रोग', 'te': 'చర్మ రోగాలు', 'ta': 'தோல் மருத்துவம்', 'mr': 'त्वचारोग'},
      'orthopedics': {'en': 'Orthopedics', 'hi': 'हड्डी रोग', 'te': 'ఎలుక 료', 'ta': 'எலும்பு மருத்துவம்', 'mr': 'अस्थिरोग'},
      'psychiatry': {'en': 'Psychiatry', 'hi': 'मानसिक रोग', 'te': 'మానసిక రోగాలు', 'ta': 'மனநல மருத்துவம்', 'mr': 'मानसिकरोग'},
      'ent': {'en': 'ENT', 'hi': 'कान-नाक-गला', 'te': 'చేవి-ముక్కు-గంతythm', 'ta': 'காது-மூக்கு-தொண்டை', 'mr': 'कान-नाक-घसा'},
      'gastroenterology': {'en': 'Gastroenterology', 'hi': 'पेट रोग', 'te': 'వంటకోష 報', 'ta': 'வயிற்று மருத்துவம்', 'mr': 'पोटरोग'},
      'neurology': {'en': 'Neurology', 'hi': 'तंत्रिका रोग', 'te': 'నాడీ రోగాలు', 'ta': 'நரம்பு மருத்துவம்', 'mr': 'स्नायुरोग'},
    };
    return specialties[specialty]?[locale] ?? specialties[specialty]?['en'] ?? specialty;
  }
}

@JsonSerializable()
class AvailabilitySlot {
  final String dayOfWeek;
  final String startTime;
  final String endTime;
  final bool isAvailable;
  final int maxAppointments;

  const AvailabilitySlot({
    required this.dayOfWeek,
    required this.startTime,
    required this.endTime,
    this.isAvailable = true,
    this.maxAppointments = 4,
  });

  factory AvailabilitySlot.fromJson(Map<String, dynamic> json) => _$AvailabilitySlotFromJson(json);
  Map<String, dynamic> toJson() => _$AvailabilitySlotToJson(this);
}