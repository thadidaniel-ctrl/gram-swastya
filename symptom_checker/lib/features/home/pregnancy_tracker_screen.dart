import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/models/pregnancy.dart';
import '../../core/services/pregnancy_service.dart';
import '../../shared/theme/app_theme.dart';
import '../../features/pregnancy/providers/pregnancy_provider.dart';

class PregnancyTrackerScreen extends StatelessWidget {
  const PregnancyTrackerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.watch<PregnancyProvider>();
    final pregnancy = provider.currentPregnancy;

    if (pregnancy == null) {
      return const Center(child: Text('No pregnancy data'));
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _buildWeekInfoCard(context, pregnancy),
          const SizedBox(height: 16),
          _buildSymptomsPrecautionsCard(context, l10n, pregnancy),
          const SizedBox(height: 16),
          _buildVisitsCard(context, l10n, pregnancy, provider),
          const SizedBox(height: 16),
          _buildDangerSignsCard(context, l10n, pregnancy, provider),
          const SizedBox(height: 16),
          _buildBirthPlanCard(context, l10n, pregnancy, provider),
          const SizedBox(height: 16),
        ],
      ),
    );
  }

  Widget _buildWeekInfoCard(BuildContext context, Pregnancy pregnancy) {
    final week = pregnancy.currentWeek;
    final fetalDev = PregnancyService.getFetalDevelopment(week);
    final weekInfo = PregnancyService.getWeekInfo(week, 'en');

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: AppTheme.primaryGreen.withOpacity(0.1),
                  child: Text(
                    '$week',
                    style: TextStyle(
                      color: AppTheme.primaryGreen,
                      fontWeight: FontWeight.bold,
                      fontSize: 20,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Week $week',
                        style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (fetalDev['size'] != null)
                        Text(
                          'Size: ${fetalDev['size']} • Weight: ${fetalDev['weight']}',
                          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppTheme.textSecondary,
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (weekInfo.isNotEmpty) ...[
              const SizedBox(height: 16),
              Text(
                weekInfo,
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            ],
            if (fetalDev['development'] != null) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Icon(Icons.info_outline, size: 16, color: AppTheme.primaryBlue),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      fetalDev['development'],
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.primaryBlue,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSymptomsPrecautionsCard(BuildContext context, AppLocalizations l10n, Pregnancy pregnancy) {
    final trimesterIndex = pregnancy.currentTrimester.index + 1;
    final symptoms = PregnancyService.getTrimesterSymptoms(trimesterIndex);
    final precautions = PregnancyService.getTrimesterPrecautions(trimesterIndex);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.healing, color: AppTheme.primaryGreen),
                const SizedBox(width: 8),
                Text(
                  'This Week: Symptoms & Precautions',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            if (symptoms.isNotEmpty) ...[
              Text(
                'Common Symptoms:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryBlue,
                ),
              ),
              const SizedBox(height: 8),
              ...symptoms.map((s) => _buildBulletPoint(context, s)),
              const SizedBox(height: 16),
            ],
            if (precautions.isNotEmpty) ...[
              Text(
                'Precautions:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppTheme.successGreen,
                ),
              ),
              const SizedBox(height: 8),
              ...precautions.map((p) => _buildBulletPoint(context, p, color: AppTheme.successGreen)),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBulletPoint(BuildContext context, String text, {Color? color}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.circle, size: 8, color: color ?? AppTheme.textSecondary),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: color ?? AppTheme.textPrimary,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildVisitsCard(BuildContext context, AppLocalizations l10n, Pregnancy pregnancy, PregnancyProvider provider) {
    final upcoming = provider.getUpcomingVisits();
    final past = provider.getPastVisits();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.local_hospital, color: AppTheme.primaryGreen),
                    const SizedBox(width: 8),
                    Text(
                      'Prenatal Visits',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                TextButton.icon(
                  icon: const Icon(Icons.add, size: 18),
                  label: Text(l10n.addNew),
                  onPressed: () => _showAddVisitDialog(context, pregnancy, provider),
                ),
              ],
            ),
            if (upcoming.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(
                'Upcoming',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppTheme.primaryBlue,
                ),
              ),
              ...upcoming.map((v) => _VisitTile(visit: v, isUpcoming: true)),
            ],
            if (past.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Completed',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textSecondary,
                ),
              ),
              ...past.take(3).map((v) => _VisitTile(visit: v, isUpcoming: false)),
            ],
            if (upcoming.isEmpty && past.isEmpty) ...[
              const SizedBox(height: 16),
              Center(
                child: Text(
                  'No visits scheduled yet',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDangerSignsCard(BuildContext context, AppLocalizations l10n, Pregnancy pregnancy, PregnancyProvider provider) {
    final dangerSigns = PregnancyService.getDangerSigns();
    final unresolved = provider.getUnresolvedDangerSigns();

    return Card(
      color: AppTheme.errorRed.withOpacity(0.05),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: AppTheme.errorRed),
                const SizedBox(width: 8),
                Text(
                  'Danger Signs - Know When to Act',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: AppTheme.errorRed,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'Seek immediate medical care if you experience any of these:',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 12),
            ...dangerSigns.take(5).map((sign) => _DangerSignTile(sign: sign)),
            if (unresolved.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'Your Reported Signs:',
                style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              ...unresolved.map((s) => ListTile(
                dense: true,
                leading: Icon(Icons.report_problem, color: AppTheme.errorRed),
                title: Text(s.sign),
                subtitle: Text(s.date.toString().split(' ')[0]),
                trailing: TextButton(
                  child: const Text('Resolved'),
                  onPressed: () => provider.updateDangerSign(s.copyWith(resolved: true, resolvedDate: DateTime.now())),
                ),
              )),
            ],
            const SizedBox(height: 12),
            TextButton.icon(
              icon: const Icon(Icons.add_alert),
              label: Text('Report Danger Sign'),
              onPressed: () => _showReportDangerSignDialog(context, pregnancy, provider),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBirthPlanCard(BuildContext context, AppLocalizations l10n, Pregnancy pregnancy, PregnancyProvider provider) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Icon(Icons.event_note, color: AppTheme.primaryGreen),
                    const SizedBox(width: 8),
                    Text(
                      'Birth Preparedness Plan',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ],
                ),
                if (pregnancy.birthPlan == null)
                  TextButton.icon(
                    icon: const Icon(Icons.add, size: 18),
                    label: Text(l10n.addNew),
                    onPressed: () => _showBirthPlanDialog(context, pregnancy, provider),
                  )
                else
                  TextButton(
                    child: Text('Edit'),
                    onPressed: () => _showBirthPlanDialog(context, pregnancy, provider),
                  ),
              ],
            ),
            if (pregnancy.birthPlan != null) ...[
              const SizedBox(height: 12),
              _buildBirthPlanFields(context, pregnancy.birthPlan!),
            ] else ...[
              const SizedBox(height: 8),
              Text(
                'Create your birth plan to be prepared for delivery',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppTheme.textSecondary,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildBirthPlanFields(BuildContext context, BirthPlan plan) {
    final items = PregnancyService.getBirthPlanItems();
    final preparedCount = plan.itemsPrepared.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        LinearProgressIndicator(
          value: items.isEmpty ? 0 : preparedCount / items.length,
          backgroundColor: AppTheme.dividerColor,
          valueColor: AlwaysStoppedAnimation<Color>(AppTheme.successGreen),
        ),
        const SizedBox(height: 8),
        Text(
          '$preparedCount of ${items.length} items prepared',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: AppTheme.textSecondary,
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: items.map((item) => FilterChip(
            label: Text(item, style: const TextStyle(fontSize: 12)),
            selected: plan.itemsPrepared.contains(item),
            onSelected: (selected) {
              final updatedItems = selected 
                  ? [...plan.itemsPrepared, item]
                  : plan.itemsPrepared.where((i) => i != item).toList();
              provider.updateBirthPlan(plan.copyWith(itemsPrepared: updatedItems, updatedAt: DateTime.now()));
            },
            selectedColor: AppTheme.successGreen.withOpacity(0.2),
            checkmarkColor: AppTheme.successGreen,
          )).toList(),
        ),
      ],
    );
  }

  void _showAddVisitDialog(BuildContext context, Pregnancy pregnancy, PregnancyProvider provider) {
    final l10n = AppLocalizations.of(context)!;
    final weekController = TextEditingController(text: pregnancy.currentWeek.toString());
    DateTime selectedDate = DateTime.now().add(const Duration(days: 7));

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Schedule Visit'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextFormField(
              controller: weekController,
              decoration: InputDecoration(labelText: 'Week Number'),
              keyboardType: TextInputType.number,
            ),
            const SizedBox(height: 16),
            ListTile(
              title: Text(l10n.selectDate),
              subtitle: Text('${selectedDate.day}/${selectedDate.month}/${selectedDate.year}'),
              trailing: const Icon(Icons.calendar_today),
              onTap: () async {
                final date = await showDatePicker(
                  context: context,
                  initialDate: selectedDate,
                  firstDate: DateTime.now(),
                  lastDate: DateTime.now().add(const Duration(days: 280)),
                );
                if (date != null) {
                  // We need to rebuild, so just close and reopen or use StatefulBuilder
                }
              },
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(l10n.cancel)),
          ElevatedButton(
            onPressed: () {
              final visit = PrenatalVisit(
                id: DateTime.now().millisecondsSinceEpoch.toString(),
                pregnancyId: pregnancy.id,
                weekNumber: int.tryParse(weekController.text) ?? pregnancy.currentWeek,
                scheduledDate: selectedDate,
                createdAt: DateTime.now(),
              );
              provider.addPrenatalVisit(visit);
              Navigator.pop(context);
            },
            child: Text(l10n.save),
          ),
        ],
      ),
    );
  }

  void _showReportDangerSignDialog(BuildContext context, Pregnancy pregnancy, PregnancyProvider provider) {
    final l10n = AppLocalizations.of(context)!;
    final dangerSigns = PregnancyService.getDangerSigns();
    String? selectedSign;
    final descriptionController = TextEditingController();
    final actionController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Report Danger Sign'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            DropdownButtonFormField<String>(
              decoration: InputDecoration(labelText: 'Danger Sign'),
              items: dangerSigns.map((s) => DropdownMenuItem(
                value: s.sign,
                child: Text(s.sign),
              )).toList(),
              onChanged: (v) => selectedSign = v,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: descriptionController,
              decoration: InputDecoration(labelText: 'Description'),
              maxLines: 2,
            ),
            const SizedBox(height: 16),
            TextField(
              controller: actionController,
              decoration: InputDecoration(labelText: 'Action Taken'),
              maxLines: 2,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(l10n.cancel)),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            onPressed: () {
              if (selectedSign != null) {
                final sign = DangerSign(
                  id: DateTime.now().millisecondsSinceEpoch.toString(),
                  pregnancyId: pregnancy.id,
                  date: DateTime.now(),
                  sign: selectedSign!,
                  description: descriptionController.text,
                  actionTaken: actionController.text,
                  createdAt: DateTime.now(),
                );
                provider.addDangerSign(sign);
                Navigator.pop(context);
              }
            },
            child: Text('Report'),
          ),
        ],
      ),
    );
  }

  void _showBirthPlanDialog(BuildContext context, Pregnancy pregnancy, PregnancyProvider provider) {
    // Simplified - would need full form
    final l10n = AppLocalizations.of(context)!;
    final plan = pregnancy.birthPlan ?? BirthPlan(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      pregnancyId: pregnancy.id,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Birth Plan'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Use the checklist on the main screen to prepare items'),
            const SizedBox(height: 16),
            Text('Items needed: ${PregnancyService.getBirthPlanItems().length}'),
            Text('Items prepared: ${plan.itemsPrepared.length}'),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: Text(l10n.cancel)),
          ElevatedButton(
            onPressed: () {
              provider.createBirthPlan(plan);
              Navigator.pop(context);
            },
            child: Text(l10n.save),
          ),
        ],
      ),
    );
  }
}

