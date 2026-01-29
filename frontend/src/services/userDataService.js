// Service centralisé pour gérer les données utilisateur et leur synchronisation

/**
 * Récupère les données utilisateur complètes depuis toutes les sources
 */
export const getUserData = () => {
  try {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) return null;
    
    const currentUser = JSON.parse(currentUserStr);
    
    // Chercher dans la liste des utilisateurs (depuis localStorage 'users')
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userFromList = users.find(u => u.email === currentUser.email);
    
    // Chercher dans la liste des employés (multi-tenant: scoppée par entreprise)
    const companyId = currentUser.companyId || currentUser.company?.id || currentUser.company?._id || null;
    const employeesKey = companyId ? `employees:${companyId}` : `employees:user:${currentUser.email}`;
    const employees = JSON.parse(localStorage.getItem(employeesKey) || '[]');
    const employeeFromList = employees.find(e => e.email === currentUser.email);
    
    // Fusionner les données de toutes les sources
    const mergedData = {
      // Depuis currentUser
      ...currentUser,
      // Depuis users
      ...(userFromList && {
        nomComplet: userFromList.nomComplet || currentUser.nomComplet,
        departement: userFromList.departement || userFromList.department || currentUser.departement || currentUser.department,
        phone: userFromList.phone || userFromList.telephone || currentUser.phone || currentUser.telephone,
        telephone: userFromList.telephone || userFromList.phone || currentUser.telephone || currentUser.phone,
        language: userFromList.language || currentUser.language,
        nomEntreprise: userFromList.nomEntreprise || currentUser.nomEntreprise
      }),
      // Depuis employees
      ...(employeeFromList && {
        nomComplet: employeeFromList.nomComplet || employeeFromList.name || currentUser.nomComplet,
        departement: employeeFromList.departement || employeeFromList.department || currentUser.departement || currentUser.department,
        telephone: employeeFromList.telephone || employeeFromList.phone || currentUser.telephone || currentUser.phone,
        phone: employeeFromList.phone || employeeFromList.telephone || currentUser.phone || currentUser.telephone,
        lieuDeTravail: employeeFromList.lieuDeTravail || employeeFromList.location || currentUser.lieuDeTravail || currentUser.location,
        dateEmbauche: employeeFromList.dateEmbauche || employeeFromList.hireDate || currentUser.dateEmbauche || currentUser.hireDate,
        manager: employeeFromList.manager || currentUser.manager,
        horaireDeTravail: employeeFromList.horaireDeTravail || employeeFromList.schedule || currentUser.horaireDeTravail || currentUser.schedule
      })
    };
    
    // S'assurer que phone et telephone sont toujours synchronisés
    if (mergedData.phone && !mergedData.telephone) {
      mergedData.telephone = mergedData.phone;
    }
    if (mergedData.telephone && !mergedData.phone) {
      mergedData.phone = mergedData.telephone;
    }
    
    return mergedData;
  } catch (error) {
    console.error('Erreur lors de la récupération des données utilisateur:', error);
    return null;
  }
};

/**
 * Met à jour les données utilisateur dans toutes les sources
 */
