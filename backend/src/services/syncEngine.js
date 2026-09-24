const {
  MedicalFileStorage,
  MedicalFolder,
  FileAccessLog,
  Medicine,
  Appointment,
} = require('../models');
const {
  FILE_CLIENT_FIELDS,
  FOLDER_CLIENT_FIELDS,
  MEDICINE_CLIENT_FIELDS,
  stripClientFields,
} = require('../utils/fieldSanitizer');
const logger = require('../utils/logger');

const CONFLICT_RESOLUTION = {
  SERVER_WINS: 'server_wins',
  CLIENT_WINS: 'client_wins',
  MERGE: 'merge',
  MANUAL: 'manual',
};

class SyncEngine {
  constructor() {
    this.syncQueue = new Map();
    this.processing = false;
  }

  // Resolve a specific conflict with a chosen resolution
  async resolveConflict(conflictId, resolution) {
    const resolutionId = resolution && resolution.toString().toLowerCase();
    if (resolutionId === 'server_wins' || resolutionId === 'server') {
      return { conflictId, resolution: 'server_wins', resolved: true };
    }
    if (resolutionId === 'client_wins' || resolutionId === 'client') {
      return { conflictId, resolution: 'client_wins', resolved: true };
    }
    if (resolutionId === 'merge') {
      return { conflictId, resolution: 'merge', resolved: true };
    }
    return { conflictId, resolution, resolved: false, message: 'Unknown resolution' };
  }

  // Generate sync manifest for client
  async generateManifest(patientId, lastSyncTimestamp) {
    try {
      const since = lastSyncTimestamp ? new Date(lastSyncTimestamp) : new Date(0);

      const [files, folders, medicines, appointments, accessLogs] = await Promise.all([
        MedicalFileStorage.find({
          patientId,
          $or: [
            { uploadedAt: { $gt: since } },
            { updatedAt: { $gt: since } },
            { isDeleted: true, deletedAt: { $gt: since } },
          ],
        })
          .select(
            'fileName fileKey fileSize mimeType category tags folderId uploadedAt updatedAt isDeleted deletedAt recoveryExpiresAt version'
          )
          .lean(),

        MedicalFolder.find({
          patientId,
          $or: [
            { createdAt: { $gt: since } },
            { updatedAt: { $gt: since } },
            { isDeleted: true, deletedAt: { $gt: since } },
          ],
        })
          .select(
            'folderName color description parentFolderId isDeleted deletedAt fileCount totalSize sortOrder updatedAt'
          )
          .lean(),

        Medicine.find({
          patient: patientId,
          $or: [{ createdAt: { $gt: since } }, { updatedAt: { $gt: since } }],
        }).lean(),

        Appointment.find({
          patient: patientId,
          $or: [{ createdAt: { $gt: since } }, { updatedAt: { $gt: since } }],
        }).lean(),

        FileAccessLog.find({
          patientId,
          timestamp: { $gt: since },
        })
          .select('fileId accessType timestamp userType success')
          .lean(),
      ]);

      return {
        timestamp: new Date().toISOString(),
        files: files.map(f => ({
          id: f._id,
          fileName: f.fileName,
          fileKey: f.fileKey,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          category: f.category,
          tags: f.tags,
          folderId: f.folderId,
          uploadedAt: f.uploadedAt,
          updatedAt: f.updatedAt,
          isDeleted: f.isDeleted,
          deletedAt: f.deletedAt,
          recoveryExpiresAt: f.recoveryExpiresAt,
          version: f.version,
          action: f.isDeleted ? 'delete' : f.version > 1 ? 'update' : 'create',
        })),
        folders: folders.map(f => ({
          id: f._id,
          folderName: f.folderName,
          color: f.color,
          description: f.description,
          parentFolderId: f.parentFolderId,
          isDeleted: f.isDeleted,
          deletedAt: f.deletedAt,
          fileCount: f.fileCount,
          totalSize: f.totalSize,
          sortOrder: f.sortOrder,
          updatedAt: f.updatedAt,
          action: f.isDeleted ? 'delete' : 'upsert',
        })),
        medicines: medicines.map(m => ({
          id: m._id,
          name: m.name,
          dosage: m.dosage,
          frequency: m.frequency,
          timeOfDay: m.timeOfDay,
          instructions: m.instructions,
          isActive: m.isActive,
          startDate: m.startDate,
          endDate: m.endDate,
          doseLogs: m.doseLogs,
          action: m.isDeleted ? 'delete' : 'upsert',
        })),
        appointments: appointments.map(a => ({
          id: a._id,
          doctorId: a.doctorId,
          type: a.type,
          scheduledAt: a.scheduledAt,
          status: a.status,
          notes: a.notes,
          action: 'upsert',
        })),
        accessLogs: accessLogs.map(l => ({
          id: l._id,
          fileId: l.fileId,
          accessType: l.accessType,
          timestamp: l.timestamp,
          userType: l.userType,
          success: l.success,
        })),
        stats: {
          filesCount: files.length,
          foldersCount: folders.length,
          medicinesCount: medicines.length,
          appointmentsCount: appointments.length,
          accessLogsCount: accessLogs.length,
        },
      };
    } catch (error) {
      logger.error('Generate manifest failed:', error);
      throw error;
    }
  }