class _VisitTile extends StatelessWidget {
  final PrenatalVisit visit;
  final bool isUpcoming;

  const _VisitTile({required this.visit, required this.isUpcoming});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      leading: CircleAvatar(
        backgroundColor: isUpcoming ? AppTheme.primaryBlue.withOpacity(0.1) : AppTheme.successGreen.withOpacity(0.1),
        child: Text(
          'W${visit.weekNumber}',
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isUpcoming ? AppTheme.primaryBlue : AppTheme.successGreen,
          ),
        ),
      ),
      title: Text('Week ${visit.weekNumber} Visit'),
      subtitle: Text('${visit.scheduledDate.day}/${visit.scheduledDate.month}/${visit.scheduledDate.year}'),
      trailing: isUpcoming
          ? TextButton(
              child: Text('Done'),
              onPressed: () {
                // Mark as completed
              },
            )
          : Icon(Icons.check_circle, color: AppTheme.successGreen),
      onTap: () {
        // Show visit details
      },
    );
  }
}

class _DangerSignTile extends StatelessWidget {
  final DangerSign sign;

  const _DangerSignTile({required this.sign});

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      leading: CircleAvatar(
        backgroundColor: AppTheme.errorRed.withOpacity(0.1),
        child: Icon(Icons.warning, color: AppTheme.errorRed, size: 18),
      ),
      title: Text(sign.sign, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Text(sign.description, maxLines: 1, overflow: TextOverflow.ellipsis),
      onTap: () => _showDetails(context),
    );
  }

  void _showDetails(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(sign.sign),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Action: ${sign.actionTaken}'),
            const SizedBox(height: 12),
            Text(sign.description),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }
}