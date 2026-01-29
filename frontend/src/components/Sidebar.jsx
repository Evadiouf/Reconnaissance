import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import authService from '../services/authService';

// Icônes de la sidebar
const DashboardIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const UserMultipleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 20H22V18C22 16.3431 18.866 15 17 15C15.134 15 12 16.3431 12 18V20H17Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14.5 7.5C14.5 9.433 12.933 11 11.5 11C10.067 11 8.5 9.433 8.5 7.5C8.5 5.567 10.067 4 11.5 4C12.933 4 14.5 5.567 14.5 7.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 20H19.3333V17.6667C19.3333 16.1939 16.6076 15 14.5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.5 11C19.433 11 21 9.433 21 7.5C21 5.567 19.433 4 17.5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CalendarIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8 2V6M16 2V6M3 10H21M5 4H19C20.1046 4 21 4.89543 21 6V20C21 21.1046 20.1046 22 19 22H5C3.89543 22 3 21.1046 3 20V6C3 4.89543 3.89543 4 5 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ClockIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 6V12L16 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const FileIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M14 2V8H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CameraIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M2 8C2 7.46957 2.21071 6.96086 2.58579 6.58579C2.96086 6.21071 3.46957 6 4 6H6L7.44721 3.10557C7.786 2.428 8.47852 2 9.23607 2H14.7639C15.5215 2 16.214 2.428 16.5528 3.10557L18 6H20C20.5304 6 21.0391 6.21071 21.4142 6.58579C21.7893 6.96086 22 7.46957 22 8V18C22 18.5304 21.7893 19.0391 21.4142 19.4142C21.0391 19.7893 20.5304 20 20 20H4C3.46957 20 2.96086 19.7893 2.58579 19.4142C2.21071 19.0391 2 18.5304 2 18V8Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="13" r="3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const SettingIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23H11.92C11.3896 23 10.8809 22.7893 10.5058 22.4142C10.1307 22.0391 9.92 21.5304 9.92 21V20.91C9.91871 20.5882 9.82343 20.2738 9.64574 20.0055C9.46804 19.7372 9.21584 19.5268 8.92 19.4C8.61838 19.2669 8.28381 19.2272 7.95941 19.286C7.63502 19.3448 7.33568 19.4995 7.1 19.73L7.04 19.79C6.85425 19.976 6.63368 20.1235 6.39087 20.2241C6.14805 20.3248 5.88783 20.3766 5.625 20.3766C5.36217 20.3766 5.10195 20.3248 4.85913 20.2241C4.61632 20.1235 4.39575 19.976 4.21 19.79C4.02405 19.6043 3.87653 19.3837 3.77588 19.1409C3.67523 18.8981 3.62344 18.6378 3.62344 18.375C3.62344 18.1122 3.67523 17.8519 3.77588 17.6091C3.87653 17.3663 4.02405 17.1457 4.21 16.96L4.27 16.9C4.50054 16.6643 4.65522 16.365 4.714 16.0406C4.77278 15.7162 4.73308 15.3816 4.6 15.08C4.47324 14.7842 4.26279 14.532 3.9945 14.3543C3.72622 14.1766 3.41179 14.0813 3.09 14.08H3C2.46957 14.08 1.96086 13.8693 1.58579 13.4942C1.21071 13.1191 1 12.6104 1 12.08V11.92C1 11.3896 1.21071 10.8809 1.58579 10.5058C1.96086 10.1307 2.46957 9.92 3 9.92H3.09C3.41179 9.91871 3.72622 9.82343 3.9945 9.64574C4.26279 9.46804 4.47324 9.21584 4.6 8.92C4.73308 8.61838 4.77278 8.28381 4.714 7.95941C4.65522 7.63502 4.50054 7.33568 4.27 7.1L4.21 7.04C4.02405 6.85425 3.87653 6.63368 3.77588 6.39087C3.67523 6.14805 3.62344 5.88783 3.62344 5.625C3.62344 5.36217 3.67523 5.10195 3.77588 4.85913C3.87653 4.61632 4.02405 4.39575 4.21 4.21C4.39575 4.02405 4.61632 3.87653 4.85913 3.77588C5.10195 3.67523 5.36217 3.62344 5.625 3.62344C5.88783 3.62344 6.14805 3.67523 6.39087 3.77588C6.63368 3.87653 6.85425 4.02405 7.04 4.21L7.1 4.27C7.33568 4.50054 7.63502 4.65522 7.95941 4.714C8.28381 4.77278 8.61838 4.73308 8.92 4.6H9C9.29584 4.47324 9.54804 4.26279 9.72574 3.9945C9.90343 3.72622 9.99871 3.41179 10 3.09V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1H12.08C12.6104 1 13.1191 1.21071 13.4942 1.58579C13.8693 1.96086 14.08 2.46957 14.08 3V3.09C14.0813 3.41179 14.1766 3.72622 14.3543 3.9945C14.532 4.26279 14.7842 4.47324 15.08 4.6C15.3816 4.73308 15.7162 4.77278 16.0406 4.714C16.365 4.65522 16.6643 4.50054 16.9 4.27L16.96 4.21C17.1457 4.02405 17.3663 3.87653 17.6091 3.77588C17.8519 3.67523 18.1122 3.62344 18.375 3.62344C18.6378 3.62344 18.8981 3.67523 19.1409 3.77588C19.3837 3.87653 19.6043 4.02405 19.79 4.21C19.976 4.39575 20.1235 4.61632 20.2241 4.85913C20.3248 5.10195 20.3766 5.36217 20.3766 5.625C20.3766 5.88783 20.3248 6.14805 20.2241 6.39087C20.1235 6.63368 19.976 6.85425 19.79 7.04L19.73 7.1C19.4995 7.33568 19.3448 7.63502 19.286 7.95941C19.2272 8.28381 19.2669 8.61838 19.4 8.92V9C19.5268 9.29584 19.7372 9.54804 20.0055 9.72574C20.2738 9.90343 20.5882 9.99871 20.91 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12V12.08C23 12.6104 22.7893 13.1191 22.4142 13.4942C22.0391 13.8693 21.5304 14.08 21 14.08H20.91C20.5882 14.0813 20.2738 14.1766 20.0055 14.3543C19.7372 14.532 19.5268 14.7842 19.4 15.08Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EntrepriseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ChecklistIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 11L12 14L22 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const MaintenanceIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

