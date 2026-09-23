import React from 'react';

export function SkeletonLoader({ 
  width = '100%', 
  height = '20px', 
  className = '',
  count = 1,
  variant = 'text', // 'text' | 'card' | 'avatar' | 'button' | 'avatar-text'
} = {}) {
  if (count > 1) {
    return (
      <div className="skeleton-group" aria-hidden="true">
        {Array.from({ length: count }, (_, i) => (
          <SkeletonLoader key={i} width={width} height={height} className={className} variant={variant} />
        ))}
      </div>
    );
  }

  const baseStyles = {
    background: 'linear-gradient(90deg, var(--color-neutral-200) 25%, var(--color-neutral-300) 50%, var(--color-neutral-200) 75%)',
    backgroundSize: '200% 100%',
    animation: 'skeleton-shimmer 1.5s infinite',
    borderRadius: 'var(--radius-md)',
    width,
    height,
  };

  const variants = {
    text: { borderRadius: 'var(--radius-sm)' },
    card: { borderRadius: 'var(--radius-lg)' },
    avatar: { borderRadius: '50%', width: '48px', height: '48px' },
    button: { borderRadius: 'var(--radius-md)', height: 'var(--touch-comfortable)', width: '120px' },
    'avatar-text': { borderRadius: 'var(--radius-lg)' },
  };

  const style = { ...baseStyles, ...variants[variant] };

  // Add variant class for testing
  const variantClass = variant !== 'text' ? `skeleton-${variant}` : '';

  return (
    <div 
      className={`skeleton-loader ${variantClass} ${className}`.trim()} 
      style={{ ...style, width, height }}
      aria-hidden="true"
      data-testid="skeleton-loader"
    />
  );
}

export function SkeletonCard({ className = '', lines = 3, hasAvatar = true, hasImage = false }) {
  return (
    <div className={`skeleton-card ${className}`} aria-hidden="true" data-testid="skeleton-card">
      <div className="flex gap-4 items-start">
        {hasAvatar && <SkeletonLoader variant="avatar" />}
        {hasImage && <SkeletonLoader variant="card" style={{ width: '100%', height: '160px' }} />}
        <div className="flex-1 flex flex-col gap-3">
          {Array.from({ length: lines }, (_, i) => (
            <SkeletonLoader key={i} width={i === 0 ? '60%' : i === lines - 1 ? '40%' : '80%'} height="1rem" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3, itemHeight = '80px', className = '' }) {
  return (
    <div className={`skeleton-list ${className}`} aria-hidden="true">
  {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton-list-item" style={{ height: itemHeight }} data-testid="skeleton-list-item">
          <div className="flex gap-4 items-center">
            <SkeletonLoader variant="avatar" />
            <div className="flex-1 flex flex-col gap-2">
              <SkeletonLoader width="60%" height="1rem" />
              <SkeletonLoader width="40%" height="0.875rem" />
            </div>
            <SkeletonLoader variant="button" />
          </div>
        </div>
      ))}
      </div>
    );
  }

export function SkeletonTable({ rows = 5, columns = 4, className = '' }) {
  return (
    <div className={`skeleton-table ${className}`} aria-hidden="true">
      <div className="skeleton-table-header">
        {Array.from({ length: columns }, (_, i) => (
          <SkeletonLoader key={i} width="100%" height="1.5rem" variant="text" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton-table-row">
          {Array.from({ length: columns }, (_, j) => (
            <SkeletonLoader key={j} width="100%" height="1rem" variant="text" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonStatCard({ className = '' }) {
  return (
    <div className={`card skeleton-card ${className}`} aria-hidden="true" data-testid="skeleton-stat-card">
      <SkeletonLoader width="100%" height="3rem" variant="card" />
    </div>
  );
}

export default SkeletonLoader;