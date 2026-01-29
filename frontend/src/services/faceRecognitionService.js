/**
 * Service de reconnaissance faciale utilisant l'API backend (qui fait proxy vers Naratech)
 * Documentation: API_DOCUMENTATION.md
 */

import apiClient from './apiClient';

const API_BASE_URL = '/api/v1/face-recognition';

/**
 * Convertit une image (File, Blob, ou data URL) en base64
 */
const imageToBase64 = async (imageSource) => {
  try {
    let blob;
    
    // Si c'est déjà une data URL
    if (typeof imageSource === 'string' && imageSource.startsWith('data:')) {
      const response = await fetch(imageSource);
      blob = await response.blob();
    }
    // Si c'est un File ou Blob
    else if (imageSource instanceof File || imageSource instanceof Blob) {
      blob = imageSource;
    }
    // Si c'est un canvas
    else if (imageSource instanceof HTMLCanvasElement) {
      return new Promise((resolve, reject) => {
        imageSource.toBlob((blob) => {
          if (blob) {
            const reader = new FileReader();
            reader.onloadend = () => {
              // Retirer le préfixe data:image/...;base64,
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          } else {
            reject(new Error('Impossible de convertir le canvas en blob'));
          }
        }, 'image/jpeg', 0.9);
      });
    }
    else {
      throw new Error('Format d\'image non supporté');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Retirer le préfixe data:image/...;base64,
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Erreur lors de la conversion en base64:', error);
    throw error;
  }
};

const faceRecognitionService = {
  /**
   * Vérifie l'état de l'API (health check)
   * @returns {Promise<Object>} État de l'API
   */
  checkHealth: async () => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/health`);
      const data = response.data;
      
      // Si le backend retourne directement un status: 'error'
      if (data.status === 'error') {
        return {
          status: 'error',
          error: data.error || 'API non disponible',
          details: data.details || null
        };
      }
      
      // Si l'API Naratech est opérationnelle
      if (data.status === 'operational') {
        return {
          status: 'ok',
          loadedPersons: data.loaded_persons,
          modelInfo: data.model_info,
          ...data
        };
      }
      
      // Par défaut, considérer comme erreur
      return {
        status: 'error',
        error: 'État de l\'API inconnu',
        data
      };
    } catch (error) {
      console.error('Erreur lors du health check:', error);
      const errorData = error.response?.data;
      
      // Si le backend a retourné un objet d'erreur structuré
      if (errorData && errorData.status === 'error') {
        return {
          status: 'error',
          error: errorData.error || 'API non disponible',
          details: errorData.details || null
        };
      }
      
      return {
        status: 'error',
        error: error.response?.data?.message || error.message || 'API non disponible',
        details: error.response?.data || null
      };
    }
  },

  /**
   * Reconnaît un visage dans une image (via base64)
   * @param {File|Blob|HTMLCanvasElement|string} imageSource - Source de l'image
   * @param {Object} options - Options de reconnaissance
   * @returns {Promise<Object>} Résultat de la reconnaissance
   */
  recognizeFace: async (imageSource, options = {}) => {
    try {
      // Convertir l'image en base64
      const imageBase64 = await imageToBase64(imageSource);

      const payload = {
        image_base64: imageBase64,
        return_embeddings: options.returnEmbeddings || false,
        return_quality_info: options.returnQualityInfo !== false, // true par défaut
        confidence_threshold: options.confidenceThreshold || 0.35
      };

      const response = await apiClient.post(`${API_BASE_URL}/recognize`, payload);
      const result = response.data;

      // Formater la réponse pour l'application
      return {
        success: result.success,
        message: result.message,
        detections: result.detections || [],
        processingTime: result.processing_time_ms,
        frameWidth: result.frame_width,
        frameHeight: result.frame_height,
        // Détection principale (première détection avec confiance HAUTE ou MOYENNE)
        recognizedPerson: result.detections?.find(
          det => det.confidence_level === 'HAUTE' || det.confidence_level === 'MOYENNE'
        ) || null
      };
    } catch (error) {
      console.error('Erreur lors de la reconnaissance faciale:', error);
      throw error;
    }
  },

  /**
   * Reconnaît un visage via upload de fichier
   * @param {File} file - Fichier image à uploader
   * @returns {Promise<Object>} Résultat de la reconnaissance
   */
  recognizeFaceFromFile: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(`${API_BASE_URL}/recognize/file`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      const result = response.data;

      return {
        success: result.success,
        message: result.message,
        detections: result.detections || [],
        processingTime: result.processing_time_ms,
        frameWidth: result.frame_width,
        frameHeight: result.frame_height,
        recognizedPerson: result.detections?.find(
          det => det.confidence_level === 'HAUTE' || det.confidence_level === 'MOYENNE'
        ) || null
      };
    } catch (error) {
      console.error('Erreur lors de la reconnaissance faciale (file upload):', error);
      throw error;
    }
  },

  /**
   * Vérifie si une détection est valide pour le pointage
   * @param {Object} detection - Détection retournée par l'API
   * @param {number} minConfidence - Seuil de confiance minimum (défaut: 0.45 pour MOYENNE)
   * @returns {boolean} True si la détection est valide
   */
  isValidDetection: (detection, minConfidence = 0.45) => {
    if (!detection) return false;
    
    // Si c'est un objet avec personName (format du callback)
    if (detection.personName) {
      const similarity = detection.similarity || 0;
      return similarity >= minConfidence;
    }
    
    // Vérifier le niveau de confiance (format API)
    const confidenceLevels = {
      'HAUTE': 0.65,
      'MOYENNE': 0.45,
      'FAIBLE': 0.35
    };
    
    const levelValue = confidenceLevels[detection.confidence_level] || 0;
    return levelValue >= minConfidence && (detection.similarity || 0) >= minConfidence;
  },

  /**
   * Obtient le niveau de confiance à partir d'un score de similarité
   * @param {number} similarity - Score de similarité (0-1)
   * @returns {Object} Niveau de confiance avec level et value
   */
  getConfidenceLevel: (similarity) => {
    if (similarity >= 0.65) {
      return { level: 'HAUTE', value: 0.65 };
    } else if (similarity >= 0.45) {
      return { level: 'MOYENNE', value: 0.45 };
    } else if (similarity >= 0.35) {
      return { level: 'FAIBLE', value: 0.35 };
    } else {
      return { level: 'REJETÉ', value: 0 };
    }
  },

  /**
   * Enregistre une photo d'employé dans l'API Naratech (nouvelle API /training_image/add)
   * @param {string} employeeId - ID de l'employé (ex: "EMP12345" ou l'ID de la base de données)
   * @param {string} employeeName - Nom complet de l'employé
   * @param {File|Blob|HTMLCanvasElement|string} imageSource - Source de l'image
   * @returns {Promise<Object>} Résultat de l'enregistrement
   */
  registerEmployeeFace: async (employeeId, employeeName, imageSource) => {
    try {
      // Convertir l'image en base64
      const imageBase64 = await imageToBase64(imageSource);

      const response = await apiClient.post(`${API_BASE_URL}/register`, {
        employee_id: employeeId,
        employee_name: employeeName,
        image_base64: imageBase64
      });

      return response.data;
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement de la photo:', error);
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors de l\'enregistrement');
    }
  },

  /**
   * Supprime une image d'entraînement d'un employé
   * @param {string} employeeId - ID de l'employé
   * @returns {Promise<Object>} Résultat de la suppression
   */
  deleteEmployeeTrainingImage: async (employeeId) => {
    try {
      const response = await apiClient.delete(`${API_BASE_URL}/training-image/${employeeId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'image d\'entraînement:', error);
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors de la suppression');
    }
  },

  /**
   * Liste toutes les images d'entraînement
   * @returns {Promise<Object>} Liste des images d'entraînement
   */
  listTrainingImages: async () => {
    try {
      const response = await apiClient.get(`${API_BASE_URL}/training-image/list`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de la liste des images:', error);
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors de la récupération');
    }
  },

  /**
   * Recharge le modèle de reconnaissance faciale
   * @returns {Promise<Object>} Résultat du rechargement
   */
  reloadModel: async () => {
    try {
      const response = await apiClient.post(`${API_BASE_URL}/training-image/reload`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors du rechargement du modèle:', error);
      throw new Error(error.response?.data?.message || error.message || 'Erreur lors du rechargement');
    }
  },

  // Méthode de compatibilité (pour l'ancien code) - DÉPRÉCIÉE
  // Utilisez registerEmployeeFace(employeeId, employeeName, imageSource) à la place
  registerFace: async function(employeeName, imageSource) {
    console.warn('registerFace est dépréciée. Utilisez registerEmployeeFace(employeeId, employeeName, imageSource)');
    // Générer un ID temporaire basé sur le nom (pour compatibilité)
    const tempId = employeeName.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    return await this.registerEmployeeFace(tempId, employeeName, imageSource);
  },

  deleteFace: async () => {
    console.warn('deleteFace: Non implémenté - La suppression se fait côté serveur API');
    throw new Error('La suppression des visages se fait côté serveur de l\'API Naratech');
  },

  getRegisteredFaces: async () => {
    // L'API ne fournit pas de liste des visages enregistrés via ces endpoints
    // Cette méthode retourne un tableau vide pour compatibilité
    return [];
  }
};

export default faceRecognitionService;
