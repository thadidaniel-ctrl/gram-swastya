import { api } from './api';

export const fileStorageAPI = {
  // Files
  getFiles: (params = {}) => api.getFiles(params),
  getFileStats: () => api.getFileStats(),
  uploadFiles: (formData) => api.uploadFiles(formData),
  getDownloadUrl: (fileId) => api.getDownloadUrl(fileId),
  getPreviewUrl: (fileId) => api.getPreviewUrl(fileId),
  updateFile: (fileId, data) => api.updateFile(fileId, data),
  deleteFile: (fileId) => api.deleteFile(fileId),
  restoreFile: (fileId) => api.request(`/patient/file-storage/${fileId}/restore`, { method: 'POST' }),
  bulkDeleteFiles: (fileIds) => api.request('/patient/file-storage/bulk-delete', {
    method: 'POST',
    body: { fileIds },
  }),
  getActivity: (params = {}) => api.request('/patient/file-storage/activity', { params }),
  shareFile: (fileId, data) => api.shareFile(fileId, data),
  unshareFile: (fileId, doctorId) => api.unshareFile(fileId, doctorId),
  createVersion: (fileId, formData) => api.createVersion(fileId, formData),

  // Folders
  getFolders: (params = {}) => api.getFolders(params),
  createFolder: (data) => api.createFolder(data),
  updateFolder: (folderId, data) => api.updateFolder(folderId, data),
  deleteFolder: (folderId, recursive = false) => api.deleteFolder(folderId, recursive),
  initializeFolders: () => api.request('/patient/folders/initialize', { method: 'POST' }),

  // Doctor list for sharing
  getDoctorList: () => api.request('/patient/auth/doctors').catch(() => ({ data: [] })),
};

export default fileStorageAPI;