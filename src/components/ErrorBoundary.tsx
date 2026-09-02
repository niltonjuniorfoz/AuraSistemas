import React from "react";

interface Props {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State;
  props: Props;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-8 text-center bg-red-500/10 text-red-400 rounded-xl m-4 border border-red-500/20">
          <h2 className="text-xl font-bold mb-2">Erro Inesperado</h2>
          <p>Ocorreu um erro nesta tela. Tente recarregar ou contate o administrador.</p>
          {this.state.error && <p className="text-sm mt-4 font-mono opacity-80">{this.state.error.message}</p>}
        </div>
      );
    }

    return this.props.children;
  }
}
