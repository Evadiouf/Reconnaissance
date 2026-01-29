/**
 * Utilitaire pour synchroniser les employés du localStorage avec MongoDB
 */

import usersService from '../services/usersService';

/**
 * Nettoie et synchronise les employés du localStorage avec MongoDB
 * @param {string} companyId - ID de l'entreprise
 * @returns {Promise<Array>} Liste des employés synchronisés
 */
export async function syncEmployeesWithMongoDB(companyId) {
  console.log('🔄 Début de la synchronisation des employés avec MongoDB...');
  
  try {
    // 1. Récupérer tous les utilisateurs de l'entreprise depuis MongoDB
    const mongoUsers = await usersService.getAll();
    console.log('📥 Utilisateurs récupérés depuis MongoDB:', mongoUsers.length);
    
    // 2. Récupérer les employés du localStorage
    const localEmployees = JSON.parse(localStorage.getItem('employees') || '[]');
    console.log('💾 Employés dans localStorage:', localEmployees.length);
    
    // 3. Créer une map des utilisateurs MongoDB par email
    const mongoUsersByEmail = new Map();
    mongoUsers.forEach(user => {
      if (user.email) {
        mongoUsersByEmail.set(user.email.toLowerCase(), user);
      }
    });
    
    // 4. Synchroniser chaque employé local avec MongoDB
    const syncedEmployees = [];
    const invalidEmployees = [];
    
    for (const localEmp of localEmployees) {
      const email = (localEmp.email || '').toLowerCase();
      const mongoUser = mongoUsersByEmail.get(email);
      
      if (mongoUser && mongoUser._id) {
        // Employé trouvé dans MongoDB - mettre à jour l'ID
        const syncedEmp = {
          ...localEmp,
          id: mongoUser._id,
          _id: mongoUser._id,
          // Mettre à jour aussi le nom si différent
          name: localEmp.name || `${mongoUser.firstName} ${mongoUser.lastName}`.trim(),
        };
        syncedEmployees.push(syncedEmp);
        console.log('✅ Employé synchronisé:', {
          name: syncedEmp.name,
          email: syncedEmp.email,
          oldId: localEmp.id,
          newId: mongoUser._id
        });
      } else {
        // Employé non trouvé dans MongoDB
        invalidEmployees.push(localEmp);
        console.warn('⚠️ Employé non trouvé dans MongoDB:', {
          name: localEmp.name,
          email: localEmp.email,
          id: localEmp.id
        });
      }
    }
    
    // 5. Sauvegarder les employés synchronisés
    localStorage.setItem('employees', JSON.stringify(syncedEmployees));
    console.log('💾 Employés synchronisés sauvegardés:', syncedEmployees.length);
    
    if (invalidEmployees.length > 0) {
      console.warn('⚠️ Employés invalides (non synchronisés):', invalidEmployees.length);
      console.warn('📋 Liste des employés invalides:', invalidEmployees.map(e => ({ name: e.name, email: e.email })));
    }
    
    return syncedEmployees;
  } catch (error) {
    console.error('❌ Erreur lors de la synchronisation:', error);
    throw error;
  }
}

/**
 * Vérifie si un employé a un ID MongoDB valide
 * @param {Object} employee - Employé à vérifier
 * @returns {boolean} True si l'ID est valide
 */
export function hasValidMongoId(employee) {
  const id = employee?.id || employee?._id;
  return id && /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Nettoie les employés avec des IDs invalides
 * @returns {Array} Liste des employés avec IDs valides uniquement
 */
export function cleanInvalidEmployees() {
  const employees = JSON.parse(localStorage.getItem('employees') || '[]');
  const validEmployees = employees.filter(hasValidMongoId);
  
  if (validEmployees.length < employees.length) {
    console.warn(`⚠️ ${employees.length - validEmployees.length} employé(s) avec ID invalide supprimé(s)`);
    localStorage.setItem('employees', JSON.stringify(validEmployees));
  }
  
  return validEmployees;
}
