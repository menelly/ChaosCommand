'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  label?: string;
}

interface State {
  error: Error | null;
}

export default class AnalyticsErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface to console even in production Tauri builds via Tauri logs.
    console.error('[AnalyticsErrorBoundary]', this.props.label || '', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h3 className="font-semibold">Analytics couldn't render</h3>
                <p className="text-sm text-muted-foreground">
                  Something in your tracker's data tripped the analytics view.
                  Your saved data is safe.
                </p>
                <pre className="text-xs bg-muted p-2 rounded overflow-auto max-w-full whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack ? '\n\n' + this.state.error.stack.split('\n').slice(0, 4).join('\n') : ''}
                </pre>
                <button
                  className="text-sm underline text-primary"
                  onClick={() => this.setState({ error: null })}
                >
                  Try again
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