export const updateUserData = (updatedFields) => {
  try {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      throw new Error('Aucun utilisateur connecté');
    }
    
    const currentUser = JSON.parse(currentUserStr);
    const userEmail = currentUser.email;
    
    // Normaliser les champs (gérer les variantes de noms)
    const normalizedFields = {
      ...updatedFields,
      // Normaliser nomComplet/fullName
      nomComplet: updatedFields.nomComplet || updatedFields.fullName,
      fullName: updatedFields.fullName || updatedFields.nomComplet,
      // Normaliser departement/department
      departement: updatedFields.departement || updatedFields.department,
      department: updatedFields.department || updatedFields.departement,
      // Normaliser phone/telephone
      phone: updatedFields.phone || updatedFields.telephone,
      telephone: updatedFields.telephone || updatedFields.phone
    };
    
    // 1. Mettre à jour currentUser
    const updatedCurrentUser = {
      ...currentUser,
      ...normalizedFields,
      nomComplet: normalizedFields.nomComplet || currentUser.nomComplet,
      email: normalizedFields.email || currentUser.email,
      departement: normalizedFields.departement || currentUser.departement || currentUser.department,
      department: normalizedFields.department || normalizedFields.departement || currentUser.department || currentUser.departement,
      phone: normalizedFields.phone || currentUser.phone || currentUser.telephone,
      telephone: normalizedFields.telephone || normalizedFields.phone || currentUser.telephone || currentUser.phone
    };
    localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
    
    // 2. Mettre à jour dans la liste users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const userIndex = users.findIndex(u => u.email === userEmail);
    if (userIndex !== -1) {
      users[userIndex] = {
        ...users[userIndex],
        ...normalizedFields,
        nomComplet: normalizedFields.nomComplet || users[userIndex].nomComplet,
        email: normalizedFields.email || users[userIndex].email,
        departement: normalizedFields.departement || normalizedFields.department || users[userIndex].departement || users[userIndex].department,
        department: normalizedFields.department || normalizedFields.departement || users[userIndex].department || users[userIndex].departement,
        phone: normalizedFields.phone || normalizedFields.telephone || users[userIndex].phone || users[userIndex].telephone,
        telephone: normalizedFields.telephone || normalizedFields.phone || users[userIndex].telephone || users[userIndex].phone
      };
      localStorage.setItem('users', JSON.stringify(users));
    } else {
      // Créer un nouvel enregistrement si l'utilisateur n'existe pas dans users
      users.push({
        email: userEmail,
        ...normalizedFields,
        nomComplet: normalizedFields.nomComplet || currentUser.nomComplet,
        departement: normalizedFields.departement || normalizedFields.department || '',
        department: normalizedFields.department || normalizedFields.departement || '',
        phone: normalizedFields.phone || normalizedFields.telephone || '',
        telephone: normalizedFields.telephone || normalizedFields.phone || ''
      });
      localStorage.setItem('users', JSON.stringify(users));
    }
    
    // 3. Mettre à jour dans la liste employees (multi-tenant: scoppée par entreprise)
    const companyId = updatedCurrentUser.companyId || updatedCurrentUser.company?.id || updatedCurrentUser.company?._id || null;
    const employeesKey = companyId ? `employees:${companyId}` : `employees:user:${userEmail}`;
    const employees = JSON.parse(localStorage.getItem(employeesKey) || '[]');
    const employeeIndex = employees.findIndex(e => e.email === userEmail);
    if (employeeIndex !== -1) {
      employees[employeeIndex] = {
        ...employees[employeeIndex],
        ...normalizedFields,
        nomComplet: normalizedFields.nomComplet || employees[employeeIndex].nomComplet || employees[employeeIndex].name,
        name: normalizedFields.nomComplet || normalizedFields.fullName || employees[employeeIndex].name || employees[employeeIndex].nomComplet,
        email: normalizedFields.email || employees[employeeIndex].email,
        departement: normalizedFields.departement || normalizedFields.department || employees[employeeIndex].departement || employees[employeeIndex].department,
        department: normalizedFields.department || normalizedFields.departement || employees[employeeIndex].department || employees[employeeIndex].departement,
        telephone: normalizedFields.telephone || normalizedFields.phone || employees[employeeIndex].telephone || employees[employeeIndex].phone,
        phone: normalizedFields.phone || normalizedFields.telephone || employees[employeeIndex].phone || employees[employeeIndex].telephone
      };
      localStorage.setItem(employeesKey, JSON.stringify(employees));
    }
    
    // 4. Déclencher un événement pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('userDataUpdated', { 
      detail: { ...updatedCurrentUser, ...normalizedFields } 
    }));
    
    return updatedCurrentUser;
  } catch (error) {
    console.error('Erreur lors de la mise à jour des données utilisateur:', error);
    throw error;
  }
};

/**
 * Écoute les changements de données utilisateur
 */
export const onUserDataUpdate = (callback) => {
  const handler = (event) => {
    callback(event.detail);
  };
  window.addEventListener('userDataUpdated', handler);
  return () => {
    window.removeEventListener('userDataUpdated', handler);
  };
};

