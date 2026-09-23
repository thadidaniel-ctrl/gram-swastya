import React from 'react';
import { useTranslation } from 'react-i18next';

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

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex min-h-[300px] items-center justify-center p-4">
          <div className="max-w-md mx-auto text-center">
            <div className="text-6xl mb-4" aria-hidden="true">⚠️</div>
            <h2 className="text-xl font-semibold text-primary mb-2">
              Something went wrong
            </h2>
            <p className="text-secondary mb-6">
              We're sorry, but something went wrong. Our team has been notified.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="btn btn-primary"
              >
                Reload Page
              </button>
              <button
                type="button"
                onClick={() => { window.location.href = '/'; }}
                className="btn btn-secondary"
              >
                Go Home
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <details className="mt-6 text-left max-w-md mx-auto text-sm">
                <summary className="cursor-pointer text-secondary mb-2">
                  Error Details (Development)
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

export default ErrorBoundary;
