const { MedicalFileStorage, FileAccessLog } = require('../models');
const { getPresignedPreviewUrl, getPresignedDownloadUrl } = require('../services/s3Service');
const logger = require('../utils/logger');

const VALID_CATEGORIES = [
  'Lab Report',
  'Prescription',
  'Medical Image',
  'Hospital Record',
  'Vaccination',
  'Insurance',
  'Other',
];

function isShareActive(share) {
  if (!share) return false;
  if (share.expiresAt && new Date(share.expiresAt) <= new Date()) return false;
  return true;
}

function currentShare(file, doctorId) {
  if (!Array.isArray(file.sharedWith)) return null;
  return file.sharedWith.find(s => s.doctorId && s.doctorId.toString() === doctorId.toString());
}

class DoctorSharedFilesController {
  async logDoctorAccess(fileId, patientId, doctorId, req, accessType) {
    try {
      await FileAccessLog.create({
        fileId,
        patientId,
        accessedBy: doctorId,
        userType: 'doctor',
        accessType,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
      });
    } catch (error) {
      logger.error('Failed to log doctor file access', {
        error: error.message,
        fileId,
        accessType,
      });
    }
  }

  // GET /api/doctor/shared-files - List files shared with this doctor
  async listSharedFiles(req, res) {
    try {
      const doctorId = req.user._id;
      const page = Math.max(parseInt(req.query.page) || 1, 1);
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const category = req.query.category;

      const filter = {
        isDeleted: false,
        'sharedWith.doctorId': doctorId,
      };
      if (category && VALID_CATEGORIES.includes(category)) {
        filter.category = category;
      }

      const [files, total] = await Promise.all([
        MedicalFileStorage.find(filter)
          .sort({ uploadedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .select('fileName mimeType fileSize category uploadedAt documentDate sharedWith')
          .populate('patientId', 'name phone')
          .lean(),
        MedicalFileStorage.countDocuments(filter),
      ]);

      const sharedFiles = files
        .filter(f => isShareActive(currentShare(f, doctorId)))
        .map(f => {
          const share = currentShare(f, doctorId);
          return {
            id: f._id,
            fileName: f.fileName,
            mimeType: f.mimeType,
            fileSize: f.fileSize,
            category: f.category,
            uploadedAt: f.uploadedAt,
            documentDate: f.documentDate || null,
            patient: f.patientId
              ? { id: f.patientId._id, name: f.patientId.name, phone: f.patientId.phone }
              : null,
            sharedAt: share?.sharedAt || null,
            expiresAt: share?.expiresAt || null,
            expired: false,
          };
        });

      res.json({
        success: true,
        files: sharedFiles,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Doctor list shared files error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch shared files' });
    }
  }

  async getSharedFile(req, res) {
    try {
      const doctorId = req.user._id;
      const file = await MedicalFileStorage.findOne({
        _id: req.params.id,
        isDeleted: false,
      }).populate('patientId', 'name phone');

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      const share = currentShare(file, doctorId);
      if (!share) {
        return res.status(403).json({ success: false, message: 'File is not shared with you' });
      }
      if (share.expiresAt && new Date(share.expiresAt) <= new Date()) {
        return res.status(403).json({ success: false, message: 'Access to this file has expired' });
      }

      return { file, share };
    } catch (error) {
      logger.error('Doctor get shared file error:', error);
      return null;
    }
  }

  // GET /api/doctor/shared-files/:id/preview - Preview shared file
  async getPreviewUrl(req, res) {
    try {
      const doctorId = req.user._id;
      const result = await this.getSharedFile(req, res);
      if (!result || res.headersSent) return;

      const { file } = result;
      const url = await getPresignedPreviewUrl(file.fileKey);

      await this.logDoctorAccess(file._id, file.patientId, doctorId, req, 'preview');

      res.json({
        success: true,
        data: {
          url,
          file: {
            id: file._id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            fileSize: file.fileSize,
            category: file.category,
            uploadedAt: file.uploadedAt,
            documentDate: file.documentDate || null,
            patient: file.patientId
              ? { id: file.patientId._id, name: file.patientId.name, phone: file.patientId.phone }
              : null,
          },
        },
      });
    } catch (error) {
      logger.error('Doctor shared file preview error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate preview' });
      }
    }
  }

  // GET /api/doctor/shared-files/:id/download - Download shared file
  async getDownloadUrl(req, res) {
    try {
      const doctorId = req.user._id;
      const result = await this.getSharedFile(req, res);
      if (!result || res.headersSent) return;

      const { file } = result;
      const url = await getPresignedDownloadUrl(file.fileKey, file.fileName);

      await this.logDoctorAccess(file._id, file.patientId, doctorId, req, 'download');

      res.json({ success: true, data: { url, fileName: file.fileName } });
    } catch (error) {
      logger.error('Doctor shared file download error:', error);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Failed to generate download URL' });
      }
    }
  }
}

module.exports = new DoctorSharedFilesController();
