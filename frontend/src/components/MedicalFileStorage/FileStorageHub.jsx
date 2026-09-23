import React, { useState, useEffect, useCallback } from 'react';
import { fileStorageAPI } from '../../services/fileStorageAPI';
import { useAuth } from '../../contexts/AuthContext';
import { useFileStorageSync } from '../../hooks/useFileStorageSync';
import { useToast } from '../../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import UploadZone from './UploadZone';
import FileList from './FileList';
import FolderView from './FolderView';
import AdvancedSearch from './AdvancedSearch';
import FilePreview from './FilePreview';
import ShareModal from './ShareModal';
import EditFileModal from './EditFileModal';
import BulkOperationModal from './BulkOperationModal';
import Pagination from './Pagination';
import FolderManager from './FolderManager';

export default function FileStorageHub() {
  const { t } = useTranslation();
  const { patient } = useAuth();
  const { isOnline, cachedFiles, lastSync, cacheFiles } = useFileStorageSync(patient?.id);
  const { showToast } = useToast();
  
  // State
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  
  // UI State
  const [selectedFolderId, setSelectedFolderId] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showUpload, setShowUpload] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [shareFile, setShareFile] = useState(null);
  const [editingFile, setEditingFile] = useState(null);
  const [bulkOp, setBulkOp] = useState(null); // { type: 'move' | 'share', fileIds: [] }
  const [searchFilters, setSearchFilters] = useState({});
  
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [, setTotalFiles] = useState(0);

  const cachedFilesRef = React.useRef(cachedFiles);
  cachedFilesRef.current = cachedFiles;

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [filesRes, foldersRes, statsRes] = await Promise.all([
        fileStorageAPI.getFiles({
          folderId: selectedFolderId || undefined,
          page: currentPage,
          limit: pageSize,
          ...searchFilters
        }),
        fileStorageAPI.getFolders({ tree: 'true' }),
        fileStorageAPI.getFileStats(),
      ]);

      const freshFiles = filesRes.files || filesRes.data || [];
      setFiles(Array.isArray(freshFiles) ? freshFiles : []);
      setFolders(foldersRes.folders || foldersRes.data || []);
      setStats(statsRes.data || statsRes);
      setTags(statsRes.tags || statsRes.meta?.tags || []);
      setTotalPages(filesRes.meta?.totalPages || filesRes.pagination?.pages || 1);
      setTotalFiles(filesRes.meta?.total || filesRes.pagination?.total || 0);

      // Cache files for offline access (fire-and-forget to avoid fetch loop)
      if (Array.isArray(freshFiles) && freshFiles.length > 0) {
        cacheFiles(freshFiles).catch(() => {});
      }
    } catch (error) {
      showToast('Failed to load file storage data', 'error');
      // Offline: fall back to cached files so rural users still see their records
      const fallback = cachedFilesRef.current;
      if (fallback?.length) {
        setFiles(fallback);
        setTotalFiles(fallback.length);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedFolderId, currentPage, pageSize, searchFilters, cacheFiles, showToast]);

  // Load cached files on mount
  useEffect(() => {
    if (patient?.id) {
      fetchData();
    }
  }, [patient?.id, fetchData]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchFilters]);

  // Backend already filters by folderId + paginates; render the page as-is.
  const filteredFiles = files;

  const handleUploadComplete = (newFiles) => {
    const arr = Array.isArray(newFiles) ? newFiles : newFiles ? [newFiles] : [];
    if (!arr.length) {
      setShowUpload(false);
      fetchData();
      return;
    }
    setFiles(prev => [...arr, ...prev]);
    if (stats) {
      setStats(prev => ({
        ...prev,
        totalFiles: (prev.totalFiles || 0) + arr.length,
        totalSize: (prev.totalSize || 0) + arr.reduce((sum, f) => sum + (f.fileSize || 0), 0),
      }));
    }
    setShowUpload(false);
  };

  const handleFileSelect = (file) => {
    setPreviewFile(file);
  };

  const handleDownload = async (file) => {
    try {
      const res = await fileStorageAPI.getDownloadUrl(file.id);
      window.open(res.data.url, '_blank');
    } catch (error) {
      alert('Failed to download: ' + error.message);
    }
  };

  const handleShare = (file) => {
    setShareFile(file);
  };

  const handleDelete = async (file) => {
    if (!confirm(`Delete "${file.originalName}"?`)) return;
    
    try {
      await fileStorageAPI.deleteFile(file.id);
      setFiles(prev => prev.filter(f => f.id !== file.id));
      setSelectedFiles(prev => prev.filter(id => id !== file.id));
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  const handleEdit = (file) => {
    setEditingFile(file);
  };

  const handleEditSave = async (updates) => {
    await fileStorageAPI.updateFile(editingFile.id, updates);
    setEditingFile(null);
    fetchData();
  };

  const handleBulkDelete = async (fileIds) => {
    try {
      await fileStorageAPI.bulkDeleteFiles(fileIds);
      setFiles(prev => prev.filter(f => !fileIds.includes(f.id)));
      setSelectedFiles([]);
      fetchData(); // Refresh stats
    } catch (error) {
      alert('Bulk delete failed: ' + error.message);
      throw error;
    }
  };

  const handleBulkMove = (fileIds) => {
    setBulkOp({ type: 'move', fileIds: [...fileIds] });
  };

  const handleBulkShare = (fileIds) => {
    setBulkOp({ type: 'share', fileIds: [...fileIds] });
  };

  const handleBulkOpConfirm = () => {
    const count = bulkOp?.fileIds?.length || 0;
    setBulkOp(null);
    setSelectedFiles([]);
    fetchData();
    if (count > 0) alert(`Done! Updated ${count} file${count !== 1 ? 's' : ''}.`);
  };

  const handleRestore = async (file) => {
    try {
      await fileStorageAPI.restoreFile(file.id);
      // Refresh the file list to reflect the restored state
      fetchData();
    } catch (error) {
      alert('Failed to restore: ' + error.message);
    }
  };

  const handleSelectFolder = (folderId) => {
    setSelectedFolderId(folderId === 'root' ? null : folderId);
    setSelectedFiles([]);
  };

  const handleCreateFolder = async (data) => {
    try {
      const res = await fileStorageAPI.createFolder(data);
      setFolders(prev => [...prev, res.data]);
    } catch (error) {
      alert('Failed to create folder: ' + error.message);
    }
  };

  const handleEditFolder = async (folderId, data) => {
    try {
      await fileStorageAPI.updateFolder(folderId, data);
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, ...data } : f));
    } catch (error) {
      alert('Failed to update folder: ' + error.message);
    }
  };

  const handleDeleteFolder = async (folderId, recursive) => {
    try {
      await fileStorageAPI.deleteFolder(folderId, recursive);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      if (selectedFolderId === folderId) setSelectedFolderId(null);
    } catch (error) {
      alert('Failed to delete folder: ' + error.message);
    }
  };

  const handleInitializeFolders = async () => {
    try {
      const res = await fileStorageAPI.initializeFolders();
      setFolders(prev => [...prev, ...res.data]);
    } catch (error) {
      alert('Failed to initialize folders: ' + error.message);
    }
  };

  // Stats display
  const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="card" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Offline Banner */}
      {!isOnline && (
        <div className="alert alert-warning">
          <span>📴 You're offline. Showing cached files. Changes will sync when online.</span>
          {lastSync && (
            <span className="badge badge-warning">
              Last synced: {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-light flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {/* Mobile sidebar toggle */}
          <button 
            className="md:hidden btn btn-icon btn-secondary"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          <h2 className="text-xl font-semibold text-primary flex items-center gap-2">📁 {t('files.title')}</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">
            {stats ? `${stats.totalFiles} files • ${formatBytes(stats.totalSize)}` : 'Loading...'}
          </span>
          <button 
            className="btn btn-primary"
            onClick={() => setShowUpload(true)}
            disabled={!isOnline}
          >
            {t('files.uploadFiles')}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-0 flex overflow-hidden" style={{ display: 'flex', overflow: 'hidden' }}>
        {/* Mobile sidebar overlay */}
        <div 
          className={`file-storage-sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        
        {/* Left Sidebar - Folders */}
        <div 
          className={`file-storage-sidebar ${sidebarOpen ? 'open' : ''}`}
          style={{ width: '280px', borderRight: '1px solid #e5e7eb', overflow: 'auto' }}
        >
          <FolderView
            folders={folders}
            selectedFolderId={selectedFolderId}
            onSelectFolder={handleSelectFolder}
            onCreateFolder={handleCreateFolder}
            onEditFolder={handleEditFolder}
            onDeleteFolder={handleDeleteFolder}
            loading={loading}
          />
          
          <FolderManager
            folders={folders}
            selectedFolderId={selectedFolderId}
            onCreateFolder={handleCreateFolder}
          />
          
          {folders.length === 0 && (
            <div style={{ padding: '16px', borderTop: '1px solid #e5e7eb' }}>
              <button 
                className="btn btn-secondary"
                onClick={handleInitializeFolders}
                style={{ width: '100%' }}
              >
                Initialize System Folders
              </button>
            </div>
          )}
        </div>

        {/* Center - File List */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {/* Advanced Search */}
          <div style={{ borderBottom: '1px solid #e5e7eb' }}>
            <AdvancedSearch
              onSearch={() => {}}
              onFilterChange={setSearchFilters}
              availableTags={tags}
            />
          </div>

          {/* File List */}
          <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column' }}>
            <FileList
              files={filteredFiles}
              folders={folders}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              selectedFiles={selectedFiles}
              onSelectionChange={setSelectedFiles}
              onPreview={handleFileSelect}
              onDownload={handleDownload}
              onShare={handleShare}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onEdit={handleEdit}
              onBulkDelete={handleBulkDelete}
              onBulkShare={handleBulkShare}
              onBulkMove={handleBulkMove}
              loading={loading}
              emptyMessage={selectedFolderId ? 'No files in this folder' : 'No files in root'}
              onUploadClick={() => setShowUpload(true)}
            />
            {totalPages > 1 && (
              <div style={{ marginTop: '16px' }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Stats/Info */}
        <div className="file-storage-stats-sidebar mobile-stats-sidebar-hidden" style={{ width: '240px', borderLeft: '1px solid #e5e7eb', padding: '16px', overflow: 'auto' }}>
          <h3 className="label" style={{ marginBottom: '16px' }}>Storage Overview</h3>
          
          {stats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="card">
                <div className="text-2xl font-bold text-primary">{stats.totalFiles}</div>
                <div className="text-sm text-secondary">Total Files</div>
              </div>
              <div className="card">
                <div className="text-2xl font-bold text-primary">{formatBytes(stats.totalSize)}</div>
                <div className="text-sm text-secondary">Total Size</div>
              </div>
            </div>
          )}

{stats?.categories && (
            <div style={{ marginTop: '24px' }}>
              <h4 className="label">By Category</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.categories.map(cat => (
                  <div key={cat._id} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span className="text-sm">{cat._id.replace('_', ' ')}</span>
                    <span className="text-sm" style={{ fontWeight: 500 }}>{cat.count} files</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        
        {stats?.folders && stats.folders.length > 0 && (
          <div style={{ marginTop: '24px' }}>
            <h4 className="label">By Folder</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stats.folders.slice(0, 10).map(folder => (
                <div key={folder._id} className="flex" style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                  <span className="text-sm" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>{folder.name}</span>
                  <span className="text-sm" style={{ fontWeight: 500 }}>{folder.count} files</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Modals */}
    <UploadZone
      isOpen={showUpload}
      onClose={() => setShowUpload(false)}
      onUploadComplete={handleUploadComplete}
      folders={folders}
      selectedFolderId={selectedFolderId}
    />

    <FilePreview
      file={previewFile}
      isOpen={!!previewFile}
      onClose={() => setPreviewFile(null)}
      onDownload={handleDownload}
    />

    <ShareModal
      file={shareFile}
      isOpen={!!shareFile}
      onClose={() => setShareFile(null)}
    />

    <EditFileModal
      file={editingFile}
      folders={folders}
      isOpen={!!editingFile}
      onClose={() => setEditingFile(null)}
      onSave={handleEditSave}
    />

    <BulkOperationModal
      isOpen={!!bulkOp}
      type={bulkOp?.type}
      count={bulkOp?.fileIds?.length || 0}
      fileIds={bulkOp?.fileIds || []}
      folders={folders}
      onClose={() => setBulkOp(null)}
      onConfirm={handleBulkOpConfirm}
    />
  </div>
);
}