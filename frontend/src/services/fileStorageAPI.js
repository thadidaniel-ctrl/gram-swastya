import { api } from './api';

// Normalize a shared-with entry: backend populates sharedWith.doctorId -> { id, name, specialization }
function normalizeShare(share) {
  if (!share) return share;
  const doctorSrc = share.doctor || share.doctorId;
  const doctor = doctorSrc && typeof doctorSrc === 'object'
    ? {
        id: doctorSrc.id || doctorSrc._id,
        _id: doctorSrc._id || doctorSrc.id,
        name: doctorSrc.profile?.fullName
          || `${doctorSrc.firstName || doctorSrc.profile?.firstName || ''} ${doctorSrc.lastName || doctorSrc.profile?.lastName || ''}`.trim()
          || doctorSrc.name
          || '',
        firstName: doctorSrc.firstName || doctorSrc.profile?.firstName,
        lastName: doctorSrc.lastName || doctorSrc.profile?.lastName,
        specialization: doctorSrc.specialization || doctorSrc.profile?.specialization || '',
      }
    : doctorSrc;
  return { ...share, doctor, doctorId: share.doctorId || share.doctor, permissions: share.permissions || share.accessLevel || 'view-only' };
}

// Normalize a file object from any backend shape to the shape the UI expects:
//   id, originalName, fileName, name, size, type, mimeType, fileSize, category,
//   uploadedAt, description, isDeleted, recoveryExpiresAt, version, folder...
function normalizeFile(file) {
  if (!file) return file;
  const id = file.id || file._id || file.fileId;
  return {
    ...file,
    id,
    fileId: id,
    originalName: file.originalName || file.fileName || file.name || file.originalname || 'Untitled',
    fileName: file.fileName || file.originalName || file.name,
    name: file.name || file.fileName || file.originalName,
    size: Number.isFinite(file.size) ? file.size : file.fileSize,
    fileSize: Number.isFinite(file.fileSize) ? file.fileSize : file.size,
    type: file.type || file.mimeType,
    mimeType: file.mimeType || file.type,
    folder: normalizeFolder(file.folder) || file.folderId,
    sharedWith: Array.isArray(file.sharedWith) ? file.sharedWith.map(normalizeShare) : file.sharedWith,
  };
}

// Normalize a folder object (including nested children)
function normalizeFolder(folder) {
  if (!folder) return folder;
  if (typeof folder === 'string') return folder;
  const id = folder.id || folder._id;
  const normalized = {
    ...folder,
    id,
    name: folder.name || folder.folderName || folder.title || 'Untitled',
    folderName: folder.folderName || folder.name,
    isSystem: Boolean(folder.isSystem),
  };
  if (Array.isArray(normalized.children)) {
    normalized.children = normalized.children.map(normalizeFolder);
  }
  return normalized;
}

function normalizeFileList(data) {
  if (Array.isArray(data)) return data.map(normalizeFile);
  if (data && Array.isArray(data.files)) return data.files.map(normalizeFile);
  return data;
}

function normalizeFolderList(data) {
  if (Array.isArray(data)) return data.map(normalizeFolder);
  if (data && Array.isArray(data.folders)) return data.folders.map(normalizeFolder);
  return data;
}

export const fileStorageAPI = {
  // Files
  getFiles: async (params = {}) => {
    const res = await api.getFiles(params);
    return { ...res, files: normalizeFileList(res.files || res.data) };
  },
  getFileStats: () => api.getFileStats(),
  uploadFiles: async (formData) => {
    const res = await api.uploadFiles(formData);
    return { ...res, data: normalizeFileList(res.data) };
  },
  getDownloadUrl: (fileId) => api.getDownloadUrl(fileId),
  getPreviewUrl: async (fileId) => {
    const res = await api.getPreviewUrl(fileId);
    if (res.data?.file) {
      return { ...res, data: { ...res.data, file: normalizeFile(res.data.file) } };
    }
    return res;
  },
  updateFile: (fileId, data) => api.updateFile(fileId, data),
  deleteFile: (fileId) => api.deleteFile(fileId),
  restoreFile: (fileId) => api.request(`/patient/file-storage/${fileId}/restore`, { method: 'POST' }),
  bulkDeleteFiles: (fileIds) => api.request('/patient/file-storage/bulk-delete', {
    method: 'POST',
    body: { fileIds },
  }),
  bulkMoveFiles: (fileIds, folderId) => api.request('/patient/file-storage/bulk-move', {
    method: 'POST',
    body: { fileIds, folderId: folderId || null },
  }),
  bulkShareFiles: (fileIds, doctorId, expiresAt) => api.request('/patient/file-storage/bulk-share', {
    method: 'POST',
    body: { fileIds, doctorId, expiresAt: expiresAt || undefined },
  }),
  getActivity: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return api.request(`/patient/file-storage/activity${qs ? `?${qs}` : ''}`);
  },
  shareFile: (fileId, data) => api.shareFile(fileId, data),
  unshareFile: (fileId, doctorId) => api.unshareFile(fileId, doctorId),
  createVersion: (fileId, formData) => api.createVersion(fileId, formData),

  // Folders
  getFolders: async (params = {}) => {
    const res = await api.getFolders(params);
    return { ...res, folders: normalizeFolderList(res.folders || res.data) };
  },
  createFolder: (data) => api.createFolder(data),
  updateFolder: (folderId, data) => api.updateFolder(folderId, data),
  deleteFolder: (folderId, recursive = false) => api.deleteFolder(folderId, recursive),
  initializeFolders: () => api.request('/patient/folders/initialize', { method: 'POST' }),

  // Doctor list for sharing
  getDoctorList: () => api.getDoctorList().catch(() => ({ data: [] })),
};

export default fileStorageAPI;