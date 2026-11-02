import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw, Home, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[WalletWisely Runtime Exception Caught]:", error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      this.setState({ hasError: false, error: null, errorInfo: null });
      if (this.props.onReset) {
        this.props.onReset();
      } else {
        window.location.href = "/";
      }
    } catch {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-background flex items-center justify-center p-4 sm:p-6 text-foreground font-sans">
          <div className="max-w-xl w-full bg-card/95 border border-border/70 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-destructive/15 border border-destructive/30 flex items-center justify-center text-destructive shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {this.props.fallbackTitle || "WalletWisely Runtime Safeguard"}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  A component encountered an issue, but your financial data is preserved safely.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive mb-5 space-y-1.5 font-mono">
              <div className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{this.state.error?.name || "Application Error"}:</span>
              </div>
              <p className="break-words pl-5 opacity-90 text-[11px]">
                {this.state.error?.message || "An unexpected rendering error occurred."}
              </p>
            </div>

            {this.state.errorInfo?.componentStack && (
              <details className="mb-5 text-[11px] text-muted-foreground bg-secondary/50 rounded-lg p-3 border border-border/40">
                <summary className="cursor-pointer font-medium text-foreground hover:text-primary">
                  View component trace details
                </summary>
                <pre className="mt-2 text-[10px] whitespace-pre-wrap font-mono max-h-36 overflow-y-auto opacity-80">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex items-center gap-3 pt-2 border-t border-border/40">
              <Button
                type="button"
                onClick={this.handleReset}
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold h-9 px-4 gap-2 flex-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recover Workspace
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={this.handleReload}
                className="text-xs h-9 px-4 gap-2 border-border/60 hover:bg-secondary/70"
              >
                <Home className="w-3.5 h-3.5 text-muted-foreground" />
                Full Reload
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
