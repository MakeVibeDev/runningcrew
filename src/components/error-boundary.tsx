"use client";

import React from "react";
import { reportError } from "@/lib/error-reporter";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // Report to Slack
    reportError({
      error,
      context: {
        metadata: {
          componentStack: errorInfo.componentStack,
          errorBoundary: true,
        },
      },
      severity: "critical",
    }).catch((err) => {
      console.error("Failed to report error:", err);
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-border/70 bg-background p-8 shadow-lg">
            <div className="mb-4 text-center text-6xl">😵</div>
            <h1 className="mb-2 text-center text-2xl font-bold">앗! 문제가 발생했습니다</h1>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              예상치 못한 오류가 발생했습니다. 개발팀에 자동으로 보고되었습니다.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full rounded-lg bg-foreground px-4 py-2.5 text-sm font-medium text-background hover:opacity-90"
              >
                페이지 새로고침
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted"
              >
                홈으로 돌아가기
              </button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 rounded-lg bg-muted p-4">
                <summary className="cursor-pointer text-sm font-medium">
                  개발자 정보 (프로덕션에서는 숨김)
                </summary>
                <pre className="mt-2 overflow-x-auto text-xs">
                  {this.state.error.toString()}
                  {"\n\n"}
                  {this.state.error.stack}
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
