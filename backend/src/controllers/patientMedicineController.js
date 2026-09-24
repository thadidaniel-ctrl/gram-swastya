const { Medicine } = require('../models');
const logger = require('../utils/logger');

class PatientMedicineController {
  mapDoseTimes(doseTimes) {
    if (!Array.isArray(doseTimes)) return [];
    return doseTimes.map(dt => ({
      time: dt.time,
      label: dt.label || '',
      isEnabled: dt.enabled !== false,
    }));
  }

  cleanupBody(body) {
    const cleaned = {};
    const fields = [
      'name',
      'genericName',
      'strength',
      'form',
      'frequency',
      'startDate',
      'endDate',
      'instructions',
      'totalQuantity',
      'remainingQuantity',
      'lowStockThreshold',
      'enableReminders',
      'enableSmsReminders',
    ];
    for (const field of fields) {
      if (body[field] !== undefined) cleaned[field] = body[field];
    }
    if (body.doseTimes !== undefined) {
      cleaned.doseTimes = this.mapDoseTimes(body.doseTimes);
    }
    return cleaned;
  }

  async listMedicines(req, res) {
    try {
      const medicines = await Medicine.find({ patient: req.user._id })
        .sort({ createdAt: -1 })
        .lean();

      res.json({
        success: true,
        medicines,
      });
    } catch (error) {
      logger.error('List medicines error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch medicines' });
    }
  }

  async createMedicine(req, res) {
    try {
      const data = this.cleanupBody(req.body);
      const medicine = await Medicine.create({
        ...data,
        patient: req.user._id,
      });

      res.status(201).json({
        success: true,
        medicine,
      });
    } catch (error) {
      logger.error('Create medicine error:', error);
      res.status(500).json({ success: false, message: 'Failed to create medicine' });
    }
  }

  async updateMedicine(req, res) {
    try {
      const data = this.cleanupBody(req.body);
      const medicine = await Medicine.findOneAndUpdate(
        { _id: req.params.id, patient: req.user._id },
        { $set: data },
        { new: true, runValidators: true }
      );

      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      res.json({
        success: true,
        medicine,
      });
    } catch (error) {
      logger.error('Update medicine error:', error);
      res.status(500).json({ success: false, message: 'Failed to update medicine' });
    }
  }

  async deleteMedicine(req, res) {
    try {
      const medicine = await Medicine.findOneAndDelete({
        _id: req.params.id,
        patient: req.user._id,
      });

      if (!medicine) {
        return res.status(404).json({ success: false, message: 'Medicine not found' });
      }

      res.json({
        success: true,
        message: 'Medicine deleted',
      });
    } catch (error) {
      logger.error('Delete medicine error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete medicine' });
    }
  }
}

module.exports = new PatientMedicineController();
