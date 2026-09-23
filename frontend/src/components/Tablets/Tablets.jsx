import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import tabletsData from '../../data/tablets.json';
import styles from './Tablets.module.css';

const BOOKMARK_KEY = 'gramSwasthya_bookmarkedTablets';
const SEARCH_HISTORY_KEY = 'gramSwasthya_searchHistory';
const MAX_SEARCH_HISTORY = 5;
const SEARCH_DEBOUNCE_MS = 300;

const CATEGORY_COLORS = {
  'Painkiller': 'painkiller',
  'Antibiotic': 'antibiotic',
  'Antacid': 'antacid',
  'Diabetes': 'diabetes',
  'Cholesterol': 'cholesterol',
  'Blood Pressure': 'bloodpressure',
  'Vitamin': 'vitamin',
  'Cough & Cold': 'coughcold',
  'Allergy': 'allergy',
  'Mental Health': 'mentalhealth',
  'Skin Care': 'skincare',
  'Hormone': 'hormone',
  'Joint & Bone': 'jointbone',
};

const MODAL_DISCLAIMER = (
  <>This information is educational only. It is NOT a substitute for professional medical advice, diagnosis, or treatment. ALWAYS consult with a qualified doctor or healthcare provider before taking any new medicine, changing your current medication, or using medicines together. In case of emergency, call ambulance or visit nearest hospital immediately. GramSwasthya is not liable for any adverse effects from self-medication.</>
);

function MedicalDisclaimer({ variant = 'banner', className = '' }) {
  const isModal = variant === 'modal';
  return (
    <div className={`${isModal ? styles.modalDisclaimer : styles.disclaimer} ${className}`} role="alert">
      <span className={isModal ? '' : styles.disclaimerIcon}>{isModal ? '⚕️' : '⚠️'}</span>
      <p className={isModal ? '' : styles.disclaimerText}>
        {isModal ? MODAL_DISCLAIMER : 'Always consult a qualified doctor before taking any medicine. Doses shown are general adult references only — never self-medicate with antibiotics or habit-forming medicines.'}
      </p>
    </div>
  );
}

function SkeletonCard() {
  return (
    <article className={styles.skeletonCard}>
      <div className={styles.skeletonTitle} style={{ width: '60%' }} />
      <div className={styles.skeletonCategory} />
      <div className={styles.skeletonUses}>
        <div className={styles.skeletonChip} />
        <div className={styles.skeletonChip} />
      </div>
      <div className={styles.skeletonButton} />
    </article>
  );
}