function Sidebar() {
  const location = useLocation();
  const { language } = useLanguage();
  
  // Récupérer les rôles de l'utilisateur connecté
  const { user } = authService.getStoredAuth();
  const userRoles = user?.roles || [];
  const isAdmin = userRoles.includes('admin') || userRoles.includes('superadmin');
  
  // Fonction pour obtenir la traduction
  const t = (key) => {
    return translations[language]?.[key] || key;
  };
  
  const menuItems = isAdmin
    ? [
        { path: '/entreprises', labelKey: 'Entreprise', icon: <EntrepriseIcon /> },
        ...(userRoles.includes('superadmin') ? [{ path: '/maintenance/visages', labelKey: 'Maintenance Visages', icon: <MaintenanceIcon /> }] : [])
      ]
    : [
        { path: '/dashboard', labelKey: 'Dashboard', icon: <DashboardIcon /> },
        { path: '/employes', labelKey: 'Employés', icon: <UserMultipleIcon /> },
        { path: '/horaires', labelKey: 'Horaires', icon: <CalendarIcon /> },
        { path: '/pointage', labelKey: 'Pointage', icon: <ClockIcon /> },
        { path: '/suivi-presences', labelKey: 'Suivi des Présences', icon: <ChecklistIcon /> },
        { path: '/rapports', labelKey: 'Rapports', icon: <FileIcon /> },
        { path: '/cameras', labelKey: 'Caméras', icon: <CameraIcon /> },
        { path: '/parametres', labelKey: 'Paramètres', icon: <SettingIcon /> },
      ];
  
  // Traductions spéciales pour le menu
  const menuTranslations = {
    'Français': {
      'Dashboard': 'Tableau de board',
      'Employés': 'Employés',
      'Horaires': 'Horaires',
      'Pointage': 'Pointage',
      'Suivi des Présences': 'Suivi des Présences',
      'Rapports': 'Rapports',
      'Caméras': 'Caméras',
      'Paramètres': 'Paramètres',
      'Entreprise': 'Entreprises'
    },
    'English': {
      'Dashboard': 'Dashboard',
      'Employés': 'Employees',
      'Horaires': 'Schedules',
      'Pointage': 'Attendance',
      'Suivi des Présences': 'Attendance Tracking',
      'Rapports': 'Reports',
      'Caméras': 'Cameras',
      'Paramètres': 'Settings',
      'Entreprise': 'Companies'
    },
    'Español': {
      'Dashboard': 'Panel de Control',
      'Employés': 'Empleados',
      'Horaires': 'Horarios',
      'Pointage': 'Asistencia',
      'Suivi des Présences': 'Seguimiento de Asistencia',
      'Rapports': 'Informes',
      'Caméras': 'Cámaras',
      'Paramètres': 'Configuración',
      'Entreprise': 'Empresas'
    }
  };
  
  const getMenuLabel = (key) => {
    return menuTranslations[language]?.[key] || key;
  };

  return (
    <aside className="p-5 bg-gradient-to-br from-[#003E3E] to-[#002222]" style={{ minHeight: 'calc(100vh - 70px)' }}>
      <nav className="space-y-2.5">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path || 
                          (location.pathname.includes('employe') && item.path === '/employes') ||
                          (location.pathname.includes('suivi-presences') && item.path === '/suivi-presences') ||
                          (item.path === '/dashboard' && location.pathname === '/');
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={(e) => {
                // Empêcher la navigation si déjà sur la page active
                if (isActive) {
                  e.preventDefault();
                }
              }}
              className={`flex items-center gap-4 px-6 py-2.5 rounded-2xl font-['Instrument_Sans',sans-serif] transition-colors ${
                isActive
                  ? 'bg-[#03D9D9]/10 border border-[#03D9D9] text-[#03D9D9]'
                  : 'text-white hover:bg-[#03D9D9]/5'
              }`}
            >
              {item.icon} {getMenuLabel(item.labelKey)}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export default Sidebar;







