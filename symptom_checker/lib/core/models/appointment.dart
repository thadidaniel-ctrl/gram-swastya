import 'package:json_annotation/json_annotation.dart';
import 'doctor.dart';

part 'appointment.g.dart';

enum AppointmentStatus {
  scheduled,
  confirmed,
  inProgress,
  completed,
  cancelled,
  noShow,
  rescheduled
}

enum AppointmentType {
  video,
  audio,
  inPerson
}

@JsonSerializable()
class Appointment {
  final String id;
  final String patientId;
  final String doctorId;
  final Doctor? doctor;
  final DateTime scheduledAt;
  final Duration duration;
  final AppointmentType type;
  final AppointmentStatus status;
  final String? meetingLink;
  final String? meetingId;
  final String? prescriptionId;
  final String? paymentId;
  final double amount;
  final String paymentMethod;
  final bool paymentCompleted;
  final String? cancellationReason;
  final DateTime? cancelledAt;
  final List<String> reminderSent;
  final String notes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isSynced;

  const Appointment({
    required this.id,
    required this.patientId,
    required this.doctorId,
    this.doctor,
    required this.scheduledAt,
    this.duration = const Duration(minutes: 15),
    required this.type,
    this.status = AppointmentStatus.scheduled,
    this.meetingLink,
    this.meetingId,
    this.prescriptionId,
    this.paymentId,
    this.amount = 0,
    this.paymentMethod = 'cash',
    this.paymentCompleted = false,
    this.cancellationReason,
    this.cancelledAt,
    this.reminderSent = const [],
    this.notes = '',
    required this.createdAt,
    required this.updatedAt,
    this.isSynced = false,
  });

  factory Appointment.fromJson(Map<String, dynamic> json) => _$AppointmentFromJson(json);
  Map<String, dynamic> toJson() => _$AppointmentToJson(this);

  String getStatusLabel(String locale) {
    final labels = {
      AppointmentStatus.scheduled: {'en': 'Scheduled', 'hi': 'निर्धारित', 'te': 'నిర్ధారిత', 'ta': 'திட்டமிடப்பட்ட', 'mr': 'नियोजित'},
      AppointmentStatus.confirmed: {'en': 'Confirmed', 'hi': 'पुष्टि', 'te': 'నిఖిల', 'ta': 'உறுதிப்படுத்தப்பட்டது', 'mr': 'पुष्टीकरण'},
      AppointmentStatus.inProgress: {'en': 'In Progress', 'hi': 'चल रहा है', 'te': 'ప్రગతిలో', 'ta': 'நடைபெறുകின்றது', 'mr': 'प्रगतीत'},
      AppointmentStatus.completed: {'en': 'Completed', 'hi': 'पूर्ण', 'te': 'పూర్తి', 'ta': 'முடிந்தது', 'mr': 'पूर्ण'},
      AppointmentStatus.cancelled: {'en': 'Cancelled', 'hi': 'रद्द', 'te': 'రద్దు', 'ta': 'ரத்து', 'mr': 'रद्द'},
      AppointmentStatus.noShow: {'en': 'No Show', 'hi': 'नहीं आए', 'te': 'రheimer', 'ta': 'வரவில்லை', 'mr': 'येत नाही'},
      AppointmentStatus.rescheduled: {'en': 'Rescheduled', 'hi': 'पुनर्निर्धारित', 'te': 'పునఃనిర్ధారిత', 'ta': 'மீண்டும் திட்டமிடப்பட்டது', 'mr': 'पुन्हा नियोजित'},
    };
    return labels[status]?[locale] ?? labels[status]?['en'] ?? status.name;
  }

  bool get isUpcoming => scheduledAt.isAfter(DateTime.now());
  bool get canJoin => status == AppointmentStatus.confirmed && 
      scheduledAt.difference(DateTime.now()).inMinutes <= 15;
}