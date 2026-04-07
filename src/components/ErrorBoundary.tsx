import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      
      try {
        // Check if it's a Firestore error JSON
        const firestoreError = JSON.parse(this.state.error?.message || "");
        if (firestoreError.error) {
          errorMessage = `Erro no banco de dados: ${firestoreError.error}`;
        }
      } catch (e) {
        // Not a JSON error
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen bg-[#313338] flex items-center justify-center p-4">
          <div className="bg-[#2b2d31] p-8 rounded-lg shadow-2xl border border-[#f23f42]/30 max-w-md w-full text-center space-y-6">
            <div className="bg-[#f23f42]/10 p-4 rounded-full inline-block">
              <AlertTriangle className="w-12 h-12 text-[#f23f42]" />
            </div>
            <h1 className="text-xl font-bold text-white">Ops! Algo deu errado.</h1>
            <p className="text-[#b5bac1] text-sm leading-relaxed">
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#5865f2] hover:bg-[#4752c4] text-white font-bold py-3 rounded-md transition-colors flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }
    
    return (this as any).props.children;
  }
}
