import React, { useState, useEffect, useCallback } from 'react';
import { fileStorageAPI } from '../../services/fileStorageAPI';
import { useAuth } from '../../contexts/AuthContext';
import { useFileStorageSync } from '../../hooks/useFileStorageSync';
import UploadZone from './UploadZone';
import FileList from './FileList';
import FolderView from './FolderView';
import AdvancedSearch from './AdvancedSearch';
import FilePreview from './FilePreview';
import ShareModal from './ShareModal';
import Pagination from './Pagination';
import FolderManager from './FolderManager';
import styles from './FileStorageStyles.module.css';

export default function FileStorageHub() {
  const { patient } = useAuth();
  const { isOnline, cachedFiles, lastSync, syncing, cacheFiles, syncFiles } = useFileStorageSync(patient?.id);
  
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
  const [searchFilters, setSearchFilters] = useState({});
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalFiles, setTotalFiles] = useState(0);

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
      setFiles(freshFiles);
      setFolders(foldersRes.folders || foldersRes.data || []);
      setStats(statsRes.data || statsRes);
      setTags(statsRes.tags || statsRes.meta?.tags || []);
      setTotalPages(filesRes.meta?.totalPages || filesRes.pagination?.pages || 1);
      setTotalFiles(filesRes.meta?.total || filesRes.pagination?.total || 0);
      
      // Cache files for offline access
      if (freshFiles.length > 0) {
        await cacheFiles(freshFiles);
      }
    } catch (error) {
      console.error('Failed to load file storage data:', error);
      // Try to load from cache if online fetch fails
      // The cached files will already be loaded via the hook
    } finally {
      setLoading(false);
    }
  }, [patient?.id, selectedFolderId, currentPage, pageSize, searchFilters, cacheFiles]);

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

  // Filter files based on selected folder and search
  const filteredFiles = files.filter(file => {
    if (selectedFolderId === null) {
      return file.folder === null || !file.folder;
    }
    return file.folder === selectedFolderId;
  });

  const handleUploadComplete = (newFiles) => {
    setFiles(prev => [...newFiles, ...prev]);
    if (stats) {
      setStats(prev => ({
        ...prev,
        totalFiles: prev.totalFiles + newFiles.length,
        totalSize: prev.totalSize + newFiles.reduce((sum, f) => sum + f.fileSize, 0),
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
    // Could open an edit modal - for now just log
    console.log('Edit file:', file);
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

  const handleRestore = async (file) => {
    try {
      await fileStorageAPI.restoreFile(file.id);
      // Refresh the file list to reflect the restored state
      fetchData();
    } catch (error) {
      alert('Failed to restore: ' + error.message);
    }
  };

  const handleBulkShare = async (fileIds) => {
    // TODO: Implement bulk share modal
    alert('Bulk share not yet implemented');
  };

  const handleBulkMove = async (fileIds) => {
    // TODO: Implement bulk move modal
    alert('Bulk move not yet implemented');
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
    <div className={styles.panel} style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Offline Banner */}
      {!isOnline && (
        <div className={styles.offlineBanner}>
          <span>📴 You're offline. Showing cached files. Changes will sync when online.</span>
          {lastSync && (
            <span className={styles.offlineBannerSync}>
              Last synced: {lastSync.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Header */}
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>📁 Medical File Storage</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span className={styles.textSm} style={{ color: '#6b7280' }}>
            {stats ? `${stats.totalFiles} files • ${formatBytes(stats.totalSize)}` : 'Loading...'}
          </span>
          <button 
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowUpload(true)}
            disabled={!isOnline}
          >
            + Upload Files
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className={styles.panelBody} style={{ flex: 1, padding: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar - Folders */}
        <div style={{ width: '280px', borderRight: '1px solid #e5e7eb', overflow: 'auto' }}>
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
                className={`${styles.btn} ${styles.btnSecondary}`}
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
            />
            {totalPages > 1 && (
              <div style={{ marginTop: '16px' }}>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  pageSize={pageSize}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
                  className={styles.pagination}
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Stats/Info */}
        <div style={{ width: '240px', borderLeft: '1px solid #e5e7eb', padding: '16px', overflow: 'auto' }}>
          <h3 className={styles.label} style={{ marginBottom: '16px' }}>Storage Overview</h3>
          
          {stats && (
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{stats.totalFiles}</div>
                <div className={styles.statLabel}>Total Files</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statValue}>{formatBytes(stats.totalSize)}</div>
                <div className={styles.statLabel}>Total Size</div>
              </div>
            </div>
          )}

          {stats?.categories && (
            <div style={{ marginTop: '24px' }}>
              <h4 className={styles.label}>By Category</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.categories.map(cat => (
                  <div key={cat._id} className={styles.flex} style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span className={styles.textSm}>{cat._id.replace('_', ' ')}</span>
                    <span className={styles.textSm} style={{ fontWeight: 500 }}>{cat.count} files</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats?.folders && stats.folders.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h4 className={styles.label}>By Folder</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.folders.slice(0, 10).map(folder => (
                  <div key={folder._id} className={styles.flex} style={{ justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <span className={styles.textSm} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>{folder.name}</span>
                    <span className={styles.textSm} style={{ fontWeight: 500 }}>{folder.count} files</span>
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
    </div>
  );
}