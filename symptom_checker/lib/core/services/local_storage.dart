import 'package:shared_preferences/shared_preferences.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import '../models/patient.dart';
import '../models/vaccination_record.dart';
import '../models/diagnosis_result.dart';
import '../models/medical_history.dart';
import '../models/appointment.dart';
import '../models/prescription.dart';
import '../models/medicine_reminder.dart';
import '../models/pregnancy.dart';

class LocalStorageService {
  static Database? _database;
  static const String _dbName = 'gram_swasthya.db';
  static const int _dbVersion = 1;

  static Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDatabase();
    return _database!;
  }

  static Future<Database> _initDatabase() async {
    final path = join(await getDatabasesPath(), _dbName);
    return openDatabase(
      path,
      version: _dbVersion,
      onCreate: _onCreate,
    );
  }

  static Future<void> _onCreate(Database db, int version) async {
    await db.execute('''
      CREATE TABLE patients (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE vaccinations (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE diagnoses (
        id TEXT PRIMARY KEY,
        patient_id TEXT,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE medical_records (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE allergies (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE medicine_history (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE medicines (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE dose_logs (
        id TEXT PRIMARY KEY,
        medicine_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (medicine_id) REFERENCES medicines (id),
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE appointments (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE prescriptions (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE pregnancies (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE prenatal_visits (
        id TEXT PRIMARY KEY,
        pregnancy_id TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (pregnancy_id) REFERENCES pregnancies (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE children (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0,
        FOREIGN KEY (patient_id) REFERENCES patients (id)
      )
    ''');

    await db.execute('''
      CREATE TABLE anm_contacts (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        is_synced INTEGER DEFAULT 0
      )
    ''');

    await db.execute('''
      CREATE TABLE settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    ''');
  }

  // Patient operations
  static Future<void> savePatient(Patient patient) async {
    final db = await database;
    await db.insert(
      'patients',
      {
        'id': patient.id,
        'data': patient.toJson().toString(),
        'updated_at': patient.updatedAt.toIso8601String(),
        'is_synced': patient.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<Patient?> getPatient(String id) async {
    final db = await database;
    final result = await db.query('patients', where: 'id = ?', whereArgs: [id]);
    if (result.isEmpty) return null;
    return Patient.fromJson(result.first['data'] as Map<String, dynamic>);
  }

  static Future<List<Patient>> getAllPatients() async {
    final db = await database;
    final result = await db.query('patients');
    return result.map((r) => Patient.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Vaccination operations
  static Future<void> saveVaccination(VaccinationRecord record) async {
    final db = await database;
    await db.insert(
      'vaccinations',
      {
        'id': record.id,
        'patient_id': record.patientId,
        'data': record.toJson().toString(),
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': record.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<VaccinationRecord>> getVaccinations(String patientId) async {
    final db = await database;
    final result = await db.query('vaccinations', where: 'patient_id = ?', whereArgs: [patientId]);
    return result.map((r) => VaccinationRecord.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Diagnosis operations
  static Future<void> saveDiagnosis(DiagnosisResult result) async {
    final db = await database;
    await db.insert(
      'diagnoses',
      {
        'id': result.id,
        'patient_id': result.patientId ?? '',
        'data': result.toJson().toString(),
        'created_at': result.timestamp.toIso8601String(),
        'is_synced': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<DiagnosisResult>> getDiagnoses({String? patientId}) async {
    final db = await database;
    final result = patientId != null
        ? await db.query('diagnoses', where: 'patient_id = ?', whereArgs: [patientId])
        : await db.query('diagnoses');
    return result.map((r) => DiagnosisResult.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Medical records
  static Future<void> saveMedicalRecord(MedicalRecord record) async {
    final db = await database;
    await db.insert(
      'medical_records',
      {
        'id': record.id,
        'patient_id': record.patientId,
        'data': record.toJson().toString(),
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': record.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<MedicalRecord>> getMedicalRecords(String patientId) async {
    final db = await database;
    final result = await db.query('medical_records', where: 'patient_id = ?', whereArgs: [patientId]);
    return result.map((r) => MedicalRecord.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Allergies
  static Future<void> saveAllergy(Allergy allergy) async {
    final db = await database;
    await db.insert(
      'allergies',
      {
        'id': allergy.id,
        'patient_id': allergy.patientId,
        'data': allergy.toJson().toString(),
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': allergy.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<Allergy>> getAllergies(String patientId) async {
    final db = await database;
    final result = await db.query('allergies', where: 'patient_id = ?', whereArgs: [patientId]);
    return result.map((r) => Allergy.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Medicine history
  static Future<void> saveMedicineHistory(MedicineHistory medicine) async {
    final db = await database;
    await db.insert(
      'medicine_history',
      {
        'id': medicine.id,
        'patient_id': medicine.patientId,
        'data': medicine.toJson().toString(),
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': medicine.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<MedicineHistory>> getMedicineHistory(String patientId) async {
    final db = await database;
    final result = await db.query('medicine_history', where: 'patient_id = ?', whereArgs: [patientId]);
    return result.map((r) => MedicineHistory.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Appointments
  static Future<void> saveAppointment(Appointment appointment) async {
    final db = await database;
    await db.insert(
      'appointments',
      {
        'id': appointment.id,
        'patient_id': appointment.patientId,
        'data': appointment.toJson().toString(),
        'updated_at': appointment.updatedAt.toIso8601String(),
        'is_synced': appointment.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<Appointment>> getAppointments(String patientId) async {
    final db = await database;
    final result = await db.query('appointments', where: 'patient_id = ?', whereArgs: [patientId]);
    return result.map((r) => Appointment.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Prescriptions
  static Future<void> savePrescription(Prescription prescription) async {
    final db = await database;
    await db.insert(
      'prescriptions',
      {
        'id': prescription.id,
        'patient_id': prescription.patientId,
        'data': prescription.toJson().toString(),
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': prescription.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<Prescription>> getPrescriptions(String patientId) async {
    final db = await database;
    final result = await db.query('prescriptions', where: 'patient_id = ?', whereArgs: [patientId]);
    return result.map((r) => Prescription.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Medicines
  static Future<void> saveMedicine(Medicine medicine) async {
    final db = await database;
    await db.insert(
      'medicines',
      {
        'id': medicine.id,
        'patient_id': medicine.patientId,
        'data': medicine.toJson().toString(),
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': medicine.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<Medicine>> getMedicines(String patientId) async {
    final db = await database;
    final result = await db.query('medicines', where: 'patient_id = ?', whereArgs: [patientId]);
    return result.map((r) => Medicine.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  static Future<void> deleteMedicine(String medicineId) async {
    final db = await database;
    await db.delete('medicines', where: 'id = ?', whereArgs: [medicineId]);
    await db.delete('dose_logs', where: 'medicine_id = ?', whereArgs: [medicineId]);
  }

  // Dose Logs
  static Future<void> saveDoseLog(DoseLog doseLog) async {
    final db = await database;
    await db.insert(
      'dose_logs',
      {
        'id': doseLog.id,
        'medicine_id': doseLog.medicineId,
        'patient_id': doseLog.patientId,
        'data': doseLog.toJson().toString(),
        'created_at': doseLog.scheduledTime.toIso8601String(),
        'is_synced': doseLog.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<DoseLog>> getDoseLogs(String patientId) async {
    final db = await database;
    final result = await db.query('dose_logs', where: 'patient_id = ?', whereArgs: [patientId]);
    return result.map((r) => DoseLog.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Pregnancies
  static Future<void> savePregnancy(Pregnancy pregnancy) async {
    final db = await database;
    await db.insert(
      'pregnancies',
      {
        'id': pregnancy.id,
        'patient_id': pregnancy.patientId,
        'data': pregnancy.toJson().toString(),
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': pregnancy.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<Pregnancy?> getPregnancy(String patientId) async {
    final db = await database;
    final result = await db.query('pregnancies', where: 'patient_id = ?', whereArgs: [patientId]);
    if (result.isEmpty) return null;
    return Pregnancy.fromJson(result.first['data'] as Map<String, dynamic>);
  }

  // Prenatal Visits
  static Future<void> savePrenatalVisit(PrenatalVisit visit) async {
    final db = await database;
    await db.insert(
      'prenatal_visits',
      {
        'id': visit.id,
        'pregnancy_id': visit.pregnancyId,
        'data': visit.toJson().toString(),
        'created_at': visit.scheduledDate.toIso8601String(),
        'is_synced': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<PrenatalVisit>> getPrenatalVisits(String pregnancyId) async {
    final db = await database;
    final result = await db.query('prenatal_visits', where: 'pregnancy_id = ?', whereArgs: [pregnancyId]);
    return result.map((r) => PrenatalVisit.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Children
  static Future<void> saveChild(Child child) async {
    final db = await database;
    await db.insert(
      'children',
      {
        'id': child.id,
        'patient_id': child.patientId,
        'data': child.toJson().toString(),
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': child.isSynced ? 1 : 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<Child>> getChildren(String patientId) async {
    final db = await database;
    final result = await db.query('children', where: 'patient_id = ?', whereArgs: [patientId]);
    return result.map((r) => Child.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // ANM Contacts
  static Future<void> saveANMContact(ANMContact contact) async {
    final db = await database;
    await db.insert(
      'anm_contacts',
      {
        'id': contact.id,
        'data': contact.toJson().toString(),
        'updated_at': DateTime.now().toIso8601String(),
        'is_synced': 0,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<List<ANMContact>> getANMContacts() async {
    final db = await database;
    final result = await db.query('anm_contacts');
    return result.map((r) => ANMContact.fromJson(r['data'] as Map<String, dynamic>)).toList();
  }

  // Settings
  static Future<void> setString(String key, String value) async {
    final db = await database;
    await db.insert(
      'settings',
      {'key': key, 'value': value},
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  static Future<String?> getString(String key) async {
    final db = await database;
    final result = await db.query('settings', where: 'key = ?', whereArgs: [key]);
    if (result.isEmpty) return null;
    return result.first['value'] as String;
  }

  static Future<void> clearAll() async {
    final db = await database;
    await db.delete('patients');
    await db.delete('vaccinations');
    await db.delete('diagnoses');
    await db.delete('medical_records');
    await db.delete('allergies');
    await db.delete('medicine_history');
    await db.delete('medicines');
    await db.delete('dose_logs');
    await db.delete('appointments');
    await db.delete('prescriptions');
    await db.delete('pregnancies');
    await db.delete('prenatal_visits');
    await db.delete('children');
    await db.delete('anm_contacts');
    await db.delete('settings');
  }
}