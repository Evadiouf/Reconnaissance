import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';

function Notifications() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState('Toutes');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('Toutes les notifications');
  const [isTypeFilterDropdownOpen, setIsTypeFilterDropdownOpen] = useState(false);
  const typeFilterDropdownRef = useRef(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [notificationDetail, setNotificationDetail] = useState(null);

  // Initialiser les notifications à zéro et charger depuis localStorage
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    }
    return [];
  });

  // Sauvegarder dans localStorage à chaque modification
  useEffect(() => {
    try {
      localStorage.setItem('notifications', JSON.stringify(notifications));
      // Mettre à jour le compteur dans localStorage pour synchronisation avec NotificationIcon
      const unreadCount = notifications.filter(n => !n.isRead).length;
      localStorage.setItem('unreadNotificationsCount', unreadCount.toString());
      // Déclencher un événement personnalisé pour mettre à jour NotificationIcon
      window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { count: unreadCount } }));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des notifications:', error);
    }
  }, [notifications]);

  // Calculer les statistiques dynamiquement
  const stats = {
    total: notifications.length,
    unread: notifications.filter(n => !n.isRead).length,
    urgent: notifications.filter(n => n.priority === 'Urgent' && !n.isRead).length
  };

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    if (!isTypeFilterDropdownOpen) return;

    const handleClickOutside = (event) => {
      try {
        if (!event.target) return;
        if (typeFilterDropdownRef.current && !typeFilterDropdownRef.current.contains(event.target)) {
          setIsTypeFilterDropdownOpen(false);
        }
      } catch (error) {
        console.error('Erreur dans handleClickOutside:', error);
        setIsTypeFilterDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTypeFilterDropdownOpen]);

  // Filtrer les notifications
  const filteredNotifications = notifications.filter(notification => {
    // Filtre par statut (Toutes, Non lues, Lues)
    if (activeFilter === 'Non lues' && notification.isRead) return false;
    if (activeFilter === 'Lues' && !notification.isRead) return false;

    // Filtre par recherche
    if (searchQuery && !notification.title.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !notification.description.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Filtre par type (si différent de "Toutes les notifications")
    if (typeFilter !== 'Toutes les notifications') {
      const typeMap = {
        'Pointage': 'pointage',
        'Rapport': 'rapport',
        'Horaire': 'horaire',
        'Système': 'systeme',
        'Alerte': 'alerte',
        'Employé': 'employe',
        'Caméra': 'camera'
      };
      if (typeMap[typeFilter] !== notification.type) return false;
    }

    return true;
  });

  // Marquer toutes comme lues
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Supprimer les lues
  const deleteRead = () => {
    setNotifications(prev => prev.filter(n => !n.isRead));
  };

  // Gérer les actions contextuelles selon le type de notification
  const handleNotificationAction = (notification) => {
    // Marquer comme lue si ce n'est pas déjà fait
    if (!notification.isRead) {
      setNotifications(prev => prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      ));
    }

    // Rediriger selon le type
    switch (notification.type) {
      case 'pointage':
        navigate('/pointage');
        break;
      case 'rapport':
        navigate('/rapports');
        break;
      case 'horaire':
        navigate('/horaires');
        break;
      case 'camera':
        navigate('/cameras');
        break;
      case 'employe':
        navigate('/employes');
        break;
      case 'systeme':
      case 'alerte':
        // Pour les notifications système/alerte, on peut rester sur la page ou rediriger vers paramètres
        break;
      default:
        break;
    }
  };

  // Icônes
  const CheckmarkIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16.6667 5L7.5 14.1667L3.33333 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const FileIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11.6667 1.66667H5C4.55833 1.66667 4.16667 2.05833 4.16667 2.5V17.5C4.16667 17.9417 4.55833 18.3333 5 18.3333H15C15.4417 18.3333 15.8333 17.9417 15.8333 17.5V6.66667L11.6667 1.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.6667 1.66667V6.66667H15.8333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CalendarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.66667 1.66667V4.16667M13.3333 1.66667V4.16667M2.5 7.5H17.5M4.16667 3.33333H15.8333C16.75 3.33333 17.5 4.08333 17.5 5V16.6667C17.5 17.5833 16.75 18.3333 15.8333 18.3333H4.16667C3.25 18.3333 2.5 17.5833 2.5 16.6667V5C2.5 4.08333 3.25 3.33333 4.16667 3.33333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const SettingsIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 12.5C11.3807 12.5 12.5 11.3807 12.5 10C12.5 8.61929 11.3807 7.5 10 7.5C8.61929 7.5 7.5 8.61929 7.5 10C7.5 11.3807 8.61929 12.5 10 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.25 12.5C16.1667 12.75 16.0833 13.0833 16.0833 13.3333V15.8333C16.0833 16.25 15.75 16.5833 15.3333 16.5833H13.0833C12.8333 16.5833 12.5 16.6667 12.25 16.75C11.9167 16.9167 11.5 17 11.25 17H8.75C8.41667 17 8 16.9167 7.75 16.75C7.5 16.6667 7.16667 16.5833 6.91667 16.5833H4.66667C4.25 16.5833 3.91667 16.25 3.91667 15.8333V13.3333C3.91667 13.0833 3.83333 12.75 3.75 12.5C3.58333 12.1667 3.5 11.75 3.5 11.5V8.5C3.5 8.16667 3.58333 7.75 3.75 7.5C3.83333 7.25 3.91667 6.91667 3.91667 6.66667V4.16667C3.91667 3.75 4.25 3.41667 4.66667 3.41667H6.91667C7.16667 3.41667 7.5 3.33333 7.75 3.25C8 3.08333 8.41667 3 8.75 3H11.25C11.5 3 11.9167 3.08333 12.25 3.25C12.5 3.33333 12.8333 3.41667 13.0833 3.41667H15.3333C15.75 3.41667 16.0833 3.75 16.0833 4.16667V6.66667C16.0833 6.91667 16.1667 7.25 16.25 7.5C16.4167 7.83333 16.5 8.25 16.5 8.5V11.5C16.5 11.75 16.4167 12.1667 16.25 12.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3.33333V10M10 14.1667H10.0083M18.3333 10C18.3333 14.6024 14.6024 18.3333 10 18.3333C5.39763 18.3333 1.66667 14.6024 1.66667 10C1.66667 5.39763 5.39763 1.66667 10 1.66667C14.6024 1.66667 18.3333 5.39763 18.3333 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 10C11.8409 10 13.3333 8.50762 13.3333 6.66667C13.3333 4.82572 11.8409 3.33333 10 3.33333C8.15905 3.33333 6.66667 4.82572 6.66667 6.66667C6.66667 8.50762 8.15905 10 10 10Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.6667 17.5V16.6667C16.6667 15.0076 15.0076 13.3333 13.3333 13.3333H6.66667C4.99238 13.3333 3.33333 15.0076 3.33333 16.6667V17.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CameraIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.66667 6.66667C1.66667 6.225 2.05833 5.83333 2.5 5.83333H5L6.44721 2.58831C6.786 1.85667 7.47852 1.66667 8.23607 1.66667H11.7639C12.5215 1.66667 13.214 1.85667 13.5528 2.58831L15 5.83333H17.5C17.9417 5.83333 18.3333 6.225 18.3333 6.66667V15.8333C18.3333 16.275 17.9417 16.6667 17.5 16.6667H2.5C2.05833 16.6667 1.66667 16.275 1.66667 15.8333V6.66667Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="11.1667" r="2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ClockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.33333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 5V10L13.3333 13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 11.3333V1.66667M8 11.3333L5.33333 8.66667M8 11.3333L10.6667 8.66667M2.66667 14.6667H13.3333" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const DeleteIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M2.25 4.5H15.75M6.75 4.5V3C6.75 2.58579 7.08579 2.25 7.5 2.25H10.5C10.9142 2.25 11.25 2.58579 11.25 3V4.5M14.25 4.5V15C14.25 15.4142 13.9142 15.75 13.5 15.75H4.5C4.08579 15.75 3.75 15.4142 3.75 15V4.5H14.25Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.5 8.25V12.75M10.5 8.25V12.75" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const SearchIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8.25" cy="8.25" r="6.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15.75 15.75L13.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ArrowDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CheckIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M3 9L6 12L15 3" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 4.5L13.5 13.5M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Rendre l'icône appropriée
  const renderIcon = (iconType, color) => {
    const iconProps = { style: { color } };
    switch (iconType) {
      case 'checkmark-circle':
        return <CheckmarkIcon {...iconProps} />;
      case 'file':
        return <FileIcon {...iconProps} />;
      case 'calendar':
        return <CalendarIcon {...iconProps} />;
      case 'settings':
        return <SettingsIcon {...iconProps} />;
      case 'alert':
        return <AlertIcon {...iconProps} />;
      case 'user':
        return <UserIcon {...iconProps} />;
      case 'camera':
        return <CameraIcon {...iconProps} />;
      case 'clock':
        return <ClockIcon {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Header */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-[50px] flex items-center justify-between">
          <div className="font-audiowide text-2xl" style={{ color: '#002222' }}>Sen Pointage</div>
          <div className="flex items-center gap-4">
            <NotificationIcon />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr]" style={{ minHeight: 'calc(100vh - 70px)' }}>
        <Sidebar />
        
        <main className="flex-1 p-8">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex flex-col gap-2.5">
              <h1 className="font-audiowide text-[26px] font-normal text-[#002222] leading-[30px]">
                Notifications
              </h1>
              <p className="font-instrument text-base text-[#5A6565] leading-[26px]">
                Restez informé de toutes vos activités
              </p>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={markAllAsRead}
                className="flex items-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors cursor-pointer"
              >
                <DownloadIcon />
                <span className="font-instrument text-base text-[#002222] leading-[19.52px]">Tout marquer comme lu</span>
              </button>
              <button
                type="button"
                onClick={deleteRead}
                className="flex items-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors cursor-pointer"
              >
                <DeleteIcon />
                <span className="font-instrument text-base text-[#002222] leading-[19.52px]">Supprimer lues</span>
              </button>
            </div>
          </div>

          {/* Statistiques */}
          <div className="flex items-center gap-4 mb-5">
            <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl px-5 py-4 flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">Totale</span>
                <span className="font-audiowide text-[32px] leading-[30px] text-[#002222]">{stats.total}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5Z" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 4.5V9L12 12" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl px-5 py-4 flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">Non lues</span>
                <span className="font-audiowide text-[32px] leading-[30px] text-[#002222]">{stats.unread}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5Z" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 4.5V9L12 12" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl px-5 py-4 flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">Urgentes</span>
                <span className="font-audiowide text-[32px] leading-[30px] text-[#002222]">{stats.urgent}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 16.5C13.1421 16.5 16.5 13.1421 16.5 9C16.5 4.85786 13.1421 1.5 9 1.5C4.85786 1.5 1.5 4.85786 1.5 9C1.5 13.1421 4.85786 16.5 9 16.5Z" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M9 4.5V9L12 12" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
          </div>

          {/* Filtres et recherche */}
          <div className="flex items-center justify-between gap-5 mb-5">
            {/* Filtres par statut */}
            <div className="flex items-center gap-1 bg-[#D4DCDC] rounded-2xl p-1">
              <button
                type="button"
                onClick={() => setActiveFilter('Toutes')}
                className={`px-2.5 py-2.5 rounded-xl transition-colors font-instrument text-base leading-[19.52px] ${
                  activeFilter === 'Toutes'
                    ? 'bg-white text-[#002222]'
                    : 'bg-transparent text-[#5A6565]'
                }`}
              >
                Toutes ({stats.total})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('Non lues')}
                className={`px-2.5 py-2.5 rounded-xl transition-colors font-instrument text-base leading-[19.52px] ${
                  activeFilter === 'Non lues'
                    ? 'bg-white text-[#002222]'
                    : 'bg-transparent text-[#5A6565]'
                }`}
              >
                Non lues ({stats.unread})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('Lues')}
                className={`px-2.5 py-2.5 rounded-xl transition-colors font-instrument text-base leading-[19.52px] ${
                  activeFilter === 'Lues'
                    ? 'bg-white text-[#002222]'
                    : 'bg-transparent text-[#5A6565]'
                }`}
              >
                Lues ({stats.total - stats.unread})
              </button>
            </div>

            {/* Recherche et filtre par type */}
            <div className="flex items-center gap-4">
              <div className="relative bg-white border border-[#D4DCDC] rounded-2xl px-4 py-2.5 flex items-center gap-2.5 w-[300px]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une notification..."
                  className="flex-1 font-instrument text-base text-[#5A6565] leading-[19.52px] outline-none bg-transparent placeholder:text-[#5A6565]"
                />
                <SearchIcon />
              </div>
              <div className="relative" ref={typeFilterDropdownRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsTypeFilterDropdownOpen(!isTypeFilterDropdownOpen);
                  }}
                  className="bg-white border border-[#D4DCDC] rounded-2xl px-4 py-2.5 flex items-center gap-2.5 hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                >
                  <span className="font-instrument text-base text-[#5A6565] leading-[19.52px]">{typeFilter}</span>
                  <ArrowDownIcon />
                </button>
                {isTypeFilterDropdownOpen && (
                  <div
                    className="absolute top-full right-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {['Toutes les notifications', 'Pointage', 'Rapport', 'Horaire', 'Système', 'Alerte', 'Employé', 'Caméra'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTypeFilter(type);
                          setIsTypeFilterDropdownOpen(false);
                        }}
                        className="w-full px-4 py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Liste des notifications */}
          <div className="bg-white border border-[#D4DCDC] rounded-2xl">
            {/* Header avec icône et titre */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
              <div className="flex-shrink-0">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                Notifications
              </h2>
            </div>
            
            {/* Sous-titre */}
            <div className="px-5 pt-2.5 pb-5">
              <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                Restez informé de toutes vos activités et événements importants
              </p>
            </div>
            
            {/* Liste des notifications */}
            <div className="px-5 pb-5 flex flex-col gap-4">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-5">
                  <div className="w-16 h-16 rounded-full bg-[#ECEFEF] flex items-center justify-center mb-4">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <p className="font-instrument text-base text-[#5A6565] mb-2 text-center">
                    {activeFilter === 'Non lues' 
                      ? 'Aucune notification non lue' 
                      : activeFilter === 'Lues'
                      ? 'Aucune notification lue'
                      : searchQuery || typeFilter !== 'Toutes les notifications'
                      ? 'Aucune notification trouvée'
                      : 'Aucune notification'}
                  </p>
                  <p className="font-instrument text-sm text-[#5A6565] text-center">
                    {activeFilter === 'Toutes' && !searchQuery && typeFilter === 'Toutes les notifications'
                      ? 'Vous serez notifié lorsque de nouveaux événements se produiront'
                      : 'Essayez de modifier vos filtres de recherche'}
                  </p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-5 rounded-2xl ${
                    notification.isRead ? 'bg-[rgba(236,239,239,0.3)] border border-[#D4DCDC]' : 'bg-[rgba(236,239,239,0.3)] border border-[#D4DCDC]'
                  }`}
                >
                  {/* Icône */}
                  <div className="flex-shrink-0">
                    {renderIcon(notification.icon, notification.iconColor)}
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex items-center gap-4">
                      <h3 className={`font-instrument text-base leading-[19.52px] ${
                        notification.isRead ? 'text-[#3E4B4B]' : 'text-[#002222]'
                      } font-bold`}>
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#01A04E]"></div>
                      )}
                    </div>
                    <p className="font-instrument text-sm text-[#5A6565] leading-[18px]">
                      {notification.description}
                    </p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="font-instrument text-xs text-[#5A6565] leading-[18px]">
                        {notification.date}
                      </span>
                      <span className="px-2.5 py-1 bg-[rgba(236,239,239,0.3)] rounded-2xl font-instrument text-xs font-medium text-[#002222] leading-[14.64px]">
                        {notification.category}
                      </span>
                      <span
                        className="px-2.5 py-1 rounded-2xl font-instrument text-xs font-medium leading-[14.64px]"
                        style={{
                          backgroundColor: notification.priorityBg,
                          color: notification.priorityColor
                        }}
                      >
                        {notification.priority}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-end gap-4">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setNotifications(prev => prev.map(n => 
                            n.id === notification.id ? { ...n, isRead: !n.isRead } : n
                          ));
                        }}
                        className="p-1.5 hover:bg-[#ECEFEF] rounded-lg transition-colors cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <CheckIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNotificationToDelete(notification);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-[#ECEFEF] rounded-lg transition-colors cursor-pointer"
                        style={{ pointerEvents: 'auto' }}
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Marquer comme lue si ce n'est pas déjà fait
                        if (!notification.isRead) {
                          setNotifications(prev => prev.map(n => 
                            n.id === notification.id ? { ...n, isRead: true } : n
                          ));
                        }
                        // Ouvrir le modal de détails
                        setNotificationDetail(notification);
                        setIsDetailModalOpen(true);
                      }}
                      className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px] cursor-pointer"
                    >
                      Détail
                    </button>
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal de détails de notification */}
      {isDetailModalOpen && notificationDetail && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setIsDetailModalOpen(false);
            setNotificationDetail(null);
          }}
        >
          <div
            className="bg-white rounded-[25px] w-full max-w-2xl mx-4 shadow-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-[30px] py-4 border-b border-[#D4DCDC]">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {renderIcon(notificationDetail.icon, notificationDetail.iconColor || '#002222')}
                </div>
                <div>
                  <h3 className="font-instrument text-lg font-semibold text-[#002222] leading-[21.6px]">
                    Détails de la notification
                  </h3>
                  <p className="font-instrument text-sm text-[#5A6565] leading-[16.8px] mt-1">
                    Informations complètes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setNotificationDetail(null);
                }}
                className="p-1 hover:bg-[#ECEFEF] rounded-lg transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="px-[30px] py-5">
              <div className="space-y-4">
                {/* Titre */}
                <div>
                  <label className="font-instrument text-sm font-semibold text-[#5A6565] leading-[16.8px] block mb-2">
                    Titre
                  </label>
                  <div className="p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                    <p className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                      {notificationDetail.title}
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="font-instrument text-sm font-semibold text-[#5A6565] leading-[16.8px] block mb-2">
                    Description
                  </label>
                  <div className="p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                    <p className="font-instrument text-base text-[#002222] leading-[19.52px]">
                      {notificationDetail.description || notificationDetail.message || 'Aucune description disponible'}
                    </p>
                  </div>
                </div>

                {/* Informations supplémentaires */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Date */}
                  <div>
                    <label className="font-instrument text-sm font-semibold text-[#5A6565] leading-[16.8px] block mb-2">
                      Date
                    </label>
                    <div className="p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                      <p className="font-instrument text-base text-[#002222] leading-[19.52px]">
                        {notificationDetail.date || new Date(notificationDetail.createdAt || Date.now()).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Statut */}
                  <div>
                    <label className="font-instrument text-sm font-semibold text-[#5A6565] leading-[16.8px] block mb-2">
                      Statut
                    </label>
                    <div className="p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                      <span className={`px-3 py-1 rounded-xl font-instrument text-sm font-medium ${
                        notificationDetail.isRead 
                          ? 'bg-[rgba(94,101,101,0.1)] text-[#5A6565]' 
                          : 'bg-[rgba(1,160,78,0.1)] text-[#01A04E]'
                      }`}>
                        {notificationDetail.isRead ? 'Lue' : 'Non lue'}
                      </span>
                    </div>
                  </div>

                  {/* Catégorie */}
                  {notificationDetail.category && (
                    <div>
                      <label className="font-instrument text-sm font-semibold text-[#5A6565] leading-[16.8px] block mb-2">
                        Catégorie
                      </label>
                      <div className="p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                        <span className="px-3 py-1 bg-[rgba(236,239,239,0.3)] rounded-2xl font-instrument text-sm font-medium text-[#002222]">
                          {notificationDetail.category}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Priorité */}
                  {notificationDetail.priority && (
                    <div>
                      <label className="font-instrument text-sm font-semibold text-[#5A6565] leading-[16.8px] block mb-2">
                        Priorité
                      </label>
                      <div className="p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                        <span
                          className="px-3 py-1 rounded-2xl font-instrument text-sm font-medium"
                          style={{
                            backgroundColor: notificationDetail.priorityBg || 'rgba(236,239,239,0.3)',
                            color: notificationDetail.priorityColor || '#002222'
                          }}
                        >
                          {notificationDetail.priority}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Type */}
                  {notificationDetail.type && (
                    <div>
                      <label className="font-instrument text-sm font-semibold text-[#5A6565] leading-[16.8px] block mb-2">
                        Type
                      </label>
                      <div className="p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                        <p className="font-instrument text-base text-[#002222] leading-[19.52px] capitalize">
                          {notificationDetail.type}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ID */}
                  {notificationDetail.id && (
                    <div>
                      <label className="font-instrument text-sm font-semibold text-[#5A6565] leading-[16.8px] block mb-2">
                        ID
                      </label>
                      <div className="p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                        <p className="font-instrument text-xs text-[#5A6565] leading-[14.4px] font-mono">
                          {notificationDetail.id}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Données supplémentaires si disponibles */}
                {notificationDetail.data && (
                  <div>
                    <label className="font-instrument text-sm font-semibold text-[#5A6565] leading-[16.8px] block mb-2">
                      Informations supplémentaires
                    </label>
                    <div className="p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                      <pre className="font-instrument text-xs text-[#002222] leading-[16.8px] whitespace-pre-wrap">
                        {JSON.stringify(notificationDetail.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-5 px-[30px] py-4 border-t border-[#D4DCDC]">
              <button
                type="button"
                onClick={() => {
                  setIsDetailModalOpen(false);
                  setNotificationDetail(null);
                }}
                className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px] cursor-pointer"
              >
                Fermer
              </button>
              {notificationDetail.type && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailModalOpen(false);
                    setNotificationDetail(null);
                    handleNotificationAction(notificationDetail);
                  }}
                  className="px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl hover:bg-[#027A94] transition-colors font-instrument text-base leading-[19.52px] cursor-pointer"
                >
                  {notificationDetail.type === 'pointage' && notificationDetail.priority === 'Retard' ? 'Pointer maintenant' :
                   notificationDetail.type === 'rapport' ? 'Voir le rapport' :
                   notificationDetail.type === 'horaire' ? 'Voir l\'horaire' :
                   notificationDetail.type === 'systeme' ? 'En savoir plus' :
                   notificationDetail.type === 'alerte' ? 'Mettre à jour' :
                   notificationDetail.type === 'employe' ? 'Voir le profil' :
                   notificationDetail.type === 'camera' ? 'Vérifier' :
                   'Aller à la page'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {isDeleteModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => {
            setIsDeleteModalOpen(false);
            setNotificationToDelete(null);
          }}
        >
          <div
            className="bg-white rounded-[25px] w-full max-w-md mx-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-[30px] py-4 border-b border-[#D4DCDC]">
              <h3 className="font-instrument text-lg font-semibold text-[#002222] leading-[21.6px]">
                Supprimer la notification
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setNotificationToDelete(null);
                }}
                className="p-1 hover:bg-[#ECEFEF] rounded-lg transition-colors cursor-pointer"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="px-[30px] py-5">
              <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                Êtes-vous sûr de vouloir supprimer cette notification ? Cette action est irréversible.
              </p>
              {notificationToDelete && (
                <div className="mt-4 p-4 bg-[rgba(236,239,239,0.3)] rounded-2xl border border-[#D4DCDC]">
                  <p className="font-instrument text-sm font-semibold text-[#002222] leading-[16.8px]">
                    {notificationToDelete.title}
                  </p>
                  <p className="font-instrument text-xs text-[#5A6565] leading-[14.4px] mt-1">
                    {notificationToDelete.description}
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-5 px-[30px] py-4 border-t border-[#D4DCDC]">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setNotificationToDelete(null);
                }}
                className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (notificationToDelete) {
                    setNotifications(prev => prev.filter(n => n.id !== notificationToDelete.id));
                    setIsDeleteModalOpen(false);
                    setNotificationToDelete(null);
                  }
                }}
                className="px-4 py-2.5 bg-[#D84343] text-white rounded-2xl hover:bg-[#C73A3A] transition-colors font-instrument text-base leading-[19.52px] cursor-pointer"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Notifications;

