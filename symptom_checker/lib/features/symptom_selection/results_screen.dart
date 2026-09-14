import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/models/diagnosis_result.dart';
import '../../core/models/symptom.dart';
import '../../core/services/diagnosis_engine.dart';
import '../../shared/theme/app_theme.dart';
import '../../features/symptom_selection/providers/symptom_provider.dart';

class ResultsScreen extends StatelessWidget {
  final DiagnosisResult result;

  const ResultsScreen({super.key, required this.result});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.read<SymptomProvider>();
    final matches = result.matches;
    final topMatch = matches.isNotEmpty ? matches.first : null;

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.possibleConditions),
        backgroundColor: topMatch != null
            ? AppTheme.getSeverityColor(topMatch.severity)
            : AppTheme.primaryGreen,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildRecommendationCard(context, l10n, result),
            const SizedBox(height: 16),
            if (topMatch != null) _buildTopMatchCard(context, l10n, topMatch),
            const SizedBox(height: 16),
            if (matches.length > 1) _buildOtherMatches(context, l10n, matches.sublist(1)),
            const SizedBox(height: 16),
            _buildSelectedSymptoms(context, l10n, provider),
            const SizedBox(height: 16),
            _buildRedFlags(context, l10n, result),
            const SizedBox(height: 16),
            if (topMatch != null) _buildHomeCare(context, l10n, topMatch),
            const SizedBox(height: 24),
            _buildActionButtons(context, l10n, result),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildRecommendationCard(BuildContext context, AppLocalizations l10n, DiagnosisResult result) {
    Color bgColor;
    IconData icon;
    
    switch (result.finalRecommendation) {
      case Recommendation.emergency:
        bgColor = AppTheme.errorRed.withOpacity(0.1);
        icon = Icons.warning_amber_rounded;
      case Recommendation.clinic:
        bgColor = AppTheme.warningOrange.withOpacity(0.1);
        icon = Icons.local_hospital_outlined;
      case Recommendation.homeCare:
        bgColor = AppTheme.successGreen.withOpacity(0.1);
        icon = Icons.home_outlined;
    }

    return Card(
      color: bgColor,
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Icon(icon, size: 40, color: AppTheme.getRecommendationColor(result.finalRecommendation)),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    result.finalRecommendation.getRecommendationLabel(result.language),
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      color: AppTheme.getRecommendationColor(result.finalRecommendation),
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _getRecommendationDescription(result.finalRecommendation, l10n),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getRecommendationDescription(Recommendation rec, AppLocalizations l10n) {
    switch (rec) {
      case Recommendation.emergency:
        return 'Seek immediate medical attention. Call emergency services or go to the nearest hospital.';
      case Recommendation.clinic:
        return 'Visit a clinic or healthcare provider within 24 hours for proper evaluation.';
      case Recommendation.homeCare:
        return 'This can likely be managed at home with rest and self-care. Monitor symptoms.';
    }
  }

  Widget _buildTopMatchCard(BuildContext context, AppLocalizations l10n, ConditionMatch match) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    match.conditionName,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppTheme.getSeverityColor(match.severity).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    match.severity.getSeverityLabel(result.language),
                    style: TextStyle(
                      color: AppTheme.getSeverityColor(match.severity),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.check_circle, size: 16, color: AppTheme.successGreen),
                const SizedBox(width: 4),
                Text(
                  '${match.matchingSymptomsCount} of ${match.totalSymptomsCount} symptoms match',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
                const SizedBox(width: 16),
                Icon(Icons.percent, size: 16, color: AppTheme.primaryBlue),
                const SizedBox(width: 4),
                Text(
                  '${(match.confidenceScore * 100).toInt()}% confidence',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
            if (match.unmatchedSymptoms.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Additional symptoms to watch for:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: match.unmatchedSymptoms.map((symptomId) {
                  final symptom = DiagnosisEngine.getSymptomById(symptomId);
                  return Chip(
                    label: Text(
                      symptom?.getName(result.language) ?? symptomId,
                      style: const TextStyle(fontSize: 12),
                    ),
                    backgroundColor: Colors.grey[100],
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildOtherMatches(BuildContext context, AppLocalizations l10n, List<ConditionMatch> matches) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Other Possible Conditions',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: matches.length,
          separatorBuilder: (_, __) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final match = matches[index];
            return Card(
              child: ListTile(
                leading: Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: AppTheme.getSeverityColor(match.severity).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      '${(match.confidenceScore * 100).toInt()}%',
                      style: TextStyle(
                        color: AppTheme.getSeverityColor(match.severity),
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ),
                title: Text(match.conditionName, style: const TextStyle(fontWeight: FontWeight.w600)),
                subtitle: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      '${match.severity.getSeverityLabel(result.language)} • ${match.recommendation.getRecommendationLabel(result.language)}',
                      style: TextStyle(fontSize: 12, color: AppTheme.textSecondary),
                    ),
                    if (match.matchedSymptoms.isNotEmpty)
                      Text(
                        'Matched: ${match.matchedSymptoms.map((s) => DiagnosisEngine.getSymptomById(s)?.getName(result.language) ?? s).join(', ')}',
                        style: TextStyle(fontSize: 11, color: AppTheme.primaryGreen),
                      ),
                  ],
                ),
                trailing: Chip(
                  label: Text(
                    match.recommendation.getRecommendationLabel(result.language),
                    style: const TextStyle(fontSize: 10, color: Colors.white),
                  ),
                  backgroundColor: AppTheme.getRecommendationColor(match.recommendation),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildSelectedSymptoms(BuildContext context, AppLocalizations l10n, SymptomProvider provider) {
    final selectedSymptoms = provider.getSelectedSymptoms();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Your Selected Symptoms',
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: selectedSymptoms.map((symptom) => Chip(
            label: Text(symptom.getName(result.language), style: const TextStyle(fontSize: 13)),
            avatar: Icon(_getCategoryIcon(symptom.category), size: 16, color: AppTheme.primaryGreen),
            backgroundColor: AppTheme.primaryGreen.withOpacity(0.1),
            side: BorderSide(color: AppTheme.primaryGreen.withOpacity(0.3)),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          )).toList(),
        ),
      ],
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'respiratory': return Icons.air;
      case 'cardiovascular': return Icons.favorite;
      case 'neurological': return Icons.psychology;
      case 'gastrointestinal': return Icons.restaurant;
      case 'dermatological': return Icons.face;
      case 'musculoskeletal': return Icons.accessibility;
      case 'ent': return Icons.hearing;
      case 'urological': return Icons.water_drop;
      case 'vector_borne': return Icons.bug_report;
      case 'infectious': return Icons.biotech;
      case 'endocrine': return Icons.science;
      case 'blood': return Icons.bloodtype;
      default: return Icons.medical_information;
    }
  }

  Widget _buildRedFlags(BuildContext context, AppLocalizations l10n, DiagnosisResult result) {
    final redFlags = DiagnosisEngine.getRedFlagsForConditions(result.matches, result.language);
    
    if (redFlags.isEmpty) return const SizedBox.shrink();

    return Card(
      color: AppTheme.errorRed.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: AppTheme.errorRed, size: 24),
                const SizedBox(width: 8),
                Text(
                  l10n.redFlags,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.errorRed,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...redFlags.map((flag) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.circle, size: 8, color: AppTheme.errorRed),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      flag,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildHomeCare(BuildContext context, AppLocalizations l10n, ConditionMatch match) {
    final homeCare = DiagnosisEngine.getHomeCareForTopMatch([match], result.language);
    
    if (homeCare.isEmpty) return const SizedBox.shrink();

    return Card(
      color: AppTheme.successGreen.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.home_outlined, color: AppTheme.successGreen, size: 24),
                const SizedBox(width: 8),
                Text(
                  l10n.homeCareAdvice,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.successGreen,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...homeCare.map((advice) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.check_circle_outline, size: 20, color: AppTheme.successGreen),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      advice,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppTheme.textPrimary,
                      ),
                    ),
                  ),
                ],
              ),
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context, AppLocalizations l10n, DiagnosisResult result) {
    return Column(
      children: [
        SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            icon: const Icon(Icons.save),
            label: Text('Save to Health Passport'),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Saved to health records')),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        if (result.finalRecommendation == Recommendation.clinic ||
            result.finalRecommendation == Recommendation.emergency)
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              icon: const Icon(Icons.video_call),
              label: Text('Book Teleconsultation'),
              onPressed: () {
                // Navigate to telemedicine tab
              },
            ),
          ),
        const SizedBox(height: 12),
        SizedBox(
          width: double.infinity,
          child: TextButton.icon(
            icon: const Icon(Icons.refresh),
            label: Text(l10n.back),
            onPressed: () => Navigator.pop(context),
          ),
        ),
      ],
    );
  }
}