import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider } from './contexts/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

// Pages publiques - chargées immédiatement
import Home from './pages/Home';
import Inscription from './pages/Inscription';
import Connexion from './pages/Connexion';

// Pages avec lazy loading pour optimiser les performances
const MotDePasseOublie = lazy(() => import('./pages/MotDePasseOublie'));
const ReinitialiserMotDePasse = lazy(() => import('./pages/ReinitialiserMotDePasse'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Employes = lazy(() => import('./pages/Employes'));
const Horaires = lazy(() => import('./pages/Horaires'));
const Pointage = lazy(() => import('./pages/Pointage'));
const Rapports = lazy(() => import('./pages/Rapports'));
const RapportQuotidienPresence = lazy(() => import('./pages/RapportQuotidienPresence'));
const Cameras = lazy(() => import('./pages/Cameras'));
const Parametres = lazy(() => import('./pages/Parametres'));
const Entreprises = lazy(() => import('./pages/Entreprises'));
const Notifications = lazy(() => import('./pages/Notifications'));
const AjouterEmploye = lazy(() => import('./pages/AjouterEmploye'));
const MonProfil = lazy(() => import('./pages/MonProfil'));
const Tarifs = lazy(() => import('./pages/Tarifs'));
const TarifsStarter = lazy(() => import('./pages/TarifsStarter'));
const TarifsBusiness = lazy(() => import('./pages/TarifsBusiness'));
const TarifsEnterprise = lazy(() => import('./pages/TarifsEnterprise'));
const Contact = lazy(() => import('./pages/Contact'));
const SuiviPresences = lazy(() => import('./pages/SuiviPresences'));
const MaintenanceVisages = lazy(() => import('./pages/MaintenanceVisages'));

// Composant de chargement
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-dark-bg">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
      <p className="text-gray-400">Chargement...</p>
    </div>
  </div>
);

/**
 * Layout avec Navbar et Footer pour les pages publiques
 */
function PublicLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-dark-bg">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
    </div>
  );
}

/**
 * Composant principal de l'application
 */
function App() {
  return (
    <ErrorBoundary>
      <LanguageProvider>
        <Router>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Routes avec Navbar et Footer */}
              <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
              <Route path="/inscription" element={<PublicLayout><Inscription /></PublicLayout>} />
              <Route path="/connexion" element={<PublicLayout><Connexion /></PublicLayout>} />
              <Route path="/mot-de-passe-oublie" element={<PublicLayout><MotDePasseOublie /></PublicLayout>} />
              <Route path="/reinitialiser-mot-de-passe" element={<PublicLayout><ReinitialiserMotDePasse /></PublicLayout>} />
              <Route path="/contact" element={<Contact />} />
        
        {/* Routes Tarifs - sans Navbar et Footer pour un design personnalisé */}
        <Route path="/tarifs" element={<Tarifs />} />
        <Route path="/tarifs/starter" element={<TarifsStarter />} />
        <Route path="/tarifs/business" element={<TarifsBusiness />} />
        <Route path="/tarifs/enterprise" element={<TarifsEnterprise />} />
        
        {/* Routes sans Navbar et Footer (pages dashboard) */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/employes" element={<ProtectedRoute><Employes /></ProtectedRoute>} />
        <Route path="/horaires" element={<ProtectedRoute><Horaires /></ProtectedRoute>} />
        <Route path="/pointage" element={<ProtectedRoute><Pointage /></ProtectedRoute>} />
        <Route path="/rapports" element={<ProtectedRoute><Rapports /></ProtectedRoute>} />
        <Route path="/rapports/quotidien" element={<ProtectedRoute><RapportQuotidienPresence /></ProtectedRoute>} />
        <Route path="/cameras" element={<ProtectedRoute><Cameras /></ProtectedRoute>} />
        <Route path="/parametres" element={<ProtectedRoute><Parametres /></ProtectedRoute>} />
        <Route 
          path="/entreprises" 
          element={
            <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
              <Entreprises />
            </ProtectedRoute>
          } 
        />
        <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        <Route path="/employes/ajouter" element={<ProtectedRoute><AjouterEmploye /></ProtectedRoute>} />
        <Route path="/suivi-presences" element={<ProtectedRoute><SuiviPresences /></ProtectedRoute>} />
        <Route path="/mon-profil" element={<ProtectedRoute><MonProfil /></ProtectedRoute>} />
        <Route path="/profil" element={<ProtectedRoute><MonProfil /></ProtectedRoute>} />
        <Route 
          path="/maintenance/visages" 
          element={
            <ProtectedRoute allowedRoles={['superadmin']}>
              <MaintenanceVisages />
            </ProtectedRoute>
          } 
        />
            </Routes>
          </Suspense>
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
