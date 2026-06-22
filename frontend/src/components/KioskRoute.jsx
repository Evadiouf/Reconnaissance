import { Navigate, useSearchParams } from 'react-router-dom';
import authService from '../services/authService';

function KioskRoute({ children }) {
  const { token, isAuthenticated } = authService.getStoredAuth();
  const [params] = useSearchParams();
  const kioskToken = params.get('kiosk_token') || localStorage.getItem('kioskToken');

  if (!isAuthenticated && !token && !kioskToken) {
    return <Navigate to="/connexion" replace />;
  }

  return children;
}

export default KioskRoute;
