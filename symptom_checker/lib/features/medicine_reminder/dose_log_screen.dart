import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/models/medicine_reminder.dart';
import '../../shared/theme/app_theme.dart';
import '../providers/medicine_provider.dart';

class DoseLogScreen extends StatefulWidget {
  final Medicine medicine;

  const DoseLogScreen({super.key, required this.medicine});

  @override
  State<DoseLogScreen> createState() => _DoseLogScreenState();
}

class _DoseLogScreenState extends State<DoseLogScreen> {
  DateTime _selectedDate = DateTime.now();
  final List<DoseLog> _tempDoses = [];

  @override
  void initState() {
    super.initState();
    _generateDosesForDate(_selectedDate);
  }

  void _generateDosesForDate(DateTime date) {
    _tempDoses.clear();
    if (widget.medicine.frequencyType == FrequencyType.asNeeded) return;

    final enabledDoses = widget.medicine.doseTimes.where((dt) => dt.isEnabled).toList();
    
    for (final doseTime in enabledDoses) {
      final scheduledTime = DateTime(
        date.year,
        date.month,
        date.day,
        doseTime.time.hour,
        doseTime.time.minute,
      );
      
      _tempDoses.add(DoseLog(
        id: 'temp_${widget.medicine.id}_${scheduledTime.millisecondsSinceEpoch}',
        medicineId: widget.medicine.id,
        patientId: '',
        scheduledTime: scheduledTime,
        status: DoseStatus.missed,
      ));
    }
    
    _tempDoses.sort((a, b) => a.scheduledTime.compareTo(b.scheduledTime));
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final provider = context.read<MedicineProvider>();

    return Scaffold(
      appBar: AppBar(
        title: Text('Log Dose - ${widget.medicine.name}'),
      ),
      body: Column(
        children: [
          _buildDateSelector(context, l10n),
          const Divider(height: 1),
          Expanded(
            child: _tempDoses.isEmpty
                ? _buildAsNeededView(context, l10n, provider)
                : _buildScheduledDosesView(context, l10n, provider),
          ),
          _buildBottomActions(context, l10n, provider),
        ],
      ),
    );
  }

