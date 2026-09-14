import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/models/medicine_reminder.dart';
import '../../shared/theme/app_theme.dart';
import '../providers/medicine_provider.dart';
import 'add_medicine_screen.dart';
import 'medicine_detail_screen.dart';

class MedicineListScreen extends StatelessWidget {
  const MedicineListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.watch<MedicineProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text(l10n.medicines),
        actions: [
          if (provider.hasInteractions)
            Stack(
              children: [
                IconButton(
                  icon: Icon(Icons.warning_amber_rounded, color: AppTheme.errorRed),
                  onPressed: () => _showInteractionsDialog(context),
                ),
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: BoxDecoration(
                      color: AppTheme.errorRed,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
                    child: Text(
                      '${provider.criticalInteractions.length}',
                      style: const TextStyle(color: Colors.white, fontSize: 10),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ],
            ),
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AddMedicineScreen()),
            ),
          ),
        ],
      ),
      body: provider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : _buildBody(context, l10n, provider),
    );
  }

  Widget _buildBody(BuildContext context, AppLocalizations l10n, MedicineProvider provider) {
    if (provider.medicines.isEmpty) {
      return _buildEmptyState(context, l10n);
    }

    return Column(
      children: [
        if (provider.getLowStockMedicines().isNotEmpty)
          _buildLowStockBanner(context, l10n, provider),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: provider.medicines.length,
            itemBuilder: (context, index) {
              final medicine = provider.medicines[index];
              return _MedicineCard(medicine: medicine);
            },
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(BuildContext context, AppLocalizations l10n) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.medication_outlined, size: 80, color: AppTheme.textSecondary.withOpacity(0.5)),
          const SizedBox(height: 16),
          Text(
            'No Medicines Added',
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Tap + to add your first medicine',
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
              color: AppTheme.textSecondary,
            ),
          ),
          const SizedBox(height: 24),
          ElevatedButton.icon(
            icon: const Icon(Icons.add),
            label: Text(l10n.addNew),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const AddMedicineScreen()),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLowStockBanner(BuildContext context, AppLocalizations l10n, MedicineProvider provider) {
    final lowStock = provider.getLowStockMedicines();
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.warningOrange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppTheme.warningOrange.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          Icon(Icons.inventory_2_outlined, color: AppTheme.warningOrange, size: 28),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Low Stock Alert',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    color: AppTheme.warningOrange,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                Text(
                  '${lowStock.length} medicine${lowStock.length > 1 ? 's' : ''} need${lowStock.length > 1 ? '' : 's'} refill',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppTheme.textSecondary,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () {},
            child: Text('View', style: TextStyle(color: AppTheme.warningOrange)),
          ),
        ],
      ),
    );
  }

  void _showInteractionsDialog(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.read<MedicineProvider>();
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.warning_amber_rounded, color: AppTheme.errorRed),
            const SizedBox(width: 8),
            Text('Drug Interactions'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: ListView.separated(
            shrinkWrap: true,
            itemCount: provider.interactions.length,
            separatorBuilder: (_, __) => const Divider(),
            itemBuilder: (context, index) {
              final interaction = provider.interactions[index];
              return _InteractionTile(interaction: interaction);
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(l10n.done),
          ),
        ],
      ),
    );
  }
}

class _MedicineCard extends StatelessWidget {
  final Medicine medicine;

  const _MedicineCard({required this.medicine});

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isLowStock = medicine.isLowStock;
    final isOutOfStock = medicine.isOutOfStock;
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => MedicineDetailScreen(medicine: medicine)),
        ),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: _getFormColor(medicine.form).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getFormIcon(medicine.form),
                  color: _getFormColor(medicine.form),
                  size: 28,
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            medicine.name,
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        if (isOutOfStock)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.errorRed.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'OUT OF STOCK',
                              style: TextStyle(
                                fontSize: 10,
                                color: AppTheme.errorRed,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          )
                        else if (isLowStock)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.warningOrange.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              'LOW STOCK',
                              style: TextStyle(
                                fontSize: 10,
                                color: AppTheme.warningOrange,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${medicine.strength} • ${medicine.formLabel}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppTheme.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(Icons.schedule, size: 14, color: AppTheme.textSecondary),
                        const SizedBox(width: 4),
                        Text(
                          medicine.getFrequencyLabel('en'),
                          style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppTheme.textSecondary,
                          ),
                        ),
                        const SizedBox(width: 12),
                        if (medicine.remainingQuantity > 0) ...[
                          Icon(Icons.medication, size: 14, color: AppTheme.textSecondary),
                          const SizedBox(width: 4),
                          Text(
                            '${medicine.remainingQuantity}/${medicine.totalQuantity} left',
                            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                              color: isLowStock || isOutOfStock ? AppTheme.errorRed : AppTheme.textSecondary,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
              Column(
                children: medicine.doseTimes.where((dt) => dt.isEnabled).map((doseTime) {
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 4),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppTheme.primaryGreen.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Text(
                        doseTime.formattedTime,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: AppTheme.primaryGreen,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
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

class _InteractionTile extends StatelessWidget {
  final DrugInteraction interaction;

  const _InteractionTile({required this.interaction});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: interaction.severityColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                interaction.getSeverityLabel('en'),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: interaction.severityColor,
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                '${interaction.medicineName1} + ${interaction.medicineName2}',
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Text(
          interaction.description,
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: AppTheme.textPrimary,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Action: ${interaction.management}',
          style: Theme.of(context).textTheme.bodySmall?.copyWith(
            color: AppTheme.primaryGreen,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}