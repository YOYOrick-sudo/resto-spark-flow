import React from "react";
import { AlertTriangle } from "lucide-react";
import { NestoCard } from "./NestoCard";
import { NestoButton } from "./NestoButton";

interface NestoErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface NestoErrorBoundaryState {
  hasError: boolean;
}

export class NestoErrorBoundary extends React.Component<
  NestoErrorBoundaryProps,
  NestoErrorBoundaryState
> {
  constructor(props: NestoErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): NestoErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[NestoErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex items-center justify-center min-h-[60vh] p-6">
          <NestoCard className="max-w-md w-full text-center space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-destructive/10 p-3">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <h2 className="text-h2 font-semibold">Er ging iets mis</h2>
            <p className="text-small text-muted-foreground">
              Dit onderdeel kon niet worden geladen. Probeer de pagina te vernieuwen.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <NestoButton onClick={() => window.location.reload()}>
                Pagina vernieuwen
              </NestoButton>
              <NestoButton
                variant="ghost"
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.href = "/";
                }}
              >
                Terug naar Dashboard
              </NestoButton>
            </div>
          </NestoCard>
        </div>
      );
    }

    return this.props.children;
  }
}
