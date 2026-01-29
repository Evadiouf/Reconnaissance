import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

// Vérifier que l'élément root existe avant de tenter le rendu
const rootElement = document.getElementById('root')

if (rootElement) {
  const root = createRoot(rootElement)
  
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  )
} else {
  console.error("Élément root introuvable dans le DOM")
}
