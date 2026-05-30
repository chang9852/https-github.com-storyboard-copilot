import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '32px',
          color: 'var(--text)',
          background: 'var(--bg)',
        }}>
          <div style={{
            maxWidth: '480px',
            textAlign: 'center',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgb(239, 68, 68)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
              Something went wrong
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px' }}>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <details style={{ textAlign: 'left', marginBottom: '16px' }}>
              <summary style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                Error details
              </summary>
              <pre style={{
                fontSize: '11px',
                color: 'var(--text-muted)',
                background: 'var(--ui-surface-field)',
                padding: '12px',
                borderRadius: '8px',
                overflow: 'auto',
                maxHeight: '200px',
                marginTop: '8px',
              }}>
                {this.state.error?.stack}
              </pre>
            </details>
            <button
              onClick={this.handleReset}
              style={{
                padding: '8px 20px',
                fontSize: '13px',
                fontWeight: 500,
                color: 'white',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}