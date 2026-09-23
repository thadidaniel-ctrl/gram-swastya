import React from 'react';
import styles from './FileStorageStyles.module.css';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showPageSize = true,
  pageSize = 10,
  onPageSizeChange,
  maxVisiblePages = 5,
  className = '',
}) {
  const { t } = useTranslation('files');
  const pages = React.useMemo(() => {
    const result = [];
    const half = Math.floor(maxVisiblePages / 2);
    let start = Math.max(1, currentPage - half);
    const end = Math.min(totalPages, start + maxVisiblePages - 1);

    if (end - start + 1 < maxVisiblePages) {
      start = Math.max(1, end - maxVisiblePages + 1);
    }

    for (let i = start; i <= end; i++) {
      result.push(i);
    }
    return result;
  }, [currentPage, totalPages, maxVisiblePages]);

  const handlePageClick = (page) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange?.(page);
    }
  };

  const handlePrev = () => handlePageClick(currentPage - 1);
  const handleNext = () => handlePageClick(currentPage + 1);
  const handleFirst = () => handlePageClick(1);
  const handleLast = () => handlePageClick(totalPages);

  const handleInputChange = (e) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      handlePageClick(value);
    }
  };

  const handleInputBlur = (e) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 1) {
      e.target.value = 1;
    } else if (value > totalPages) {
      e.target.value = totalPages;
    }
  };

  if (totalPages <= 1) return null;

  return (
    <div className={`${styles.pagination} ${className}`} role="navigation" aria-label="Pagination">
      <div className={styles.paginationInfo}>
        Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
      </div>

      <div className={styles.paginationControls}>
        <button
          className={`${styles.paginationBtn} ${styles.paginationBtnFirst}`}
          onClick={handleFirst}
          disabled={currentPage === 1}
          aria-label="First page"
          title="First page"
        >
          ««
        </button>

        <button
          className={`${styles.paginationBtn} ${styles.paginationBtnPrev}`}
          onClick={handlePrev}
          disabled={currentPage === 1}
          aria-label="Previous page"
          title="Previous page"
        >
          ‹
        </button>

        {pages.map(page => (
          <button
            key={page}
            className={`${styles.paginationBtn} ${styles.paginationBtnPage} ${page === currentPage ? styles.paginationBtnActive : ''}`}
            onClick={() => handlePageClick(page)}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </button>
        ))}

        <button
          className={`${styles.paginationBtn} ${styles.paginationBtnNext}`}
          onClick={handleNext}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          title="Next page"
        >
          ›
        </button>

        <button
          className={`${styles.paginationBtn} ${styles.paginationBtnLast}`}
          onClick={handleLast}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          title="Last page"
        >
          »»
        </button>
      </div>

      <div className={styles.paginationGoTo}>
        <label htmlFor="page-input" className={styles.visuallyHidden}>Go to page</label>
        <input
          id="page-input"
          type="number"
          className={`${styles.paginationInput} ${styles.input}`}
          value={currentPage}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          min={1}
          max={totalPages}
          aria-label="Go to page"
          placeholder="Page"
          style={{ width: '70px', textAlign: 'center' }}
        />
      </div>

      {showPageSize && (
        <div className={styles.paginationPageSize}>
          <label htmlFor="page-size" className={styles.visuallyHidden}>Items per page</label>
          <select
            id="page-size"
            className={`${styles.paginationSelect} ${styles.select} ${styles.input}`}
            value={pageSize}
            onChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
            aria-label="Items per page"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      )}
    </div>
  );
}