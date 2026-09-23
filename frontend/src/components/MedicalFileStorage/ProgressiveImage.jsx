import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './FileStorageStyles.module.css';

const QUALITY_LEVELS = {
  thumbnail: { width: 100, height: 100, quality: 30 },
  preview: { width: 400, height: 400, quality: 60 },
  full: { width: 1200, height: 1200, quality: 85 },
};

export default function ProgressiveImage({
  src,
  alt,
  mimeType,
  fileSize,
  onLoad,
  onError,
  className = '',
  style = {},
  lowBandwidthMode = false,
  priority = false,
}) {
  const { t } = useTranslation();
  const [currentQuality, setCurrentQuality] = useState(lowBandwidthMode ? 'thumbnail' : 'preview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loadedQualities, setLoadedQualities] = useState(new Set());
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  const retryCountRef = useRef(0);

  // Determine available qualities based on bandwidth mode
  const availableQualities = useMemo(() => {
    if (lowBandwidthMode) {
      return ['thumbnail', 'preview'];
    }
    return ['thumbnail', 'preview', 'full'];
  }, [lowBandwidthMode]);

  // Get optimized URL with quality parameters
  const getOptimizedUrl = useCallback((baseUrl, quality) => {
    if (!baseUrl) return null;
    const params = new URLSearchParams(baseUrl.split('?')[1] || '');
    params.set('q', QUALITY_LEVELS[quality].quality.toString());
    params.set('w', QUALITY_LEVELS[quality].width.toString());
    params.set('h', QUALITY_LEVELS[quality].height.toString());
    params.set('fit', 'inside');
    const base = baseUrl.split('?')[0];
    return `${base}?${params.toString()}`;
  }, []);

  // Build srcset for progressive loading
  const srcSet = useMemo(() => {
    if (!src) return '';
    return availableQualities
      .map(q => `${getOptimizedUrl(src, q)} ${QUALITY_LEVELS[q].width}w`)
      .join(', ');
  }, [src, availableQualities, getOptimizedUrl]);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setCurrentQuality(availableQualities[1] || 'preview');
            observerRef.current?.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '100px', threshold: 0.1 }
    );

    observerRef.current.observe(imgRef.current);
    return () => observerRef.current?.disconnect();
  }, [priority, availableQualities]);

  // Handle load
  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    setLoadedQualities(prev => new Set([...prev, currentQuality]));
    onLoad?.();
  }, [currentQuality, onLoad]);

  // Handle error with retry
  const handleError = useCallback((e) => {
    if (retryCountRef.current < 3) {
      retryCountRef.current++;
      setTimeout(() => {
        if (imgRef.current) {
          imgRef.current.src = getOptimizedUrl(src, currentQuality);
        }
      }, 1000 * retryCountRef.current);
      return;
    }
    setLoading(false);
    setError(true);
    onError?.(e);
  }, [src, currentQuality, getOptimizedUrl, onError]);

  // Preload next quality on hover/focus
  const handleMouseEnter = useCallback(() => {
    const nextQualityIndex = availableQualities.indexOf(currentQuality) + 1;
    if (nextQualityIndex < availableQualities.length) {
      const nextQuality = availableQualities[nextQualityIndex];
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = getOptimizedUrl(src, nextQuality);
      document.head.appendChild(link);
    }
  }, [currentQuality, availableQualities, src, getOptimizedUrl]);

  // Format file size
  const formatSize = useCallback((bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  if (error) {
    return (
      <div className={`${styles.progressiveImageError} ${className}`} style={style} role="img" aria-label={alt}>
        <div className={styles.errorContent}>
          <span className={styles.errorIcon}>📄</span>
          <p className={styles.errorText}>{t('common.error')}</p>
          {fileSize && <p className={styles.errorSize}>{formatSize(fileSize)}</p>}
          <button
            className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}
            onClick={() => { retryCountRef.current = 0; setError(false); setLoading(true); }}
          >
            {t('common.retry')}
          </button>
        </div>
      </div>
    );
  }

  const optimizedSrc = getOptimizedUrl(src, currentQuality);

  return (
    <div className={`${styles.progressiveImage} ${className}`} style={style} onMouseEnter={handleMouseEnter}>
      <img
        ref={imgRef}
        src={optimizedSrc}
        srcSet={srcSet}
        sizes="(max-width: 400px) 100vw, (max-width: 800px) 50vw, 400px"
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
        className={`${styles.progressiveImg} ${loading ? styles.loading : ''} ${loadedQualities.has('full') ? styles.loadedFull : ''}`}
        style={{
          opacity: loading ? 0.3 : 1,
          transition: 'opacity 0.3s ease',
          ...style,
        }}
        aria-busy={loading}
        aria-label={alt}
      />

      {loading && (
        <div className={styles.loadingOverlay} aria-hidden="true">
          <div className={styles.spinner} />
          <span className={styles.loadingText}>{t('common.loading')}</span>
          {lowBandwidthMode && <span className={styles.lowBandwidthBadge}>{t('files.lowBandwidth')}</span>}
        </div>
      )}

      {/* Quality indicator */}
      {!loading && availableQualities.length > 1 && (
        <div className={styles.qualityIndicator} role="status" aria-live="polite">
          <span className={`${styles.qualityBadge} ${currentQuality === 'full' ? styles.highQuality : ''}`}>
            {currentQuality === 'thumbnail' ? '📱' : currentQuality === 'preview' ? '🖼️' : '🖥️'}
            {currentQuality.charAt(0).toUpperCase() + currentQuality.slice(1)}
          </span>
          {currentQuality !== 'full' && availableQualities.includes('full') && (
            <button
              className={`${styles.btn} ${styles.btnGhost} ${styles.btnXs}`}
              onClick={() => setCurrentQuality('full')}
              aria-label={t('files.loadFullQuality')}
            >
              {t('files.hd')}
            </button>
          )}
        </div>
      )}

      {/* File info */}
      {fileSize && !loading && (
        <div className={styles.fileInfo}>
          <span>{formatSize(fileSize)}</span>
          {mimeType && <span className={styles.mimeType}>{mimeType}</span>}
        </div>
      )}
    </div>
  );
}

// Lightweight thumbnail component for grids
export function ThumbnailImage({ src, alt, className = '', fileSize, mimeType, lowBandwidthMode = false }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  const optimizedSrc = useMemo(() => {
    if (!src) return '';
    const params = new URLSearchParams();
    params.set('w', '150');
    params.set('h', '150');
    params.set('q', lowBandwidthMode ? '25' : '50');
    params.set('fit', 'cover');
    return `${src.split('?')[0]}?${params.toString()}`;
  }, [src, lowBandwidthMode]);

  return (
    <div className={`${styles.thumbnailContainer} ${className}`}>
      {!error && (
        <img
          src={optimizedSrc}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`${styles.thumbnailImg} ${loaded ? styles.loaded : ''}`}
          style={{ opacity: loaded ? 1 : 0 }}
        />
      )}
      {error && (
        <div className={styles.thumbnailError} role="img" aria-label={alt}>
          <span className={styles.thumbnailIcon}>
            {mimeType?.startsWith('image/') ? '🖼️' : 
             mimeType === 'application/pdf' ? '📄' :
             mimeType?.includes('word') ? '📝' : '📄'}
          </span>
        </div>
      )}
      {fileSize && <div className={styles.thumbnailSize}>{formatSize(fileSize)}</div>}
    </div>
  );
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}