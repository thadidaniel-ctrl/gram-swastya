import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/models/pregnancy.dart';
import '../../core/services/pregnancy_service.dart';
import '../../shared/theme/app_theme.dart';
import '../../features/pregnancy/providers/pregnancy_provider.dart';
import 'pregnancy_tracker_screen.dart';
import 'child_health_screen.dart';

class PregnancyScreen extends StatelessWidget {
  const PregnancyScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.watch<PregnancyProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.pregnancy),
        actions: [
          if (provider.isPregnant)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _showAddChildDialog(context),
              tooltip: 'Add Child',
            ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(context, l10n, provider),
    );
  }

  Widget _buildBody(BuildContext context, AppLocalizations l10n, PregnancyProvider provider) {
    if (!provider.isPregnant && provider.children.isEmpty) {
      return _buildEmptyState(context, l10n, provider);
    }

    return DefaultTabController(
      length: provider.isPregnant ? 2 : 1,
      child: Column(
        children: [
          if (provider.isPregnant)
            _buildPregnancyHeader(context, provider),
          TabBar(
            tabs: [
              if (provider.isPregnant)
                Tab(
                  icon: const Icon(Icons.pregnant_woman),
                  text: l10n.pregnancy,
                ),
              Tab(
                icon: const Icon(Icons.child_care),
                text: 'Child Health',
              ),
            ],
            labelColor: AppTheme.primaryGreen,
            unselectedLabelColor: AppTheme.textSecondary,
            indicatorColor: AppTheme.primaryGreen,
          ),
          Expanded(
            child: TabBarView(
              children: [
                if (provider.isPregnant)
                  const PregnancyTrackerScreen(),
                const ChildHealthScreen(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPregnancyHeader(BuildContext context, PregnancyProvider provider) {
    final pregnancy = provider.currentPregnancy!;
    final week = pregnancy.currentWeek;
    final trimester = pregnancy.currentTrimester;

    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [AppTheme.primaryGreen, AppTheme.primaryLightGreen],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppTheme.primaryGreen.withOpacity(0.3),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Week $week',
                    style: const TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    trimester.getTrimesterLabel('en'),
                    style: const TextStyle(
                      fontSize: 16,
                      color: Colors.white70,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '${pregnancy.daysUntilEdd > 0 ? pregnancy.daysUntilEdd : 0} days to EDD',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          LinearProgressIndicator(
            value: week / 40,
            backgroundColor: Colors.white.withOpacity(0.3),
            valueColor: const AlwaysStoppedAnimation<Color>(Colors.white),
            minHeight: 8,
            borderRadius: BorderRadius.circular(4),
          ),
          const SizedBox(height: 8),
          Text(
            'EDD: ${_formatDate(pregnancy.calculatedEdd)}',
            style: const TextStyle(color: Colors.white70),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  Widget _buildEmptyState(BuildContext context, AppLocalizations l10n, PregnancyProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.pregnant_woman_outlined,
              size: 100,
              color: AppTheme.primaryGreen.withOpacity(0.3),
            ),
            const SizedBox(height: 24),
            Text(
              'Pregnancy & Child Health',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            Text(
              'Track your pregnancy week by week, monitor child growth, vaccinations, and milestones.',
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.textSecondary,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 32),
            if (!provider.isPregnant)
              ElevatedButton.icon(
                icon: const Icon(Icons.add),
                label: Text('Start Pregnancy Tracking'),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                ),
                onPressed: () => _showAddPregnancyDialog(context, provider),
              ),
            if (!provider.isPregnant && provider.children.isEmpty) ...[
              const SizedBox(height: 16),
              OutlinedButton.icon(
                icon: const Icon(Icons.child_care),
                label: Text('Add Child'),
                onPressed: () => _showAddChildDialog(context),
              ),
            ],
          ],
        ),
      ),
    );
  }

  void _showAddPregnancyDialog(BuildContext context, PregnancyProvider provider) {
    final l10n = AppLocalizations.of(context)!;
    DateTime lmpDate = DateTime.now();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('New Pregnancy'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('When was the first day of your last menstrual period?'),
            const SizedBox(height: 16),
            ListTile(
              title: Text('LMP Date'),
              subtitle: Text('${lmpDate.day}/${lmpDate.month}/${lmpDate.year}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: lmpDate,
                  firstDate: DateTime.now().subtract(const Duration(days: 365)),
                  lastDate: DateTime.now(),
                );
                if (date != null) {
                  lmpDate = date;
                }
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.cancel),
          ),
          ElevatedButton(
            onPressed: () async {
              final patientId = 'default_patient'; // TODO: Get from auth
              final pregnancy = Pregnancy(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                patientId: patientId,
                lmpDate: lmpDate,
                createdAt: DateTime.now(),
                updatedAt: DateTime.now(),
              );
              await provider.createPregnancy(pregnancy);
              if (context.mounted) Navigator.pop(context);
            },
            child: Text(l10n.save),
          ),
        ],
      ),
    );
  }

  void _showAddChildDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final nameController = TextEditingController();
    final provider = context.read<PregnancyProvider>();
    DateTime dob = DateTime.now();
    ChildGender gender = ChildGender.male;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: Text('Add Child'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: InputDecoration(labelText: l10n.name),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<ChildGender>(
                value: gender,
                decoration: InputDecoration(labelText: l10n.gender),
                items: ChildGender.values.map((g) => DropdownMenuItem(
                  value: g,
                  child: Text(g.name.capitalize()),
                )).toList(),
                onChanged: (v) => setState(() => gender = v!),
              ),
              const SizedBox(height: 16),
              ListTile(
                title: Text(l10n.age),
                subtitle: Text('${dob.day}/${dob.month}/${dob.year}'),
                trailing: const Icon(Icons.calendar_today),
                onTap: () async {
                  final date = await showDatePicker(
                    context: context,
                    initialDate: dob,
                    firstDate: DateTime.now().subtract(const Duration(days: 365 * 18)),
                    lastDate: DateTime.now(),
                  );
                  if (date != null) {
                    setState(() => dob = date);
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: Text(l10n.cancel),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameController.text.isNotEmpty) {
                  final patientId = 'default_patient';
                  final child = Child(
                    id: DateTime.now().millisecondsSinceEpoch.toString(),
                    patientId: patientId,
                    name: nameController.text.trim(),
                    gender: gender,
                    dateOfBirth: dob,
                    createdAt: DateTime.now(),
                    updatedAt: DateTime.now(),
                  );
                  await provider.addChild(child);
                  if (context.mounted) Navigator.pop(context);
                }
              },
              child: Text(l10n.save),
            ),
          ],
        ),
      ),
    );
  }
}

extension StringExtension on String {
  String capitalize() => '${this[0].toUpperCase()}${substring(1)}';
}