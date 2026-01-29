import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

function NotificationIcon({ unreadCount: propUnreadCount }) {
  const [unreadCount, setUnreadCount] = useState(() => {
    // Charger depuis localStorage au montage
    try {
      const saved = localStorage.getItem('unreadNotificationsCount');
      if (saved !== null) {
        return parseInt(saved, 10) || 0;
      }
      // Si pas de valeur sauvegardée, calculer depuis les notifications
      const notifications = localStorage.getItem('notifications');
      if (notifications) {
        const parsed = JSON.parse(notifications);
        if (Array.isArray(parsed)) {
          return parsed.filter(n => !n.isRead).length;
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement du compteur de notifications:', error);
    }
    return propUnreadCount !== undefined ? propUnreadCount : 0;
  });

  // Écouter les mises à jour des notifications
  useEffect(() => {
    const handleNotificationsUpdate = (event) => {
      if (event.detail && typeof event.detail.count === 'number') {
        setUnreadCount(event.detail.count);
      }
    };

    // Écouter l'événement personnalisé
    window.addEventListener('notificationsUpdated', handleNotificationsUpdate);

    // Vérifier localStorage périodiquement (pour synchronisation entre onglets)
    const interval = setInterval(() => {
      try {
        const saved = localStorage.getItem('unreadNotificationsCount');
        if (saved !== null) {
          const count = parseInt(saved, 10) || 0;
          if (count !== unreadCount) {
            setUnreadCount(count);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du compteur:', error);
      }
    }, 1000); // Vérifier toutes les secondes

    return () => {
      window.removeEventListener('notificationsUpdated', handleNotificationsUpdate);
      clearInterval(interval);
    };
  }, [unreadCount]);

  const NotificationIconSvg = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.73 21C13.5542 21.3031 13.3019 21.5547 12.9982 21.7295C12.6946 21.9044 12.3504 21.9965 12 21.9965C11.6496 21.9965 11.3054 21.9044 11.0018 21.7295C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <Link
      to="/notifications"
      className="relative p-1.5 hover:bg-[#ECEFEF] rounded-lg transition-colors"
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      <NotificationIconSvg />
      {unreadCount > 0 && (
        <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#D84343] rounded-full flex items-center justify-center">
          <span className="font-instrument text-xs font-bold text-white leading-[14.64px]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        </div>
      )}
    </Link>
  );
}

export default NotificationIcon;

