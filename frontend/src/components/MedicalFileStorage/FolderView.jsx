import React, { useState, useMemo } from 'react';
import styles from './FileStorageStyles.module.css';

export default function FolderView({ 
  folders = [], 
  selectedFolderId = null,
  onSelectFolder,
  onCreateFolder,
  onEditFolder,
  onDeleteFolder,
  loading = false 
}) {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'tree'
  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [editingFolder, setEditingFolder] = useState(null);
  const [editName, setEditName] = useState('');

  const getParentId = (f) => f?.parentFolderId ?? f?.parent ?? f?.parentId ?? null;
  const rootFolders = useMemo(() =>
    folders.filter(f => !getParentId(f)).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)),
    [folders]
  );

  const getChildren = (parentId) =>
    folders.filter(f => {
      const pid = getParentId(f);
      return pid !== null && pid !== undefined && String(pid) === String(parentId);
    }).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const getDescendantIds = (folderId) => {
    const children = getChildren(folderId);
    let ids = children.map(c => c.id);
    children.forEach(c => {
      ids = ids.concat(getDescendantIds(c.id));
    });
    return ids;
  };

  const toggleExpanded = (folderId) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
        getDescendantIds(folderId).forEach(id => next.delete(id));
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const isExpanded = (folderId) => expandedFolders.has(folderId);
  const hasChildren = (folderId) => getChildren(folderId).length > 0;

  const renderFolderNode = (folder, depth = 0) => {
    const children = getChildren(folder.id);
    const expanded = isExpanded(folder.id);
    const isSelected = selectedFolderId === folder.id;
    const isSystem = folder.isSystem;

    return (
      <div key={folder.id} style={{ marginLeft: `${depth * 20}px` }}>
        <div
          className={`${styles.folderNode} ${isSelected ? styles.folderNodeActive : ''}`}
          onClick={() => onSelectFolder?.(folder.id)}
          style={{ 
            opacity: editingFolder === folder.id ? 0.5 : 1,
            borderLeft: isSystem ? '3px solid #f59e0b' : 'none',
          }}
        >
          {hasChildren(folder.id) && (
            <button
              className={styles.folderExpand}
              onClick={(e) => { e.stopPropagation(); toggleExpanded(folder.id); }}
              aria-label={expanded ? 'Collapse' : 'Expand'}
            >
              {expanded ? '▼' : '▶'}
            </button>
          )}
          {!hasChildren(folder.id) && <div className={styles.folderExpand} />}

          <div 
            className={styles.folderIcon} 
            style={{ background: folder.color || '#3b82f6' }}
          >
            {folder.icon || '📁'}
          </div>

          {editingFolder === folder.id ? (
            <input
              type="text"
              className={styles.input}
              style={{ flex: 1, maxWidth: '200px' }}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onBlur={() => handleSaveEdit(folder.id)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(folder.id); }}
              autoFocus
            />
          ) : (
            <span 
              className={styles.folderName}
              onDoubleClick={() => !isSystem && startEdit(folder)}
            >
              {folder.name}
              {isSystem && <span className={styles.badge} style={{ marginLeft: '8px', fontSize: '0.625rem' }}>System</span>}
            </span>
          )}

          {(folder.fileCount || 0) > 0 && (
            <span className={styles.folderCount}>{folder.fileCount}</span>
          )}

          <div className={styles.flex} style={{ gap: '4px' }}>
            {!isSystem && (
              <>
                <button 
                  className={styles.btnIcon} 
                  onClick={(e) => { e.stopPropagation(); startEdit(folder); }}
                  title="Rename"
                >✏️</button>
                <button 
                  className={styles.btnIcon} 
                  onClick={(e) => { e.stopPropagation(); handleCreateSubfolder(folder.id); }}
                  title="Add subfolder"
                >➕</button>
                <button 
                  className={styles.btnIcon} 
                  onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }}
                  title="Delete"
                  style={{ color: '#ef4444' }}
                >🗑️</button>
              </>
            )}
          </div>
        </div>

        {expanded && children.length > 0 && (
          <div className={styles.folderChildren}>
            {children.map(child => renderFolderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderFolderCard = (folder) => {
    const isSelected = selectedFolderId === folder.id;
    const isSystem = folder.isSystem;

    return (
      <div
        key={folder.id}
        className={`${styles.folderCard} ${isSelected ? styles.folderCardSelected : ''}`}
        onClick={() => onSelectFolder?.(folder.id)}
        style={{ 
          '--folder-color': folder.color || '#3b82f6',
          borderLeft: isSystem ? '4px solid #f59e0b' : 'none',
        }}
      >
        <div className={styles.folderCardIcon}>
          {folder.icon || '📁'}
        </div>
        <p className={styles.folderCardName}>{folder.name}</p>
        <p className={styles.folderCardCount}>
          {folder.fileCount || 0} file{folder.fileCount !== 1 ? 's' : ''}
        </p>
        {folder.description && (
          <p className={styles.folderCardDescription}>{folder.description}</p>
        )}
        {!isSystem && (
          <div className={styles.flex} style={{ gap: '4px', justifyContent: 'center', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
            <button 
              className={styles.btnIcon} 
              onClick={(e) => { e.stopPropagation(); startEdit(folder); }}
              title="Rename"
            >✏️</button>
            <button 
              className={styles.btnIcon} 
              onClick={(e) => { e.stopPropagation(); handleCreateSubfolder(folder.id); }}
              title="Add subfolder"
            >➕</button>
            <button 
              className={styles.btnIcon} 
              onClick={(e) => { e.stopPropagation(); handleDelete(folder.id); }}
              title="Delete"
              style={{ color: '#ef4444' }}
            >🗑️</button>
          </div>
        )}
      </div>
    );
  };

  const startEdit = (folder) => {
    setEditingFolder(folder.id);
    setEditName(folder.name);
  };

  const handleSaveEdit = (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder && editName.trim() && editName.trim() !== folder.name) {
      onEditFolder?.(folderId, { name: editName.trim() });
    }
    setEditingFolder(null);
    setEditName('');
  };

  const handleCreateSubfolder = (parentId) => {
    const name = prompt('Enter subfolder name:');
    if (name?.trim()) {
      onCreateFolder?.({ folderName: name.trim(), parentFolderId: parentId });
    }
  };

  const handleDelete = (folderId) => {
    const folder = folders.find(f => f.id === folderId);
    const children = getChildren(folderId);
    const files = folder?.fileCount || 0;
    
    let message = `Delete "${folder?.name}"?`;
    if (children.length > 0 || files > 0) {
      message += `\nThis folder contains ${children.length} subfolder(s) and ${files} file(s).`;
      if (!confirm(message + '\n\nDelete recursively?')) return;
      onDeleteFolder?.(folderId, true);
    } else if (confirm(message)) {
      onDeleteFolder?.(folderId, false);
    }
  };

  if (loading) {
    return (
      <div className={styles.panel} style={{ minHeight: '300px' }}>
        <div className={styles.flex} style={{ justifyContent: 'center', padding: '48px' }}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>📁 Folders</h2>
        <div className={styles.flex} style={{ gap: '8px', alignItems: 'center' }}>
          <select
            className={`${styles.select} ${styles.input}`}
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            style={{ minWidth: '140px' }}
          >
            <option value="cards">📦 Cards</option>
            <option value="tree">🌲 Tree</option>
          </select>
        </div>
      </div>

      <div className={styles.panelBody} style={{ maxHeight: '600px', overflow: 'auto' }}>
        {rootFolders.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>📁</div>
            <p className={styles.textMuted}>No folders yet</p>
            <button 
              className={`${styles.btn} ${styles.btnPrimary} ${styles.mt4}`}
              onClick={() => {
                const name = prompt('Enter folder name:');
                if (name?.trim()) onCreateFolder?.({ name: name.trim() });
              }}
            >
              Create First Folder
            </button>
          </div>
        ) : (
          <div>
            {viewMode === 'cards' ? (
              <div className={styles.folderGrid}>
                {rootFolders.map(renderFolderCard)}
              </div>
            ) : (
              <div className={styles.folderTree}>
                {rootFolders.map(folder => renderFolderNode(folder))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}