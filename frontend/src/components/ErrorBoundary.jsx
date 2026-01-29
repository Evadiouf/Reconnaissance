import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Mettre à jour l'état pour que le prochain rendu affiche l'UI de repli
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Vous pouvez également enregistrer l'erreur dans un service de rapport d'erreur
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Vous pouvez rendre n'importe quelle UI personnalisée de repli
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#ECEFEF]">
          <div className="bg-white border border-[#D4DCDC] rounded-2xl p-8 max-w-md w-full mx-4">
            <h2 className="font-['Instrument_Sans',sans-serif] text-xl font-bold text-[#002222] mb-4">
              Une erreur s'est produite
            </h2>
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mb-6">
              Désolé, une erreur inattendue s'est produite. Veuillez rafraîchir la page.
            </p>
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="w-full px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl hover:bg-[#027A94] transition-colors font-['Instrument_Sans',sans-serif] text-base leading-[19.52px] cursor-pointer"
            >
              Rafraîchir la page
            </button>
            {this.state.error && (
              <details className="mt-4">
                <summary className="font-['Instrument_Sans',sans-serif] text-sm text-[#5A6565] cursor-pointer">
                  Détails de l'erreur
                </summary>
                <pre className="mt-2 p-4 bg-[#ECEFEF] rounded-lg text-xs overflow-auto">
                  {this.state.error.toString()}
                  {this.state.error.stack ? '\n' + this.state.error.stack : ''}
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

export default ErrorBoundary;