  Widget _buildDateSelector(BuildContext context, AppLocalizations l10n) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Icon(Icons.calendar_today, color: AppTheme.primaryGreen),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              DateFormat('EEEE, MMM dd, yyyy').format(_selectedDate),
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.chevron_left),
            onPressed: () {
              setState(() {
                _selectedDate = _selectedDate.subtract(const Duration(days: 1));
                _generateDosesForDate(_selectedDate);
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.today),
            onPressed: () {
              setState(() {
                _selectedDate = DateTime.now();
                _generateDosesForDate(_selectedDate);
              });
            },
          ),
          IconButton(
            icon: const Icon(Icons.chevron_right),
            onPressed: () {
              setState(() {
                _selectedDate = _selectedDate.add(const Duration(days: 1));
                _generateDosesForDate(_selectedDate);
              });
            },
          ),
        ],
      ),
    );
  }

  Widget _buildAsNeededView(BuildContext context, AppLocalizations l10n, MedicineProvider provider) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.medication_outlined, size: 80, color: AppTheme.primaryGreen.withOpacity(0.3)),
            const SizedBox(height: 24),
            Text(
              'As-Needed Medicine',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 12),
            Text(
              'This medicine is taken only when needed (SOS). Tap below to log a dose.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: AppTheme.textSecondary,
              ),
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              icon: const Icon(Icons.add),
              label: Text('Log Dose Taken Now'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
              ),
              onPressed: () async {
                final now = DateTime.now();
                await provider.markDoseTaken(
                  widget.medicine.id,
                  now,
                );
                if (context.mounted) {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Dose logged')),
                  );
                }
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduledDosesView(BuildContext context, AppLocalizations l10n, MedicineProvider provider) {
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _tempDoses.length,
      itemBuilder: (context, index) {
        final dose = _tempDoses[index];
        final existingLog = provider.doseLogs.firstWhere(
          (log) => log.medicineId == widget.medicine.id &&
              log.scheduledTime.year == dose.scheduledTime.year &&
              log.scheduledTime.month == dose.scheduledTime.month &&
              log.scheduledTime.day == dose.scheduledTime.day &&
              log.scheduledTime.hour == dose.scheduledTime.hour &&
              log.scheduledTime.minute == dose.scheduledTime.minute,
          orElse: () => DoseLog(
            id: '',
            medicineId: '',
            patientId: '',
            scheduledTime: DateTime.now(),
          ),
        );
        
        final isLogged = existingLog.id.isNotEmpty;
        final status = isLogged ? existingLog.status : DoseStatus.missed;
        final isPast = dose.scheduledTime.isBefore(DateTime.now());

        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: _buildStatusIndicator(status, isPast),
            title: Text(
              dose.formattedTime,
              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                fontWeight: FontWeight.w600,
                color: isPast ? null : AppTheme.textSecondary,
              ),
            ),
            subtitle: isLogged
                ? Text(
                    dose.status.name.capitalize() +
                    (dose.takenTime != null ? ' at ${DateFormat('HH:mm').format(dose.takenTime!)}' : ''),
                    style: TextStyle(
                      color: _getStatusColor(dose.status),
                      fontWeight: FontWeight.w500,
                    ),
                  )
                : Text(
                    isPast ? 'Missed (tap to log)' : 'Upcoming',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppTheme.textSecondary,
                    ),
                  ),
            trailing: isPast && !isLogged
                ? ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.successGreen,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    ),
                    onPressed: () => _logDose(provider, dose),
                    child: const Text('Taken'),
                  )
                : null,
            onTap: isPast && !isLogged ? () => _logDose(provider, dose) : null,
          ),
        );
      },
    );
  }

  Widget _buildStatusIndicator(DoseStatus status, bool isPast) {
    Color color;
    IconData icon;
    
    if (!isPast) {
      color = AppTheme.primaryBlue;
      icon = Icons.schedule;
    } else {
      switch (status) {
        case DoseStatus.taken:
          color = AppTheme.successGreen;
          icon = Icons.check_circle;
          break;
        case DoseStatus.missed:
          color = AppTheme.errorRed;
          icon = Icons.cancel;
          break;
        case DoseStatus.skipped:
          color = AppTheme.warningOrange;
          icon = Icons.skip_next;
          break;
        case DoseStatus.snoozed:
          color = AppTheme.primaryBlue;
          icon = Icons.snooze;
          break;
      }
    }

    return Container(
      width: 44,
      height: 44,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Icon(icon, color: color, size: 24),
    );
  }

  Color _getStatusColor(DoseStatus status) {
    switch (status) {
      case DoseStatus.taken: return AppTheme.successGreen;
      case DoseStatus.missed: return AppTheme.errorRed;
      case DoseStatus.skipped: return AppTheme.warningOrange;
      case DoseStatus.snoozed: return AppTheme.primaryBlue;
    }
  }

  Future<void> _logDose(MedicineProvider provider, DoseLog dose) async {
    await provider.markDoseTaken(widget.medicine.id, dose.scheduledTime);
    if (mounted) {
      setState(() {
        _generateDosesForDate(_selectedDate);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Dose logged as taken')),
      );
    }
  }

  Widget _buildBottomActions(BuildContext context, AppLocalizations l10n, MedicineProvider provider) {
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
        child: Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                icon: const Icon(Icons.skip_next),
                label: const Text('Skip All'),
                onPressed: _tempDoses.isEmpty ? null : () async {
                  for (final dose in _tempDoses) {
                    if (dose.scheduledTime.isBefore(DateTime.now())) {
                      await provider.markDoseSkipped(widget.medicine.id, dose.scheduledTime);
                    }
                  }
                  if (mounted) {
                    setState(() => _generateDosesForDate(_selectedDate));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Doses skipped')),
                    );
                  }
                },
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: ElevatedButton.icon(
                icon: const Icon(Icons.check_circle),
                label: const Text('Mark All Taken'),
                onPressed: _tempDoses.isEmpty ? null : () async {
                  for (final dose in _tempDoses) {
                    if (dose.scheduledTime.isBefore(DateTime.now())) {
                      await provider.markDoseTaken(widget.medicine.id, dose.scheduledTime);
                    }
                  }
                  if (mounted) {
                    setState(() => _generateDosesForDate(_selectedDate));
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('All doses marked as taken')),
                    );
                  }
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}