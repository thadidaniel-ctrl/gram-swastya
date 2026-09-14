import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/models/medicine_reminder.dart';
import '../../shared/theme/app_theme.dart';
import '../providers/medicine_provider.dart';
import 'add_medicine_screen.dart';
import 'dose_log_screen.dart';

class MedicineDetailScreen extends StatelessWidget {
  final Medicine medicine;

  const MedicineDetailScreen({super.key, required this.medicine});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.watch<MedicineProvider>();
    final stats = provider.getAdherenceStats(medicine.id);
    final todaysDoses = provider.getTodaysDoses(medicine.id);
    final interactions = provider.interactions
        .where((i) => i.medicineId1 == medicine.id || i.medicineId2 == medicine.id)
        .toList();
    final substitutions = provider.getSubstitutionsForMedicine(medicine.genericName);

    return Scaffold(
      appBar: AppBar(
        title: Text(medicine.name),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => AddMedicineScreen(medicineToEdit: medicine)),
            ),
          ),
          PopupMenuButton(
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'log',
                child: Row(
                  children: [
                    const Icon(Icons.medication),
                    const SizedBox(width: 8),
                    Text(l10n.addNew),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'substitute',
                child: Row(
                  children: [
                    const Icon(Icons.swap_horiz),
                    const SizedBox(width: 8),
                    Text('Substitutes'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, color: AppTheme.errorRed),
                    const SizedBox(width: 8),
                    Text('Delete', style: TextStyle(color: AppTheme.errorRed)),
                  ],
                ),
              ),
            ],
            onSelected: (value) => _handleAction(context, value, provider, substitutions),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeaderCard(context, medicine),
            const SizedBox(height: 16),
            _buildAdherenceCard(context, stats),
            const SizedBox(height: 16),
            if (interactions.isNotEmpty) ...[
              _buildInteractionsCard(context, interactions),
              const SizedBox(height: 16),
            ],
            if (substitutions.isNotEmpty) ...[
              _buildSubstitutionsCard(context, substitutions),
              const SizedBox(height: 16),
            ],
            _buildTodaysDosesCard(context, l10n, todaysDoses, provider),
            const SizedBox(height: 16),
            _buildInfoCard(context, medicine),
          ],
        ),
      ),
    );
  }

  void _handleAction(BuildContext context, String action, MedicineProvider provider, List<MedicineSubstitution> substitutions) {
    switch (action) {
      case 'log':
        Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => DoseLogScreen(medicine: medicine)),
        );
        break;
      case 'substitute':
        _showSubstitutionsDialog(context, substitutions);
        break;
      case 'delete':
        _confirmDelete(context, provider);
        break;
    }
  }

  void _showSubstitutionsDialog(BuildContext context, List<MedicineSubstitution> substitutions) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Available Substitutes'),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: substitutions.length,
            separatorBuilder: (_, __) => const Divider(),
            itemBuilder: (context, index) {
              final sub = substitutions[index];
              return ListTile(
                title: Text(sub.substituteName),
                subtitle: Text('${sub.substituteGeneric} ${sub.substituteStrength}'),
                trailing: Text(
                  sub.priceDifference >= 0 
                      ? '+₹${sub.priceDifference.toInt()}' 
                      : '₹${sub.priceDifference.toInt()}',
                  style: TextStyle(
                    color: sub.priceDifference >= 0 ? AppTheme.errorRed : AppTheme.successGreen,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Substitute: ${sub.substituteName}')),
                  );
                },
              );
            },
          ),
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

  void _confirmDelete(BuildContext context, MedicineProvider provider) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Medicine'),
        content: Text('Are you sure you want to delete ${medicine.name}? All dose logs will be removed.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.errorRed),
            onPressed: () async {
              await provider.deleteMedicine(medicine.id);
              if (context.mounted) {
                Navigator.pop(context); // Close dialog
                Navigator.pop(context); // Go back to list
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Widget _buildHeaderCard(BuildContext context, Medicine medicine) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            Container(
              width: 72,
              height: 72,
              decoration: BoxDecoration(
                color: _getFormColor(medicine.form).withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(
                _getFormIcon(medicine.form),
                color: _getFormColor(medicine.form),
                size: 36,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    medicine.name,
                    style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${medicine.genericName} • ${medicine.strength}',
                    style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Chip(
                        label: Text(medicine.formLabel.capitalize()),
                        backgroundColor: _getFormColor(medicine.form).withOpacity(0.1),
                        labelStyle: TextStyle(color: _getFormColor(medicine.form)),
                      ),
                      const SizedBox(width: 8),
                      Chip(
                        label: Text(medicine.getFrequencyLabel('en')),
                        backgroundColor: AppTheme.primaryGreen.withOpacity(0.1),
                        labelStyle: const TextStyle(color: AppTheme.primaryGreen),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Column(
              children: [
                if (medicine.isOutOfStock)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.errorRed,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'OUT OF STOCK',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  )
                else if (medicine.isLowStock)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.warningOrange,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text(
                      'LOW STOCK',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: AppTheme.successGreen,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '${medicine.remainingQuantity}/${medicine.totalQuantity}',
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAdherenceCard(BuildContext context, Map<String, int> stats) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '30-Day Adherence',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildStatItem(
                    context,
                    'Taken',
                    '${stats['taken']}',
                    AppTheme.successGreen,
                    Icons.check_circle,
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    context,
                    'Missed',
                    '${stats['missed']}',
                    AppTheme.errorRed,
                    Icons.cancel,
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    context,
                    'Skipped',
                    '${stats['skipped']}',
                    AppTheme.warningOrange,
                    Icons.skip_next,
                  ),
                ),
                Expanded(
                  child: _buildStatItem(
                    context,
                    'Rate',
                    '${stats['rate']}%',
                    stats['rate']! >= 80 ? AppTheme.successGreen : AppTheme.warningOrange,
                    Icons.percent,
                  ),
                ),
              ],
            ),
            if (stats['total']! > 0) ...[
              const SizedBox(height: 16),
              LinearProgressIndicator(
                value: stats['rate']! / 100,
                backgroundColor: AppTheme.dividerColor,
                valueColor: AlwaysStoppedAnimation<Color>(
                  stats['rate']! >= 80 ? AppTheme.successGreen : AppTheme.warningOrange,
                ),
                minHeight: 8,
                borderRadius: BorderRadius.circular(4),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildStatItem(BuildContext context, String label, String value, Color color, IconData icon) {
    return Column(
      children: [
        Icon(icon, color: color, size: 28),
        const SizedBox(height: 8),
        Text(
          value,
          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
        Text(
          label,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: AppTheme.textSecondary,
          ),
        ),
      ],
    );
  }

  Widget _buildInteractionsCard(BuildContext context, List<DrugInteraction> interactions) {
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
                  'Drug Interactions (${interactions.length})',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.errorRed,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...interactions.map((i) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: i.severityColor.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          i.getSeverityLabel('en'),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: i.severityColor,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          i.medicineId1 == medicine.id 
                              ? i.medicineName2 
                              : i.medicineName1,
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(i.description, style: Theme.of(context).textTheme.bodySmall),
                  Text(
                    'Action: ${i.management}',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppTheme.primaryGreen,
                      fontWeight: FontWeight.w500,
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

  Widget _buildSubstitutionsCard(BuildContext context, List<MedicineSubstitution> substitutions) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Available Substitutes',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            ...substitutions.map((sub) => ListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(sub.substituteName),
              subtitle: Text('${sub.substituteGeneric} ${sub.substituteStrength}'),
              trailing: Text(
                sub.priceDifference >= 0 
                    ? '+₹${sub.priceDifference.toInt()}' 
                    : '₹${sub.priceDifference.toInt()}',
                style: TextStyle(
                  color: sub.priceDifference >= 0 ? AppTheme.errorRed : AppTheme.successGreen,
                  fontWeight: FontWeight.bold,
                ),
              ),
              onTap: () {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Substitute: ${sub.substituteName}')),
                );
              },
            )),
          ],
        ),
      ),
    );
  }

  Widget _buildTodaysDosesCard(BuildContext context, AppLocalizations l10n, List<DoseLog> doses, MedicineProvider provider) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Today\'s Doses',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
                TextButton.icon(
                  icon: const Icon(Icons.add, size: 18),
                  label: Text(l10n.addNew),
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => DoseLogScreen(medicine: medicine)),
                  ),
                ),
              ],
            ),
            if (doses.isEmpty)
              Center(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Text(
                    'No doses scheduled for today',
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppTheme.textSecondary,
                    ),
                  ),
                ),
              )
            else
              ...doses.map((dose) => _DoseLogTile(
                dose: dose,
                medicine: medicine,
                onTap: () => _showDoseActionSheet(context, dose, provider),
              )),
          ],
        ),
      ),
    );
  }

  void _showDoseActionSheet(BuildContext context, DoseLog dose, MedicineProvider provider) {
    showModalBottomSheet(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: Icon(Icons.check_circle, color: AppTheme.successGreen),
              title: const Text('Mark as Taken'),
              onTap: () async {
                await provider.markDoseTaken(dose.medicineId, dose.scheduledTime);
                if (context.mounted) Navigator.pop(context);
              },
            ),
            ListTile(
              leading: Icon(Icons.skip_next, color: AppTheme.warningOrange),
              title: const Text('Skip Dose'),
              onTap: () async {
                await provider.markDoseSkipped(dose.medicineId, dose.scheduledTime);
                if (context.mounted) Navigator.pop(context);
              },
            ),
            ListTile(
              leading: Icon(Icons.snooze, color: AppTheme.primaryBlue),
              title: const Text('Snooze 30 min'),
              onTap: () async {
                await provider.snoozeDose(dose.medicineId, dose.scheduledTime, const Duration(minutes: 30));
                if (context.mounted) Navigator.pop(context);
              },
            ),
            ListTile(
              leading: Icon(Icons.cancel, color: AppTheme.errorRed),
              title: const Text('Mark Missed'),
              onTap: () async {
                await provider.markDoseMissed(dose.medicineId, dose.scheduledTime);
                if (context.mounted) Navigator.pop(context);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoCard(BuildContext context, Medicine medicine) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Details',
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 16),
            _buildInfoRow('Instructions', medicine.instructions.isEmpty ? 'None' : medicine.instructions),
            _buildInfoRow('Prescribed By', medicine.prescribedBy.isEmpty ? 'Unknown' : medicine.prescribedBy),
            _buildInfoRow('Start Date', DateFormat('MMM dd, yyyy').format(medicine.startDate)),
            if (medicine.endDate != null)
              _buildInfoRow('End Date', DateFormat('MMM dd, yyyy').format(medicine.endDate!)),
            _buildInfoRow('Low Stock Alert', 'When ≤ ${medicine.lowStockThreshold} remaining'),
            _buildInfoRow('Reminders', medicine.enableReminders ? 'Enabled' : 'Disabled'),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 120,
            child: Text(
              label,
              style: TextStyle(
                color: AppTheme.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Color _getFormColor(String form) {
    switch (form.toLowerCase()) {
      case 'tablet': return Colors.blue;
      case 'capsule': return Colors.purple;
      case 'syrup': return Colors.orange;
      case 'injection': return Colors.red;
      case 'cream': return Colors.pink;
      case 'drops': return Colors.cyan;
      case 'inhaler': return Colors.green;
      case 'patch': return Colors.teal;
      default: return AppTheme.primaryGreen;
    }
  }

  IconData _getFormIcon(String form) {
    switch (form.toLowerCase()) {
      case 'tablet': return Icons.medication;
      case 'capsule': return Icons.medication_outlined;
      case 'syrup': return Icons.local_drink;
      case 'injection': return Icons.vaccines;
      case 'cream': return Icons.face;
      case 'drops': return Icons.water_drop;
      case 'inhaler': return Icons.air;
      case 'patch': return Icons.healing;
      default: return Icons.medication;
    }
  }
}

class _DoseLogTile extends StatelessWidget {
  final DoseLog dose;
  final Medicine medicine;
  final VoidCallback onTap;

  const _DoseLogTile({
    required this.dose,
    required this.medicine,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    Color statusColor;
    IconData statusIcon;
    
    switch (dose.status) {
      case DoseStatus.taken:
        statusColor = AppTheme.successGreen;
        statusIcon = Icons.check_circle;
        break;
      case DoseStatus.missed:
        statusColor = AppTheme.errorRed;
        statusIcon = Icons.cancel;
        break;
      case DoseStatus.skipped:
        statusColor = AppTheme.warningOrange;
        statusIcon = Icons.skip_next;
        break;
      case DoseStatus.snoozed:
        statusColor = AppTheme.primaryBlue;
        statusIcon = Icons.snooze;
        break;
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(statusIcon, color: statusColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    dose.formattedTime,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Text(
                    dose.status.name.capitalize(),
                    style: TextStyle(
                      fontSize: 12,
                      color: statusColor,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            if (dose.takenTime != null)
              Text(
                'Taken: ${DateFormat('HH:mm').format(dose.takenTime!)}',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppTheme.textSecondary,
                ),
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