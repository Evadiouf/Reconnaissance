import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import siteConfigService from '../services/siteConfigService';
import authService from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';
import { getUserData, updateUserData, onUserDataUpdate } from '../services/userDataService';
import { 
  getCurrentSessionInfo, 
  getActiveSessions, 
  saveCurrentSession, 
  removeSession, 
  removeAllOtherSessions, 
  formatLastActivity,
  initSessionTimeout 
} from '../services/sessionService';
import notificationService from '../services/notificationService';
import { sendVerificationCodes, verifyCode } from '../services/twoFactorService';

function Parametres() {
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Profil');
  const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [twoFactorPhone, setTwoFactorPhone] = useState('');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorCodeSent, setTwoFactorCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  
  // Charger les données de l'utilisateur connecté
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    department: '',
    phone: '',
    language: 'Français',
    nomEntreprise: ''
  });
  
  // Charger les données de l'utilisateur connecté au chargement
  useEffect(() => {
    try {
      // Utiliser le service centralisé pour récupérer les données
      const userData = getUserData();
      if (userData) {
        setProfileData({
          fullName: userData.nomComplet || userData.fullName || '',
          email: userData.email || '',
          department: userData.departement || userData.department || '',
          phone: userData.phone || userData.telephone || '',
          language: userData.language || 'Français',
          nomEntreprise: userData.nomEntreprise || ''
        });
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
    }
    
    // Charger les préférences de notifications depuis localStorage
    try {
      const savedPreferences = localStorage.getItem('notificationPreferences');
      if (savedPreferences) {
        const parsed = JSON.parse(savedPreferences);
        setNotificationPreferences(parsed);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences de notifications:', error);
    }
    
    // Charger les paramètres de sécurité depuis localStorage
    let sessionTimeoutCleanup = null;
    try {
      const savedSecurity = localStorage.getItem('securitySettings');
      if (savedSecurity) {
        const parsed = JSON.parse(savedSecurity);
        setSecuritySettings(parsed);
        if (parsed.twoFactorPhone) {
          setTwoFactorPhone(parsed.twoFactorPhone);
        }
        if (parsed.twoFactorEmail) {
          setTwoFactorEmail(parsed.twoFactorEmail);
        }
        
        // Initialiser le timeout de session si configuré
        if (parsed.sessionTimeout && parsed.sessionTimeout !== 'Jamais') {
          sessionTimeoutCleanup = initSessionTimeout(parsed.sessionTimeout, () => {
            alert('Votre session a expiré en raison de l\'inactivité. Vous allez être déconnecté.');
            authService.logout();
            navigate('/connexion');
          });
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres de sécurité:', error);
    }
    
    // Charger et sauvegarder la session actuelle
    const currentSession = saveCurrentSession();
    const sessions = getActiveSessions();
    const userData = getUserData();
    if (userData && userData.email) {
      const userSessions = sessions.filter(s => s.userEmail === userData.email);
      setActiveSessions(userSessions);
    }
    
    // Écouter les changements de données utilisateur depuis d'autres pages
    const unsubscribe = onUserDataUpdate((updatedData) => {
      setProfileData(prev => ({
        ...prev,
        fullName: updatedData.nomComplet || updatedData.fullName || prev.fullName,
        email: updatedData.email || prev.email,
        department: updatedData.departement || updatedData.department || prev.department,
        phone: updatedData.phone || updatedData.telephone || prev.phone,
        nomEntreprise: updatedData.nomEntreprise || prev.nomEntreprise
      }));
    });
    
    return () => {
      if (sessionTimeoutCleanup) {
        sessionTimeoutCleanup();
      }
      unsubscribe();
    };
  }, []);
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // États pour gérer la visibilité des mots de passe
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [notificationPreferences, setNotificationPreferences] = useState({
    email: true,
    push: true,
    attendanceReminders: true,
    push2: true,
    reportAlerts: true,
    systemUpdates: true,
    weeklySummary: true
  });

  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  
  const [securitySettings, setSecuritySettings] = useState({
    twoFactorAuth: false,
    twoFactorPhone: '',
    twoFactorEmail: '',
    sessionTimeout: '30 minutes',
    loginAlerts: true
  });
  
  const [isSessionTimeoutDropdownOpen, setIsSessionTimeoutDropdownOpen] = useState(false);
  
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: 'Clair',
    interfaceLanguage: 'Français',
    dateFormat: 'JJ/MM/AAAA',
    timeFormat: '24 heures'
  });
  
  // Fonction pour appliquer le thème
  const applyTheme = (theme) => {
    const body = document.body;
    const root = document.documentElement;
    
    // Déterminer le thème à appliquer
    let actualTheme = theme;
    if (theme === 'Auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      actualTheme = prefersDark ? 'Sombre' : 'Clair';
    }
    
    if (actualTheme === 'Sombre') {
      // Thème sombre - Ajouter une classe globale
      body.classList.add('dark-theme');
      root.classList.add('dark-theme');
      
      // Appliquer les styles au body
      body.style.backgroundColor = '#1a1a1a';
      body.style.color = '#ffffff';
      body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      
      // Créer ou mettre à jour une feuille de style pour le thème sombre
      let styleSheet = document.getElementById('dark-theme-styles');
      if (!styleSheet) {
        styleSheet = document.createElement('style');
        styleSheet.id = 'dark-theme-styles';
        document.head.appendChild(styleSheet);
      }
      
      styleSheet.textContent = `
        body.dark-theme {
          background-color: #1a1a1a !important;
          color: #ffffff !important;
        }
        body.dark-theme .bg-white,
        body.dark-theme [class*="bg-white"] {
          background-color: #2d2d2d !important;
          color: #ffffff !important;
          border-color: #404040 !important;
        }
        body.dark-theme [style*="background-color: rgb(236, 239, 239)"],
        body.dark-theme [style*="background-color:#ECEFEF"] {
          background-color: #1a1a1a !important;
        }
        body.dark-theme [style*="background-color: rgb(255, 255, 255)"],
        body.dark-theme [style*="background-color:#ffffff"] {
          background-color: #2d2d2d !important;
          color: #ffffff !important;
        }
        body.dark-theme h1,
        body.dark-theme h2,
        body.dark-theme h3,
        body.dark-theme p,
        body.dark-theme span,
        body.dark-theme label {
          color: #ffffff !important;
        }
        body.dark-theme input,
        body.dark-theme select,
        body.dark-theme textarea {
          background-color: #2d2d2d !important;
          color: #ffffff !important;
          border-color: #404040 !important;
        }
        body.dark-theme .border-\\[\\#D4DCDC\\] {
          border-color: #404040 !important;
        }
      `;
      
    } else {
      // Thème clair - Retirer la classe globale
      body.classList.remove('dark-theme');
      root.classList.remove('dark-theme');
      
      // Restaurer les styles par défaut
      body.style.backgroundColor = '#ECEFEF';
      body.style.color = '#002222';
      body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
      
      // Supprimer la feuille de style du thème sombre
      const styleSheet = document.getElementById('dark-theme-styles');
      if (styleSheet) {
        styleSheet.remove();
      }
    }
  };
  
  // Charger les paramètres d'apparence sauvegardés au chargement
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('appearanceSettings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setAppearanceSettings(parsed);
        // Synchroniser avec le contexte de langue global
        if (parsed.interfaceLanguage && parsed.interfaceLanguage !== language) {
          changeLanguage(parsed.interfaceLanguage);
        }
        // Appliquer le thème immédiatement
        setTimeout(() => applyTheme(parsed.theme), 100);
      } else {
        // Appliquer le thème par défaut
        setTimeout(() => applyTheme('Clair'), 100);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres d\'apparence:', error);
      setTimeout(() => applyTheme('Clair'), 100);
    }
  }, []);
  
  // Synchroniser appearanceSettings avec la langue du contexte
  useEffect(() => {
    if (language && appearanceSettings.interfaceLanguage !== language) {
      setAppearanceSettings(prev => ({ ...prev, interfaceLanguage: language }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);
  
  // Appliquer le thème quand il change
  useEffect(() => {
    if (appearanceSettings.theme) {
      setTimeout(() => applyTheme(appearanceSettings.theme), 100);
    }
  }, [appearanceSettings.theme]);
  
  // Système de traduction simple
  const translations = {
    'Français': {
      'Paramètres': 'Paramètres',
      'Gérez vos préférences': 'Gérez vos préférences et la configuration de votre compte',
      'Profil': 'Profil',
      'Notifications': 'Notifications',
      'Sécurité': 'Sécurité',
      'Apparence': 'Apparence',
      'Entreprise': 'Entreprise',
      'Informations personnelles': 'Informations personnelles',
      'Mettez à jour vos informations de profil': 'Mettez à jour vos informations de profil',
      'Paramètres d\'image': 'Paramètres d\'image',
      'Nom complet': 'Nom complet',
      'Adresse email': 'Adresse email',
      'Département': 'Département',
      'Téléphone': 'Téléphone',
      'Langue': 'Langue',
      'Enregistrer les modifications': 'Enregistrer les modifications',
      'Changer le mot de passe': 'Changer le mot de passe',
      'Mettez à jour votre mot de passe pour sécuriser votre compte': 'Mettez à jour votre mot de passe pour sécuriser votre compte',
      'Mot de passe actuel': 'Mot de passe actuel',
      'Nouveau mot de passe': 'Nouveau mot de passe',
      'Confirmer le mot de passe': 'Confirmer le mot de passe',
      'Préférences de notification': 'Préférences de notification',
      'Choisissez comment vous souhaitez être notifié': 'Choisissez comment vous souhaitez être notifié',
      'Notifications par e-mail': 'Notifications par e-mail',
      'Recevoir des notifications par email': 'Recevoir des notifications par email',
      'Notification push': 'Notification push',
      'Recevoir des notifications sur votre navigateur': 'Recevoir des notifications sur votre navigateur',
      'Rappels pointage': 'Rappels pointage',
      'Recevoir des rappels pour pointer': 'Recevoir des rappels pour pointer',
      'Alertes rapports': 'Alertes rapports',
      'Notifications pour les nouveaux rapports': 'Notifications pour les nouveaux rapports',
      'Mise à jour système': 'Mise à jour système',
      'Notifications sur les nouvelles fonctionnalités': 'Notifications sur les nouvelles fonctionnalités',
      'Résumé hebdomadaire': 'Résumé hebdomadaire',
      'Recevoir un résumé de vos activités chaque semaine': 'Recevoir un résumé de vos activités chaque semaine',
      'Sécurité du compte': 'Sécurité du compte',
      'Gérez les paramètres de sécurité de votre compte': 'Gérez les paramètres de sécurité de votre compte',
      'Authentification à deux facteurs': 'Authentification à deux facteurs',
      'Ajoutez une couche de sécurité supplémentaire': 'Ajoutez une couche de sécurité supplémentaire',
      'Délais d\'expiration de session': 'Délais d\'expiration de session',
      'Durée avant déconnexion automatique en cas d\'inactivité': 'Durée avant déconnexion automatique en cas d\'inactivité',
      'Alertes de connexion': 'Alertes de connexion',
      'Recevoir une notification à chaque nouvelle connexion': 'Recevoir une notification à chaque nouvelle connexion',
      'Enregistrer les paramètres': 'Enregistrer les paramètres',
      'Sessions actives': 'Sessions actives',
      'Gérez les appareils connectés à votre compte': 'Gérez les appareils connectés à votre compte',
      'Session actuelle': 'Session actuelle',
      'Personnalisez l\'apparence de l\'application': 'Personnalisez l\'apparence de l\'application',
      'Thème': 'Thème',
      'Langue de l\'interface': 'Langue de l\'interface',
      'Format date': 'Format date',
      'Format heure': 'Format heure',
      'Informations de l\'entreprise': 'Informations de l\'entreprise',
      'Configurez les paramètres globaux de l\'entreprise': 'Configurez les paramètres globaux de l\'entreprise',
      'Nom de l\'entreprise': 'Nom de l\'entreprise',
      'Fuseau horaire': 'Fuseau horaire',
      'Début de semaine': 'Début de semaine',
      'Début d\'année fiscale': 'Début d\'année fiscale'
    },
    'English': {
      'Paramètres': 'Settings',
      'Gérez vos préférences': 'Manage your preferences and account configuration',
      'Profil': 'Profile',
      'Notifications': 'Notifications',
      'Sécurité': 'Security',
      'Apparence': 'Appearance',
      'Entreprise': 'Company',
      'Informations personnelles': 'Personal Information',
      'Mettez à jour vos informations de profil': 'Update your profile information',
      'Paramètres d\'image': 'Image Settings',
      'Nom complet': 'Full Name',
      'Adresse email': 'Email Address',
      'Département': 'Department',
      'Téléphone': 'Phone',
      'Langue': 'Language',
      'Enregistrer les modifications': 'Save Changes',
      'Changer le mot de passe': 'Change Password',
      'Mettez à jour votre mot de passe pour sécuriser votre compte': 'Update your password to secure your account',
      'Mot de passe actuel': 'Current Password',
      'Nouveau mot de passe': 'New Password',
      'Confirmer le mot de passe': 'Confirm Password',
      'Préférences de notification': 'Notification Preferences',
      'Choisissez comment vous souhaitez être notifié': 'Choose how you want to be notified',
      'Notifications par e-mail': 'Email Notifications',
      'Recevoir des notifications par email': 'Receive notifications by email',
      'Notification push': 'Push Notifications',
      'Recevoir des notifications sur votre navigateur': 'Receive notifications on your browser',
      'Rappels pointage': 'Attendance Reminders',
      'Recevoir des rappels pour pointer': 'Receive reminders to clock in',
      'Alertes rapports': 'Report Alerts',
      'Notifications pour les nouveaux rapports': 'Notifications for new reports',
      'Mise à jour système': 'System Updates',
      'Notifications sur les nouvelles fonctionnalités': 'Notifications about new features',
      'Résumé hebdomadaire': 'Weekly Summary',
      'Recevoir un résumé de vos activités chaque semaine': 'Receive a summary of your activities each week',
      'Sécurité du compte': 'Account Security',
      'Gérez les paramètres de sécurité de votre compte': 'Manage your account security settings',
      'Authentification à deux facteurs': 'Two-Factor Authentication',
      'Ajoutez une couche de sécurité supplémentaire': 'Add an extra layer of security',
      'Délais d\'expiration de session': 'Session Timeout',
      'Durée avant déconnexion automatique en cas d\'inactivité': 'Time before automatic logout due to inactivity',
      'Alertes de connexion': 'Login Alerts',
      'Recevoir une notification à chaque nouvelle connexion': 'Receive a notification for each new login',
      'Enregistrer les paramètres': 'Save Settings',
      'Sessions actives': 'Active Sessions',
      'Gérez les appareils connectés à votre compte': 'Manage devices connected to your account',
      'Session actuelle': 'Current Session',
      'Personnalisez l\'apparence de l\'application': 'Customize the appearance of the application',
      'Thème': 'Theme',
      'Langue de l\'interface': 'Interface Language',
      'Format date': 'Date Format',
      'Format heure': 'Time Format',
      'Informations de l\'entreprise': 'Company Information',
      'Configurez les paramètres globaux de l\'entreprise': 'Configure global company settings',
      'Nom de l\'entreprise': 'Company Name',
      'Fuseau horaire': 'Timezone',
      'Début de semaine': 'Week Start',
      'Début d\'année fiscale': 'Fiscal Year Start'
    },
    'Español': {
      'Paramètres': 'Configuración',
      'Gérez vos préférences': 'Gestiona tus preferencias y configuración de cuenta',
      'Profil': 'Perfil',
      'Notifications': 'Notificaciones',
      'Sécurité': 'Seguridad',
      'Apparence': 'Apariencia',
      'Entreprise': 'Empresa',
      'Informations personnelles': 'Información Personal',
      'Mettez à jour vos informations de profil': 'Actualiza tu información de perfil',
      'Paramètres d\'image': 'Configuración de Imagen',
      'Nom complet': 'Nombre Completo',
      'Adresse email': 'Dirección de Correo',
      'Département': 'Departamento',
      'Téléphone': 'Teléfono',
      'Langue': 'Idioma',
      'Enregistrer les modifications': 'Guardar Cambios',
      'Changer le mot de passe': 'Cambiar Contraseña',
      'Mettez à jour votre mot de passe pour sécuriser votre compte': 'Actualiza tu contraseña para asegurar tu cuenta',
      'Mot de passe actuel': 'Contraseña Actual',
      'Nouveau mot de passe': 'Nueva Contraseña',
      'Confirmer le mot de passe': 'Confirmar Contraseña',
      'Préférences de notification': 'Preferencias de Notificación',
      'Choisissez comment vous souhaitez être notifié': 'Elige cómo quieres ser notificado',
      'Notifications par e-mail': 'Notificaciones por Correo',
      'Recevoir des notifications par email': 'Recibir notificaciones por correo',
      'Notification push': 'Notificaciones Push',
      'Recevoir des notifications sur votre navigateur': 'Recibir notificaciones en tu navegador',
      'Rappels pointage': 'Recordatorios de Asistencia',
      'Recevoir des rappels pour pointer': 'Recibir recordatorios para fichar',
      'Alertes rapports': 'Alertas de Informes',
      'Notifications pour les nouveaux rapports': 'Notificaciones para nuevos informes',
      'Mise à jour système': 'Actualizaciones del Sistema',
      'Notifications sur les nouvelles fonctionnalités': 'Notificaciones sobre nuevas funcionalidades',
      'Résumé hebdomadaire': 'Resumen Semanal',
      'Recevoir un résumé de vos activités chaque semaine': 'Recibir un resumen de tus actividades cada semana',
      'Sécurité du compte': 'Seguridad de la Cuenta',
      'Gérez les paramètres de sécurité de votre compte': 'Gestiona la configuración de seguridad de tu cuenta',
      'Authentification à deux facteurs': 'Autenticación de Dos Factores',
      'Ajoutez une couche de sécurité supplémentaire': 'Añade una capa adicional de seguridad',
      'Délais d\'expiration de session': 'Tiempo de Expiración de Sesión',
      'Durée avant déconnexion automatique en cas d\'inactivité': 'Tiempo antes de desconexión automática por inactividad',
      'Alertes de connexion': 'Alertas de Inicio de Sesión',
      'Recevoir une notification à chaque nouvelle connexion': 'Recibir una notificación en cada nuevo inicio de sesión',
      'Enregistrer les paramètres': 'Guardar Configuración',
      'Sessions actives': 'Sesiones Activas',
      'Gérez les appareils connectés à votre compte': 'Gestiona los dispositivos conectados a tu cuenta',
      'Session actuelle': 'Sesión Actual',
      'Personnalisez l\'apparence de l\'application': 'Personaliza la apariencia de la aplicación',
      'Thème': 'Tema',
      'Langue de l\'interface': 'Idioma de la Interfaz',
      'Format date': 'Formato de Fecha',
      'Format heure': 'Formato de Hora',
      'Informations de l\'entreprise': 'Información de la Empresa',
      'Configurez les paramètres globaux de l\'entreprise': 'Configura los parámetros globales de la empresa',
      'Nom de l\'entreprise': 'Nombre de la Empresa',
      'Fuseau horaire': 'Zona Horaria',
      'Début de semaine': 'Inicio de Semana',
      'Début d\'année fiscale': 'Inicio del Año Fiscal'
    }
  };
  
  // Fonction pour obtenir la traduction
  const t = (key) => {
    const lang = language || appearanceSettings.interfaceLanguage || 'Français';
    return translations[lang]?.[key] || key;
  };
  
  // Appliquer la langue quand elle change
  useEffect(() => {
    if (appearanceSettings.interfaceLanguage) {
      // Stocker la langue dans localStorage pour utilisation globale
      localStorage.setItem('interfaceLanguage', appearanceSettings.interfaceLanguage);
      // Afficher un message de confirmation
      const langNames = {
        'Français': 'français',
        'English': 'anglais',
        'Español': 'espagnol'
      };
      console.log(`Langue de l'interface changée en ${langNames[appearanceSettings.interfaceLanguage]}`);
    }
  }, [appearanceSettings.interfaceLanguage]);
  
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const [isInterfaceLanguageDropdownOpen, setIsInterfaceLanguageDropdownOpen] = useState(false);
  const [isDateFormatDropdownOpen, setIsDateFormatDropdownOpen] = useState(false);
  const [isTimeFormatDropdownOpen, setIsTimeFormatDropdownOpen] = useState(false);
  const [isSavingAppearance, setIsSavingAppearance] = useState(false);
  
  const [companySettings, setCompanySettings] = useState({
    companyName: 'SenPointage',
    timezone: 'Afrique/Dakar (GMT+0)',
    weekStart: 'Lundi',
    fiscalYearStart: 'Janvier'
  });
  
  const [isTimezoneDropdownOpen, setIsTimezoneDropdownOpen] = useState(false);
  const [isWeekStartDropdownOpen, setIsWeekStartDropdownOpen] = useState(false);
  const [isFiscalYearStartDropdownOpen, setIsFiscalYearStartDropdownOpen] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  
  // Refs pour gérer les clics en dehors des dropdowns
  const themeDropdownRef = useRef(null);
  const interfaceLanguageDropdownRef = useRef(null);
  const dateFormatDropdownRef = useRef(null);
  const timeFormatDropdownRef = useRef(null);
  const timezoneDropdownRef = useRef(null);
  const weekStartDropdownRef = useRef(null);
  const fiscalYearStartDropdownRef = useRef(null);
  
  // Fermer les dropdowns lors d'un clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target)) {
        setIsThemeDropdownOpen(false);
      }
      if (interfaceLanguageDropdownRef.current && !interfaceLanguageDropdownRef.current.contains(event.target)) {
        setIsInterfaceLanguageDropdownOpen(false);
      }
      if (dateFormatDropdownRef.current && !dateFormatDropdownRef.current.contains(event.target)) {
        setIsDateFormatDropdownOpen(false);
      }
      if (timeFormatDropdownRef.current && !timeFormatDropdownRef.current.contains(event.target)) {
        setIsTimeFormatDropdownOpen(false);
      }
      if (timezoneDropdownRef.current && !timezoneDropdownRef.current.contains(event.target)) {
        setIsTimezoneDropdownOpen(false);
      }
      if (weekStartDropdownRef.current && !weekStartDropdownRef.current.contains(event.target)) {
        setIsWeekStartDropdownOpen(false);
      }
      if (fiscalYearStartDropdownRef.current && !fiscalYearStartDropdownRef.current.contains(event.target)) {
        setIsFiscalYearStartDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isThemeDropdownOpen, isInterfaceLanguageDropdownOpen, isDateFormatDropdownOpen, isTimeFormatDropdownOpen, isTimezoneDropdownOpen, isWeekStartDropdownOpen, isFiscalYearStartDropdownOpen]);

  // Icônes SVG
  const UserIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="7" r="4" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const LockIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="7" width="16" height="13" rx="1" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 7V5C8 3.93913 8.42143 2.92172 9.17157 2.17157C9.92172 1.42143 10.9391 1 12 1C13.0609 1 14.0783 1.42143 14.8284 2.17157C15.5786 2.92172 16 3.93913 16 5V7" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 13V15" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ArrowDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône œil pour afficher le mot de passe
  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.667 10C1.667 10 4.583 4.167 10 4.167C15.417 4.167 18.333 10 18.333 10C18.333 10 15.417 15.833 10 15.833C4.583 15.833 1.667 10 1.667 10Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="2.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône œil barré pour masquer le mot de passe
  const EyeOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.667 10C1.667 10 4.583 4.167 10 4.167C15.417 4.167 18.333 10 18.333 10C18.333 10 15.417 15.833 10 15.833C4.583 15.833 1.667 10 1.667 10Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="2.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2.5 2.5L17.5 17.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  // Tabs avec traduction
  const getTabs = () => {
    return [
      t('Profil'),
      t('Notifications'),
      t('Sécurité'),
      t('Apparence'),
      t('Entreprise')
    ];
  };
  
  const tabs = ['Profil', 'Notifications', 'Sécurité', 'Apparence', 'Entreprise'];
  const tabKeys = ['Profil', 'Notifications', 'Sécurité', 'Apparence', 'Entreprise'];

  // Icône Notification
  const NotificationIconSettings = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Toggle On Icon
  const ToggleOnIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.33" y="10" width="33.33" height="20" rx="10" fill="#01A04E"/>
      <circle cx="15" cy="20" r="8.33" fill="white"/>
    </svg>
  );

  // Toggle Off Icon
  const ToggleOffIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.33" y="10" width="33.33" height="20" rx="10" fill="#D4DCDC"/>
      <circle cx="25" cy="20" r="8.33" fill="white"/>
    </svg>
  );

  // Security Icon
  const SecurityIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 12L11 14L15 10" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Paint Board Icon (Apparence)
  const PaintBoardIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 21H21" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 21V7L13 2L21 7V21" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 7H21" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13 2V7" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="14" r="1" fill="#002222"/>
      <circle cx="15" cy="14" r="1" fill="#002222"/>
      <circle cx="9" cy="18" r="1" fill="#002222"/>
      <circle cx="15" cy="18" r="1" fill="#002222"/>
    </svg>
  );

  // Building Icon (Entreprise)
  const BuildingIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 21H21" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 21V7L12 3L19 7V21" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 9V13" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 17V21" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 9V13" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 17V21" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Header */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-20 flex justify-between items-center">
          <h1 className="font-audiowide text-2xl text-[#002222]">Sen Pointage</h1>
          
          <div className="flex items-center gap-4">
            <NotificationIcon />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <div className="flex min-h-screen">
        <Sidebar />
        
        <main className="flex-1 p-8">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2.5">
              <h1 className="font-audiowide text-[26px] font-normal text-[#002222] leading-[30px]">
                {t('Paramètres')}
              </h1>
              <p className="font-instrument text-base text-[#5A6565] leading-[26px]">
                {t('Gérez vos préférences')}
              </p>
            </div>
          </div>

          {/* Tabs Navigation */}
          <div className="bg-[#D4DCDC] rounded-2xl p-1 mb-5 flex gap-1">
            {tabKeys.map((tabKey, index) => {
              const tab = tabs[index];
              return (
                <button
                  key={tabKey}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-2.5 rounded-xl font-instrument text-base leading-[19.52px] transition-colors ${
                    activeTab === tab
                      ? 'bg-white text-[#002222]'
                      : 'bg-transparent text-[#002222] hover:bg-white/50'
                  }`}
                >
                  {t(tabKey)}
                </button>
              );
            })}
          </div>

          {/* Content based on active tab */}
          {activeTab === 'Profil' && (
            <>
              {/* Informations personnelles */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden mb-5">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                  <UserIcon />
                  <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                    Informations personnelles
                  </h2>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-5 px-5 py-2.5 pb-5">
                  <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                    Mettez à jour vos informations de profil
                  </p>

                  <h3 className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                    Paramètres d'image
                  </h3>

                  {/* Form Fields */}
                  <div className="flex flex-col gap-5">
                    {/* Row 1: Nom complet et Email */}
                    <div className="flex gap-5">
                      <div className="flex-1 flex flex-col gap-0.5">
                        <label className="font-instrument text-base font-semibold text-[#002222] leading-[26px] px-2.5">
                          Nom complet
                        </label>
                        <input
                          type="text"
                          value={profileData.fullName}
                          onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                          className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:border-[#0389A6]"
                        />
                      </div>

                      <div className="flex-1 flex flex-col gap-0.5">
                        <label className="font-instrument text-base font-semibold text-[#002222] leading-[26px] px-2.5">
                          Adresse email
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:border-[#0389A6]"
                        />
                      </div>
                    </div>

                    {/* Row 2: Département et Téléphone */}
                    <div className="flex gap-5">
                      <div className="flex-1 flex flex-col gap-0.5">
                        <label className="font-instrument text-base font-semibold text-[#002222] leading-[26px] px-2.5">
                          Département
                        </label>
                        <input
                          type="text"
                          value={profileData.department}
                          onChange={(e) => setProfileData({ ...profileData, department: e.target.value })}
                          className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:border-[#0389A6]"
                        />
                      </div>

                      <div className="flex-1 flex flex-col gap-0.5">
                        <label className="font-instrument text-base font-semibold text-[#002222] leading-[26px] px-2.5">
                          Téléphone
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                          className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:border-[#0389A6]"
                        />
                      </div>
                    </div>

                    {/* Row 3: Langue */}
                    <div className="flex gap-5">
                      <div className="w-[510px] flex flex-col gap-0.5">
                        <label className="font-instrument text-base font-semibold text-[#002222] leading-[26px] px-2.5">
                          Langue
                        </label>
                        <div className="relative">
                          <button
                            onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                            className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                          >
                            <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                              {profileData.language}
                            </span>
                            <ArrowDownIcon />
                          </button>
                          
                          {isLanguageDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden">
                              <button
                                onClick={() => {
                                  setProfileData({ ...profileData, language: 'Français' });
                                  setIsLanguageDropdownOpen(false);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                              >
                                Français
                              </button>
                              <button
                                onClick={() => {
                                  setProfileData({ ...profileData, language: 'English' });
                                  setIsLanguageDropdownOpen(false);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                              >
                                English
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-[#D4DCDC] flex justify-end items-center gap-5 px-[30px] py-2.5 bg-white rounded-b-[25px]">
                  <button
                    onClick={async () => {
                      try {
                        // Utiliser le service centralisé pour mettre à jour les données
                        updateUserData({
                          nomComplet: profileData.fullName,
                          fullName: profileData.fullName,
                          email: profileData.email,
                          departement: profileData.department,
                          department: profileData.department,
                          phone: profileData.phone,
                          telephone: profileData.phone,
                          language: profileData.language,
                          nomEntreprise: profileData.nomEntreprise
                        });
                        
                        console.log('Modifications enregistrées:', profileData);
                        alert(t('Modifications enregistrées avec succès !') || 'Modifications enregistrées avec succès !');
                      } catch (error) {
                        console.error('Erreur lors de l\'enregistrement:', error);
                        alert('Une erreur est survenue lors de l\'enregistrement');
                      }
                    }}
                    className="px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-base leading-[19.52px] hover:bg-[#027A94] transition-colors cursor-pointer"
                  >
                    Enregistrer les modifications
                  </button>
                </div>
              </div>

              {/* Changer le mot de passe */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                  <LockIcon />
                  <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                    Changer le mot de passe
                  </h2>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-5 px-5 py-2.5 pb-5">
                  <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                    Mettez à jour votre mot de passe pour sécuriser votre compte
                  </p>

                  <h3 className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                    Paramètres d'image
                  </h3>

                  {/* Form Fields */}
                  <div className="flex flex-col gap-5">
                    {/* Row 1: Mot de passe actuel et Nouveau mot de passe */}
                    <div className="flex gap-5">
                      <div className="flex-1 flex flex-col gap-0.5">
                        <label className="font-instrument text-base font-semibold text-[#002222] leading-[26px] px-2.5">
                          Mot de passe actuel
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                            placeholder="**********"
                            className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 pr-12 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:border-[#0389A6]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#D4DCDC] rounded-md transition-colors cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                          >
                            {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 flex flex-col gap-0.5">
                        <label className="font-instrument text-base font-semibold text-[#002222] leading-[26px] px-2.5">
                          Nouveau mot de passe
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                            placeholder="**********"
                            className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 pr-12 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:border-[#0389A6]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#D4DCDC] rounded-md transition-colors cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                          >
                            {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Confirmer le mot de passe */}
                    <div className="flex gap-5">
                      <div className="w-[510px] flex flex-col gap-0.5">
                        <label className="font-instrument text-base font-semibold text-[#002222] leading-[26px] px-2.5">
                          Confirmer le mot de passe
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                            placeholder="**********"
                            className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 pr-12 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:border-[#0389A6]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#D4DCDC] rounded-md transition-colors cursor-pointer"
                            style={{ pointerEvents: 'auto' }}
                          >
                            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-[#D4DCDC] flex justify-end items-center gap-5 px-[30px] py-2.5 bg-white rounded-b-[25px]">
                  <button
                    onClick={async () => {
                      try {
                        // Validation des champs
                        if (!passwordData.currentPassword) {
                          alert('Veuillez entrer votre mot de passe actuel');
                          return;
                        }
                        
                        if (!passwordData.newPassword) {
                          alert('Veuillez entrer un nouveau mot de passe');
                          return;
                        }
                        
                        if (passwordData.newPassword.length < 6) {
                          alert('Le nouveau mot de passe doit contenir au moins 6 caractères');
                          return;
                        }
                        
                        if (passwordData.newPassword !== passwordData.confirmPassword) {
                          alert('Les mots de passe ne correspondent pas');
                          return;
                        }
                        
                        // Récupérer l'utilisateur connecté
                        const currentUserStr = localStorage.getItem('currentUser');
                        if (!currentUserStr) {
                          alert('Aucun utilisateur connecté');
                          return;
                        }
                        
                        const currentUser = JSON.parse(currentUserStr);
                        const users = JSON.parse(localStorage.getItem('users') || '[]');
                        const userIndex = users.findIndex(u => u.email === currentUser.email);
                        
                        if (userIndex === -1) {
                          alert('Utilisateur non trouvé');
                          return;
                        }
                        
                        // Vérifier le mot de passe actuel
                        if (users[userIndex].motDePasse !== passwordData.currentPassword) {
                          alert('Mot de passe actuel incorrect');
                          return;
                        }
                        
                        // Mettre à jour le mot de passe
                        users[userIndex].motDePasse = passwordData.newPassword;
                        
                        // Sauvegarder dans localStorage
                        localStorage.setItem('users', JSON.stringify(users));
                        
                        // Réinitialiser le formulaire
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                        
                        console.log('Mot de passe changé avec succès');
                        alert('Mot de passe changé avec succès !');
                      } catch (error) {
                        console.error('Erreur lors du changement de mot de passe:', error);
                        alert('Une erreur est survenue lors du changement de mot de passe');
                      }
                    }}
                    className="px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-base leading-[19.52px] hover:bg-[#027A94] transition-colors cursor-pointer"
                  >
                    Changer le mot de passe
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Section Notifications */}
          {activeTab === 'Notifications' && (
            <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                <NotificationIconSettings />
                <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                  Préférences de notification
                </h2>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-5 px-5 py-2.5 pb-5">
                <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                  Choisissez comment vous souhaitez être notifié
                </p>

                {/* Liste des préférences */}
                <div className="flex flex-col gap-2.5">
                  {/* Notification par e-mail */}
                  <div className="flex justify-between items-center gap-[50px]">
                    <div className="flex flex-col gap-2 w-[379px]">
                      <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                        Notifications par e-mail
                      </span>
                      <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Recevoir des notifications par email
                      </span>
                    </div>
                    <button
                      onClick={() => setNotificationPreferences({ ...notificationPreferences, email: !notificationPreferences.email })}
                      className="cursor-pointer"
                    >
                      {notificationPreferences.email ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </button>
                  </div>

                  {/* Notification push */}
                  <div className="flex justify-between items-center gap-[50px]">
                    <div className="flex flex-col gap-2 w-[379px]">
                      <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                        Notification push
                      </span>
                      <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Recevoir des notifications sur votre navigateur
                      </span>
                    </div>
                    <button
                      onClick={() => setNotificationPreferences({ ...notificationPreferences, push: !notificationPreferences.push })}
                      className="cursor-pointer"
                    >
                      {notificationPreferences.push ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </button>
                  </div>

                  {/* Rappels pointage */}
                  <div className="flex justify-between items-center gap-[50px]">
                    <div className="flex flex-col gap-2 w-[379px]">
                      <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                        Rappels pointage
                      </span>
                      <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Recevoir des rappels pour pointer
                      </span>
                    </div>
                    <button
                      onClick={() => setNotificationPreferences({ ...notificationPreferences, attendanceReminders: !notificationPreferences.attendanceReminders })}
                      className="cursor-pointer"
                    >
                      {notificationPreferences.attendanceReminders ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </button>
                  </div>

                  {/* Notification push 2 */}
                  <div className="flex justify-between items-center gap-[50px]">
                    <div className="flex flex-col gap-2 w-[379px]">
                      <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                        Notification push
                      </span>
                      <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Recevoir des notifications sur votre navigateur
                      </span>
                    </div>
                    <button
                      onClick={() => setNotificationPreferences({ ...notificationPreferences, push2: !notificationPreferences.push2 })}
                      className="cursor-pointer"
                    >
                      {notificationPreferences.push2 ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </button>
                  </div>

                  {/* Alertes rapports */}
                  <div className="flex justify-between items-center gap-[50px]">
                    <div className="flex flex-col gap-2 w-[379px]">
                      <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                        Alertes rapports
                      </span>
                      <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Notifications pour les nouveaux rapports
                      </span>
                    </div>
                    <button
                      onClick={() => setNotificationPreferences({ ...notificationPreferences, reportAlerts: !notificationPreferences.reportAlerts })}
                      className="cursor-pointer"
                    >
                      {notificationPreferences.reportAlerts ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </button>
                  </div>

                  {/* Mise à jour système */}
                  <div className="flex justify-between items-center gap-[50px]">
                    <div className="flex flex-col gap-2 w-[379px]">
                      <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                        Mise à jour système
                      </span>
                      <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Notifications sur les nouvelles fonctionnalités
                      </span>
                    </div>
                    <button
                      onClick={() => setNotificationPreferences({ ...notificationPreferences, systemUpdates: !notificationPreferences.systemUpdates })}
                      className="cursor-pointer"
                    >
                      {notificationPreferences.systemUpdates ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </button>
                  </div>

                  {/* Résumé hebdomadaire */}
                  <div className="flex justify-between items-center gap-[50px]">
                    <div className="flex flex-col gap-2 w-[379px]">
                      <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                        Résumé hebdomadaire
                      </span>
                      <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Recevoir un résumé de vos activités chaque semaine
                      </span>
                    </div>
                    <button
                      onClick={() => setNotificationPreferences({ ...notificationPreferences, weeklySummary: !notificationPreferences.weeklySummary })}
                      className="cursor-pointer"
                    >
                      {notificationPreferences.weeklySummary ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#D4DCDC] flex justify-end items-center gap-5 px-[30px] py-2.5 bg-white rounded-b-[25px]">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Activer l'état de chargement
                    setIsSavingPreferences(true);
                    
                    // Simuler une sauvegarde (dans une vraie app, ce serait un appel API)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    // Sauvegarder les préférences
                    localStorage.setItem('notificationPreferences', JSON.stringify(notificationPreferences));
                    
                    // Si les notifications push sont activées, demander la permission
                    if (notificationPreferences.push || notificationPreferences.push2) {
                      if ('Notification' in window && Notification.permission === 'default') {
                        const permission = await Notification.requestPermission();
                        if (permission === 'granted') {
                          console.log('Permission pour les notifications push accordée');
                        } else {
                          console.log('Permission pour les notifications push refusée');
                        }
                      }
                    }
                    
                    // Désactiver l'état de chargement
                    setIsSavingPreferences(false);
                    
                    // Afficher un message de confirmation
                    console.log('Préférences de notification enregistrées:', notificationPreferences);
                    
                    // Afficher un message de succès
                    alert(t('Préférences de notification enregistrées avec succès !') || 'Préférences de notification enregistrées avec succès !');
                  }}
                  disabled={isSavingPreferences}
                  className={`px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-base leading-[19.52px] hover:bg-[#027A94] transition-colors ${
                    isSavingPreferences ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {isSavingPreferences ? 'Enregistrement...' : 'Enregistrer les préférences'}
                </button>
              </div>
            </div>
          )}

          {/* Section Sécurité */}
          {activeTab === 'Sécurité' && (
            <>
              {/* Sécurité du compte */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden mb-5">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                  <SecurityIcon />
                  <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                    Sécurité du compte
                  </h2>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-5 px-5 py-2.5 pb-5">
                  <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                    Gérez les paramètres de sécurité de votre compte
                  </p>

                  {/* Liste des paramètres */}
                  <div className="flex flex-col gap-4">
                    {/* Authentification à deux facteurs */}
                    <div className="flex justify-between items-center gap-[50px]">
                      <div className="flex flex-col gap-2 w-[379px]">
                        <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                          Authentification à deux facteurs
                        </span>
                        <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                          Ajoutez une couche de sécurité supplémentaire
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (!securitySettings.twoFactorAuth) {
                            // Ouvrir le modal de configuration 2FA pour activer
                            setIs2FAModalOpen(true);
                          } else {
                            // Désactiver directement avec confirmation
                            if (window.confirm(t('Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ?') || 'Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ?')) {
                              setSecuritySettings({ 
                                ...securitySettings, 
                                twoFactorAuth: false,
                                twoFactorPhone: '',
                                twoFactorEmail: ''
                              });
                              localStorage.setItem('securitySettings', JSON.stringify({
                                ...securitySettings,
                                twoFactorAuth: false,
                                twoFactorPhone: '',
                                twoFactorEmail: ''
                              }));
                              alert(t('Authentification à deux facteurs désactivée.') || 'Authentification à deux facteurs désactivée.');
                            }
                          }
                        }}
                        className="cursor-pointer"
                      >
                        {securitySettings.twoFactorAuth ? <ToggleOnIcon /> : <ToggleOffIcon />}
                      </button>
                    </div>

                    {/* Délais d'expiration de session */}
                    <div className="flex flex-col gap-0.5 w-[510px]">
                      <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                        Délais d'expiration de session
                      </label>
                      <div className="relative">
                        <button
                          onClick={() => setIsSessionTimeoutDropdownOpen(!isSessionTimeoutDropdownOpen)}
                          className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                        >
                          <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                            {securitySettings.sessionTimeout}
                          </span>
                          <ArrowDownIcon />
                        </button>
                        
                        {isSessionTimeoutDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden">
                            {['15 minutes', '30 minutes', '1 heure', '2 heures', '4 heures', 'Jamais'].map((option) => (
                              <button
                                key={option}
                                onClick={() => {
                                  setSecuritySettings({ ...securitySettings, sessionTimeout: option });
                                  setIsSessionTimeoutDropdownOpen(false);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="px-2.5 font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Durée avant déconnexion automatique en cas d'inactivité
                      </p>
                    </div>

                    {/* Alertes de connexion */}
                    <div className="flex justify-between items-center gap-[50px]">
                      <div className="flex flex-col gap-2 w-[379px]">
                        <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                          Alertes de connexion
                        </span>
                        <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                          Recevoir une notification à chaque nouvelle connexion
                        </span>
                      </div>
                      <button
                        onClick={() => setSecuritySettings({ ...securitySettings, loginAlerts: !securitySettings.loginAlerts })}
                        className="cursor-pointer"
                      >
                        {securitySettings.loginAlerts ? <ToggleOnIcon /> : <ToggleOffIcon />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="border-t border-[#D4DCDC] flex justify-end items-center gap-5 px-[30px] py-2.5 bg-white rounded-b-[25px]">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      setIsSavingSecurity(true);
                      
                      await new Promise(resolve => setTimeout(resolve, 1000));
                      
                      localStorage.setItem('securitySettings', JSON.stringify(securitySettings));
                      
                      // Réinitialiser le timeout de session si nécessaire
                      if (securitySettings.sessionTimeout && securitySettings.sessionTimeout !== 'Jamais') {
                        const cleanup = initSessionTimeout(securitySettings.sessionTimeout, () => {
                          alert('Votre session a expiré en raison de l\'inactivité. Vous allez être déconnecté.');
                          authService.logout();
                          navigate('/connexion');
                        });
                      }
                      
                      setIsSavingSecurity(false);
                      
                      console.log('Paramètres de sécurité enregistrés:', securitySettings);
                      alert(t('Paramètres de sécurité enregistrés avec succès !') || 'Paramètres de sécurité enregistrés avec succès !');
                    }}
                    disabled={isSavingSecurity}
                    className={`px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-base leading-[19.52px] hover:bg-[#027A94] transition-colors ${
                      isSavingSecurity ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {isSavingSecurity ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                  </button>
                </div>
              </div>

              {/* Sessions actives */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                  <SecurityIcon />
                  <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                    Sessions actives
                  </h2>
                </div>

                {/* Content */}
                <div className="flex flex-col gap-5 px-5 py-2.5 pb-5">
                  <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                    Gérez les appareils connectés à votre compte
                  </p>

                  {/* Liste des sessions */}
                  {activeSessions.length === 0 ? (
                    <div className="bg-[rgba(236,239,239,0.3)] border border-[#D4DCDC] rounded-2xl px-5 py-2.5">
                      <div className="flex flex-col">
                        <span className="font-instrument text-base font-semibold text-[#002222] leading-[24px] mb-0.5">
                          {t('Session actuelle')}
                        </span>
                        <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                          {getCurrentSessionInfo().os} • Dakar, Sénégal<br />
                          {t('Dernière activité: il y a quelques secondes')}
                        </span>
                      </div>
                      <div className="mt-2 px-2.5 py-0.5 bg-[rgba(1,160,78,0.1)] rounded-md w-fit">
                        <span className="font-instrument text-xs font-medium text-[#01A04E] leading-[18px]">
                          {t('Active')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {activeSessions.map((session) => (
                        <div key={session.id} className="bg-[rgba(236,239,239,0.3)] border border-[#D4DCDC] rounded-2xl px-5 py-2.5 flex justify-between items-center">
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                                {session.isCurrent ? t('Session actuelle') : session.os || `${session.browser} sur Inconnu`}
                              </span>
                              {session.isCurrent && (
                                <span className="px-2.5 py-0.5 bg-[rgba(1,160,78,0.1)] rounded-md">
                                  <span className="font-instrument text-xs font-medium text-[#01A04E] leading-[18px]">
                                    {t('Active')}
                                  </span>
                                </span>
                              )}
                            </div>
                            <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                              {session.os} • {session.location || 'Dakar, Sénégal'}<br />
                              {t('Dernière activité:')} {formatLastActivity(session.lastActivity)}
                            </span>
                          </div>
                          {!session.isCurrent && (
                            <button
                              onClick={() => {
                                if (window.confirm(t('Êtes-vous sûr de vouloir déconnecter cette session ?') || 'Êtes-vous sûr de vouloir déconnecter cette session ?')) {
                                  removeSession(session.id);
                                  const updated = activeSessions.filter(s => s.id !== session.id);
                                  setActiveSessions(updated);
                                }
                              }}
                              className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-instrument text-sm"
                            >
                              {t('Déconnecter')}
                            </button>
                          )}
                        </div>
                      ))}
                      
                      {activeSessions.length > 1 && (
                        <button
                          onClick={() => {
                            if (window.confirm(t('Êtes-vous sûr de vouloir déconnecter toutes les autres sessions ?') || 'Êtes-vous sûr de vouloir déconnecter toutes les autres sessions ?')) {
                              removeAllOtherSessions();
                              const current = activeSessions.find(s => s.isCurrent);
                              setActiveSessions(current ? [current] : []);
                            }
                          }}
                          className="self-start px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-instrument text-sm"
                        >
                          {t('Déconnecter toutes les autres sessions')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Modal 2FA */}
              {is2FAModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setIs2FAModalOpen(false)}>
                  <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                    <h3 className="font-instrument text-xl font-semibold text-[#002222] mb-4">
                      {t('Configurer l\'authentification à deux facteurs') || 'Configurer l\'authentification à deux facteurs'}
                    </h3>
                    <p className="font-instrument text-sm text-[#5A6565] mb-4">
                      {t('Entrez votre numéro de téléphone et votre email pour recevoir des codes de vérification') || 'Entrez votre numéro de téléphone et votre email pour recevoir des codes de vérification'}
                    </p>
                    
                    {!twoFactorCodeSent ? (
                      <>
                        <div className="mb-4">
                          <label className="font-instrument text-sm font-semibold text-[#002222] mb-2 block">
                            {t('Numéro de téléphone') || 'Numéro de téléphone'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            value={twoFactorPhone}
                            onChange={(e) => setTwoFactorPhone(e.target.value)}
                            placeholder="+221 77 123 45 67"
                            className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-4 py-2.5 font-instrument text-base text-[#002222]"
                          />
                        </div>
                        <div className="mb-4">
                          <label className="font-instrument text-sm font-semibold text-[#002222] mb-2 block">
                            {t('Adresse email') || 'Adresse email'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            value={twoFactorEmail || profileData.email || ''}
                            onChange={(e) => setTwoFactorEmail(e.target.value)}
                            placeholder={profileData.email || 'votre.email@exemple.com'}
                            className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-4 py-2.5 font-instrument text-base text-[#002222]"
                          />
                          <p className="font-instrument text-xs text-[#5A6565] mt-1">
                            {t('L\'email utilisé pour recevoir les codes de vérification') || 'L\'email utilisé pour recevoir les codes de vérification'}
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setIs2FAModalOpen(false);
                              setTwoFactorPhone('');
                              setTwoFactorEmail('');
                              setTwoFactorCode('');
                              setTwoFactorCodeSent(false);
                            }}
                            className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-instrument text-sm"
                          >
                            {t('Annuler') || 'Annuler'}
                          </button>
                          <button
                            onClick={async () => {
                              if (!twoFactorPhone.trim()) {
                                alert(t('Veuillez entrer votre numéro de téléphone') || 'Veuillez entrer votre numéro de téléphone');
                                return;
                              }
                              if (!profileData.email) {
                                alert(t('Veuillez configurer votre email dans votre profil') || 'Veuillez configurer votre email dans votre profil');
                                return;
                              }
                              
                              setIsSendingCode(true);
                              const result = await sendVerificationCodes(twoFactorPhone.trim(), profileData.email);
                              
                              if (result.success) {
                                setTwoFactorCodeSent(true);
                                alert(t('Codes de vérification envoyés ! Vérifiez votre téléphone et votre email.') || 'Codes de vérification envoyés ! Vérifiez votre téléphone et votre email.');
                                // Pour les tests, afficher le code dans la console
                                console.log('Code de vérification (pour test):', result.code);
                              } else {
                                alert(t('Erreur lors de l\'envoi des codes. Veuillez réessayer.') || 'Erreur lors de l\'envoi des codes. Veuillez réessayer.');
                              }
                              setIsSendingCode(false);
                            }}
                            disabled={isSendingCode}
                            className="flex-1 px-4 py-2.5 bg-[#0389A6] text-white rounded-xl hover:bg-[#027A94] transition-colors font-instrument text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isSendingCode ? (t('Envoi...') || 'Envoi...') : (t('Envoyer les codes') || 'Envoyer les codes')}
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <p className="font-instrument text-sm text-blue-800">
                            {t('Codes de vérification envoyés !') || 'Codes de vérification envoyés !'}
                          </p>
                          <p className="font-instrument text-xs text-blue-600 mt-1">
                            {t('Vérifiez votre téléphone (SMS) et votre email pour obtenir le code à 6 chiffres.') || 'Vérifiez votre téléphone (SMS) et votre email pour obtenir le code à 6 chiffres.'}
                          </p>
                        </div>
                        <div className="mb-4">
                          <label className="font-instrument text-sm font-semibold text-[#002222] mb-2 block">
                            {t('Code de vérification') || 'Code de vérification'} <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={twoFactorCode}
                            onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength="6"
                            className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-4 py-2.5 font-instrument text-base text-[#002222] text-center text-2xl tracking-widest"
                          />
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => {
                              setTwoFactorCodeSent(false);
                              setTwoFactorCode('');
                              setTwoFactorEmail('');
                            }}
                            className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-instrument text-sm"
                          >
                            {t('Retour') || 'Retour'}
                          </button>
                          <button
                            onClick={async () => {
                              if (twoFactorCode.length !== 6) {
                                alert(t('Veuillez entrer un code à 6 chiffres') || 'Veuillez entrer un code à 6 chiffres');
                                return;
                              }
                              
                              const emailToUse = twoFactorEmail.trim() || profileData.email;
                              setIsVerifyingCode(true);
                              const result = verifyCode(twoFactorCode, twoFactorPhone.trim(), emailToUse);
                              
                              if (result.valid) {
                                setSecuritySettings({ 
                                  ...securitySettings, 
                                  twoFactorAuth: true,
                                  twoFactorPhone: twoFactorPhone.trim(),
                                  twoFactorEmail: emailToUse
                                });
                                localStorage.setItem('securitySettings', JSON.stringify({
                                  ...securitySettings,
                                  twoFactorAuth: true,
                                  twoFactorPhone: twoFactorPhone.trim(),
                                  twoFactorEmail: emailToUse
                                }));
                                setIs2FAModalOpen(false);
                                setTwoFactorPhone('');
                                setTwoFactorEmail('');
                                setTwoFactorCode('');
                                setTwoFactorCodeSent(false);
                                alert(t('Authentification à deux facteurs activée avec succès !') || 'Authentification à deux facteurs activée avec succès !');
                              } else {
                                alert(t('Code invalide. Veuillez réessayer.') || 'Code invalide. Veuillez réessayer.');
                                setTwoFactorCode('');
                              }
                              setIsVerifyingCode(false);
                            }}
                            disabled={isVerifyingCode || twoFactorCode.length !== 6}
                            className="flex-1 px-4 py-2.5 bg-[#0389A6] text-white rounded-xl hover:bg-[#027A94] transition-colors font-instrument text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isVerifyingCode ? (t('Vérification...') || 'Vérification...') : (t('Vérifier et activer') || 'Vérifier et activer')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Section Apparence */}
          {activeTab === 'Apparence' && (
            <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                <PaintBoardIcon />
                <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                  Apparence
                </h2>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-5 px-5 py-2.5 pb-5">
                <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                  Personnalisez l'apparence de l'application
                </p>

                {/* Champs de formulaire */}
                <div className="flex flex-col gap-4">
                  {/* Row 1: Thème et Langue de l'interface */}
                  <div className="flex gap-5">
                    {/* Thème */}
                    <div className="w-[510px] flex flex-col gap-0.5">
                      <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                        Thème
                      </label>
                      <div className="relative" ref={themeDropdownRef}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsThemeDropdownOpen(!isThemeDropdownOpen);
                            setIsInterfaceLanguageDropdownOpen(false);
                            setIsDateFormatDropdownOpen(false);
                            setIsTimeFormatDropdownOpen(false);
                          }}
                          className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                        >
                          <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                            {appearanceSettings.theme}
                          </span>
                          <ArrowDownIcon />
                        </button>
                        
                        {isThemeDropdownOpen && (
                          <div 
                            className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {['Clair', 'Sombre', 'Auto'].map((option) => (
                              <button
                                key={option}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const newSettings = { ...appearanceSettings, theme: option };
                                  setAppearanceSettings(newSettings);
                                  setIsThemeDropdownOpen(false);
                                  // Sauvegarder immédiatement
                                  localStorage.setItem('appearanceSettings', JSON.stringify(newSettings));
                                  // Appliquer le thème immédiatement
                                  setTimeout(() => {
                                    applyTheme(option);
                                    // Forcer une mise à jour visuelle
                                    document.body.style.transition = 'background-color 0.3s ease, color 0.3s ease';
                                  }, 50);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Langue de l'interface */}
                    <div className="w-[510px] flex flex-col gap-0.5">
                      <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                        Langue de l'interface
                      </label>
                      <div className="relative" ref={interfaceLanguageDropdownRef}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsInterfaceLanguageDropdownOpen(!isInterfaceLanguageDropdownOpen);
                            setIsThemeDropdownOpen(false);
                            setIsDateFormatDropdownOpen(false);
                            setIsTimeFormatDropdownOpen(false);
                          }}
                          className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                        >
                          <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                            {appearanceSettings.interfaceLanguage}
                          </span>
                          <ArrowDownIcon />
                        </button>
                        
                        {isInterfaceLanguageDropdownOpen && (
                          <div 
                            className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {['Français', 'English', 'Español'].map((option) => (
                              <button
                                key={option}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const newSettings = { ...appearanceSettings, interfaceLanguage: option };
                                  setAppearanceSettings(newSettings);
                                  setIsInterfaceLanguageDropdownOpen(false);
                                  // Sauvegarder immédiatement
                                  localStorage.setItem('appearanceSettings', JSON.stringify(newSettings));
                                  localStorage.setItem('interfaceLanguage', option);
                                  // Changer la langue dans le contexte global
                                  changeLanguage(option);
                                  // Mettre à jour les settings locaux
                                  setAppearanceSettings(newSettings);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Format date et Format heure */}
                  <div className="flex gap-5">
                    {/* Format date */}
                    <div className="w-[510px] flex flex-col gap-0.5">
                      <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                        Format date
                      </label>
                      <div className="relative" ref={dateFormatDropdownRef}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsDateFormatDropdownOpen(!isDateFormatDropdownOpen);
                            setIsThemeDropdownOpen(false);
                            setIsInterfaceLanguageDropdownOpen(false);
                            setIsTimeFormatDropdownOpen(false);
                          }}
                          className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                        >
                          <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                            {appearanceSettings.dateFormat}
                          </span>
                          <ArrowDownIcon />
                        </button>
                        
                        {isDateFormatDropdownOpen && (
                          <div 
                            className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {['JJ/MM/AAAA', 'MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'].map((option) => (
                              <button
                                key={option}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAppearanceSettings({ ...appearanceSettings, dateFormat: option });
                                  setIsDateFormatDropdownOpen(false);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Format heure */}
                    <div className="w-[510px] flex flex-col gap-0.5">
                      <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                        Format heure
                      </label>
                      <div className="relative" ref={timeFormatDropdownRef}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsTimeFormatDropdownOpen(!isTimeFormatDropdownOpen);
                            setIsThemeDropdownOpen(false);
                            setIsInterfaceLanguageDropdownOpen(false);
                            setIsDateFormatDropdownOpen(false);
                          }}
                          className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                        >
                          <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                            {appearanceSettings.timeFormat}
                          </span>
                          <ArrowDownIcon />
                        </button>
                        
                        {isTimeFormatDropdownOpen && (
                          <div 
                            className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {['24 heures', '12 heures (AM/PM)'].map((option) => (
                              <button
                                key={option}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setAppearanceSettings({ ...appearanceSettings, timeFormat: option });
                                  setIsTimeFormatDropdownOpen(false);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#D4DCDC] flex justify-end items-center gap-5 px-[30px] py-2.5 bg-white rounded-b-[25px]">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    setIsSavingAppearance(true);
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    localStorage.setItem('appearanceSettings', JSON.stringify(appearanceSettings));
                    
                    setIsSavingAppearance(false);
                    
                    console.log('Préférences d\'apparence enregistrées:', appearanceSettings);
                    alert('Préférences d\'apparence enregistrées avec succès !');
                  }}
                  disabled={isSavingAppearance}
                  className={`px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-base leading-[19.52px] hover:bg-[#027A94] transition-colors ${
                    isSavingAppearance ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {isSavingAppearance ? 'Enregistrement...' : 'Enregistrer les préférences'}
                </button>
              </div>
            </div>
          )}

          {/* Section Entreprise */}
          {activeTab === 'Entreprise' && (
            <div className="bg-white border border-[#D4DCDC] rounded-2xl" style={{ overflow: 'visible' }}>
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                <BuildingIcon />
                <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                  Informations de l'entreprise
                </h2>
              </div>

              {/* Content */}
              <div className="flex flex-col gap-5 px-5 py-2.5 pb-5" style={{ overflow: 'visible', position: 'relative' }}>
                <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                  Configurez les paramètres globaux de l'entreprise
                </p>

                {/* Champs de formulaire */}
                <div className="flex flex-col gap-4" style={{ overflow: 'visible', position: 'relative' }}>
                  {/* Row 1: Nom de l'entreprise et Fuseau horaire */}
                  <div className="flex gap-5" style={{ overflow: 'visible', position: 'relative' }}>
                    {/* Nom de l'entreprise */}
                    <div className="w-[510px] flex flex-col gap-0.5">
                      <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                        Nom de l'entreprise
                      </label>
                      <input
                        type="text"
                        value={companySettings.companyName}
                        onChange={(e) => setCompanySettings({ ...companySettings, companyName: e.target.value })}
                        className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                        placeholder="SenPointage"
                      />
                    </div>

                    {/* Fuseau horaire */}
                    <div className="w-[510px] flex flex-col gap-0.5">
                      <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                        Fuseau horaire
                      </label>
                      <div className="relative" ref={timezoneDropdownRef}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsTimezoneDropdownOpen(!isTimezoneDropdownOpen);
                            setIsWeekStartDropdownOpen(false);
                            setIsFiscalYearStartDropdownOpen(false);
                          }}
                          className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                        >
                          <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                            {companySettings.timezone}
                          </span>
                          <ArrowDownIcon />
                        </button>
                        
                        {isTimezoneDropdownOpen && (
                          <div 
                            className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden max-h-[300px] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {[
                              'Afrique/Dakar (GMT+0)',
                              'Afrique/Abidjan (GMT+0)',
                              'Afrique/Casablanca (GMT+1)',
                              'Afrique/Cairo (GMT+2)',
                              'Europe/Paris (GMT+1)',
                              'America/New_York (GMT-5)'
                            ].map((option) => (
                              <button
                                key={option}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCompanySettings({ ...companySettings, timezone: option });
                                  setIsTimezoneDropdownOpen(false);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Début de semaine et Début d'année fiscale */}
                  <div className="flex gap-5" style={{ overflow: 'visible', position: 'relative' }}>
                    {/* Début de semaine */}
                    <div className="w-[510px] flex flex-col gap-0.5" style={{ position: 'relative', overflow: 'visible' }}>
                      <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                        Début de semaine
                      </label>
                      <div className="relative" ref={weekStartDropdownRef}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsWeekStartDropdownOpen(!isWeekStartDropdownOpen);
                            setIsTimezoneDropdownOpen(false);
                            setIsFiscalYearStartDropdownOpen(false);
                          }}
                          className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                        >
                          <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                            {companySettings.weekStart}
                          </span>
                          <ArrowDownIcon />
                        </button>
                        
                        {isWeekStartDropdownOpen && (
                          <div 
                            className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-[100]"
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              overflow: 'visible', 
                              maxHeight: 'none',
                              position: 'absolute',
                              display: 'block',
                              visibility: 'visible'
                            }}
                          >
                            {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((option) => (
                              <button
                                key={option}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCompanySettings({ ...companySettings, weekStart: option });
                                  setIsWeekStartDropdownOpen(false);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF] whitespace-nowrap"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Début d'année fiscale */}
                    <div className="w-[510px] flex flex-col gap-0.5" style={{ position: 'relative', overflow: 'visible' }}>
                      <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                        Début d'année fiscale
                      </label>
                      <div className="relative" ref={fiscalYearStartDropdownRef} style={{ position: 'relative', overflow: 'visible' }}>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsFiscalYearStartDropdownOpen(!isFiscalYearStartDropdownOpen);
                            setIsTimezoneDropdownOpen(false);
                            setIsWeekStartDropdownOpen(false);
                          }}
                          className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                        >
                          <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                            {companySettings.fiscalYearStart}
                          </span>
                          <ArrowDownIcon />
                        </button>
                        
                        {isFiscalYearStartDropdownOpen && (
                          <div 
                            className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-[100]"
                            onClick={(e) => e.stopPropagation()}
                            style={{ 
                              overflow: 'visible', 
                              maxHeight: 'none',
                              position: 'absolute',
                              display: 'block',
                              visibility: 'visible'
                            }}
                          >
                            {['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'].map((option) => (
                              <button
                                key={option}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setCompanySettings({ ...companySettings, fiscalYearStart: option });
                                  setIsFiscalYearStartDropdownOpen(false);
                                }}
                                className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF] whitespace-nowrap"
                              >
                                {option}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-[#D4DCDC] flex justify-end items-center gap-5 px-[30px] py-2.5 bg-white rounded-b-[25px]">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    setIsSavingCompany(true);
                    
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
                    localStorage.setItem('companySettings', JSON.stringify(companySettings));
                    
                    setIsSavingCompany(false);
                    
                    console.log('Paramètres d\'entreprise enregistrés:', companySettings);
                    alert('Paramètres d\'entreprise enregistrés avec succès !');
                  }}
                  disabled={isSavingCompany}
                  className={`px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-base leading-[19.52px] hover:bg-[#027A94] transition-colors ${
                    isSavingCompany ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'
                  }`}
                >
                  {isSavingCompany ? 'Enregistrement...' : 'Enregistrer les paramètres'}
                </button>
              </div>
            </div>
          )}

          {/* Other tabs content */}
          {activeTab !== 'Profil' && activeTab !== 'Notifications' && activeTab !== 'Sécurité' && activeTab !== 'Apparence' && activeTab !== 'Entreprise' && (
            <div className="bg-white border border-[#D4DCDC] rounded-2xl p-8">
              <p className="font-instrument text-base text-[#5A6565]">
                Section {activeTab} - À implémenter
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Parametres;
