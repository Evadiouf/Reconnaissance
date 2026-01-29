// Service pour gérer les sessions utilisateur et le timeout

/**
 * Détecte les informations de la session actuelle
 */
export const getCurrentSessionInfo = () => {
  const userAgent = navigator.userAgent;
  let browser = 'Inconnu';
  let os = 'Inconnu';
  
  // Détecter le navigateur
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) {
    browser = 'Chrome';
  } else if (userAgent.includes('Firefox')) {
    browser = 'Firefox';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
  } else if (userAgent.includes('Edg')) {
    browser = 'Edge';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
    browser = 'Opera';
  }
  
  // Détecter l'OS
  if (userAgent.includes('Windows')) {
    os = 'Windows';
  } else if (userAgent.includes('Mac')) {
    os = 'macOS';
  } else if (userAgent.includes('Linux')) {
    os = 'Linux';
  } else if (userAgent.includes('Android')) {
    os = 'Android';
  } else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    os = 'iOS';
  }
  
  return {
    browser,
    os: `${browser} sur ${os}`,
    userAgent,
    timestamp: new Date().toISOString(),
    lastActivity: new Date().toISOString()
  };
};

/**
 * Récupère toutes les sessions actives depuis localStorage
 */
export const getActiveSessions = () => {
  try {
    const sessions = localStorage.getItem('activeSessions');
    if (sessions) {
      return JSON.parse(sessions);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des sessions:', error);
  }
  return [];
};

/**
 * Enregistre ou met à jour la session actuelle
 */
export const saveCurrentSession = () => {
  try {
    const { user } = require('./authService').default.getStoredAuth();
    if (!user || !user.email) return;
    
    const sessionInfo = getCurrentSessionInfo();
    const sessionId = `session_${Date.now()}_${user.email}`;
    
    const sessions = getActiveSessions();
    const existingSessionIndex = sessions.findIndex(s => 
      s.userEmail === user.email && 
      s.browser === sessionInfo.browser && 
      s.os === sessionInfo.os
    );
    
    const newSession = {
      id: existingSessionIndex !== -1 ? sessions[existingSessionIndex].id : sessionId,
      userEmail: user.email,
      ...sessionInfo,
      isCurrent: true,
      location: 'Dakar, Sénégal' // Peut être amélioré avec une API de géolocalisation
    };
    
    if (existingSessionIndex !== -1) {
      sessions[existingSessionIndex] = { ...sessions[existingSessionIndex], ...newSession, lastActivity: new Date().toISOString() };
    } else {
      sessions.push(newSession);
    }
    
    // Marquer toutes les autres sessions comme non actuelles
    sessions.forEach(s => {
      if (s.id !== newSession.id) {
        s.isCurrent = false;
      }
    });
    
    localStorage.setItem('activeSessions', JSON.stringify(sessions));
    return newSession;
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la session:', error);
    return null;
  }
};

/**
 * Supprime une session
 */
export const removeSession = (sessionId) => {
  try {
    const sessions = getActiveSessions();
    const filtered = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem('activeSessions', JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression de la session:', error);
    return false;
  }
};

/**
 * Supprime toutes les sessions sauf la session actuelle
 */
export const removeAllOtherSessions = () => {
  try {
    const { user } = require('./authService').default.getStoredAuth();
    if (!user || !user.email) return false;
    
    const sessions = getActiveSessions();
    const currentSession = sessions.find(s => s.isCurrent && s.userEmail === user.email);
    const filtered = currentSession ? [currentSession] : [];
    
    localStorage.setItem('activeSessions', JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Erreur lors de la suppression des autres sessions:', error);
    return false;
  }
};

/**
 * Formate le temps écoulé depuis la dernière activité
 */
export const formatLastActivity = (timestamp) => {
  if (!timestamp) return 'Jamais';
  
  const now = new Date();
  const lastActivity = new Date(timestamp);
  const diffMs = now - lastActivity;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) {
    return 'il y a quelques secondes';
  } else if (diffMin < 60) {
    return `il y a ${diffMin} minute${diffMin > 1 ? 's' : ''}`;
  } else if (diffHour < 24) {
    return `il y a ${diffHour} heure${diffHour > 1 ? 's' : ''}`;
  } else {
    return `il y a ${diffDay} jour${diffDay > 1 ? 's' : ''}`;
  }
};

/**
 * Initialise le système de timeout de session
 */
export const initSessionTimeout = (timeoutMinutes, onTimeout) => {
  let timeoutId = null;
  let lastActivity = Date.now();
  
  const resetTimeout = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    if (timeoutMinutes === null || timeoutMinutes === 'Jamais') {
      return; // Pas de timeout
    }
    
    const minutes = parseInt(timeoutMinutes) || 30;
    const timeoutMs = minutes * 60 * 1000;
    
    timeoutId = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
    }, timeoutMs);
  };
  
  // Écouter l'activité de l'utilisateur
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
  const handleActivity = () => {
    lastActivity = Date.now();
    resetTimeout();
  };
  
  activityEvents.forEach(event => {
    document.addEventListener(event, handleActivity, true);
  });
  
  // Initialiser le timeout
  resetTimeout();
  
  // Retourner une fonction pour nettoyer
  return () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    activityEvents.forEach(event => {
      document.removeEventListener(event, handleActivity, true);
    });
  };
};

