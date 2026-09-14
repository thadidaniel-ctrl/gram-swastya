import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../core/models/symptom.dart';
import '../../shared/theme/app_theme.dart';

class SymptomIconSelector extends StatelessWidget {
  final List<Symptom> symptoms;
  final List<String> selectedSymptomIds;
  final ValueChanged<String> onToggle;
  final String language;
  final bool showCategoryHeaders;

  const SymptomIconSelector({
    super.key,
    required this.symptoms,
    required this.selectedSymptomIds,
    required this.onToggle,
    required this.language,
    this.showCategoryHeaders = true,
  });

  @override
  Widget build(BuildContext context) {
    if (showCategoryHeaders) {
      final categories = symptoms.map((s) => s.category).toSet().toList()..sort();
      return ListView.builder(
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final category = categories[index];
          final categorySymptoms = symptoms.where((s) => s.category == category).toList();
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Text(
                  _getCategoryLabel(category, language),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.primaryGreen,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
              _buildSymptomGrid(categorySymptoms),
              if (index < categories.length - 1) const Divider(height: 1),
            ],
          );
        },
      );
    }
    return _buildSymptomGrid(symptoms);
  }

  Widget _buildSymptomGrid(List<Symptom> symptomsList) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 0.85,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: symptomsList.length,
      itemBuilder: (context, index) {
        final symptom = symptomsList[index];
        final isSelected = selectedSymptomIds.contains(symptom.id);
        return _SymptomIconCard(
          symptom: symptom,
          isSelected: isSelected,
          language: language,
          onTap: () => onToggle(symptom.id),
        );
      },
    );
  }

  String _getCategoryLabel(String category, String language) {
    final labels = {
      'general': {'en': 'General', 'hi': 'सामान्य', 'te': 'సాధారణ', 'ta': 'பொதுவான', 'mr': 'सामान्य'},
      'respiratory': {'en': 'Respiratory', 'hi': 'श्वसन', 'te': 'శ్వాస', 'ta': 'சுவாச', 'mr': 'श्वसन'},
      'cardiovascular': {'en': 'Cardiovascular', 'hi': 'हृदय', 'te': 'హృదయ', 'ta': 'இதய', 'mr': 'हृदय'},
      'neurological': {'en': 'Neurological', 'hi': 'तंत्रिका', 'te': 'నాడీ', 'ta': 'நரம்பு', 'mr': 'स्नायु'},
      'gastrointestinal': {'en': 'Digestive', 'hi': 'पाचन', 'te': 'వ בעיקר', 'ta': 'எண்ணverkehr', 'mr': 'पाचन'},
      'dermatological': {'en': 'Skin', 'hi': 'त्वचा', 'te': 'చర్మ', 'ta': 'தோல்', 'mr': 'त्वचा'},
      'musculoskeletal': {'en': 'Joints/Muscles', 'hi': 'जोड़/मांसपेशी', 'te': 'సంధి/పెంపు', 'ta': 'மூட்டு/தசை', 'mr': 'संधी/पेशी'},
      'ent': {'en': 'Ear/Nose/Throat', 'hi': 'कान/नाक/गला', 'te': 'చేవి/ముక్కు/గంతు', 'ta': 'காது/மூக்கு/தொண்டை', 'mr': 'कान/नाक/घसा'},
      'urological': {'en': 'Urinary', 'hi': 'मूत्र', 'te': 'మూత్ర', 'ta': 'சிறுநீர்', 'mr': 'मूत्र'},
      'vector_borne': {'en': 'Mosquito-borne', 'hi': 'मच्छर-जनित', 'te': 'డోమల-జన్య', 'ta': 'கொசு-உண்டாக்கப்பட்ட', 'mr': 'डांगर-जन्य'},
      'infectious': {'en': 'Infectious', 'hi': 'संक्रामक', 'te': 'అ给力', 'ta': 'ஆர்ப்பற்ற', 'mr': 'संक्रामक'},
      'endocrine': {'en': 'Hormonal', 'hi': 'हार्मोनल', 'te': 'హార్మోనల్', 'ta': 'ஹார்மோனல்', 'mr': 'हार्मोनल'},
      'blood': {'en': 'Blood', 'hi': 'रक्त', 'te': 'రక్త', 'ta': 'இரத்த', 'mr': 'रक्त'},
    };
    return labels[category]?[language] ?? labels[category]?['en'] ?? category;
  }
}

