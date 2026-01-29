/**
 * Service de synchronisation des caméras entre les pages Pointage et Cameras
 * Permet de maintenir la caméra active synchronisée entre les deux pages
 */

/**
 * Convertit une string "Nom - Lieu" en objet caméra
 * @param {string} cameraString - Format "Nom - Lieu"
 * @param {Array} cameras - Liste des caméras disponibles
 * @returns {Object|null} - Objet caméra ou null si non trouvé
 */
export const findCameraByString = (cameraString, cameras) => {
  if (!cameraString || !cameras || !Array.isArray(cameras)) {
    return null;
  }
  
  return cameras.find(cam => {
    const camString = `${cam.name} - ${cam.location}`;
    return camString === cameraString;
  }) || null;
};

/**
 * Convertit un objet caméra en string "Nom - Lieu"
 * @param {Object} camera - Objet caméra
 * @returns {string} - Format "Nom - Lieu" ou chaîne vide
 */
export const cameraToString = (camera) => {
  if (!camera || !camera.name || !camera.location) {
    return '';
  }
  return `${camera.name} - ${camera.location}`;
};

/**
 * Stocke la caméra active globalement et émet un événement
 * @param {Object} camera - Objet caméra à définir comme active
 */
export const setActiveCamera = (camera) => {
  try {
    if (camera) {
      localStorage.setItem('activeCamera', JSON.stringify(camera));
      // Émettre un événement personnalisé pour notifier les autres composants
      window.dispatchEvent(new CustomEvent('activeCameraChanged', { 
        detail: camera 
      }));
      console.log('📹 Caméra active définie:', cameraToString(camera));
    } else {
      localStorage.removeItem('activeCamera');
      window.dispatchEvent(new CustomEvent('activeCameraChanged', { 
        detail: null 
      }));
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de la caméra active:', error);
  }
};

/**
 * Récupère la caméra active depuis le stockage
 * @returns {Object|null} - Objet caméra active ou null
 */
export const getActiveCamera = () => {
  try {
    const stored = localStorage.getItem('activeCamera');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Erreur lors de la récupération de la caméra active:', error);
  }
  return null;
};

/**
 * Synchronise la caméra active avec une liste de caméras
 * Vérifie que la caméra active existe toujours dans la liste
 * @param {Array} cameras - Liste des caméras disponibles
 * @returns {Object|null} - Caméra active valide ou null
 */
export const syncActiveCamera = (cameras) => {
  const activeCamera = getActiveCamera();
  
  if (!activeCamera || !cameras || !Array.isArray(cameras)) {
    return null;
  }
  
  // Vérifier si la caméra active existe toujours dans la liste
  const found = cameras.find(cam => cam.id === activeCamera.id);
  
  if (!found) {
    // La caméra active n'existe plus, la supprimer
    setActiveCamera(null);
    return null;
  }
  
  // Retourner la caméra trouvée (au cas où elle aurait été mise à jour)
  return found;
};

/**
 * Trouve une caméra par son ID
 * @param {string} cameraId - ID de la caméra
 * @param {Array} cameras - Liste des caméras disponibles
 * @returns {Object|null} - Objet caméra ou null
 */
export const findCameraById = (cameraId, cameras) => {
  if (!cameraId || !cameras || !Array.isArray(cameras)) {
    return null;
  }
  
  return cameras.find(cam => cam.id === cameraId) || null;
};

/**
 * Service complet de synchronisation des caméras
 */
const cameraSyncService = {
  setActiveCamera,
  getActiveCamera,
  syncActiveCamera,
  findCameraByString,
  cameraToString,
  findCameraById
};

export default cameraSyncService;

