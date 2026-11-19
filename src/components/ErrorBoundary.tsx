import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  error: Error | null;
}

/**
 * The last line of defence: if rendering fails, show what happened and a way out instead of a blank page. A
 * reader's edits are stored as they make them, so reloading doesn't lose them.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="boot" role="alert">
        <h1>Something went wrong</h1>
        <p>The timeline couldn't be shown. Edits you made before this are kept in this browser.</p>
        <p>
          <button className="primary" onClick={() => window.location.reload()}>
            Reload
          </button>{' '}
          <a href={window.location.pathname}>Go to the included timelines</a>
        </p>
        <details>
          <summary>Details</summary>
          <p className="muted small">
            <code>{error.message}</code>
          </p>
        </details>
      </div>
    );
  }
}
