import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FileStorageStyles.module.css';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'Lab Report', label: 'Lab Report' },
  { value: 'Prescription', label: 'Prescription' },
  { value: 'Medical Image', label: 'Medical Image' },
  { value: 'Hospital Record', label: 'Hospital Record' },
  { value: 'Vaccination', label: 'Vaccination' },
  { value: 'Insurance', label: 'Insurance' },
  { value: 'Other', label: 'Other' },
];

const SORT_OPTIONS = [
  { value: 'uploadedAt', label: 'Date (Newest)', order: 'desc' },
  { value: 'uploadedAt', label: 'Date (Oldest)', order: 'asc' },
  { value: 'fileName', label: 'Name (A-Z)' },
  { value: 'fileSize', label: 'Size (Largest)' },
  { value: 'category', label: 'Category' },
];

export default function SearchBar({
  files = [],
  tags = [],
  onSearch,
  onFilterChange,
  initialFilters = {}
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialFilters.search || '');
  const [category, setCategory] = useState(initialFilters.category || '');
  const [selectedTags, setSelectedTags] = useState(initialFilters.tags || []);
  const [dateRange, setDateRange] = useState({
    start: initialFilters.startDate || '',
    end: initialFilters.endDate || '',
  });
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'uploadedAt');
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder || 'desc');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const filteredFiles = useMemo(() => {
    return files.filter(file => {
      if (query) {
        const searchLower = query.toLowerCase();
        const nameMatch = file.originalName?.toLowerCase().includes(searchLower);
        const descMatch = file.description?.toLowerCase().includes(searchLower);
        const tagMatch = file.tags?.some(t => t.toLowerCase().includes(searchLower));
        if (!nameMatch && !descMatch && !tagMatch) return false;
      }

      if (category && file.category !== category) return false;

      if (selectedTags.length > 0) {
        const fileTags = file.tags || [];
        if (!selectedTags.some(tag => fileTags.includes(tag))) return false;
      }

      if (dateRange.start) {
        const fileDate = new Date(file.uploadedAt || file.createdAt);
        if (fileDate < new Date(dateRange.start)) return false;
      }

      if (dateRange.end) {
        const fileDate = new Date(file.uploadedAt || file.createdAt);
        const endDate = new Date(dateRange.end);
        endDate.setHours(23, 59, 59, 999);
        if (fileDate > endDate) return false;
      }

      return true;
    });
  }, [files, query, category, selectedTags, dateRange]);

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      let aVal, bVal;
      switch (sortBy) {
        case 'fileName':
          aVal = a.originalName || '';
          bVal = b.originalName || '';
          break;
        case 'fileSize':
          aVal = a.fileSize || 0;
          bVal = b.fileSize || 0;
          break;
        case 'category':
          aVal = a.category || '';
          bVal = b.category || '';
          break;
        case 'uploadedAt':
        default:
          aVal = new Date(a.uploadedAt || a.createdAt);
          bVal = new Date(b.uploadedAt || b.createdAt);
          break;
      }
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (aVal < bVal) return -1 * dir;
      if (aVal > bVal) return 1 * dir;
      return 0;
    });
  }, [filteredFiles, sortBy, sortOrder]);

  const handleTagToggle = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setQuery('');
    setCategory('');
    setSelectedTags([]);
    setDateRange({ start: '', end: '' });
    setSortBy('uploadedAt');
    setSortOrder('desc');
  };

  const hasActiveFilters =
    category || selectedTags.length > 0 || dateRange.start || dateRange.end;

  const filters = useMemo(() => ({
    search: query,
    category,
    tags: selectedTags,
    startDate: dateRange.start,
    endDate: dateRange.end,
    sortBy,
    sortOrder,
  }), [query, category, selectedTags, dateRange, sortBy, sortOrder]);

  React.useEffect(() => {
    onFilterChange?.(filters);
  }, [filters, onFilterChange]);

  React.useEffect(() => {
    onSearch?.(sortedFiles);
  }, [sortedFiles, onSearch]);

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>🔍 Search & Filter</h2>
        <button
          className={`${styles.tab} ${showAdvanced ? styles.tabActive : ''}`}
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ padding: '8px 12px', fontSize: '0.875rem' }}
        >
          {showAdvanced ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      <div className={styles.panelBody}>
        {/* Main Search */}
        <div style={{ marginBottom: '16px' }}>
          <label className={styles.label}>{t('common.search')}</label>
          <div className={styles.flex} style={{ gap: '12px' }}>
            <input
              type="text"
              className={`${styles.input} ${styles.searchBox}`}
              placeholder="Search by name, description, tags..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
            />
            {query && (
              <button
                className={styles.btnIcon}
                onClick={() => setQuery('')}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Sort */}
        <div style={{ marginBottom: '16px' }}>
          <label className={styles.label}>{t('files.sortBy')}</label>
          <select
            className={`${styles.select} ${styles.input}`}
            value={sortBy}
            onChange={(e) => {
              const opt = SORT_OPTIONS.find(o => o.value === e.target.value);
              setSortBy(e.target.value);
              if (opt?.order) setSortOrder(opt.order);
              else setSortOrder('desc');
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={`${opt.value}-${opt.order || 'desc'}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div style={{
            padding: '16px',
            background: '#f9fafb',
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            animation: 'slideDown 0.2s ease'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              {/* Category Filter */}
              <div>
                <label className={styles.label}>Category</label>
                <select
                  className={`${styles.select} ${styles.input}`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Tags Filter */}
              <div>
                <label className={styles.label}>Tags</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflow: 'auto' }}>
                  {tags.slice(0, 20).map(tag => (
                    <button
                      key={tag}
                      className={`${styles.badge} ${selectedTags.includes(tag) ? styles.badgeBlue : styles.badgeGray}`}
                      onClick={() => handleTagToggle(tag)}
                      style={{
                        cursor: 'pointer',
                        border: 'none',
                        background: selectedTags.includes(tag) ? '#dbeafe' : '#f3f4f6',
                        color: selectedTags.includes(tag) ? '#1e40af' : '#374151',
                      }}
                    >
                      {tag}
                      {selectedTags.includes(tag) && ' ✕'}
                    </button>
                  ))}
                  {tags.length > 20 && (
                    <span className={styles.textXs} style={{ color: '#9ca3af', alignSelf: 'center' }}>
                      +{tags.length - 20} more
                    </span>
                  )}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className={styles.label}>From Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={dateRange.start}
                  onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className={styles.label}>To Date</label>
                <input
                  type="date"
                  className={styles.input}
                  value={dateRange.end}
                  onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className={styles.mt4} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={clearFilters}>
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div style={{
            padding: '12px 16px',
            background: '#fef3c7',
            borderRadius: '8px',
            border: '1px solid #fde68a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <span style={{ color: '#92400e', fontSize: '0.875rem' }}>
              Active filters: {[
                category && `Category: ${category}`,
                selectedTags.length && `Tags: ${selectedTags.join(', ')}`,
                dateRange.start && `From: ${dateRange.start}`,
                dateRange.end && `To: ${dateRange.end}`,
              ].filter(Boolean).join(' | ')}
            </span>
            <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={clearFilters}>
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
}