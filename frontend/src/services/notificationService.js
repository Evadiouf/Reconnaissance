// Service pour gérer les notifications selon les préférences utilisateur

/**
 * Récupère les préférences de notifications depuis localStorage
 */
const getNotificationPreferences = () => {
  try {
    const saved = localStorage.getItem('notificationPreferences');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences de notifications:', error);
  }
  // Préférences par défaut (toutes activées)
  return {
    email: true,
    push: true,
    attendanceReminders: true,
    push2: true,
    reportAlerts: true,
    systemUpdates: true,
    weeklySummary: true
  };
};

/**
 * Crée une notification dans localStorage
 */
const createNotification = (notification) => {
  try {
    const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
    const newNotification = {
      id: Date.now().toString(),
      ...notification,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    notifications.unshift(newNotification);
    localStorage.setItem('notifications', JSON.stringify(notifications));
    
    // Mettre à jour le compteur
    const unreadCount = notifications.filter(n => !n.isRead).length;
    localStorage.setItem('unreadNotificationsCount', unreadCount.toString());
    
    // Déclencher un événement pour mettre à jour NotificationIcon
    window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { count: unreadCount } }));
    
    return newNotification;
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    return null;
  }
};

/**
 * Envoie une notification email (simulation - dans une vraie app, ce serait un appel API)
 */
const sendEmailNotification = async (to, subject, message) => {
  const preferences = getNotificationPreferences();
  if (!preferences.email) {
    console.log('Notifications email désactivées');
    return false;
  }
  
  // Dans une vraie application, on appellerait l'API backend pour envoyer l'email
  console.log('Email envoyé:', { to, subject, message });
  return true;
};

/**
 * Envoie une notification push (simulation - dans une vraie app, utiliserait l'API Notifications du navigateur)
 */
const sendPushNotification = async (title, message, options = {}) => {
  const preferences = getNotificationPreferences();
  if (!preferences.push && !preferences.push2) {
    console.log('Notifications push désactivées');
    return false;
  }
  
  // Vérifier si le navigateur supporte les notifications
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        ...options
      });
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification push:', error);
    }
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    // Demander la permission si elle n'a pas encore été demandée
    Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          ...options
        });
      }
    });
  }
  
  return false;
};

export const notificationService = {
  /**
   * Envoie un rappel de pointage
   */
  async sendAttendanceReminder(userEmail, userName) {
    const preferences = getNotificationPreferences();
    if (!preferences.attendanceReminders) {
      return false;
    }
    
    const title = 'Rappel de pointage';
    const message = `Bonjour ${userName}, n'oubliez pas de pointer aujourd'hui !`;
    
    // Créer une notification dans l'interface
    createNotification({
      type: 'attendance',
      title,
      message,
      icon: 'clock'
    });
    
    // Envoyer par email si activé
    if (preferences.email) {
      await sendEmailNotification(userEmail, title, message);
    }
    
    // Envoyer une notification push si activé
    if (preferences.push || preferences.push2) {
      await sendPushNotification(title, message);
    }
    
    return true;
  },
  
  /**
   * Envoie une alerte de rapport
   */
  async sendReportAlert(userEmail, userName, reportName) {
    const preferences = getNotificationPreferences();
    if (!preferences.reportAlerts) {
      return false;
    }
    
    const title = 'Nouveau rapport disponible';
    const message = `Le rapport "${reportName}" a été généré avec succès.`;
    
    // Créer une notification dans l'interface
    createNotification({
      type: 'report',
      title,
      message,
      icon: 'file'
    });
    
    // Envoyer par email si activé
    if (preferences.email) {
      await sendEmailNotification(userEmail, title, message);
    }
    
    // Envoyer une notification push si activé
    if (preferences.push || preferences.push2) {
      await sendPushNotification(title, message);
    }
    
    return true;
  },
  
  /**
   * Envoie une notification de mise à jour système
   */
  async sendSystemUpdate(userEmail, userName, updateMessage) {
    const preferences = getNotificationPreferences();
    if (!preferences.systemUpdates) {
      return false;
    }
    
    const title = 'Mise à jour système';
    const message = updateMessage || 'Une nouvelle fonctionnalité est disponible !';
    
    // Créer une notification dans l'interface
    createNotification({
      type: 'system',
      title,
      message,
      icon: 'settings'
    });
    
    // Envoyer par email si activé
    if (preferences.email) {
      await sendEmailNotification(userEmail, title, message);
    }
    
    // Envoyer une notification push si activé
    if (preferences.push || preferences.push2) {
      await sendPushNotification(title, message);
    }
    
    return true;
  },
  
  /**
   * Envoie un résumé hebdomadaire
   */
  async sendWeeklySummary(userEmail, userName, summaryData) {
    const preferences = getNotificationPreferences();
    if (!preferences.weeklySummary) {
      return false;
    }
    
    const title = 'Résumé hebdomadaire';
    const message = `Bonjour ${userName}, voici votre résumé de la semaine : ${summaryData?.totalHours || 0} heures travaillées.`;
    
    // Créer une notification dans l'interface
    createNotification({
      type: 'weekly',
      title,
      message,
      icon: 'analytics',
      data: summaryData
    });
    
    // Envoyer par email si activé
    if (preferences.email) {
      await sendEmailNotification(userEmail, title, message);
    }
    
    // Envoyer une notification push si activé
    if (preferences.push || preferences.push2) {
      await sendPushNotification(title, message);
    }
    
    return true;
  },
  
  /**
   * Demande la permission pour les notifications push du navigateur
   */
  async requestPushPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }
};

export default notificationService;

