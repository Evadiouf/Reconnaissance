import apiClient from './apiClient';

/**
 * Service de gestion des utilisateurs
 */
const usersService = {
  /**
   * Créer un nouvel utilisateur/employé
   * @param {Object} userData - Données de l'utilisateur
   * @param {string} userData.firstName - Prénom
   * @param {string} userData.lastName - Nom
   * @param {string} userData.email - Email
   * @param {string} userData.password - Mot de passe
   * @param {string} [userData.invitationToken] - Token d'invitation (optionnel)
   * @returns {Promise<Object>} Utilisateur créé
   */
  create: async (userData) => {
    try {
      const response = await apiClient.post('/api/v1/users', userData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de l\'utilisateur:', error);
      throw error;
    }
  },

  createEmployee: async (userData) => {
    try {
      const response = await apiClient.post('/api/v1/users/employees', userData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la création de l\'employé:', error);
      throw error;
    }
  },

  /**
   * Mettre à jour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {Object} userData - Données à mettre à jour
   * @returns {Promise<Object>} Utilisateur mis à jour
   */
  update: async (userId, userData) => {
    try {
      const response = await apiClient.patch(`/api/v1/users/${userId}`, userData);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Supprimer un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<void>}
   */
  delete: async (userId) => {
    try {
      await apiClient.delete(`/api/v1/users/${userId}`);
    } catch (error) {
      console.error('Erreur lors de la suppression de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Récupérer un utilisateur par ID
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Utilisateur
   */
  getById: async (userId) => {
    try {
      const response = await apiClient.get(`/api/v1/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      throw error;
    }
  },

  /**
   * Récupérer tous les utilisateurs
   * @returns {Promise<Array>} Liste des utilisateurs
   */
  getAll: async () => {
    try {
      const response = await apiClient.get('/api/v1/users');
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des utilisateurs:', error);
      return [];
    }
  },

  // Alias pour compatibilité avec le code existant
  createUser: async (userData) => usersService.create(userData),
  updateUser: async (userId, userData) => usersService.update(userId, userData),
  deleteUser: async (userId) => usersService.delete(userId),
  getUser: async (userId) => usersService.getById(userId),
  getUsers: async () => usersService.getAll(),
};

export default usersService;







