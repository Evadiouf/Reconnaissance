import apiClient from './apiClient';
import { getCurrentSessionInfo } from './sessionService';

const LOGIN_ENDPOINT = '/api/v1/auth/login';
const REGISTER_ENDPOINT = '/api/v1/users';
const COMPANY_INVITATIONS_VALIDATE_ENDPOINT = '/api/v1/company-invitations/validate';
const RH_INVITATIONS_VALIDATE_ENDPOINT = '/api/v1/invitations/validate';
const FORGOT_PASSWORD_ENDPOINT = '/api/v1/auth/forgot-password';
const RESET_PASSWORD_ENDPOINT = '/api/v1/auth/reset-password';

const extractTokenFromResponse = (data) => {
  if (!data) return null;
  // Le backend retourne { access_token: ..., user: ... }
  return (
    data.access_token ||
    data.accessToken ||
    data.token ||
    data.jwt ||
    data?.result?.accessToken ||
    data?.result?.access_token ||
    data?.result?.token ||
    null
  );
};

const normalizeUser = (data = {}, fallbackEmail = '') => {
  if (!data || typeof data !== 'object') {
    return {
      email: fallbackEmail,
      nomComplet: '',
      prenom: '',
      nom: '',
      nomEntreprise: '',
      roles: []
    };
  }

  const firstName = data.firstName || data.prenom || data.first_name || '';
  const lastName = data.lastName || data.nom || data.last_name || '';
  const email = data.email || fallbackEmail || '';
  const companyName = data.companyName || data.nomEntreprise || data.company || '';
  const fullName = data.nomComplet || data.fullName || `${firstName} ${lastName}`.trim();
  const roles = data.roles || [];

  return {
    ...data,
    email,
    prenom: firstName,
    nom: lastName,
    nomComplet: fullName,
    nomEntreprise: companyName,
    roles: Array.isArray(roles) ? roles : []
  };
};

const persistAuth = ({ token, user }) => {
  if (token) {
    localStorage.setItem('authToken', token);
  }
  if (user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Effacer l'ancienne photo globale si elle existe (pour éviter qu'elle s'affiche pour un autre utilisateur)
    // La photo sera chargée depuis la clé spécifique à l'utilisateur (profileImage_${email})
    const oldGlobalImage = localStorage.getItem('profileImage');
    if (oldGlobalImage) {
      // Vérifier si cette photo appartient à l'utilisateur actuel
      const userEmail = (user.email || '').toLowerCase();
      const userSpecificImage = localStorage.getItem(`profileImage_${userEmail}`);
      
      // Si l'utilisateur n'a pas de photo spécifique, effacer l'ancienne photo globale
      if (!userSpecificImage) {
        localStorage.removeItem('profileImage');
      }
    }
  }
  if (token && user) {
    localStorage.setItem('isAuthenticated', 'true');
  }
};

