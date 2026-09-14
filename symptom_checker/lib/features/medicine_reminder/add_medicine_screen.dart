import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../core/localization/app_localizations.dart';
import '../../core/models/medicine_reminder.dart';
import '../../shared/theme/app_theme.dart';
import '../providers/medicine_provider.dart';

class AddMedicineScreen extends StatefulWidget {
  final Medicine? medicineToEdit;

  const AddMedicineScreen({super.key, this.medicineToEdit});

  @override
  State<AddMedicineScreen> createState() => _AddMedicineScreenState();
}

class _AddMedicineScreenState extends State<AddMedicineScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _genericController = TextEditingController();
  final _strengthController = TextEditingController();
  final _instructionsController = TextEditingController();
  final _prescribedByController = TextEditingController();
  final _totalQuantityController = TextEditingController();
  final _remainingQuantityController = TextEditingController();
  final _lowStockController = TextEditingController(text: '5');

  String _selectedForm = 'tablet';
  FrequencyType _selectedFrequency = FrequencyType.daily;
  int _intervalDays = 1;
  DateTime _startDate = DateTime.now();
  DateTime? _endDate;
  List<DoseTime> _doseTimes = [];
  bool _enableReminders = true;
  bool _enableSmsReminders = false;
  bool _isLoading = false;

  final List<String> _forms = [
    'tablet', 'capsule', 'syrup', 'injection', 'cream', 'drops', 'inhaler', 'patch'
  ];

  @override
  void initState() {
    super.initState();
    if (widget.medicineToEdit != null) {
      _loadMedicineData(widget.medicineToEdit!);
    } else {
      _doseTimes = [
        DoseTime(id: 'dose_1', time: const TimeOfDay(hour: 8, minute: 0)),
      ];
    }
  }

  void _loadMedicineData(Medicine medicine) {
    _nameController.text = medicine.name;
    _genericController.text = medicine.genericName;
    _strengthController.text = medicine.strength;
    _instructionsController.text = medicine.instructions;
    _prescribedByController.text = medicine.prescribedBy;
    _totalQuantityController.text = medicine.totalQuantity.toString();
    _remainingQuantityController.text = medicine.remainingQuantity.toString();
    _lowStockController.text = medicine.lowStockThreshold.toString();
    _selectedForm = medicine.form;
    _selectedFrequency = medicine.frequencyType;
    _intervalDays = medicine.intervalDays;
    _startDate = medicine.startDate;
    _endDate = medicine.endDate;
    _doseTimes = List.from(medicine.doseTimes);
    _enableReminders = medicine.enableReminders;
    _enableSmsReminders = medicine.enableSmsReminders;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _genericController.dispose();
    _strengthController.dispose();
    _instructionsController.dispose();
    _prescribedByController.dispose();
    _totalQuantityController.dispose();
    _remainingQuantityController.dispose();
    _lowStockController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    final isEditing = widget.medicineToEdit != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(isEditing ? 'Edit Medicine' : l10n.addNew),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildBasicInfoSection(l10n),
            const SizedBox(height: 24),
            _buildDosageSection(l10n),
            const SizedBox(height: 24),
            _buildScheduleSection(l10n),
            const SizedBox(height: 24),
            _buildStockSection(l10n),
            const SizedBox(height: 24),
            _buildReminderSection(l10n),
            const SizedBox(height: 32),
            _buildSaveButton(l10n, isEditing),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildBasicInfoSection(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Basic Information', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        TextFormField(
          controller: _nameController,
          decoration: InputDecoration(
            labelText: 'Medicine Name *',
            hintText: 'e.g., Crocin, Metformin',
          ),
          validator: (v) => v?.isEmpty == true ? 'Required' : null,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _genericController,
          decoration: InputDecoration(
            labelText: 'Generic Name *',
            hintText: 'e.g., Paracetamol, Metformin Hydrochloride',
          ),
          validator: (v) => v?.isEmpty == true ? 'Required' : null,
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _strengthController,
                decoration: InputDecoration(
                  labelText: 'Strength *',
                  hintText: 'e.g., 500mg, 10ml',
                ),
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _selectedForm,
                decoration: const InputDecoration(labelText: 'Form *'),
                items: _forms.map((form) => DropdownMenuItem(
                  value: form,
                  child: Text(form.capitalize()),
                )).toList(),
                onChanged: (v) => setState(() => _selectedForm = v!),
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _instructionsController,
          decoration: InputDecoration(
            labelText: 'Instructions',
            hintText: 'e.g., Take after food, Do not crush',
          ),
          maxLines: 2,
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _prescribedByController,
          decoration: InputDecoration(
            labelText: 'Prescribed By',
            hintText: 'Doctor name',
          ),
        ),
      ],
    );
  }

  Widget _buildDosageSection(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Dosage Schedule', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        DropdownButtonFormField<FrequencyType>(
          value: _selectedFrequency,
          decoration: const InputDecoration(labelText: 'Frequency'),
          items: FrequencyType.values.map((f) => DropdownMenuItem(
            value: f,
            child: Text(_getFrequencyLabel(f)),
          )).toList(),
          onChanged: (v) => setState(() {
            _selectedFrequency = v!;
            if (v != FrequencyType.asNeeded) _syncDoseTimes();
          }),
        ),
        const SizedBox(height: 16),
        if (_selectedFrequency == FrequencyType.custom) ...[
          TextFormField(
            initialValue: _intervalDays.toString(),
            decoration: const InputDecoration(labelText: 'Every N Days'),
            keyboardType: TextInputType.number,
            onChanged: (v) => _intervalDays = int.tryParse(v) ?? 1,
          ),
          const SizedBox(height: 16),
        ],
        ..._doseTimes.asMap().entries.map((entry) {
          final index = entry.key;
          final doseTime = entry.value;
          return _buildDoseTimeRow(index, doseTime, l10n);
        }),
        if (_selectedFrequency != FrequencyType.asNeeded) ...[
          const SizedBox(height: 8),
          OutlinedButton.icon(
            icon: const Icon(Icons.add),
            label: Text('Add Dose Time'),
            onPressed: _addDoseTime,
          ),
        ],
      ],
    );
  }

  Widget _buildDoseTimeRow(int index, DoseTime doseTime, AppLocalizations l10n) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Expanded(
            child: InkWell(
              onTap: () async {
                final time = await showTimePicker(
                  context: context,
                  initialTime: doseTime.time,
                );
                if (time != null) {
                  setState(() {
                    _doseTimes[index] = DoseTime(
                      id: doseTime.id,
                      time: time,
                      label: doseTime.label,
                      isEnabled: doseTime.isEnabled,
                    );
                  });
                }
              },
              child: InputDecorator(
                decoration: const InputDecoration(
                  labelText: 'Time',
                  prefixIcon: Icon(Icons.access_time),
                ),
                child: Text(doseTime.formattedTime),
              ),
            ),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: TextFormField(
              initialValue: doseTime.label,
              decoration: const InputDecoration(labelText: 'Label (optional)'),
              onChanged: (v) => setState(() {
                _doseTimes[index] = DoseTime(
                  id: doseTime.id,
                  time: doseTime.time,
                  label: v,
                  isEnabled: doseTime.isEnabled,
                );
              }),
            ),
          ),
          IconButton(
            icon: Icon(Icons.delete, color: AppTheme.errorRed),
            onPressed: _doseTimes.length > 1 ? () => setState(() => _doseTimes.removeAt(index)) : null,
          ),
        ],
      ),
    );
  }

  void _addDoseTime() {
    setState(() {
      _doseTimes.add(DoseTime(
        id: 'dose_${_doseTimes.length + 1}',
        time: const TimeOfDay(hour: 20, minute: 0),
      ));
    });
  }

  void _syncDoseTimes() {
    if (_selectedFrequency == FrequencyType.daily && _doseTimes.length > 1) {
      _doseTimes = [_doseTimes.first];
    }
  }

  String _getFrequencyLabel(FrequencyType f) {
    switch (f) {
      case FrequencyType.daily: return 'Daily';
      case FrequencyType.weekly: return 'Weekly';
      case FrequencyType.monthly: return 'Monthly';
      case FrequencyType.custom: return 'Custom (every N days)';
      case FrequencyType.asNeeded: return 'As Needed (SOS)';
    }
  }

  Widget _buildScheduleSection(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Schedule', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        ListTile(
          title: Text('Start Date'),
          subtitle: Text(DateFormat('MMM dd, yyyy').format(_startDate)),
          trailing: const Icon(Icons.calendar_today),
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: _startDate,
              firstDate: DateTime(2020),
              lastDate: DateTime.now().add(const Duration(days: 365)),
            );
            if (date != null) setState(() => _startDate = date);
          },
        ),
        ListTile(
          title: Text('End Date (Optional)'),
          subtitle: Text(_endDate != null ? DateFormat('MMM dd, yyyy').format(_endDate!) : 'No end date'),
          trailing: _endDate != null
              ? IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () => setState(() => _endDate = null),
                )
              : const Icon(Icons.calendar_today),
          onTap: () async {
            final date = await showDatePicker(
              context: context,
              initialDate: _endDate ?? DateTime.now().add(const Duration(days: 30)),
              firstDate: _startDate,
              lastDate: DateTime.now().add(const Duration(days: 3650)),
            );
            if (date != null) setState(() => _endDate = date);
          },
        ),
      ],
    );
  }

  Widget _buildStockSection(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Stock Tracking', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(
              child: TextFormField(
                controller: _totalQuantityController,
                decoration: const InputDecoration(labelText: 'Total Quantity'),
                keyboardType: TextInputType.number,
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: TextFormField(
                controller: _remainingQuantityController,
                decoration: const InputDecoration(labelText: 'Remaining *'),
                keyboardType: TextInputType.number,
                validator: (v) => v?.isEmpty == true ? 'Required' : null,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _lowStockController,
          decoration: const InputDecoration(
            labelText: 'Low Stock Alert Threshold',
            hintText: 'Alert when remaining ≤ this number',
          ),
          keyboardType: TextInputType.number,
        ),
      ],
    );
  }

  Widget _buildReminderSection(AppLocalizations l10n) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Reminders', style: Theme.of(context).textTheme.titleLarge),
        const SizedBox(height: 16),
        SwitchListTile(
          title: Text('Enable Reminders'),
          subtitle: Text('Get notified when it\'s time to take medicine'),
          value: _enableReminders,
          onChanged: (v) => setState(() => _enableReminders = v),
          activeColor: AppTheme.primaryGreen,
        ),
        SwitchListTile(
          title: Text('SMS Reminders'),
          subtitle: Text('Also send SMS (requires phone number)'),
          value: _enableSmsReminders,
          onChanged: (v) => setState(() => _enableSmsReminders = v),
          activeColor: AppTheme.primaryGreen,
        ),
      ],
    );
  }

  Widget _buildSaveButton(AppLocalizations l10n, bool isEditing) {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _isLoading ? null : _saveMedicine,
        child: _isLoading
            ? const CircularProgressIndicator(color: Colors.white)
            : Text(isEditing ? 'Update Medicine' : 'Save Medicine'),
      ),
    );
  }

  Future<void> _saveMedicine() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final provider = context.read<MedicineProvider>();
      final patientId = provider.medicines.isNotEmpty 
          ? provider.medicines.first.patientId 
          : 'default_patient';

      final medicine = Medicine(
        id: widget.medicineToEdit?.id ?? DateTime.now().millisecondsSinceEpoch.toString(),
        patientId: patientId,
        name: _nameController.text.trim(),
        genericName: _genericController.text.trim(),
        strength: _strengthController.text.trim(),
        form: _selectedForm,
        frequencyType: _selectedFrequency,
        doseTimes: _doseTimes.where((dt) => dt.isEnabled).toList(),
        intervalDays: _intervalDays,
        startDate: _startDate,
        endDate: _endDate,
        instructions: _instructionsController.text.trim(),
        prescribedBy: _prescribedByController.text.trim(),
        totalQuantity: int.tryParse(_totalQuantityController.text) ?? 0,
        remainingQuantity: int.tryParse(_remainingQuantityController.text) ?? 0,
        lowStockThreshold: int.tryParse(_lowStockController.text) ?? 5,
        enableReminders: _enableReminders,
        enableSmsReminders: _enableSmsReminders,
        createdAt: widget.medicineToEdit?.createdAt ?? DateTime.now(),
        updatedAt: DateTime.now(),
      );

      if (widget.medicineToEdit != null) {
        await provider.updateMedicine(medicine);
      } else {
        await provider.addMedicine(medicine);
      }

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(isEditing ? 'Medicine updated' : 'Medicine added')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }
}

extension StringExtension on String {
  String capitalize() => '${this[0].toUpperCase()}${substring(1)}';
}