  // Apply client changes with conflict resolution
  async applyChanges(
    patientId,
    changes = {},
    resolutionStrategy = CONFLICT_RESOLUTION.SERVER_WINS
  ) {
    const results = {
      applied: [],
      conflicts: [],
      errors: [],
    };

    // Process files
    if (changes.files?.length) {
      for (const fileChange of changes.files) {
        try {
          const result = await this.applyFileChange(patientId, fileChange, resolutionStrategy);
          result.clientId = fileChange.clientId || fileChange.id;
          if (result.conflict) {
            results.conflicts.push(result);
          } else {
            results.applied.push(result);
          }
        } catch (error) {
          results.errors.push({ id: fileChange.id, error: error.message });
        }
      }
    }

    // Process folders
    if (changes.folders?.length) {
      for (const folderChange of changes.folders) {
        try {
          const result = await this.applyFolderChange(patientId, folderChange, resolutionStrategy);
          result.clientId = folderChange.clientId || folderChange.id;
          if (result.conflict) {
            results.conflicts.push(result);
          } else {
            results.applied.push(result);
          }
        } catch (error) {
          results.errors.push({ id: folderChange.id, error: error.message });
        }
      }
    }

    // Process medicines
    if (changes.medicines?.length) {
      for (const medChange of changes.medicines) {
        try {
          const result = await this.applyMedicineChange(patientId, medChange, resolutionStrategy);
          result.clientId = medChange.clientId || medChange.id;
          if (result.conflict) {
            results.conflicts.push(result);
          } else {
            results.applied.push(result);
          }
        } catch (error) {
          results.errors.push({ id: medChange.id, error: error.message });
        }
      }
    }

    return results;
  }

  async applyFileChange(patientId, change, strategy) {
    const { id, action } = change;
    const data = stripClientFields(change, FILE_CLIENT_FIELDS);

    if (action === 'delete') {
      const file = await MedicalFileStorage.findOne({ _id: id, patientId });
      if (!file) return { id, action: 'delete', status: 'not_found' };

      if (file.updatedAt > new Date(change.updatedAt || 0)) {
        if (strategy === CONFLICT_RESOLUTION.SERVER_WINS) {
          file.isDeleted = true;
          file.deletedAt = new Date();
          await file.save();
          return { id, action: 'delete', status: 'server_wins', conflict: true };
        } else if (strategy === CONFLICT_RESOLUTION.CLIENT_WINS) {
          return { id, action: 'delete', status: 'client_wins', conflict: true };
        }
      }

      file.isDeleted = true;
      file.deletedAt = new Date();
      await file.save();
      return { id, action: 'delete', status: 'applied' };
    }

    if (action === 'create' || action === 'update') {
      if (data.folderId) {
        const ownsFolder = await MedicalFolder.exists({ _id: data.folderId, patientId });
        if (!ownsFolder) {
          delete data.folderId;
        }
      }

      const existing = id ? await MedicalFileStorage.findOne({ _id: id, patientId }) : null;

      if (existing && existing.updatedAt > new Date(change.updatedAt || 0)) {
        if (strategy === CONFLICT_RESOLUTION.SERVER_WINS) {
          return {
            id: existing._id,
            action,
            status: 'server_wins',
            conflict: true,
            serverData: existing,
          };
        } else if (strategy === CONFLICT_RESOLUTION.CLIENT_WINS) {
          Object.assign(existing, data);
          existing.updatedAt = new Date();
          await existing.save();
          return { id: existing._id, action, status: 'client_wins', conflict: true };
        }
      }

      if (existing) {
        Object.assign(existing, data);
        existing.updatedAt = new Date();
        await existing.save();
        return { id: existing._id, action: 'update', status: 'applied' };
      }

      const created = await MedicalFileStorage.create({
        patientId,
        ...data,
      });
      return { id: created._id, action: 'create', status: 'applied' };
    }

    return { id, action, status: 'unknown_action' };
  }

