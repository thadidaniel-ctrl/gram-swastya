const { MedicalFileStorage, MedicalFolder, FileAccessLog } = require('../models');
const {
  uploadFile,
  getPresignedDownloadUrl,
  getPresignedPreviewUrl,
  deleteFile,
  generateS3Key,
  getFileCategoryFromMimeType,
} = require('../services/s3Service');
const logger = require('../utils/logger');
const redis = require('../config/redis');

const RECOVERY_DAYS = 30;
const VALID_CATEGORIES = [
  'Lab Report',
  'Prescription',
  'Medical Image',
  'Hospital Record',
  'Vaccination',
  'Insurance',
  'Other',
];
const UPLOAD_RATE_LIMIT = 20;
const UPLOAD_WINDOW_SECONDS = 900;

class FileStorageController {
  // Helper: log file access
  async logAccess(fileId, patientId, accessedBy, userType, accessType, req, duration = null) {
    try {
      await FileAccessLog.create({
        fileId,
        patientId,
        accessedBy,
        userType,
        accessType,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get('user-agent'),
        duration,
      });
    } catch (error) {
      logger.error('Failed to log file access', { error: error.message, fileId, accessType });
    }
  }

  // GET /api/file-storage - List files with pagination, filtering, search
  async getFiles(req, res) {
    try {
      const patientId = req.user._id.toString();
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 10, 50);
      const {
        folderId,
        category,
        tags,
        search,
        sortBy = 'uploadedAt',
        sortOrder = 'desc',
        includeDeleted = false,
        dateFrom,
        dateTo,
        sizeMin,
        sizeMax,
        sharedOnly,
      } = req.query;

      const filter = { patientId };
      if (includeDeleted === 'false' || includeDeleted === false) {
        filter.isDeleted = false;
      }
      if (folderId) filter.folderId = folderId === 'root' ? null : folderId;
      if (category) filter.category = category;
      if (tags) filter.tags = { $in: tags.split(',').map(t => t.trim()) };
      if (search) {
        filter.fileName = { $regex: search, $options: 'i' };
      }
      if (dateFrom || dateTo) {
        filter.uploadedAt = {};
        if (dateFrom) filter.uploadedAt.$gte = new Date(dateFrom);
        if (dateTo) {
          const endDate = new Date(dateTo);
          endDate.setHours(23, 59, 59, 999);
          filter.uploadedAt.$lte = endDate;
        }
      }
      if (sizeMin || sizeMax) {
        filter.fileSize = {};
        if (sizeMin) filter.fileSize.$gte = parseFloat(sizeMin) * 1024 * 1024;
        if (sizeMax) filter.fileSize.$lte = parseFloat(sizeMax) * 1024 * 1024;
      }
      if (sharedOnly === 'true') {
        filter.sharedWith = { $exists: true, $ne: [] };
      }

      const sortOptions = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

      const [files, total] = await Promise.all([
        MedicalFileStorage.find(filter)
          .sort(sortOptions)
          .skip((page - 1) * limit)
          .limit(limit)
          .select('fileName category fileSize uploadedAt tags folderId sharedWith isDeleted')
          .lean(),
        MedicalFileStorage.countDocuments(filter),
      ]);

      // Add shared count
      const filesWithMetadata = files.map(f => ({
        ...f,
        sharedWith: f.sharedWith?.length || 0,
      }));

      res.json({
        success: true,
        files: filesWithMetadata,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get files error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch files' });
    }
  }

  // POST /api/file-storage/upload - Upload file(s)
  async uploadFiles(req, res) {
    try {
      const patientId = req.user._id.toString();
      const files = req.files || (req.file ? [req.file] : []);

      if (!files.length) {
        return res.status(400).json({ success: false, message: 'No files provided' });
      }

      // Rate limiting: 20 uploads per 15 minutes
      const rateLimitKey = `uploads:${patientId}`;
      const uploadCount = await redis.incr(rateLimitKey);
      if (uploadCount === 1) {
        await redis.expire(rateLimitKey, UPLOAD_WINDOW_SECONDS);
      }
      if (uploadCount > UPLOAD_RATE_LIMIT) {
        return res.status(429).json({
          success: false,
          message: 'Too many uploads. Try again in 15 minutes',
        });
      }

      const { folderId, category, tags, description } = req.body;
      const tagArray = tags
        ? tags
            .split(',')
            .map(t => t.trim())
            .filter(Boolean)
        : [];

      // Verify folder belongs to patient if provided
      if (folderId) {
        const folder = await MedicalFolder.findOne({ _id: folderId, patientId, isDeleted: false });
        if (!folder) {
          return res.status(400).json({ success: false, message: 'Invalid folder' });
        }
      }

      const uploadedFiles = [];

      for (const file of files) {
        // Validate file size (50MB max)
        if (file.size > 50 * 1024 * 1024) {
          return res.status(400).json({ success: false, message: 'File exceeds 50MB limit' });
        }

        const fileKey = generateS3Key(patientId, file.originalname);
        const mimeType = file.mimetype;

        // Validate category - use provided or auto-detect from mimeType
        const fileCategory =
          category && VALID_CATEGORIES.includes(category)
            ? category
            : getFileCategoryFromMimeType(mimeType);

        // Upload to S3
        const s3Result = await uploadFile(file.buffer, fileKey, mimeType, {
          patientId,
          originalName: file.originalname,
          category: fileCategory,
        });

        // Use compressed size for storage if compression occurred
        const storedSize = s3Result.compression?.compressed
          ? s3Result.compression.compressedSize
          : file.size;
        const originalSize = file.size;

        // Create DB record
        const medicalFile = await MedicalFileStorage.create({
          patientId,
          folderId: folderId || null,
          fileName: file.originalname,
          fileKey: s3Result.s3Key,
          mimeType,
          fileSize: storedSize,
          originalSize: originalSize !== storedSize ? originalSize : undefined,
          uploadedAt: new Date(),
          category: fileCategory,
          tags: tagArray,
          description: description || '',
          encrypted: true,
        });

        // Update folder file count with stored size
        if (folderId) {
          await MedicalFolder.findByIdAndUpdate(folderId, {
            $inc: { fileCount: 1, totalSize: storedSize },
          });
        }

        // Log access
        await this.logAccess(medicalFile._id, patientId, patientId, 'patient', 'upload', req);

        // Generate presigned URL (1 hour expiry)
        const presignedUrl = await getPresignedDownloadUrl(s3Result.s3Key, file.originalname);

        uploadedFiles.push({
          fileId: medicalFile._id,
          fileName: medicalFile.fileName,
          fileSize: medicalFile.fileSize,
          originalSize: medicalFile.originalSize,
          compressed: s3Result.compression?.compressed || false,
          compressionRatio: s3Result.compression?.ratio,
          category: medicalFile.category,
          uploadedAt: medicalFile.uploadedAt,
          storageUrl: presignedUrl,
        });
      }

      res.status(201).json({
        success: true,
        message: `${uploadedFiles.length} file(s) uploaded successfully`,
        data: uploadedFiles,
      });
    } catch (error) {
      logger.error('Upload files error:', error);
      res.status(500).json({ success: false, message: 'Failed to upload files' });
    }
  }

  // GET /api/file-storage/:id/download - Get download URL
  async getDownloadUrl(req, res) {
    try {
      const patientId = req.user._id;
      const file = await MedicalFileStorage.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: false,
      });

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      const url = await getPresignedDownloadUrl(file.fileKey, file.fileName);

      await this.logAccess(file._id, patientId, patientId, 'patient', 'download', req);

      res.json({ success: true, data: { url, fileName: file.fileName } });
    } catch (error) {
      logger.error('Get download URL error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate download URL' });
    }
  }

  // GET /api/file-storage/:id/preview - Get preview URL
  async getPreviewUrl(req, res) {
    try {
      const patientId = req.user._id;
      const file = await MedicalFileStorage.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: false,
      });

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      const url = await getPresignedPreviewUrl(file.fileKey);

      await this.logAccess(file._id, patientId, patientId, 'patient', 'preview', req);

      res.json({ success: true, data: { url, file } });
    } catch (error) {
      logger.error('Get preview URL error:', error);
      res.status(500).json({ success: false, message: 'Failed to generate preview URL' });
    }
  }

  // PUT /api/file-storage/:id - Update file metadata
  async updateFile(req, res) {
    try {
      const patientId = req.user._id;
      const { fileName, description, category, tags, folderId } = req.body;

      const file = await MedicalFileStorage.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: false,
      });

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      const updates = {};
      if (fileName) updates.fileName = fileName;
      if (description !== undefined) updates.description = description;
      if (category && VALID_CATEGORIES.includes(category)) updates.category = category;
      if (tags !== undefined)
        updates.tags = tags
          .split(',')
          .map(t => t.trim())
          .filter(Boolean);

      // Handle folder change
      const oldFolderId = file.folderId;
      if (folderId !== undefined) {
        if (folderId) {
          const folder = await MedicalFolder.findOne({
            _id: folderId,
            patientId,
            isDeleted: false,
          });
          if (!folder) {
            return res.status(400).json({ success: false, message: 'Invalid folder' });
          }
          updates.folderId = folderId;
        } else {
          updates.folderId = null;
        }
      }

      const updated = await MedicalFileStorage.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('folderId', 'name color icon');

      // Update folder counts
      if (folderId !== undefined && folderId !== String(oldFolderId)) {
        if (oldFolderId) {
          await MedicalFolder.findByIdAndUpdate(oldFolderId, {
            $inc: { fileCount: -1, totalSize: -file.fileSize },
          });
        }
        if (folderId) {
          await MedicalFolder.findByIdAndUpdate(folderId, {
            $inc: { fileCount: 1, totalSize: file.fileSize },
          });
        }
      }

      await this.logAccess(file._id, patientId, patientId, 'patient', 'upload', req);

      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error('Update file error:', error);
      res.status(500).json({ success: false, message: 'Failed to update file' });
    }
  }

  // DELETE /api/file-storage/:id - Soft delete file
  async deleteFile(req, res) {
    try {
      const patientId = req.user._id;
      const file = await MedicalFileStorage.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: false,
      });

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      const recoveryExpiresAt = new Date(Date.now() + RECOVERY_DAYS * 24 * 60 * 60 * 1000);

      file.isDeleted = true;
      file.deletedAt = new Date();
      file.recoveryExpiresAt = recoveryExpiresAt;
      await file.save();

      // Update folder count
      if (file.folderId) {
        await MedicalFolder.findByIdAndUpdate(file.folderId, {
          $inc: { fileCount: -1, totalSize: -file.fileSize },
        });
      }

      await this.logAccess(file._id, patientId, patientId, 'patient', 'delete', req);

      res.json({
        success: true,
        message: 'File moved to trash',
        data: { recoveryExpiresAt },
      });
    } catch (error) {
      logger.error('Delete file error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete file' });
    }
  }

  // POST /api/file-storage/bulk-delete - Bulk delete files
  async bulkDeleteFiles(req, res) {
    try {
      const patientId = req.user._id.toString();
      const { fileIds } = req.body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No file IDs provided' });
      }

      const files = await MedicalFileStorage.find({
        _id: { $in: fileIds },
        patientId,
        isDeleted: false,
      });

      if (files.length === 0) {
        return res.status(404).json({ success: false, message: 'No files found to delete' });
      }

      const recoveryExpiresAt = new Date(Date.now() + RECOVERY_DAYS * 24 * 60 * 60 * 1000);

      // Update all files
      await MedicalFileStorage.updateMany(
        { _id: { $in: fileIds }, patientId, isDeleted: false },
        {
          $set: {
            isDeleted: true,
            deletedAt: new Date(),
            recoveryExpiresAt,
          },
        }
      );

      // Update folder counts
      const folderUpdates = {};
      for (const file of files) {
        if (file.folderId) {
          const folderIdStr = file.folderId.toString();
          if (!folderUpdates[folderIdStr]) {
            folderUpdates[folderIdStr] = { fileCount: 0, totalSize: 0 };
          }
          folderUpdates[folderIdStr].fileCount += 1;
          folderUpdates[folderIdStr].totalSize += file.fileSize;
        }
      }

      for (const [folderId, updates] of Object.entries(folderUpdates)) {
        await MedicalFolder.findByIdAndUpdate(folderId, {
          $inc: { fileCount: -updates.fileCount, totalSize: -updates.totalSize },
        });
      }

      // Log all deletions
      await Promise.all(
        files.map(file => this.logAccess(file._id, patientId, patientId, 'patient', 'delete', req))
      );

      res.json({
        success: true,
        message: `${files.length} file${files.length !== 1 ? 's' : ''} moved to trash`,
        data: {
          deletedCount: files.length,
          recoveryExpiresAt,
        },
      });
    } catch (error) {
      logger.error('Bulk delete error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete files' });
    }
  }

  // POST /api/file-storage/:id/restore - Restore file from trash
  async restoreFile(req, res) {
    try {
      const patientId = req.user._id;
      const file = await MedicalFileStorage.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: true,
      });

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found in trash' });
      }

      // Check if recovery period has expired
      if (file.recoveryExpiresAt && new Date(file.recoveryExpiresAt) < new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Recovery period expired. File has been permanently deleted.',
        });
      }

      // Restore file
      file.isDeleted = false;
      file.deletedAt = null;
      file.recoveryExpiresAt = null;
      await file.save();

      // Update folder count
      if (file.folderId) {
        await MedicalFolder.findByIdAndUpdate(file.folderId, {
          $inc: { fileCount: 1, totalSize: file.fileSize },
        });
      }

      await this.logAccess(file._id, patientId, patientId, 'patient', 'restore', req);

      res.json({
        success: true,
        message: 'File restored successfully',
        data: file,
      });
    } catch (error) {
      logger.error('Restore file error:', error);
      res.status(500).json({ success: false, message: 'Failed to restore file' });
    }
  }

  // POST /api/file-storage/:id/share - Share file with doctor
  async shareFile(req, res) {
    try {
      const patientId = req.user._id;
      const { doctorId, expiresIn, expiresAt, message } = req.body;

      if (!doctorId) {
        return res.status(400).json({ success: false, message: 'Doctor ID required' });
      }

      // Check if doctor exists
      const Doctor = require('../models/Doctor');
      const doctor = await Doctor.findById(doctorId);
      if (!doctor) {
        return res.status(404).json({ success: false, message: 'Doctor not found' });
      }
      if (!doctor.isVerified) {
        return res.status(400).json({ success: false, message: 'Doctor is not verified' });
      }

      const file = await MedicalFileStorage.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: false,
      });

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      // Check if already shared with this doctor
      const existingShare = file.sharedWith.find(s => s.doctorId.toString() === doctorId);
      if (existingShare) {
        return res.status(400).json({ success: false, message: 'Already shared with this doctor' });
      }

      const sharedAt = new Date();
      let expiresAtDate = null;
      if (expiresIn) {
        expiresAtDate = new Date(Date.now() + parseInt(expiresIn) * 24 * 60 * 60 * 1000);
      } else if (expiresAt) {
        expiresAtDate = new Date(expiresAt);
      }

      const shareRecord = {
        doctorId,
        sharedAt,
        accessLevel: 'view-only',
        expiresAt: expiresAtDate,
      };

      file.sharedWith.push(shareRecord);
      await file.save();

      await this.logAccess(file._id, patientId, patientId, 'patient', 'share', req);

      // Send email to doctor
      const Patient = require('../models/Patient');
      const patient = await Patient.findById(patientId);
      if (patient && doctor.email) {
        const emailService = require('../services/emailService');
        const viewUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/file-storage/${file._id}/preview`;
        emailService
          .sendFileSharedEmail(
            doctor.email,
            doctor.name || 'Doctor',
            patient.name || 'A patient',
            file.fileName,
            file.category,
            expiresAtDate,
            message,
            viewUrl
          )
          .catch(err => logger.error('Failed to send share email:', err));
      }

      res.json({
        success: true,
        message: 'File shared with doctor',
        sharedAt,
        accessLevel: 'view-only',
        expiresAt: expiresAtDate,
      });
    } catch (error) {
      logger.error('Share file error:', error);
      res.status(500).json({ success: false, message: 'Failed to share file' });
    }
  }

  // DELETE /api/file-storage/:id/share/:doctorId - Unshare file
  async unshareFile(req, res) {
    try {
      const patientId = req.user._id;
      const file = await MedicalFileStorage.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: false,
      });

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      file.sharedWith = file.sharedWith.filter(s => s.doctorId.toString() !== req.params.doctorId);
      await file.save();

      await this.logAccess(file._id, patientId, patientId, 'patient', 'share', req);

      res.json({ success: true, message: 'File unshared successfully' });
    } catch (error) {
      logger.error('Unshare file error:', error);
      res.status(500).json({ success: false, message: 'Failed to unshare file' });
    }
  }

  // POST /api/file-storage/:id/version - Create new version
  async createVersion(req, res) {
    try {
      const patientId = req.user._id;
      const uploadedByDoctor = req.user.role === 'doctor';

      const file = await MedicalFileStorage.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: false,
      });

      if (!file) {
        return res.status(404).json({ success: false, message: 'File not found' });
      }

      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file provided' });
      }

      const newFileKey = generateS3Key(patientId, req.file.originalname);
      const mimeType = req.file.mimetype;

      // Upload new version to S3
      const s3Result = await uploadFile(req.file.buffer, newFileKey, mimeType, {
        patientId: patientId.toString(),
        originalName: req.file.originalname,
        version: file.version + 1,
      });

      // Save current version to previousVersions
      file.previousVersions.push({
        fileKey: file.fileKey,
        uploadedAt: file.uploadedAt,
        uploadedByDoctor: false,
      });

      // Update to new version
      file.fileKey = s3Result.s3Key;
      file.fileName = req.file.originalname;
      file.mimeType = mimeType;
      file.fileSize = req.file.size;
      file.uploadedAt = new Date();
      file.version += 1;
      file.extension = req.file.originalname.split('.').pop().toLowerCase();

      await file.save();

      await this.logAccess(
        file._id,
        patientId,
        patientId,
        uploadedByDoctor ? 'doctor' : 'patient',
        'upload',
        req
      );

      res.json({ success: true, message: 'New version created', data: file });
    } catch (error) {
      logger.error('Create version error:', error);
      res.status(500).json({ success: false, message: 'Failed to create version' });
    }
  }

  // GET /api/file-storage/stats - Get storage stats
  async getStats(req, res) {
    try {
      const patientId = req.user._id;

      const [totalFiles, totalSize, categoryStats, folderStats] = await Promise.all([
        MedicalFileStorage.countDocuments({ patientId, isDeleted: false }),
        MedicalFileStorage.aggregate([
          { $match: { patientId, isDeleted: false } },
          { $group: { _id: null, total: { $sum: '$fileSize' } } },
        ]),
        MedicalFileStorage.aggregate([
          { $match: { patientId, isDeleted: false } },
          { $group: { _id: '$category', count: { $sum: 1 }, size: { $sum: '$fileSize' } } },
        ]),
        MedicalFolder.aggregate([
          { $match: { patientId, isDeleted: false } },
          {
            $group: {
              _id: '$_id',
              name: { $first: '$name' },
              count: { $first: '$fileCount' },
              size: { $first: '$totalSize' },
            },
          },
        ]),
      ]);

      const totalSizeBytes = totalSize[0]?.total || 0;

      res.json({
        success: true,
        data: {
          totalFiles,
          totalSize: totalSizeBytes,
          totalSizeFormatted: this.formatBytes(totalSizeBytes),
          categories: categoryStats,
          folders: folderStats,
        },
      });
    } catch (error) {
      logger.error('Get stats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // GET /api/file-storage/activity - Get activity timeline
  async getActivity(req, res) {
    try {
      const patientId = req.user._id;
      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const { type, fileId } = req.query;

      const filter = { patientId };
      if (type && type !== 'all') filter.accessType = type;
      if (fileId) filter.fileId = fileId;

      const [activities, total] = await Promise.all([
        FileAccessLog.find(filter)
          .sort({ timestamp: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .populate('fileId', 'fileName mimeType fileSize')
          .lean(),
        FileAccessLog.countDocuments(filter),
      ]);

      // Format time ago
      const formatTimeAgo = date => {
        const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
        return new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
      };

      const formattedActivities = activities.map(a => ({
        ...a,
        timeAgo: formatTimeAgo(a.timestamp),
        fileName: a.fileId?.fileName || 'Unknown file',
        mimeType: a.fileId?.mimeType,
      }));

      res.json({
        success: true,
        activities: formattedActivities,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('Get activity error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch activity' });
    }
  }
}

module.exports = new FileStorageController();