function SkeletonGrid() {
  return (
    <div className={styles.skeletonGrid} role="status" aria-label="Loading medicines" aria-live="polite">
      {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );
}

function TabletModal({ tablet, onClose, bookmarks, toggleBookmark }) {
  const { t } = useTranslation();
  const isBookmarked = bookmarks.includes(tablet.id);
  const categoryClass = CATEGORY_COLORS[tablet.category] || '';
  const modalRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onClose();
    // Trap focus within modal
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    // Focus the close button when modal opens
    const closeBtn = modalRef.current?.querySelector('.modal-close');
    closeBtn?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const hasCommonSideEffects = tablet.commonSideEffects && tablet.commonSideEffects.length > 0;
  const hasSeriousSideEffects = tablet.seriousSideEffects && tablet.seriousSideEffects.length > 0;
  const hasContraindications = tablet.contraindications && tablet.contraindications.length > 0;
  const hasInteractions = tablet.interactions && tablet.interactions.length > 0;
  const hasPregnancyWarning = !!tablet.pregnancyWarning;
  const hasAlcoholWarning = !!tablet.alcoholWarning;

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div ref={modalRef} className={styles.modal} onClick={e => e.stopPropagation()}>
        <header className={styles.modalHeader}>
          <div className={styles.modalTitleRow} id="modal-title">
            <span className={styles.modalIcon} aria-hidden="true">💊</span>
            <div>
              <h2 className={styles.modalName}>{tablet.name}</h2>
              <span className={`${styles.modalCategory} ${styles[categoryClass]}`}>
                {tablet.category}
              </span>
            </div>
          </div>
          <button
            className={`${styles.modalClose} ${styles['modal-close']}`}
            onClick={onClose}
            aria-label="Close medicine details"
          >
            ✕
          </button>
        </header>

        <div className={styles.modalBody}>
          <MedicalDisclaimer variant="modal" />

          <section className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>
              <span className={styles.modalSectionIcon} aria-hidden="true">🎯</span>
              Common Uses
            </h3>
            <ul className={styles.modalUses}>
              {tablet.uses.map(u => (
                <li key={u} className={styles.modalUseItem}>
                  <span className={styles.modalUseBullet} aria-hidden="true" />
                  {u}
                </li>
              ))}
            </ul>
          </section>

          <section className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>
              <span className={styles.modalSectionIcon} aria-hidden="true">💊</span>
              Dosage (Adult Reference)
            </h3>
            <div className={styles.modalDosage}>
              <div className={styles.modalDosageItem}>
                <div className={styles.modalDosageLabel}>Typical Dose</div>
                <div className={styles.modalDosageValue}>{tablet.dosage}</div>
              </div>
              {tablet.dosageFrequency && (
                <div className={styles.modalDosageItem}>
                  <div className={styles.modalDosageLabel}>Frequency</div>
                  <div className={styles.modalDosageValue}>{tablet.dosageFrequency}</div>
                </div>
              )}
              {tablet.maxDailyDose && (
                <div className={styles.modalDosageItem}>
                  <div className={styles.modalDosageLabel}>Max Daily</div>
                  <div className={styles.modalDosageValue}>{tablet.maxDailyDose}</div>
                </div>
              )}
            </div>
          </section>

          <section className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>
              <span className={styles.modalSectionIcon} aria-hidden="true">⚠️</span>
              Side Effects
            </h3>
            <div className={styles.modalSideEffects}>
              {hasCommonSideEffects && (
                <div className={styles.modalSideEffectGroup}>
                  <div className={styles.modalSideEffectLabel}>
                    <span aria-hidden="true">🔶</span> Common
                  </div>
                  <ul className={styles.modalSideEffectList}>
                    {tablet.commonSideEffects.map(s => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {hasSeriousSideEffects && (
                <div className={`${styles.modalSideEffectGroup} ${styles.serious}`}>
                  <div className={styles.modalSideEffectLabel}>
                    <span aria-hidden="true">🔴</span> Serious (Rare)
                  </div>
                  <ul className={styles.modalSideEffectList}>
                    {tablet.seriousSideEffects.map(s => (
                      <li key={s}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {(!hasCommonSideEffects && !hasSeriousSideEffects) && (
                <p style={{ color: '#666', fontSize: '14px' }}>
                  {tablet.sideEffects.join(', ') || 'Consult your doctor for side effect information.'}
                </p>
              )}
            </div>
          </section>

          <section className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>
              <span className={styles.modalSectionIcon} aria-hidden="true">🔄</span>
              Alternative Medicines
            </h3>
            <div className={styles.modalAlternatives}>
              {tablet.alternatives.map(a => (
                <span key={a} className={styles.modalAltChip}>{a}</span>
              ))}
            </div>
          </section>

          <section className={styles.modalSection}>
            <h3 className={styles.modalSectionTitle}>
              <span className={styles.modalSectionIcon} aria-hidden="true">💡</span>
              Why People Use It
            </h3>
            <p className={styles.modalWhyUsed}>{tablet.whyUsed}</p>
          </section>

          {hasContraindications || hasInteractions || hasPregnancyWarning || hasAlcoholWarning ? (
            <section className={styles.modalSection}>
              <h3 className={styles.modalSectionTitle}>
                <span className={styles.modalSectionIcon} aria-hidden="true">📋</span>
                Important Notes
              </h3>
              <ul className={styles.modalNotesList}>
                {hasContraindications && tablet.contraindications.map((c, i) => (
                  <li key={i}>⚠️ {c}</li>
                ))}
                {hasInteractions && tablet.interactions.map((i, idx) => (
                  <li key={idx}>💊 May interact with: {i}</li>
                ))}
                {hasPregnancyWarning && (
                  <li>🤰 Pregnancy: {tablet.pregnancyWarning}</li>
                )}
                {hasAlcoholWarning && (
                  <li>🍺 Alcohol: {tablet.alcoholWarning}</li>
                )}
                {(!hasContraindications && !hasInteractions && !hasPregnancyWarning && !hasAlcoholWarning) && (
                  <li>Consult your doctor for specific warnings and contraindications.</li>
                )}
              </ul>
            </section>
          ) : null}

          <div className={styles.modalActions}>
            <button className={`${styles.modalActionBtn} ${styles.primary}`}>
              🩺 Consult Doctor
            </button>
            <button
              className={`${styles.modalActionBtn} ${isBookmarked ? styles.secondary : styles.outline}`}
              onClick={() => toggleBookmark(tablet.id)}
            >
              {isBookmarked ? '⭐ Saved' : '☆ Save'}
            </button>
            <button className={`${styles.modalActionBtn} ${styles.outline}`}>
              🔗 {t('common.share')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TabletCard({ tablet, bookmarks, toggleBookmark, onViewDetails }) {
  const isBookmarked = bookmarks.includes(tablet.id);
  const categoryClass = CATEGORY_COLORS[tablet.category] || '';

  return (
    <article className={styles.card}>
      <div className={styles.cardHeader}>
        <h3 className={styles.medName}>{tablet.name}</h3>
        <button
          className={`${styles.bookmarkBtn} ${isBookmarked ? styles.bookmarked : ''}`}
          onClick={() => toggleBookmark(tablet.id)}
          aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
          aria-pressed={isBookmarked}
        >
          {isBookmarked ? '★' : '☆'}
        </button>
      </div>
      <span className={`${styles.categoryTag} ${styles[categoryClass]}`}>
        {tablet.category}
      </span>

      <div className={styles.usesList}>
        {tablet.uses.slice(0, 2).map(u => (
          <span key={u} className={styles.useChip}>{u}</span>
        ))}
        {tablet.uses.length > 2 && <span className={styles.useMore}>+{tablet.uses.length - 2} more</span>}
      </div>

      <button
        className={styles.viewDetailsBtn}
        onClick={() => onViewDetails(tablet)}
      >
        View Details →
      </button>
    </article>
  );
}

function TabletTableRow({ tablet, bookmarks, toggleBookmark, onViewDetails, isExpanded }) {
  const isBookmarked = bookmarks.includes(tablet.id);
  const categoryClass = CATEGORY_COLORS[tablet.category] || '';

  return (
    <>
      <tr key={tablet.id}>
        <td className={styles.tableBookmark}>
          <button
            className={`${styles.bookmarkBtn} ${isBookmarked ? styles.bookmarked : ''}`}
            onClick={() => toggleBookmark(tablet.id)}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Bookmark'}
            aria-pressed={isBookmarked}
          >
            {isBookmarked ? '★' : '☆'}
          </button>
        </td>
        <td>
          <span className={styles.tableName}>{tablet.name}</span>
          <button
            className={styles.viewDetailsBtn}
            onClick={() => onViewDetails(tablet)}
            style={{ marginTop: '8px', display: 'block', width: 'auto' }}
          >
            View Details →
          </button>
        </td>
        <td>
          <span className={`${styles.categoryTag} ${styles[categoryClass]}`}>
            {tablet.category}
          </span>
        </td>
        <td>{tablet.uses.slice(0, 3).join(', ')}{tablet.uses.length > 3 ? '...' : ''}</td>
        <td>
          {tablet.dosage}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={5}>
            <div className={styles.tableDetails}>
              <p><strong>Side effects:</strong> {tablet.sideEffects.join(', ')}</p>
              <p><strong>Alternatives:</strong> {tablet.alternatives.join(', ')}</p>
              <p><strong>Why used:</strong> {tablet.whyUsed}</p>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SearchSuggestions({ searchHistory, searchTerm, onSelect, onClearHistory }) {
  if (!searchHistory.length || searchTerm.trim()) return null;

  return (
    <div className={styles.searchSuggestions} role="listbox" aria-label="Recent searches">
      <div className={styles.searchSuggestionsHeader}>
        <span>Recent Searches</span>
        <button
          className={styles.clearHistoryBtn}
          onClick={onClearHistory}
          aria-label="Clear search history"
        >
          Clear
        </button>
      </div>
      <ul className={styles.searchSuggestionsList}>
        {searchHistory.map((term, i) => (
          <li key={i} role="option" onClick={() => onSelect(term)} className={styles.searchSuggestionItem}>
            <span aria-hidden="true">🔍</span>
            <span>{term}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Tablets() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [viewMode, setViewMode] = useState('card');
  const [onlyBookmarked, setOnlyBookmarked] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalTablet, setModalTablet] = useState(null);
  const [searchHistory, setSearchHistory] = useState([]);
  const [, setShowSearchSuggestions] = useState(false);
  const debounceRef = useRef(null);

  const categories = useMemo(() => {
    const set = new Set(tabletsData.tablets.map(t => t.category));
    return ['All', ...Array.from(set).sort()];
  }, []);

  // Load bookmarks and search history on mount
  useEffect(() => {
    try {
      const storedBookmarks = localStorage.getItem(BOOKMARK_KEY);
      if (storedBookmarks) setBookmarks(JSON.parse(storedBookmarks));
      const storedHistory = localStorage.getItem(SEARCH_HISTORY_KEY);
      if (storedHistory) setSearchHistory(JSON.parse(storedHistory));
    } catch (e) {
      setBookmarks([]);
      setSearchHistory([]);
    }
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  const filteredTablets = useMemo(() => {
    const term = debouncedSearchTerm;
    return tabletsData.tablets.filter(t => {
      if (selectedCategory !== 'All' && t.category !== selectedCategory) return false;
      if (onlyBookmarked && !bookmarks.includes(t.id)) return false;
      if (!term) return true;
      return (
        t.name.toLowerCase().includes(term) ||
        t.category.toLowerCase().includes(term) ||
        t.uses.some(u => u.toLowerCase().includes(term)) ||
        t.alternatives.some(a => a.toLowerCase().includes(term))
      );
    });
  }, [debouncedSearchTerm, selectedCategory, onlyBookmarked, bookmarks]);

  const toggleBookmark = useCallback(id => {
    setBookmarks(prev => {
      const next = prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id];
      try {
        localStorage.setItem(BOOKMARK_KEY, JSON.stringify(next));
      } catch (e) {
        // storage unavailable; keep in-memory state
      }
      return next;
    });
  }, []);

  const addToSearchHistory = useCallback((term) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    setSearchHistory(prev => {
      const next = [trimmed, ...prev.filter(t => t !== trimmed)].slice(0, MAX_SEARCH_HISTORY);
      try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
      } catch {
        // storage may be unavailable (private mode / quota)
      }
      return next;
    });
  }, []);

  const clearSearchHistory = useCallback(() => {
    setSearchHistory([]);
    try {
      localStorage.removeItem(SEARCH_HISTORY_KEY);
    } catch {
      // storage may be unavailable (private mode / quota)
    }
  }, []);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowSearchSuggestions(!value.trim() && searchHistory.length > 0);
  };

  const handleHeroSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (value.trim()) {
      setShowSearchSuggestions(false);
    }
  };

  const handleSearchSelect = (term) => {
    setSearchTerm(term);
    setShowSearchSuggestions(false);
    addToSearchHistory(term);
  };

  const handleSearchBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSearchSuggestions(false), 200);
  };

  const handleSearchFocus = () => {
    if (searchHistory.length > 0 && !searchTerm.trim()) {
      setShowSearchSuggestions(true);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      addToSearchHistory(searchTerm.trim());
      setShowSearchSuggestions(false);
    }
  };

  const handleHeroSearchSubmit = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      addToSearchHistory(searchTerm.trim());
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTerm.trim()) {
        addToSearchHistory(searchTerm.trim());
        setShowSearchSuggestions(false);
      }
    }
  };

  const openModal = useCallback((tablet) => {
    setModalTablet(tablet);
  }, []);

  const closeModal = useCallback(() => {
    setModalTablet(null);
  }, []);

  const resetFilters = () => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    setSelectedCategory('All');
    setOnlyBookmarked(false);
    setShowSearchSuggestions(false);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <SkeletonGrid />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero} aria-labelledby="hero-title">
        <h1 id="hero-title" className={styles.heroTitle}>💊 Top 100 Essential Medicines</h1>
        <p className={styles.heroSubtitle}>
          Find detailed information about the medicines you use. Always consult a doctor before taking any medicine.
        </p>
        <form onSubmit={handleHeroSearchSubmit} className={styles.heroSearch}>
          <input
            type="search"
            className={styles.heroSearchInput}
            placeholder="Search tablet name (e.g., Aspirin, Metformin)..."
            value={searchTerm}
            onChange={handleHeroSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search medicines"
            autoFocus
          />
        </form>
        <SearchSuggestions
          searchHistory={searchHistory}
          searchTerm={searchTerm}
          onSelect={handleSearchSelect}
          onClearHistory={clearSearchHistory}
        />
      </section>

      {/* Header / Disclaimer */}
      <header className={styles.header}>
        <h2 className={styles.title}>Medicines Guide</h2>
        <p className={styles.subtitle}>
          A simple reference guide to the medicines most commonly used at home.
        </p>
      </header>

      <MedicalDisclaimer variant="banner" />

      {/* Search & Filter Toolbar */}
      <form onSubmit={handleSearchSubmit} className={styles.toolbar}>
        <div className={styles.searchWrapper}>
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search medicine, condition or alternative..."
            value={searchTerm}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            onKeyDown={handleSearchKeyDown}
            aria-label="Search tablets"
            autoComplete="off"
          />
          <SearchSuggestions
            searchHistory={searchHistory}
            searchTerm={searchTerm}
            onSelect={handleSearchSelect}
            onClearHistory={clearSearchHistory}
          />
        </div>

        <select
          className={styles.categorySelect}
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          aria-label="Filter by category"
        >
          {categories.map(c => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <div className={styles.controls}>
          <button
            type="button"
            className={`${styles.filterBtn} ${onlyBookmarked ? styles.active : ''}`}
            onClick={() => setOnlyBookmarked(prev => !prev)}
            aria-pressed={onlyBookmarked}
          >
            ⭐ Bookmarked {bookmarks.length > 0 ? `(${bookmarks.length})` : ''}
          </button>

          <div className={styles.viewToggle} role="group" aria-label="View mode">
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'card' ? styles.active : ''}`}
              onClick={() => setViewMode('card')}
              aria-label="Card view"
              aria-pressed={viewMode === 'card'}
            >
              ▦
            </button>
            <button
              type="button"
              className={`${styles.viewBtn} ${viewMode === 'list' ? styles.active : ''}`}
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              ☰
            </button>
          </div>

          {(searchTerm || selectedCategory !== 'All' || onlyBookmarked) && (
            <button type="button" className={styles.resetBtn} onClick={resetFilters}>
              ✕ Clear filters
            </button>
          )}
        </div>
      </form>

      <div className={styles.resultCount} aria-live="polite">
        Showing {filteredTablets.length} of {tabletsData.tablets.length} medicines
      </div>

      {/* Content */}
      {filteredTablets.length === 0 ? (
        <div className={styles.emptyState}>
          <span className={styles.emptyIcon}>🔍</span>
          <p>No medicines match your search.</p>
          <p style={{ fontSize: '13px', color: '#aaa', marginBottom: '12px' }}>
            Try: Check spelling • Use a shorter search term • Browse by category
          </p>
          <button className={styles.resetBtn} onClick={resetFilters}>
            Clear all filters
          </button>
        </div>
      ) : viewMode === 'card' ? (
        <div className={styles.cardGrid} role="list" aria-label="Medicines">
          {filteredTablets.map(t => (
            <TabletCard
              key={t.id}
              tablet={t}
              bookmarks={bookmarks}
              toggleBookmark={toggleBookmark}
              onViewDetails={openModal}
            />
          ))}
        </div>
      ) : (
        <table className={styles.listTable} role="table">
          <thead>
            <tr>
              <th scope="col" className={styles.tableBookmark}></th>
              <th scope="col">Medicine</th>
              <th scope="col">{t('common.category')}</th>
              <th scope="col">Used for</th>
              <th scope="col">Dosage (adult reference)</th>
            </tr>
          </thead>
          <tbody>
            {filteredTablets.map(t => (
              <TabletTableRow
                key={t.id}
                tablet={t}
                bookmarks={bookmarks}
                toggleBookmark={toggleBookmark}
                onViewDetails={openModal}
                isExpanded={false}
              />
            ))}
          </tbody>
        </table>
      )}

      <p className={styles.footerNote}>
        Information here is for education only and does not replace a doctor's advice.
      </p>

      {/* Modal */}
      {modalTablet && (
        <TabletModal
          tablet={modalTablet}
          onClose={closeModal}
          bookmarks={bookmarks}
          toggleBookmark={toggleBookmark}
        />
      )}
    </div>
  );
}