class _SymptomIconCard extends StatelessWidget {
  final Symptom symptom;
  final bool isSelected;
  final String language;
  final VoidCallback onTap;

  const _SymptomIconCard({
    required this.symptom,
    required this.isSelected,
    required this.language,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 200),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primaryGreen : Colors.grey[50],
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppTheme.primaryGreen : Colors.grey[300]!,
              width: isSelected ? 2 : 1,
            ),
            boxShadow: isSelected
                ? [BoxShadow(color: AppTheme.primaryGreen.withOpacity(0.3), blurRadius: 8, offset: const Offset(0, 2))]
                : null,
          ),
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              _buildIcon(),
              const SizedBox(height: 8),
              Flexible(
                child: Text(
                  symptom.getName(language),
                  textAlign: TextAlign.center,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: isSelected ? Colors.white : AppTheme.textPrimary,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIcon() {
    final iconPath = 'assets/icons/${symptom.icon}.svg';
    return SizedBox(
      width: 48,
      height: 48,
      child: isSelected
          ? ColorFiltered(
              colorFilter: const ColorFilter.mode(Colors.white, BlendMode.srcIn),
              child: SvgPicture.asset(iconPath, fit: BoxFit.contain),
            )
          : SvgPicture.asset(iconPath, fit: BoxFit.contain, colorFilter: ColorFilter.mode(AppTheme.textSecondary, BlendMode.srcIn)),
    );
  }
}

class SelectedSymptomsChips extends StatelessWidget {
  final List<Symptom> allSymptoms;
  final List<String> selectedSymptomIds;
  final String language;
  final ValueChanged<String> onRemove;

  const SelectedSymptomsChips({
    super.key,
    required this.allSymptoms,
    required this.selectedSymptomIds,
    required this.language,
    required this.onRemove,
  });

  @override
  Widget build(BuildContext context) {
    if (selectedSymptomIds.isEmpty) {
      return const SizedBox.shrink();
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
          child: Text(
            'Selected Symptoms',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
              color: AppTheme.primaryGreen,
              fontWeight: FontWeight.w600,
            ),
          ),
        ),
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            children: selectedSymptomIds.map((id) {
              final symptom = allSymptoms.firstWhere((s) => s.id == id);
              return Padding(
                padding: const EdgeInsets.only(right: 8),
                child: Chip(
                  label: Text(symptom.getName(language), style: const TextStyle(fontSize: 12)),
                  avatar: Icon(_getCategoryIcon(symptom.category), size: 16, color: AppTheme.primaryGreen),
                  deleteIcon: const Icon(Icons.close, size: 16),
                  onDeleted: () => onRemove(id),
                  backgroundColor: AppTheme.primaryGreen.withOpacity(0.1),
                  side: BorderSide(color: AppTheme.primaryGreen.withOpacity(0.3)),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                ),
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }

  IconData _getCategoryIcon(String category) {
    switch (category) {
      case 'respiratory':
        return Icons.air;
      case 'cardiovascular':
        return Icons.favorite;
      case 'neurological':
        return Icons.psychology;
      case 'gastrointestinal':
        return Icons.restaurant;
      case 'dermatological':
        return Icons.face;
      case 'musculoskeletal':
        return Icons.accessibility;
      case 'ent':
        return Icons.hearing;
      case 'urological':
        return Icons.water_drop;
      case 'vector_borne':
        return Icons.bug_report;
      case 'infectious':
        return Icons.biotech;
      case 'endocrine':
        return Icons.science;
      case 'blood':
        return Icons.bloodtype;
      default:
        return Icons.medical_information;
    }
  }
}