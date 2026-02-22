import React from "react";
import { ErrorDisplay } from "./ErrorDisplay";
import { formatError } from "@/hooks/useErrorHandler";
import type { AppError } from "@/types";

interface State {
  hasError: boolean;
  appError: AppError | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, appError: null };
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    formatError(error, info.componentStack ?? undefined).then((appError) => {
      this.setState({ appError });
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorDisplay
          error={
            this.state.appError ?? {
              message: "Error desconocido",
              timestamp: new Date().toISOString(),
              version: "unknown",
            }
          }
          onRetry={() => this.setState({ hasError: false, appError: null })}
        />
      );
    }
    return this.props.children;
  }
}