  async applyFolderChange(patientId, change, strategy) {
    const { id, action } = change;
    const data = stripClientFields(change, FOLDER_CLIENT_FIELDS);

    if (action === 'delete') {
      const folder = await MedicalFolder.findOne({ _id: id, patientId });
      if (!folder) return { id, action: 'delete', status: 'not_found' };

      folder.isDeleted = true;
      folder.deletedAt = new Date();
      await folder.save();
      return { id, action: 'delete', status: 'applied' };
    }

    if (data.parentFolderId) {
      const ownsParent = await MedicalFolder.exists({ _id: data.parentFolderId, patientId });
      if (!ownsParent) {
        delete data.parentFolderId;
      }
    }

    const existing = id ? await MedicalFolder.findOne({ _id: id, patientId }) : null;

    if (existing && existing.updatedAt > new Date(change.updatedAt || 0)) {
      if (strategy === CONFLICT_RESOLUTION.SERVER_WINS) {
        return {
          id: existing._id,
          action,
          status: 'server_wins',
          conflict: true,
          serverData: existing,
        };
      }
    }

    if (existing) {
      Object.assign(existing, data);
      existing.updatedAt = new Date();
      await existing.save();
      return { id: existing._id, action: 'update', status: 'applied' };
    }

    const created = await MedicalFolder.create({
      patientId,
      ...data,
    });
    return { id: created._id, action: 'create', status: 'applied' };
  }

  async applyMedicineChange(patientId, change, strategy) {
    const { id, action } = change;
    const data = stripClientFields(change, MEDICINE_CLIENT_FIELDS);

    if (action === 'delete') {
      const med = await Medicine.findOne({ _id: id, patient: patientId });
      if (!med) return { id, action: 'delete', status: 'not_found' };
      // Medicine schema has no isDeleted; hard-delete via archive flag
      med.isActive = false;
      await med.save();
      return { id, action: 'delete', status: 'applied' };
    }

    const existing = id ? await Medicine.findOne({ _id: id, patient: patientId }) : null;

    if (existing && existing.updatedAt > new Date(change.updatedAt || 0)) {
      if (strategy === CONFLICT_RESOLUTION.SERVER_WINS) {
        return { id: existing._id, action, status: 'server_wins', conflict: true };
      }
    }

    if (existing) {
      Object.assign(existing, data);
      existing.updatedAt = new Date();
      await existing.save();
      return { id: existing._id, action: 'update', status: 'applied' };
    }

    const created = await Medicine.create({
      patient: patientId,
      ...data,
    });
    return { id: created._id, action: 'create', status: 'applied' };
  }

  // Generate delta sync for low bandwidth
  async generateDeltaSync(patientId, clientState) {
    const serverState = await this.generateManifest(patientId, clientState.lastSync);

    const delta = {
      timestamp: serverState.timestamp,
      added: [],
      modified: [],
      deleted: [],
      unchanged: [],
    };

    // Files
    for (const file of serverState.files) {
      const clientFile = clientState.files?.find(f => f.id === file.id);
      if (!clientFile) {
        delta.added.push(file);
      } else if (clientFile.version !== file.version || clientFile.updatedAt !== file.updatedAt) {
        delta.modified.push(file);
      } else {
        delta.unchanged.push({ id: file.id });
      }
    }

    // Folders
    for (const folder of serverState.folders) {
      const clientFolder = clientState.folders?.find(f => f.id === folder.id);
      if (!clientFolder) {
        delta.added.push(folder);
      } else if (clientFolder.updatedAt !== folder.updatedAt) {
        delta.modified.push(folder);
      } else {
        delta.unchanged.push({ id: folder.id });
      }
    }

    // Find deleted items
    const serverFileIds = new Set(serverState.files.map(f => f.id));
    const clientFileIds = new Set(clientState.files?.map(f => f.id) || []);
    for (const id of clientFileIds) {
      if (!serverFileIds.has(id)) {
        delta.deleted.push({ id, type: 'file' });
      }
    }

    return delta;
  }
}

module.exports = new SyncEngine();
