import apiClient from './apiClient';

/**
 * Service pour gérer le streaming des caméras IP
 */
const cameraStreamService = {
  /**
   * Construit l'URL de streaming pour une caméra
   */
  getStreamUrl(cameraId, cameraConfig) {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    const params = new URLSearchParams();
    
    if (cameraConfig.rtspUrl) {
      params.append('rtspUrl', cameraConfig.rtspUrl);
    } else {
      params.append('ip', cameraConfig.ip);
      params.append('port', cameraConfig.port || '554');
      if (cameraConfig.username) {
        params.append('username', cameraConfig.username);
      }
      if (cameraConfig.password) {
        params.append('password', cameraConfig.password);
      }
    }

    // Ajouter le token d'authentification
    const authData = localStorage.getItem('auth');
    let token = '';
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        token = parsed?.token || '';
      } catch (e) {
        // Ignorer
      }
    }

    // Essayer aussi avec authToken
    if (!token) {
      token = localStorage.getItem('authToken') || '';
    }

    if (token) {
      params.append('token', token);
    }

    return `${baseUrl}/api/v1/cameras/${cameraId}/stream?${params.toString()}`;
  },

  /**
   * Démarre un stream pour une caméra IP
   */
  async startStream(cameraId, cameraConfig) {
    try {
      const response = await apiClient.post(
        `/cameras/${cameraId}/stream/start`,
        cameraConfig
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors du démarrage du stream:', error);
      throw error;
    }
  },

  /**
   * Arrête un stream
   */
  async stopStream(cameraId) {
    try {
      const response = await apiClient.post(
        `/cameras/${cameraId}/stream/stop`
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'arrêt du stream:', error);
      throw error;
    }
  },

  /**
   * Vérifie l'état d'un stream
   */
  async getStreamStatus(cameraId) {
    try {
      const response = await apiClient.get(
        `/cameras/${cameraId}/stream/status`
      );
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
      throw error;
    }
  },
};

export default cameraStreamService;
