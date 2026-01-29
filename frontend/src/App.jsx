import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { LanguageProvider } from './contexts/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Inscription from './pages/Inscription';
import Connexion from './pages/Connexion';
import MotDePasseOublie from './pages/MotDePasseOublie';
import ReinitialiserMotDePasse from './pages/ReinitialiserMotDePasse';
import Dashboard from './pages/Dashboard';
import Employes from './pages/Employes';
import Horaires from './pages/Horaires';
import Pointage from './pages/Pointage';
import Rapports from './pages/Rapports';
import RapportQuotidienPresence from './pages/RapportQuotidienPresence';
import Cameras from './pages/Cameras';
import Parametres from './pages/Parametres';
import Entreprises from './pages/Entreprises';
import Notifications from './pages/Notifications';
import AjouterEmploye from './pages/AjouterEmploye';
import MonProfil from './pages/MonProfil';
import Tarifs from './pages/Tarifs';
import TarifsStarter from './pages/TarifsStarter';
import TarifsBusiness from './pages/TarifsBusiness';
import TarifsEnterprise from './pages/TarifsEnterprise';
import GestionVisages from './pages/GestionVisages';
import Contact from './pages/Contact';
import SuiviPresences from './pages/SuiviPresences';
import MaintenanceVisages from './pages/MaintenanceVisages';
import './App.css';

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
        </Router>
      </LanguageProvider>
    </ErrorBoundary>
  );
}

export default App;