export const authService = {
  async validateInvitationToken(token) {
    if (!token) {
      return { valid: false, message: 'Token requis' };
    }

    try {
      const res = await apiClient.get(COMPANY_INVITATIONS_VALIDATE_ENDPOINT, {
        params: { token }
      });
      if (res?.data && typeof res.data === 'object') {
        return res.data;
      }
    } catch (err) {
      // ignore and fallback to RH invitations
    }

    const response = await apiClient.get(RH_INVITATIONS_VALIDATE_ENDPOINT, {
      params: { token }
    });
    return response.data;
  },

  async forgotPassword({ email }) {
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Email requis');
    }

    const response = await apiClient.post(FORGOT_PASSWORD_ENDPOINT, {
      email: normalizedEmail,
    });
    return response.data;
  },

  async resetPassword({ token, newPassword }) {
    const normalizedToken = (token || '').trim();
    if (!normalizedToken) {
      throw new Error('Token requis');
    }
    if (!newPassword) {
      throw new Error('Nouveau mot de passe requis');
    }

    await apiClient.post(RESET_PASSWORD_ENDPOINT, {
      token: normalizedToken,
      newPassword,
    });
    return true;
  },

  async login({ email, password }) {
    const payload = {
      email: email.trim().toLowerCase(),
      password
    };

    const response = await apiClient.post(LOGIN_ENDPOINT, payload);
    const token = extractTokenFromResponse(response.data);
    
    if (!token) {
      console.error('Token manquant dans la réponse:', response.data);
      throw new Error('Token d\'authentification manquant dans la réponse du serveur');
    }

    const userFromResponse =
      response.data?.user ||
      response.data?.data?.user ||
      response.data?.profile ||
      response.data?.data ||
      {};

    // S'assurer que les rôles sont inclus dans les données utilisateur
    if (response.data?.user?.roles) {
      userFromResponse.roles = response.data.user.roles;
    }

    const normalizedUser = normalizeUser(userFromResponse, email);
    
    // Enrichir avec les données depuis localStorage si disponibles
    try {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const userFromStorage = users.find(u => u.email === email);
      if (userFromStorage) {
        // Fusionner les données, en priorisant celles de l'API mais en complétant avec localStorage
        normalizedUser.nomEntreprise = normalizedUser.nomEntreprise || userFromStorage.nomEntreprise || '';
        normalizedUser.nomComplet = normalizedUser.nomComplet || userFromStorage.nomComplet || normalizedUser.nomComplet;
        normalizedUser.telephone = normalizedUser.telephone || userFromStorage.telephone || userFromStorage.phone || '';
        normalizedUser.phone = normalizedUser.phone || userFromStorage.phone || userFromStorage.telephone || '';
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des données depuis localStorage:', error);
    }

    persistAuth({ token, user: normalizedUser });
    
    // Envoyer une alerte de connexion si activée
    try {
      const securitySettings = JSON.parse(localStorage.getItem('securitySettings') || '{}');
      if (securitySettings.loginAlerts !== false) {
        // Créer une notification
        const notifications = JSON.parse(localStorage.getItem('notifications') || '[]');
        const sessionInfo = getCurrentSessionInfo();
        const newNotification = {
          id: Date.now().toString(),
          type: 'security',
          title: 'Nouvelle connexion détectée',
          message: `Connexion depuis ${sessionInfo.os} • ${new Date().toLocaleString('fr-FR')}`,
          icon: 'login',
          isRead: false,
          createdAt: new Date().toISOString()
        };
        notifications.unshift(newNotification);
        localStorage.setItem('notifications', JSON.stringify(notifications));
        
        // Mettre à jour le compteur
        const unreadCount = notifications.filter(n => !n.isRead).length;
        localStorage.setItem('unreadNotificationsCount', unreadCount.toString());
        window.dispatchEvent(new CustomEvent('notificationsUpdated', { detail: { count: unreadCount } }));
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'alerte de connexion:', error);
    }

    return {
      token,
      user: normalizedUser,
      raw: response.data
    };
  },

  async register({
    prenom,
    nom,
    email,
    motDePasse,
    nomEntreprise,
    typeOrganisation,
    invitationToken,
    address,
    phone,
    website
  }) {
    // Validation des champs requis
    if (!prenom || !nom || !email || !motDePasse) {
      throw new Error('Tous les champs requis doivent être remplis');
    }
    
    if (motDePasse.length < 6) {
      throw new Error('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    const payload = {
      firstName: prenom.trim(),
      lastName: nom.trim(),
      email: email.trim().toLowerCase(),
      password: motDePasse,
      ...(invitationToken && { invitationToken }),
      ...(nomEntreprise && nomEntreprise.trim() && { companyName: nomEntreprise.trim() }),
      ...(typeOrganisation && { typeId: typeOrganisation }),
      ...(address && address.trim() && { address: address.trim() }),
      ...(phone && phone.trim() && { phone: phone.trim() }),
      ...(website && website.trim() && { website: website.trim() })
    };

    try {
    const response = await apiClient.post(REGISTER_ENDPOINT, payload);
    return response.data;
    } catch (error) {
      // Améliorer les messages d'erreur
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 409) {
          throw new Error(data?.message || 'Cet email est déjà utilisé. Veuillez vous connecter à la place.');
        } else if (status === 400) {
          const message = data?.message || data?.error || 'Données invalides. Veuillez vérifier les informations saisies.';
          throw new Error(message);
        } else if (status === 500) {
          throw new Error(data?.message || data?.error || 'Erreur serveur. Veuillez réessayer plus tard.');
        }
      }
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.setItem('isAuthenticated', 'false');

    // Nettoyer les caches globaux legacy (évite les fuites de données entre sessions)
    // Les nouveaux caches sont scoppés (ex: employees:<companyId>) et ne sont pas supprimés ici.
    try {
      localStorage.removeItem('employees');
      localStorage.removeItem('companies');
      localStorage.removeItem('users');
      localStorage.removeItem('attendance');
    } catch {
      // ignore
    }
  },

  getStoredAuth() {
    const token = localStorage.getItem('authToken') || '';
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const userRaw = localStorage.getItem('currentUser');
    const user = userRaw ? JSON.parse(userRaw) : null;

    return { token, isAuthenticated, user };
  }
};

export default authService;

