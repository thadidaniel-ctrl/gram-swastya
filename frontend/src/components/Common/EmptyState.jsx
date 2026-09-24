import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export function EmptyState({ 
  icon = '📭', 
  title = 'Nothing here', 
  description = '', 
  action = null,
  className = '' 
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleAction = () => {
    if (action?.onClick) {
      action.onClick();
    } else if (action?.to) {
      navigate(action.to);
    }
  };

  return (
    <div className={`empty-state ${className}`} style={{ textAlign: 'center', padding: 'var(--space-10) var(--space-4)' }} data-testid="empty-state">
      <div className="empty-icon" style={{ fontSize: '4rem', marginBottom: 'var(--space-4)', display: 'block' }} aria-hidden="true">
        {icon}
      </div>
      <h3 className="empty-title" style={{ marginBottom: 'var(--space-2)', color: 'var(--color-text-primary)', fontSize: 'var(--font-size-lg)' }}>
        {title}
      </h3>
      <p className="empty-description" style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-6)', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
        {description}
      </p>
      {action && (
        <button 
          type="button"
          onClick={handleAction}
          className={`btn btn-primary ${action.variant || ''}`}
          style={{ minWidth: '160px' }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export default EmptyState;