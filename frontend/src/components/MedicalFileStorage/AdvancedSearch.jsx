import React, { useState, useCallback } from 'react';
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

export default function AdvancedSearch({
  onSearch,
  onFilterChange,
  initialFilters = {},
  availableTags = [],
}) {
  const [query, setQuery] = useState(initialFilters.search || '');
  const [expanded, setExpanded] = useState(false);
  const [category, setCategory] = useState(initialFilters.category || '');
  const [tags, setTags] = useState(initialFilters.tags || '');
  const [dateFrom, setDateFrom] = useState(initialFilters.dateFrom || '');
  const [dateTo, setDateTo] = useState(initialFilters.dateTo || '');
  const [sizeMin, setSizeMin] = useState(initialFilters.sizeMin || '');
  const [sizeMax, setSizeMax] = useState(initialFilters.sizeMax || '');
  const [sharedOnly, setSharedOnly] = useState(initialFilters.sharedOnly || false);
  const [sortBy, setSortBy] = useState(initialFilters.sortBy || 'uploadedAt');
  const [sortOrder, setSortOrder] = useState(initialFilters.sortOrder || 'desc');

  const buildFilters = useCallback(() => ({
    search: query,
    category,
    tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    dateFrom,
    dateTo,
    sizeMin: sizeMin ? parseFloat(sizeMin) : undefined,
    sizeMax: sizeMax ? parseFloat(sizeMax) : undefined,
    sharedOnly,
    sortBy,
    sortOrder,
  }), [query, category, tags, dateFrom, dateTo, sizeMin, sizeMax, sharedOnly, sortBy, sortOrder]);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(query);
  };

  const handleFilterChange = () => {
    const filters = buildFilters();
    onFilterChange?.(filters);
  };

  const clearAll = () => {
    setQuery('');
    setCategory('');
    setTags('');
    setDateFrom('');
    setDateTo('');
    setSizeMin('');
    setSizeMax('');
    setSharedOnly(false);
    setSortBy('uploadedAt');
    setSortOrder('desc');
    onFilterChange?.(buildFilters());
  };

  const hasActiveFilters = category || tags || dateFrom || dateTo || sizeMin || sizeMax || sharedOnly;

  return (
    <div className={styles.advancedSearch}>
      {/* Main Search Bar */}
      <form onSubmit={handleSearch} className={styles.searchForm}>
        <div className={styles.searchInputWrapper}>
          <label htmlFor="main-search" className={styles.visuallyHidden}>Search files</label>
          <input
            id="main-search"
            type="text"
            className={`${styles.input} ${styles.searchInput}`}
            placeholder="Search by filename, description, tags..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
          />
          {query && (
            <button
              type="button"
              className={styles.clearSearchBtn}
              onClick={() => setQuery('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        
        <button
          type="button"
          className={`${styles.btn} ${styles.btnGhost} ${expanded ? styles.active : ''}`}
          onClick={() => setExpanded(!expanded)}
          style={{ marginLeft: '8px' }}
        >
          {expanded ? '🔽 Hide Filters' : '🔍 Filters'}
        </button>
      </form>

      {/* Advanced Filters Panel */}
      {expanded && (
        <div className={styles.filtersPanel}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {/* Category Filter */}
            <div>
              <label htmlFor="filter-category" className={styles.label}>Category</label>
              <select
                id="filter-category"
                className={`${styles.select} ${styles.input}`}
                value={category}
                onChange={(e) => { setCategory(e.target.value); handleFilterChange(); }}
              >
                {CATEGORY_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <label htmlFor="filter-tags" className={styles.label}>Tags (comma-separated)</label>
              <input
                id="filter-tags"
                type="text"
                className={styles.input}
                placeholder="e.g., cardiology, follow-up, urgent"
                value={tags}
                onChange={(e) => { setTags(e.target.value); handleFilterChange(); }}
              />
              {availableTags.length > 0 && (
                <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {availableTags.slice(0, 15).map(tag => (
                    <button
                      key={tag}
                      type="button"
                      className={`${styles.badge} ${tags.includes(tag) ? styles.badgeBlue : styles.badgeGray}`}
                      onClick={() => {
                        const newTags = tags.includes(tag)
                          ? tags.split(',').map(t => t.trim()).filter(t => t !== tag).join(', ')
                          : [tags, tag].filter(Boolean).join(', ');
                        setTags(newTags);
                        handleFilterChange();
                      }}
                      style={{ cursor: 'pointer', border: 'none', background: tags.includes(tag) ? '#dbeafe' : '#f3f4f6', color: tags.includes(tag) ? '#1e40af' : '#374151' }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date Range */}
            <div>
              <label htmlFor="filter-date-from" className={styles.label}>From Date</label>
              <input
                id="filter-date-from"
                type="date"
                className={styles.input}
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div>
              <label htmlFor="filter-date-to" className={styles.label}>To Date</label>
              <input
                id="filter-date-to"
                type="date"
                className={styles.input}
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* File Size Range */}
            <div>
              <label htmlFor="filter-size-min" className={styles.label}>Min Size (MB)</label>
              <input
                id="filter-size-min"
                type="number"
                className={styles.input}
                placeholder="0"
                min="0"
                step="0.1"
                value={sizeMin}
                onChange={(e) => { setSizeMin(e.target.value); handleFilterChange(); }}
              />
            </div>

            <div>
              <label htmlFor="filter-size-max" className={styles.label}>Max Size (MB)</label>
              <input
                id="filter-size-max"
                type="number"
                className={styles.input}
                placeholder="50"
                min="0"
                step="0.1"
                value={sizeMax}
                onChange={(e) => { setSizeMax(e.target.value); handleFilterChange(); }}
              />
            </div>

            {/* Shared Only Checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={sharedOnly}
                  onChange={(e) => { setSharedOnly(e.target.checked); handleFilterChange(); }}
                />
                <span>Shared with doctors only</span>
              </label>
            </div>

            {/* Sort */}
            <div>
              <label htmlFor="filter-sort" className={styles.label}>Sort By</label>
              <select
                id="filter-sort"
                className={`${styles.select} ${styles.input}`}
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [by, order] = e.target.value.split(':');
                  setSortBy(by);
                  setSortOrder(order);
                  handleFilterChange();
                }}
              >
                <option value="uploadedAt:desc">Date (Newest)</option>
                <option value="uploadedAt:asc">Date (Oldest)</option>
                <option value="fileName:asc">Name (A-Z)</option>
                <option value="fileName:desc">Name (Z-A)</option>
                <option value="fileSize:desc">Size (Largest)</option>
                <option value="fileSize:asc">Size (Smallest)</option>
                <option value="category:asc">Category</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary & Clear */}
          {hasActiveFilters && (
            <div className={styles.activeFiltersBar}>
              <div className={styles.activeFiltersTags}>
                {category && <span className={`${styles.badge} ${styles.badgeBlue}`}>Category: {category}</span>}
                {tags && <span className={`${styles.badge} ${styles.badgeGray}`}>Tags: {tags}</span>}
                {dateFrom && <span className={`${styles.badge} ${styles.badgeTeal}`}>From: {dateFrom}</span>}
                {dateTo && <span className={`${styles.badge} ${styles.badgeTeal}`}>To: {dateTo}</span>}
                {sizeMin && <span className={`${styles.badge} ${styles.badgePurple}`}>Min: {sizeMin}MB</span>}
                {sizeMax && <span className={`${styles.badge} ${styles.badgePurple}`}>Max: {sizeMax}MB</span>}
                {sharedOnly && <span className={`${styles.badge} ${styles.badgePink}`}>Shared only</span>}
              </div>
              <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={clearAll}>
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}