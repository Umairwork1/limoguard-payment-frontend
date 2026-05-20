import { Component } from 'react';
import type { ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div style={{ padding: 32 }}>
        <div className="alert alert-error" style={{ marginBottom: 12 }}>
          <strong>Render error:</strong> {error.message}
        </div>
        <pre className="json-block" style={{ fontSize: 11 }}>{error.stack}</pre>
        <button
          className="btn btn-secondary"
          style={{ marginTop: 12 }}
          onClick={() => this.setState({ error: null })}
        >
          Dismiss
        </button>
      </div>
    );
  }
}
