import { Navigate } from 'react-router-dom';
import authService from '../services/authService';

/**
 * Composant pour protéger les routes qui nécessitent des permissions spécifiques
 * @param {Object} props
 * @param {React.ReactNode} props.children - Le composant à rendre si l'utilisateur a les permissions
 * @param {string[]} props.allowedRoles - Les rôles autorisés à accéder à cette route
 * @param {string} props.redirectTo - La route vers laquelle rediriger si l'utilisateur n'a pas les permissions (par défaut: /dashboard)
 */
function ProtectedRoute({ children, allowedRoles = [], redirectTo = '/dashboard' }) {
  const { user, token, isAuthenticated } = authService.getStoredAuth();
  const userRoles = user?.roles || [];
 
  // Bloquer l'accès si l'utilisateur n'est pas authentifié
  if (!isAuthenticated || !token) {
    return <Navigate to="/connexion" replace />;
  }
  
  // Vérifier si l'utilisateur a au moins un des rôles autorisés
  const hasAccess = allowedRoles.length === 0 || allowedRoles.some(role => userRoles.includes(role));
  
  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return children;
}

export default ProtectedRoute;
