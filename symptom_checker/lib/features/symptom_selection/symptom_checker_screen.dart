import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/models/symptom.dart';
../../core/models/diagnosis_result.dart';
import '../../core/services/diagnosis_engine.dart';
import '../../shared/theme/app_theme.dart';
import '../../shared/widgets/symptom_icon_selector.dart';
import '../providers/symptom_provider.dart';
import 'results_screen.dart';

class SymptomCheckerScreen extends StatelessWidget {
  const SymptomCheckerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.watch<SymptomProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.symptomChecker),
        actions: [
          IconButton(
            icon: const Icon(Icons.language),
            onPressed: () => _showLanguageDialog(context),
            tooltip: l10n.selectLanguage,
          ),
          Consumer<SymptomProvider>(
            builder: (context, provider, _) {
              return IconButton(
                icon: Icon(provider.isChwMode ? Icons.person : Icons.health_and_safety),
                onPressed: () => _showModeDialog(context),
                tooltip: provider.isChwMode ? l10n.patientMode : l10n.chwMode,
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          if (provider.isChwMode)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              color: AppTheme.primaryGreen.withOpacity(0.1),
              child: Row(
                children: [
                  Icon(Icons.health_and_safety, color: AppTheme.primaryGreen, size: 20),
                  const SizedBox(width: 8),
                  Text(
                    l10n.chwMode,
                    style: TextStyle(
                      color: AppTheme.primaryGreen,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          Expanded(
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(
                  child: Column(
                    children: [
                      const SizedBox(height: 8),
                      Text(
                        l10n.selectSymptoms,
                        style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: AppTheme.textSecondary,
                        ),
                      ),
                      const SizedBox(height: 8),
                      SelectedSymptomsChips(
                        allSymptoms: provider.allSymptoms,
                        selectedSymptomIds: provider.selectedSymptomIds,
                        language: provider.currentLanguage,
                        onRemove: provider.toggleSymptom,
                      ),
                    ],
                  ),
                ),
                SliverFillRemaining(
                  hasScrollBody: false,
                  child: SymptomIconSelector(
                    symptoms: provider.allSymptoms,
                    selectedSymptomIds: provider.selectedSymptomIds,
                    onToggle: provider.toggleSymptom,
                    language: provider.currentLanguage,
                  ),
                ),
              ],
            ),
          ),
          _buildBottomBar(context, provider),
        ],
      ),
    );
  }

  Widget _buildBottomBar(BuildContext context, SymptomProvider provider) {
    final l10n = AppLocalizations.of(context)!;
    final hasSelection = provider.selectedSymptomIds.isNotEmpty;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
          ),
        ],
      ),
      child: SafeArea(
        child: SizedBox(
          width: double.infinity,
          height: 56,
          child: ElevatedButton.icon(
            icon: provider.isLoading
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                  )
                : const Icon(Icons.search),
            label: Text(l10n.continueButton),
            onPressed: hasSelection && !provider.isLoading
                ? () async {
                    final result = await provider.diagnose();
                    if (result != null && context.mounted) {
                      Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => ResultsScreen(result: result)),
                      );
                    }
                  }
                : null,
          ),
        ),
      ),
    );
  }

  void _showLanguageDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final localeProvider = context.read<LocaleProvider>();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.selectLanguage),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            _buildLanguageOption(context, 'en', 'English', localeProvider),
            _buildLanguageOption(context, 'hi', 'हिंदी', localeProvider),
            _buildLanguageOption(context, 'te', 'తెలుగు', localeProvider),
            _buildLanguageOption(context, 'ta', 'தமிழ்', localeProvider),
            _buildLanguageOption(context, 'mr', 'मराठी', localeProvider),
          ],
        ),
      ),
    );
  }

  Widget _buildLanguageOption(BuildContext context, String code, String name, LocaleProvider provider) {
    final isSelected = provider.languageCode == code;
    return ListTile(
      title: Text(name),
      trailing: isSelected ? Icon(Icons.check, color: AppTheme.primaryGreen) : null,
      onTap: () {
        provider.setLocale(code);
        Navigator.pop(context);
      },
    );
  }

  void _showModeDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.read<SymptomProvider>();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.selectLanguage),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: Text(l10n.patientMode),
              leading: const Icon(Icons.person),
              selected: !provider.isChwMode,
              onTap: () {
                provider.toggleChwMode(false);
                Navigator.pop(context);
              },
            ),
            ListTile(
              title: Text(l10n.chwMode),
              leading: const Icon(Icons.health_and_safety),
              selected: provider.isChwMode,
              onTap: () {
                _showChwIdDialog(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showChwIdDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.read<SymptomProvider>();
    final controller = TextEditingController();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(l10n.chwMode),
        content: TextField(
          controller: controller,
          decoration: InputDecoration(
            labelText: 'CHW ID',
            hintText: 'Enter your CHW ID',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.cancel),
          ),
          ElevatedButton(
            onPressed: () {
              if (controller.text.isNotEmpty) {
                provider.toggleChwMode(true, chwId: controller.text);
                Navigator.pop(context);
              }
            },
            child: Text(l10n.continueButton),
          ),
        ],
      ),
    );
  }
}