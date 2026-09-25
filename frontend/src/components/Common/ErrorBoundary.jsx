import React from 'react';
import { withTranslation } from 'react-i18next';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { t } = this.props;

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[300px] items-center justify-center p-4">
          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-4" aria-hidden="true">⚠️</div>
            <h2 className="text-xl font-semibold text-primary mb-2">
              {t('errorBoundary.title')}
            </h2>
            <p className="text-secondary mb-6">
              {t('errorBoundary.message')}
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn btn-primary"
              >
                {t('errorBoundary.reload')}
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="btn btn-secondary"
              >
                {t('errorBoundary.goHome')}
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left max-w-md mx-auto text-sm">
                <summary className="cursor-pointer text-secondary mb-2">
                  {t('errorBoundary.expandDetails')}
                </summary>
                <pre className="bg-neutral-100 p-3 rounded text-xs overflow-auto text-left text-error">
                  {this.state.error?.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Higher-order component that wraps a component with an ErrorBoundary.
 */
export function withErrorBoundary(WrappedComponent, errorBoundaryProps = {}) {
  function WithErrorBoundary(props) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <WrappedComponent {...props} />
      </ErrorBoundary>
    );
  }
  WithErrorBoundary.displayName = `withErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  return WithErrorBoundary;
}

export default withTranslation()(ErrorBoundary);