import React from 'react';
import { useTranslation } from 'react-i18next';

export function Button({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  disabled = false, 
  loading = false, 
  onClick, 
  type = 'button',
  className = '',
  'aria-label': ariaLabel,
  ...props 
}) {
  const { t } = useTranslation('common');
  const variantClasses = {
    primary: 'bg-brand-800 text-white hover:bg-brand-900 focus:ring-brand-800',
    secondary: 'bg-surface-secondary text-text-primary border border-border-main hover:bg-neutral-200 focus:ring-brand-800',
    outline: 'bg-transparent text-brand-800 border-2 border-brand-800 hover:bg-brand-50 focus:ring-brand-800',
    ghost: 'bg-transparent text-brand-800 hover:bg-brand-50 focus:ring-brand-800',
    danger: 'bg-error-main text-white hover:bg-error-dark focus:ring-error-main',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px]',
    md: 'px-5 py-2.5 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[52px]',
  };

  const computedClassName = `inline-flex items-center justify-center font-semibold rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();

  return (
    <button
      type={type}
      className={computedClassName}
      disabled={disabled || loading}
      onClick={onClick}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      aria-label={ariaLabel}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )}
      {children}
    </button>
  );
}

export default Button;