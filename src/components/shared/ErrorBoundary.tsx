import { Component, type ErrorInfo, type ReactNode } from 'react';

type Props = { children: ReactNode; label?: string };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error(`[${this.props.label ?? 'ErrorBoundary'}]`, error, info);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 m-4 text-sm">
        <div className="font-semibold text-bad mb-2">
          Something broke{this.props.label ? ` in ${this.props.label}` : ''}
        </div>
        <div className="font-mono text-xs whitespace-pre-wrap break-all text-ink mb-3">
          {this.state.error.message}
        </div>
        {this.state.error.stack && (
          <details className="text-xs text-muted">
            <summary>Stack</summary>
            <pre className="whitespace-pre-wrap break-all mt-2">
              {this.state.error.stack}
            </pre>
          </details>
        )}
        <button
          onClick={this.reset}
          className="mt-3 px-3 py-1.5 rounded-md bg-white border border-border text-sm hover:bg-bg"
        >
          Try again
        </button>
      </div>
    );
  }
}
