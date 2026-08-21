import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { ShieldAlert, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('REALITY//DECISION ErrorBoundary caught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#07090b] text-[#e8edf2] p-6 text-center font-mono">
          <div className="max-w-md p-6 bg-[#0d1117] border border-[#222b34] rounded-xl shadow-2xl flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-[#ef4444]/15 border border-[#ef4444] flex items-center justify-center text-[#ef4444] mb-4">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-base font-extrabold tracking-wider text-[#e8edf2] mb-2">
              DECISION COMMAND CENTER RECOVERY
            </h2>
            <p className="text-xs text-[#8a9aaa] mb-4 leading-relaxed">
              {this.state.error?.message || 'A transient UI rendering issue occurred. Restoring mission control.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="px-4 py-2 bg-[#00f2fe] text-[#07090b] font-extrabold rounded text-xs flex items-center gap-2 hover:bg-[#38bdf8] transition-all cursor-pointer shadow-lg"
            >
              <RotateCcw className="w-4 h-4" />
              <span>RELOAD DECISION CENTER</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
