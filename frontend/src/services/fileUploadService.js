import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/v1';

// Créer une instance axios avec les headers par défaut
const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

// Intercepteur pour ajouter le token d'authentification
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const fileUploadService = {
  /**
   * Upload simple d'un fichier (photo d'employé)
   */
  async uploadEmployeePhoto(file) {
    try {
      // Vérifier si l'utilisateur est connecté
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Aucun token d\'authentification trouvé, utilisation du stockage local');
        return this.uploadPhotoLocally(file);
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/files/simple-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur upload photo employé:', error);
      
      // Gestion spécifique des erreurs d'authentification
      if (error.response?.status === 401) {
        console.warn('Erreur d\'authentification, utilisation du stockage local');
        return this.uploadPhotoLocally(file);
      }
      
      // Fallback : stocker en base64 localement si l'API n'est pas disponible
      if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
        console.warn('Serveur non disponible, utilisation du stockage local');
        return this.uploadPhotoLocally(file);
      }
      
      // Pour les autres erreurs, utiliser aussi le fallback local
      console.warn('Erreur upload serveur, utilisation du stockage local:', error.message);
      return this.uploadPhotoLocally(file);
    }
  },

  /**
   * Fallback : stocker la photo localement en base64
   */
  async uploadPhotoLocally(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const photoData = {
          id: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          filename: file.name,
          originalName: file.name,
          size: file.size,
          mimeType: file.type,
          fileType: 'image',
          url: reader.result, // Base64 data URL
          createdAt: new Date().toISOString(),
          isLocal: true
        };

        resolve({
          success: true,
          data: photoData,
          message: 'Photo stockée localement'
        });
      };

      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };

      reader.readAsDataURL(file);
    });
  },

  /**
   * Upload avec options avancées
   */
  async uploadFile(file, options = {}) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Ajouter les options si présentes
      if (options.description) {
        formData.append('description', options.description);
      }
      if (options.tags) {
        formData.append('tags', JSON.stringify(options.tags));
      }
      if (options.isPublic !== undefined) {
        formData.append('isPublic', options.isPublic);
      }

      const response = await apiClient.post('/files/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        return {
          success: true,
          data: response.data.data,
          message: response.data.message
        };
      } else {
        throw new Error(response.data.message || 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Erreur upload fichier:', error);
      throw new Error(
        error.response?.data?.message || 
        error.message || 
        'Erreur lors de l\'upload du fichier'
      );
    }
  },

  /**
   * Valider un fichier image
   */
  validateImageFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!file) {
      throw new Error('Aucun fichier sélectionné');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Format de fichier non supporté. Utilisez JPG, PNG ou WebP.');
    }

    if (file.size > maxSize) {
      throw new Error('Le fichier est trop volumineux. Taille maximale : 5MB.');
    }

    return true;
  }
};

export default fileUploadService;
