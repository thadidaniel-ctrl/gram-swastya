import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/services/api_service.dart';
import '../../core/services/diagnosis_engine.dart';
import '../../core/models/diagnosis_result.dart';
import '../../features/symptom_selection/providers/symptom_provider.dart';

class ApiIntegrationExample extends StatelessWidget {
  const ApiIntegrationExample({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SymptomProvider>(
      builder: (context, provider, _) => Column(
        children: [
          ElevatedButton.icon(
            icon: const Icon(Icons.cloud),
            label: const Text('Analyze with AI (Gemini)'),
            onPressed: provider.selectedSymptomIds.isEmpty ? null : () => _analyzeWithAI(context, provider),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            icon: const Icon(Icons.local_hospital),
            label: const Text('Book Emergency Ambulance'),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => _bookAmbulance(context),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            icon: const Icon(Icons.sync),
            label: const Text('Sync Health Records'),
            onPressed: () => _syncRecords(context),
          ),
          const SizedBox(height: 12),
          ElevatedButton.icon(
            icon: const Icon(Icons.mic),
            label: const Text('Voice Assistant Demo'),
            onPressed: () => _demoVoiceAssistant(context),
          ),
        ],
      ),
    );
  }

  Future<void> _analyzeWithAI(BuildContext context, SymptomProvider provider) async {
    try {
      // Show loading
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );

      // Call API
      final apiResponse = await ApiService.analyzeSymptoms(
        symptomIds: provider.selectedSymptomIds,
        language: provider.currentLanguage,
        patientId: provider.patientId,
        isChwScreening: provider.isChwMode,
        chwId: provider.chwId,
      );

      if (!context.mounted) return;
      Navigator.pop(context); // Close loading

      // Convert API response to local DiagnosisResult
      final diagnosisResult = _convertApiResponse(apiResponse, provider);
      
      // Save locally
      await provider.saveDiagnosis(diagnosisResult);

      // Show results
      if (context.mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => DiagnosisResultScreen(result: diagnosisResult)),
        );
      }
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('AI Analysis failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  DiagnosisResult _convertApiResponse(DiagnosisApiResponse api, SymptomProvider provider) {
    final matches = api.conditions.map((c) => ConditionMatch(
      conditionId: c.conditionId,
      conditionName: c.conditionName,
      severity: _parseSeverity(c.severity),
      matchingSymptomsCount: c.matchingSymptoms,
      totalSymptomsCount: c.totalSymptoms,
      confidenceScore: c.probability,
      recommendation: _parseRecommendation(api.recommendation),
      matchedSymptoms: provider.selectedSymptomIds.take(c.matchingSymptoms).toList(),
      unmatchedSymptoms: [],
    )).toList();

    return DiagnosisResult(
      id: api.diagnosisId,
      timestamp: DateTime.now(),
      selectedSymptomIds: provider.selectedSymptomIds,
      matches: matches,
      finalRecommendation: _parseRecommendation(api.recommendation),
      language: provider.currentLanguage,
      isChwScreening: provider.isChwMode,
      chwId: provider.chwId,
      patientId: provider.patientId,
    );
  }

  Severity _parseSeverity(String s) {
    switch (s.toLowerCase()) {
      case 'critical': return Severity.critical;
      case 'high': return Severity.high;
      case 'medium': return Severity.medium;
      default: return Severity.low;
    }
  }

  Recommendation _parseRecommendation(String r) {
    switch (r.toLowerCase()) {
      case 'emergency': return Recommendation.emergency;
      case 'clinic': return Recommendation.clinic;
      default: return Recommendation.homeCare;
    }
  }

  Future<void> _bookAmbulance(BuildContext context) async {
    try {
      // In real app, get location from GPS
      const lat = 28.6139;
      const lng = 77.2090;

      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );

      final response = await ApiService.bookEmergencyAmbulance(
        latitude: lat,
        longitude: lng,
        patientId: 'patient_123',
        emergencyType: 'general',
        description: 'Emergency requested from app',
        contactPhone: '+91-9876543210',
      );

      if (!context.mounted) return;
      Navigator.pop(context);

      _showAmbulanceDialog(context, response);
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Ambulance booking failed: $e')),
        );
      }
    }
  }

  void _showAmbulanceDialog(BuildContext context, AmbulanceBookingResponse response) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.local_hospital, color: Colors.red),
            const SizedBox(width: 8),
            const Text('Ambulance Booked'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _infoRow('Booking ID', response.bookingId),
            _infoRow('Ambulance', response.vehicleNumber),
            _infoRow('Driver', '${response.driverName} (${response.driverPhone})'),
            _infoRow('ETA', '${response.etaMinutes} minutes'),
            _infoRow('Distance', '${response.distanceKm} km'),
            _infoRow('Hospital', response.hospitalName),
            const SizedBox(height: 12),
            Text(
              'Status: ${response.status.toUpperCase()}',
              style: TextStyle(
                color: response.status == 'assigned' ? Colors.orange : Colors.green,
                fontWeight: FontWeight.bold,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // Call driver
            },
            child: const Text('Call Driver'),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey)),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  Future<void> _syncRecords(BuildContext context) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );

      final records = await ApiService.getHealthRecords('patient_123');

      if (!context.mounted) return;
      Navigator.pop(context);

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Synced ${records.diagnoses.length} diagnoses, ${records.vaccinations.length} vaccinations')),
      );
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sync failed: $e')),
        );
      }
    }
  }

  Future<void> _demoVoiceAssistant(BuildContext context) async {
    // In real app, record audio and convert to base64
    const mockAudioBase64 = 'base64_audio_data_here';

    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => const Center(child: CircularProgressIndicator()),
      );

      final response = await ApiService.processVoiceCommand(
        audioBase64: mockAudioBase64,
        language: 'hi',
        patientId: 'patient_123',
        context: 'symptom_check',
      );

      if (!context.mounted) return;
      Navigator.pop(context);

      _showVoiceResponseDialog(context, response);
    } catch (e) {
      if (context.mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Voice processing failed: $e')),
        );
      }
    }
  }

  void _showVoiceResponseDialog(BuildContext context, VoiceAssistantResponse response) {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.mic, color: Colors.blue),
            const SizedBox(width: 8),
            const Text('Voice Assistant'),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Response: ${response.textResponse}'),
            const SizedBox(height: 12),
            Text('Intent: ${response.intent}'),
            const SizedBox(height: 8),
            Text('Entities: ${response.entities.toString()}'),
            const SizedBox(height: 8),
            if (response.actions.isNotEmpty) ...[
              const Text('Actions:', style: TextStyle(fontWeight: FontWeight.bold)),
              ...response.actions.map((a) => Text('• ${a.description} (${a.type})')),
            ],
            if (response.requiresHandoff) ...[
              const SizedBox(height: 12),
              Container(
                padding: const EdgeInsets.all(8),
                color: Colors.orange.withOpacity(0.1),
                child: Text(
                  '⚠️ Requires doctor handoff: ${response.handoffReason}',
                  style: const TextStyle(color: Colors.orange),
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }
}

// Placeholder for result screen
class DiagnosisResultScreen extends StatelessWidget {
  final DiagnosisResult result;
  const DiagnosisResultScreen({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('AI Diagnosis Result')),
      body: Center(child: Text('Diagnosis: ${result.matches.first.conditionName}')),
    );
  }
}