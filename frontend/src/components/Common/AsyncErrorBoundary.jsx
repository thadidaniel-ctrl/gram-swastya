import React from 'react';
import { useTranslation } from 'react-i18next';
import ErrorBoundary from './ErrorBoundary';

/**
 * Error boundary for async operations (data fetching, etc.)
 * Shows a retry button on error.
 */
export class AsyncErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Async Error Boundary caught:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: null });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[200px] items-center justify-center p-4">
          <div className="max-w-md mx-auto text-center p-6">
            <div className="text-6xl mb-4" aria-hidden="true">⚠️</div>
            <h3 className="text-lg font-semibold text-primary mb-2">
              Failed to load content
            </h3>
            <p className="text-secondary mb-4">
              {this.state.error?.message || 'Failed to load content'}
            </p>
            <button type="button" onClick={this.retry} className="btn btn-primary">
              Retry
            </button>
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

export default AsyncErrorBoundary;
