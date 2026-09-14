import 'dart:convert';
import 'package:flutter/services.dart';
import '../models/medicine_reminder.dart';

class DrugInteractionService {
  static Map<String, dynamic>? _interactionData;
  static bool _initialized = false;

  static Future<void> initialize() async {
    if (_initialized) return;
    final jsonString = await rootBundle.loadString('assets/translations/drug_interactions.json');
    _interactionData = jsonDecode(jsonString);
    _initialized = true;
  }

  static List<DrugInteraction> checkInteractions(List<Medicine> medicines) {
    if (!_initialized) {
      throw StateError('DrugInteractionService not initialized');
    }
    
    final interactions = <DrugInteraction>[];
    final interactionList = _interactionData!['interactions'] as List;
    
    for (int i = 0; i < medicines.length; i++) {
      for (int j = i + 1; j < medicines.length; j++) {
        final med1 = medicines[i].genericName.toLowerCase().replaceAll(' ', '_');
        final med2 = medicines[j].genericName.toLowerCase().replaceAll(' ', '_');
        
        final match = interactionList.firstWhere(
          (interaction) {
            final m1 = interaction['medicine1'].toString().toLowerCase();
            final m2 = interaction['medicine2'].toString().toLowerCase();
            return (m1 == med1 && m2 == med2) || (m1 == med2 && m2 == med1);
          },
          orElse: () => null,
        );
        
        if (match != null) {
          interactions.add(DrugInteraction(
            id: '${medicines[i].id}_${medicines[j].id}',
            medicineId1: medicines[i].id,
            medicineName1: medicines[i].name,
            medicineId2: medicines[j].id,
            medicineName2: medicines[j].name,
            severity: InteractionSeverity.values.firstWhere(
              (s) => s.name == match['severity'],
              orElse: () => InteractionSeverity.moderate,
            ),
            description: match['description'],
            mechanism: match['mechanism'],
            management: match['management'],
            references: List<String>.from(match['references'] ?? []),
            createdAt: DateTime.now(),
          ));
        }
      }
    }
    
    interactions.sort((a, b) {
      final order = {
        InteractionSeverity.contraindicated: 4,
        InteractionSeverity.major: 3,
        InteractionSeverity.moderate: 2,
        InteractionSeverity.minor: 1,
      };
      return order[b.severity]! - order[a.severity]!;
    });
    
    return interactions;
  }

  static List<MedicineSubstitution> getSubstitutions(String medicineGenericName) {
    if (!_initialized) return [];
    
    final subList = _interactionData!['substitutions'] as List;
    final match = subList.firstWhere(
      (sub) => sub['original'].toString().toLowerCase() == medicineGenericName.toLowerCase(),
      orElse: () => null,
    );
    
    if (match == null) return [];
    
    return (match['substitutes'] as List).map((sub) => MedicineSubstitution(
      id: 'sub_${medicineGenericName}_${sub['name']}',
      originalMedicineId: '',
      originalMedicineName: '',
      substituteId: sub['name'],
      substituteName: sub['generic'],
      substituteGeneric: sub['generic'],
      substituteStrength: sub['strength'],
      reason: sub['reason'],
      priceDifference: (sub['price_diff'] as num).toDouble(),
      isGenericEquivalent: true,
      notes: '',
    )).toList();
  }

  static List<DrugInteraction> checkWithAllergies(List<Medicine> medicines, List<String> allergies) {
    final interactions = <DrugInteraction>[];
    
    for (final medicine in medicines) {
      for (final allergy in allergies) {
        if (medicine.genericName.toLowerCase().contains(allergy.toLowerCase()) ||
            allergy.toLowerCase().contains(medicine.genericName.toLowerCase())) {
          interactions.add(DrugInteraction(
            id: 'allergy_${medicine.id}_$allergy',
            medicineId1: medicine.id,
            medicineName1: medicine.name,
            medicineId2: 'allergy_$allergy',
            medicineName2: 'Allergy: $allergy',
            severity: InteractionSeverity.contraindicated,
            description: 'Patient has known allergy to ${allergy}',
            mechanism: 'Immune-mediated hypersensitivity reaction',
            management: 'DO NOT ADMINISTER. Use alternative medication immediately.',
            references: ['Patient allergy record'],
            createdAt: DateTime.now(),
          ));
        }
      }
    }
    
    return interactions;
  }
}