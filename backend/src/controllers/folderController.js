const { MedicalFolder, MedicalFileStorage } = require('../models');
const logger = require('../utils/logger');

class FolderController {
  // Helper: build folder tree
  async buildFolderTree(patientId, parentId = null) {
    const folders = await MedicalFolder.find({
      patientId,
      parentFolderId: parentId,
      isDeleted: false,
    })
      .sort({ folderName: 1 })
      .lean();

    for (const folder of folders) {
      folder.children = await this.buildFolderTree(patientId, folder._id);
    }
    return folders;
  }

  // GET /api/folders - Get all folders (tree or flat)
  async getFolders(req, res) {
    try {
      const patientId = req.user._id;
      const { tree = 'true', parent, parentFolderId } = req.query;

      // Support both 'parent' and 'parentFolderId' query params
      const parentParam = parent || parentFolderId;

      if (tree === 'true') {
        const rootFolders = await this.buildFolderTree(patientId, null);
        return res.json({ success: true, folders: rootFolders });
      }

      const filter = { patientId, isDeleted: false };
      if (parentParam) filter.parentFolderId = parentParam === 'root' ? null : parentParam;

      const folders = await MedicalFolder.find(filter)
        .sort({ folderName: 1 })
        .select('folderName color fileCount createdAt')
        .lean();

      res.json({ success: true, folders });
    } catch (error) {
      logger.error('Get folders error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch folders' });
    }
  }

  // POST /api/folders - Create folder
  async createFolder(req, res) {
    try {
      const patientId = req.user._id;
      const { folderName, parentFolderId, description, color } = req.body;

      if (!folderName?.trim()) {
        return res.status(400).json({ success: false, message: 'Folder name is required' });
      }

      // Check parent exists if provided
      if (parentFolderId) {
        const parent = await MedicalFolder.findOne({
          _id: parentFolderId,
          patientId,
          isDeleted: false,
        });
        if (!parent) {
          return res.status(400).json({ success: false, message: 'Parent folder not found' });
        }
      }

      // Check duplicate name in same parent (unique index handles this, but give better error)
      const existing = await MedicalFolder.findOne({
        patientId,
        parentFolderId: parentFolderId || null,
        folderName: folderName.trim(),
        isDeleted: false,
      });
      if (existing) {
        return res
          .status(400)
          .json({ success: false, message: 'Folder with this name already exists' });
      }

      const folder = await MedicalFolder.create({
        patientId,
        parentFolderId: parentFolderId || null,
        folderName: folderName.trim(),
        description: description || '',
        color: color || '#4287F5',
      });

      res.status(201).json({ success: true, data: folder });
    } catch (error) {
      if (error.code === 11000) {
        return res
          .status(400)
          .json({ success: false, message: 'Folder with this name already exists' });
      }
      logger.error('Create folder error:', error);
      res.status(500).json({ success: false, message: 'Failed to create folder' });
    }
  }

  // PUT /api/folders/:id - Update folder
  async updateFolder(req, res) {
    try {
      const patientId = req.user._id;
      const { folderName, description, color, parentFolderId } = req.body;

      const folder = await MedicalFolder.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: false,
      });

      if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }

      const updates = {};
      if (folderName !== undefined) updates.folderName = folderName.trim();
      if (description !== undefined) updates.description = description;
      if (color !== undefined) updates.color = color;

      // Handle parent change
      if (parentFolderId !== undefined) {
        if (parentFolderId) {
          if (parentFolderId === folder._id.toString()) {
            return res
              .status(400)
              .json({ success: false, message: 'Cannot move folder into itself' });
          }
          const parent = await MedicalFolder.findOne({
            _id: parentFolderId,
            patientId,
            isDeleted: false,
          });
          if (!parent) {
            return res.status(400).json({ success: false, message: 'Parent folder not found' });
          }
          // Check for circular reference
          let current = parent;
          while (current.parentFolderId) {
            if (current.parentFolderId.toString() === folder._id.toString()) {
              return res
                .status(400)
                .json({ success: false, message: 'Cannot create circular folder structure' });
            }
            current = await MedicalFolder.findById(current.parentFolderId);
          }
          updates.parentFolderId = parentFolderId;
        } else {
          updates.parentFolderId = null;
        }
      }

      // Check duplicate name in target parent
      if (folderName !== undefined || parentFolderId !== undefined) {
        const targetParent = updates.parentFolderId;
        const existing = await MedicalFolder.findOne({
          patientId,
          parentFolderId: targetParent,
          folderName: updates.folderName || folder.folderName,
          isDeleted: false,
          _id: { $ne: folder._id },
        });
        if (existing) {
          return res.status(400).json({
            success: false,
            message: 'Folder with this name already exists in target location',
          });
        }
      }

      const updated = await MedicalFolder.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate('parentFolderId', 'folderName');

      res.json({ success: true, data: updated });
    } catch (error) {
      if (error.code === 11000) {
        return res
          .status(400)
          .json({ success: false, message: 'Folder with this name already exists' });
      }
      logger.error('Update folder error:', error);
      res.status(500).json({ success: false, message: 'Failed to update folder' });
    }
  }

  // DELETE /api/folders/:id - Delete folder (soft)
  async deleteFolder(req, res) {
    try {
      const patientId = req.user._id;
      const { recursive = 'false' } = req.query;

      const folder = await MedicalFolder.findOne({
        _id: req.params.id,
        patientId,
        isDeleted: false,
      });

      if (!folder) {
        return res.status(404).json({ success: false, message: 'Folder not found' });
      }

      if (recursive === 'true') {
        // Delete folder and all children + files
        await this.deleteFolderRecursive(folder._id, patientId);
      } else {
        // Check if folder has children
        const children = await MedicalFolder.countDocuments({
          parentFolderId: folder._id,
          isDeleted: false,
        });
        const files = await MedicalFileStorage.countDocuments({
          folderId: folder._id,
          isDeleted: false,
        });

        if (children > 0 || files > 0) {
          return res.status(400).json({
            success: false,
            message: 'Folder is not empty. Use recursive=true to delete all contents.',
            children,
            files,
          });
        }

        folder.isDeleted = true;
        folder.deletedAt = new Date();
        await folder.save();
      }

      res.json({ success: true, message: 'Folder deleted' });
    } catch (error) {
      logger.error('Delete folder error:', error);
      res.status(500).json({ success: false, message: 'Failed to delete folder' });
    }
  }

  async deleteFolderRecursive(folderId, patientId) {
    const children = await MedicalFolder.find({ parentFolderId: folderId, isDeleted: false });
    for (const child of children) {
      await this.deleteFolderRecursive(child._id, patientId);
    }

    // Get files in this folder to calculate size for folder count updates
    const filesToDelete = await MedicalFileStorage.find({
      folderId,
      isDeleted: false,
    });

    let totalSize = 0;
    for (const file of filesToDelete) {
      totalSize += file.fileSize;
    }

    // Soft delete files
    await MedicalFileStorage.updateMany(
      { folderId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date() } }
    );

    // Update folder count and size for this folder
    await MedicalFolder.findByIdAndUpdate(folderId, {
      $inc: { fileCount: -filesToDelete.length, totalSize: -totalSize },
      $set: { isDeleted: true, deletedAt: new Date() },
    });
  }

  // POST /api/folders/initialize - Create default system folders for a patient
  async initializeFolders(req, res) {
    try {
      const patientId = req.user._id;

      const defaultFolders = [
        {
          folderName: 'Lab Reports',
          color: '#4287F5',
          description: 'All lab test reports',
          isSystem: true,
        },
        {
          folderName: 'Prescriptions',
          color: '#E5A33F',
          description: 'Doctor prescriptions',
          isSystem: true,
        },
        {
          folderName: 'Medical Images',
          color: '#7C3AED',
          description: 'X-rays, scans and imaging',
          isSystem: true,
        },
        {
          folderName: 'Vaccination Records',
          color: '#EC4899',
          description: 'Immunization certificates',
          isSystem: true,
        },
        {
          folderName: 'Hospital Records',
          color: '#14B8A6',
          description: 'Discharge summaries and records',
          isSystem: true,
        },
        {
          folderName: 'Insurance',
          color: '#10B981',
          description: 'Insurance policies and claims',
          isSystem: true,
        },
        {
          folderName: 'Other',
          color: '#6B7280',
          description: 'Miscellaneous documents',
          isSystem: true,
        },
      ];

      const created = [];
      for (const folderData of defaultFolders) {
        const existing = await MedicalFolder.findOne({
          patientId,
          parentFolderId: null,
          folderName: folderData.folderName,
          isDeleted: false,
        });
        if (!existing) {
          const folder = await MedicalFolder.create({
            patientId,
            parentFolderId: null,
            ...folderData,
          });
          created.push(folder);
        }
      }

      const folders = await MedicalFolder.find({ patientId, isDeleted: false })
        .sort({ folderName: 1 })
        .lean();

      res.json({
        success: true,
        message: 'Folders initialized',
        data: folders,
        created: created.length,
      });
    } catch (error) {
      logger.error('Initialize folders error:', error);
      res.status(500).json({ success: false, message: 'Failed to initialize folders' });
    }
  }

  // GET /api/folders/:id/files - Get files in folder
  async getFolderFiles(req, res) {
    try {
      const patientId = req.user._id;
      const folderId = req.params.id;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;

      if (folderId !== 'root') {
        const folder = await MedicalFolder.findOne({ _id: folderId, patientId, isDeleted: false });
        if (!folder) {
          return res.status(404).json({ success: false, message: 'Folder not found' });
        }
      }

      const filter = { patientId, isDeleted: false };
      if (folderId !== 'root') filter.folderId = folderId;
      else filter.folderId = null;

      const [files, total] = await Promise.all([
        MedicalFileStorage.find(filter)
          .sort({ uploadedAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        MedicalFileStorage.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: files,
        meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (error) {
      logger.error('Get folder files error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch folder files' });
    }
  }
}

module.exports = new FolderController();
