import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import authService from '../services/authService';
import attendanceService from '../services/attendanceService';
import { getUserData, updateUserData, onUserDataUpdate } from '../services/userDataService';

function MonProfil() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState({
    assiduite: 86.4,
    ponctualite: 83.3,
    note: 'Excellent'
  });
  const [changePasswordModal, setChangePasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // État pour les informations personnelles
  const [profileData, setProfileData] = useState({
    nomComplet: '',
    email: '',
    telephone: '',
    departement: '',
    lieuDeTravail: '',
    dateEmbauche: '',
    manager: '',
    horaireDeTravail: '',
  });

  const [profileImage, setProfileImage] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState({});

  // Charger les données utilisateur au montage du composant
  useEffect(() => {
    const userData = getUserData();
    if (userData) {
      setProfileData({
        nomComplet: userData.nomComplet || `${userData.prenom || ''} ${userData.nom || ''}`.trim(),
        email: userData.email || '',
        telephone: userData.telephone || userData.phone || '',
        departement: userData.departement || 'Non spécifié',
        lieuDeTravail: userData.lieuDeTravail || 'Non spécifié',
        dateEmbauche: userData.dateEmbauche || 'Non spécifiée',
        manager: userData.manager || 'Non spécifié',
        horaireDeTravail: userData.horaireDeTravail || '9h00 - 17h00',
      });

      // Charger l'image de profil spécifique à l'utilisateur
      const userEmail = userData.email?.toLowerCase();
      if (userEmail) {
        const userSpecificImage = localStorage.getItem(`profileImage_${userEmail}`);
        if (userSpecificImage) {
          setProfileImage(userSpecificImage);
        }
      }
    }
    setLoading(false);
  }, []);

  // Écouter les mises à jour des données utilisateur
  useEffect(() => {
    const unsubscribe = onUserDataUpdate((updatedData) => {
      setProfileData(prev => ({
        ...prev,
        nomComplet: updatedData.nomComplet || `${updatedData.prenom || ''} ${updatedData.nom || ''}`.trim(),
        email: updatedData.email || prev.email,
        telephone: updatedData.telephone || updatedData.phone || prev.telephone,
      }));
    });

    return unsubscribe;
  }, []);

  // Gestion de l'image de profil
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('La taille de l\'image ne doit pas dépasser 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target.result;
        setProfileImage(imageData);
        
        // Sauvegarder l'image spécifiquement pour cet utilisateur
        const userData = getUserData();
        const userEmail = userData.email?.toLowerCase();
        if (userEmail) {
          localStorage.setItem(`profileImage_${userEmail}`, imageData);
        }
        
        // Aussi sauvegarder dans la clé globale pour compatibilité
        localStorage.setItem('profileImage', imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeProfileImage = () => {
    setProfileImage(null);
    
    // Supprimer l'image spécifique à l'utilisateur
    const userData = getUserData();
    const userEmail = userData.email?.toLowerCase();
    if (userEmail) {
      localStorage.removeItem(`profileImage_${userEmail}`);
    }
    
    // Aussi supprimer la clé globale
    localStorage.removeItem('profileImage');
  };

  // Gestion de l'édition du profil
  const startEditingProfile = () => {
    setIsEditingProfile(true);
    setEditProfileData({ ...profileData });
  };

  const cancelEditingProfile = () => {
    setIsEditingProfile(false);
    setEditProfileData({});
  };

  const saveProfileChanges = () => {
    setProfileData(editProfileData);
    
    // Mettre à jour les données utilisateur
    const userData = getUserData();
    const updatedUserData = {
      ...userData,
      telephone: editProfileData.telephone,
      departement: editProfileData.departement,
      lieuDeTravail: editProfileData.lieuDeTravail,
      manager: editProfileData.manager,
      horaireDeTravail: editProfileData.horaireDeTravail,
    };
    
    updateUserData(updatedUserData);
    
    setIsEditingProfile(false);
    setEditProfileData({});
    
    alert('Profil mis à jour avec succès !');
  };

  const handleEditProfileChange = (field, value) => {
    setEditProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fonction pour exporter l'historique de pointage
  const exportAttendanceHistory = async () => {
    try {
      const userData = getUserData();
      const attendanceHistory = attendanceService.getAttendanceHistory();
      
      if (!attendanceHistory || attendanceHistory.length === 0) {
        alert('Aucun historique de pointage à exporter');
        return;
      }

      // Créer le contenu CSV
      const csvHeader = 'Date,Heure d\'arrivée,Heure de sortie,Durée,Statut\n';
      const csvContent = attendanceHistory.map(record => {
        const date = new Date(record.date).toLocaleDateString('fr-FR');
        const heureArrivee = record.heureArrivee || 'Non pointé';
        const heureSortie = record.heureSortie || 'Non pointé';
        const duree = record.duree || 'N/A';
        const statut = record.statut || 'Incomplet';
        
        return `${date},${heureArrivee},${heureSortie},${duree},${statut}`;
      }).join('\n');

      const fullCsvContent = csvHeader + csvContent;

      // Créer un blob et télécharger
      const blob = new Blob(['\ufeff' + fullCsvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `historique_pointage_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('Historique exporté avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export de l\'historique:', error);
      alert('Une erreur est survenue lors de l\'export de l\'historique');
    }
  };

  // Gestion du changement de mot de passe
  const handleChangePassword = async () => {
    setPasswordError('');
    
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordError('Veuillez remplir tous les champs');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Les nouveaux mots de passe ne correspondent pas');
      return;
    }

    try {
      // Simuler le changement de mot de passe
      // Dans un vrai système, cela ferait appel à une API
      const userData = getUserData();
      
      // Vérifier l'ancien mot de passe (simulation)
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const userIndex = users.findIndex(u => u.email === userData.email);
      
      if (userIndex !== -1) {
        // Mettre à jour le mot de passe
        users[userIndex].motDePasse = passwordForm.newPassword;
        localStorage.setItem('users', JSON.stringify(users));
        
        // Réinitialiser le formulaire
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        
        setChangePasswordModal(false);
        alert('Mot de passe changé avec succès !');
      } else {
        setPasswordError('Utilisateur non trouvé');
      }
    } catch (error) {
      console.error('Erreur lors du changement de mot de passe:', error);
      setPasswordError('Une erreur est survenue lors du changement de mot de passe');
    }
  };

  const handlePasswordFormChange = (field, value) => {
    setPasswordForm(prev => ({
      ...prev,
      [field]: value
    }));
    setPasswordError('');
  };

  // Vérifier l'authentification
  useEffect(() => {
    const { isAuthenticated } = authService.getStoredAuth();
    if (!isAuthenticated) {
      navigate('/connexion');
    }
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECEFEF] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0389A6] mx-auto mb-4"></div>
          <p className="text-[#5A6565]">Chargement...</p>
        </div>
      </div>
    );
  }

  // Composants d'icônes
  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.49998C18.8978 2.10216 19.4374 1.87866 20 1.87866C20.5626 1.87866 21.1022 2.10216 21.5 2.49998C21.8978 2.89781 22.1213 3.43737 22.1213 3.99998C22.1213 4.56259 21.8978 5.10216 21.5 5.49998L12 15L8 16L9 12L18.5 2.49998Z" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const PerformanceIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3V21H21" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 9L12 6L16 10L21 5" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 12S5 4 12 4S23 12 23 12S19 20 12 20S1 12 1 12Z" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const EyeOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20C5 20 1 12 1 12A16.16 16.16 0 0 1 6.06 6.06L17.94 17.94Z" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4C19 4 23 12 23 12A16.16 16.16 0 0 1 19.36 15.36L9.9 4.24Z" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="min-h-screen bg-[#ECEFEF]">
      {/* Top bar */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-20 flex items-center justify-between">
          <div className="font-audiowide text-2xl" style={{ color: '#002222' }}>Sen Pointage</div>
          <div className="flex items-center gap-4">
            <NotificationIcon />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr]" style={{ minHeight: 'calc(100vh - 70px)' }}>
        <Sidebar />
        
        <main className="p-8">
          {/* Header avec titre */}
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2.5">
              <h1 className="font-audiowide text-[26px] text-[#002222]">Mon Profil</h1>
              <p className="font-instrument text-base text-[#5A6565]">Gérez vos informations personnelles et vos préférences</p>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="space-y-5">
            {/* Ligne 1: Informations personnelles et Performance côte à côte */}
            <div className="grid grid-cols-1 lg:grid-cols-[700px_1fr] gap-5">
              {/* Section Informations personnelles */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-visible">
                {/* Header section */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-[#D4DCDC]">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-md bg-[#ECEFEF] flex items-center justify-center">
                      <UserIcon />
                    </div>
                    <h3 className="font-instrument text-lg font-semibold text-[#002222]">Informations personnelles</h3>
                  </div>
                  <button 
                    onClick={isEditingProfile ? cancelEditingProfile : startEditingProfile}
                    className="w-10 h-10 rounded-2xl bg-[#ECEFEF] border border-[#D4DCDC] flex items-center justify-center hover:bg-[#D4DCDC] transition-colors"
                  >
                    <EditIcon />
                  </button>
                </div>

                {/* Profil utilisateur avec photo */}
                <div className="p-5 border-b border-[#D4DCDC]">
                  <div className="flex items-center gap-5">
                    {/* Photo de profil */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-[#ECEFEF] border-2 border-[#D4DCDC]">
                        {profileImage ? (
                          <img 
                            src={profileImage} 
                            alt="Photo de profil" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <UserIcon />
                          </div>
                        )}
                      </div>
                      
                      {/* Boutons de gestion de la photo */}
                      <div className="absolute -bottom-2 -right-2 flex gap-1">
                        <label className="w-8 h-8 bg-[#0389A6] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#027A94] transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="12" cy="13" r="4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </label>
                        
                        {profileImage && (
                          <button
                            onClick={removeProfileImage}
                            className="w-8 h-8 bg-[#D84343] rounded-full flex items-center justify-center hover:bg-[#C73E3E] transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <polyline points="3,6 5,6 21,6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Informations de base */}
                    <div className="flex-1">
                      <h4 className="font-instrument text-xl font-semibold text-[#002222]">
                        {profileData.nomComplet}
                      </h4>
                      <p className="font-instrument text-base text-[#5A6565]">
                        {profileData.email}
                      </p>
                      <p className="font-instrument text-base text-[#5A6565]">
                        {profileData.departement}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Détails du profil */}
                <div className="p-5 space-y-4">
                  {/* Téléphone */}
                  <div className="flex items-center justify-between">
                    <span className="font-instrument text-base text-[#5A6565]">Téléphone</span>
                    {isEditingProfile ? (
                      <input
                        type="tel"
                        value={editProfileData.telephone || ''}
                        onChange={(e) => handleEditProfileChange('telephone', e.target.value)}
                        className="font-instrument text-base text-[#002222] bg-[#ECEFEF] border border-[#D4DCDC] rounded px-2 py-1"
                        placeholder="Numéro de téléphone"
                      />
                    ) : (
                      <span className="font-instrument text-base text-[#002222]">
                        {profileData.telephone || 'Non renseigné'}
                      </span>
                    )}
                  </div>

                  {/* Département */}
                  <div className="flex items-center justify-between">
                    <span className="font-instrument text-base text-[#5A6565]">Département</span>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editProfileData.departement || ''}
                        onChange={(e) => handleEditProfileChange('departement', e.target.value)}
                        className="font-instrument text-base text-[#002222] bg-[#ECEFEF] border border-[#D4DCDC] rounded px-2 py-1"
                        placeholder="Département"
                      />
                    ) : (
                      <span className="font-instrument text-base text-[#002222]">
                        {profileData.departement}
                      </span>
                    )}
                  </div>

                  {/* Lieu de travail */}
                  <div className="flex items-center justify-between">
                    <span className="font-instrument text-base text-[#5A6565]">Lieu de travail</span>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editProfileData.lieuDeTravail || ''}
                        onChange={(e) => handleEditProfileChange('lieuDeTravail', e.target.value)}
                        className="font-instrument text-base text-[#002222] bg-[#ECEFEF] border border-[#D4DCDC] rounded px-2 py-1"
                        placeholder="Lieu de travail"
                      />
                    ) : (
                      <span className="font-instrument text-base text-[#002222]">
                        {profileData.lieuDeTravail}
                      </span>
                    )}
                  </div>

                  {/* Date d'embauche */}
                  <div className="flex items-center justify-between">
                    <span className="font-instrument text-base text-[#5A6565]">Date d'embauche</span>
                    <span className="font-instrument text-sm text-[#002222]">
                      {profileData.dateEmbauche}
                    </span>
                  </div>

                  {/* Manager */}
                  <div className="flex items-center justify-between">
                    <span className="font-instrument text-base text-[#5A6565]">Poste</span>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editProfileData.manager || ''}
                        onChange={(e) => handleEditProfileChange('manager', e.target.value)}
                        className="font-instrument text-base text-[#002222] bg-[#ECEFEF] border border-[#D4DCDC] rounded px-2 py-1"
                        placeholder="Poste"
                      />
                    ) : (
                      <span className="font-instrument text-base text-[#002222]">
                        {profileData.manager}
                      </span>
                    )}
                  </div>

                  {/* Horaire de travail */}
                  <div className="flex items-center justify-between">
                    <span className="font-instrument text-base text-[#5A6565]">Horaire de travail</span>
                    {isEditingProfile ? (
                      <input
                        type="text"
                        value={editProfileData.horaireDeTravail || ''}
                        onChange={(e) => handleEditProfileChange('horaireDeTravail', e.target.value)}
                        className="font-instrument text-base text-[#002222] bg-[#ECEFEF] border border-[#D4DCDC] rounded px-2 py-1"
                        placeholder="Horaire de travail"
                      />
                    ) : (
                      <span className="font-instrument text-base text-[#002222]">
                        {profileData.horaireDeTravail}
                      </span>
                    )}
                  </div>

                  {/* Boutons d'action pour l'édition */}
                  {isEditingProfile && (
                    <div className="flex gap-3 pt-4 border-t border-[#D4DCDC]">
                      <button
                        onClick={saveProfileChanges}
                        className="flex-1 px-4 py-2.5 bg-[#01A04E] text-white rounded-2xl font-instrument text-base hover:bg-[#019A47] transition-colors"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={cancelEditingProfile}
                        className="flex-1 px-4 py-2.5 bg-[#D84343] text-white rounded-2xl font-instrument text-base hover:bg-[#C73E3E] transition-colors"
                      >
                        Annuler
                      </button>
                    </div>
                  )}

                  {/* Actions */}
                  {!isEditingProfile && (
                    <div className="pt-2.5 border-t border-[#D4DCDC] space-y-3">
                      <button
                        onClick={() => setChangePasswordModal(true)}
                        className="w-full px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-base hover:bg-[#027A94] transition-colors"
                      >
                        Changer le mot de passe
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Section Performance */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-3 border-b border-[#D4DCDC]">
                  <div className="w-10 h-10 rounded-md bg-[#ECEFEF] flex items-center justify-center">
                    <PerformanceIcon />
                  </div>
                  <h3 className="font-instrument text-lg font-semibold text-[#002222]">Performance</h3>
                </div>

                {/* Contenu performance */}
                <div className="p-5 space-y-6">
                  {/* Assiduité */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-instrument text-base text-[#5A6565]">Assiduité</span>
                      <span className="font-instrument text-base font-semibold text-[#002222]">
                        {performanceData.assiduite}%
                      </span>
                    </div>
                    <div className="w-full bg-[#ECEFEF] rounded-full h-2">
                      <div 
                        className="bg-[#01A04E] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${performanceData.assiduite}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Ponctualité */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-instrument text-base text-[#5A6565]">Ponctualité</span>
                      <span className="font-instrument text-base font-semibold text-[#002222]">
                        {performanceData.ponctualite}%
                      </span>
                    </div>
                    <div className="w-full bg-[#ECEFEF] rounded-full h-2">
                      <div 
                        className="bg-[#0389A6] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${performanceData.ponctualite}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Note globale */}
                  <div className="pt-4 border-t border-[#D4DCDC]">
                    <div className="text-center">
                      <p className="font-instrument text-base text-[#5A6565] mb-1">Note globale</p>
                      <p className="font-instrument text-2xl font-bold text-[#01A04E]">
                        {performanceData.note}
                      </p>
                    </div>
                  </div>

                  {/* Bouton export */}
                  <button
                    onClick={exportAttendanceHistory}
                    className="w-full px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-sm hover:bg-[#027A94] transition-colors"
                  >
                    Exporter l'historique
                  </button>
                </div>
              </div>
            </div>

            {/* Section Historique des pointages - pleine largeur */}
            <div className="bg-white border border-[#D4DCDC] rounded-2xl">
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-3 border-b border-[#D4DCDC]">
                <div className="w-10 h-10 rounded-md bg-[#ECEFEF] flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="#5A6565" strokeWidth="2"/>
                    <polyline points="12,6 12,12 16,14" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="font-instrument text-base font-semibold text-[#002222]">Historique des pointages</h3>
              </div>

              {/* Contenu historique */}
              <div className="p-5">
                <p className="font-instrument text-base text-[#5A6565] mb-5">
                  Vos pointages des derniers jours
                </p>
                
                <div className="space-y-3">
                  {/* Exemple d'entrée d'historique */}
                  <div className="flex items-center justify-between p-4 bg-white border border-[#D4DCDC] rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-5 h-5 rounded-full bg-[#01A04E] flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <polyline points="20,6 9,17 4,12" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <p className="font-instrument text-sm font-bold text-[#002222]">
                          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="font-instrument text-xs text-[#5A6565]">
                          Arrivée: 08:15 • Départ: 17:30 • Heures: 8.25h<br />
                          Journée normale
                        </p>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-[rgba(1,160,78,0.1)] text-[#01A04E] rounded-2xl">
                      <span className="font-instrument text-xs font-medium">Présent</span>
                    </div>
                  </div>

                  {/* Message si pas d'historique */}
                  <div className="text-center py-8 text-[#5A6565]">
                    <p className="font-instrument text-sm">
                      Votre historique de pointage s'affichera ici
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal changement de mot de passe */}
      {changePasswordModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setChangePasswordModal(false);
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
              setPasswordError('');
            }
          }}
        >
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-instrument text-lg font-semibold text-[#002222]">
                Changer le mot de passe
              </h3>
              <button
                onClick={() => {
                  setChangePasswordModal(false);
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setPasswordError('');
                }}
                className="w-8 h-8 rounded-full bg-[#ECEFEF] flex items-center justify-center hover:bg-[#D4DCDC] transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <line x1="18" y1="6" x2="6" y2="18" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="6" y1="6" x2="18" y2="18" stroke="#5A6565" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Mot de passe actuel */}
              <div>
                <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                  Mot de passe actuel
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => handlePasswordFormChange('currentPassword', e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-sm text-[#002222] placeholder-[#5A6565] pr-12"
                    placeholder="Saisissez votre mot de passe actuel"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showCurrentPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Nouveau mot de passe */}
              <div>
                <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                  Nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={passwordForm.newPassword}
                    onChange={(e) => handlePasswordFormChange('newPassword', e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-sm text-[#002222] placeholder-[#5A6565] pr-12"
                    placeholder="Saisissez votre nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Confirmer le nouveau mot de passe */}
              <div>
                <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                  Confirmer le nouveau mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => handlePasswordFormChange('confirmPassword', e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-sm text-[#002222] placeholder-[#5A6565] pr-12"
                    placeholder="Confirmez votre nouveau mot de passe"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Message d'erreur */}
              {passwordError && (
                <p className="text-red-500 text-sm font-instrument">{passwordError}</p>
              )}

              {/* Boutons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setChangePasswordModal(false);
                    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }}
                  className="flex-1 px-4 py-2.5 bg-[#ECEFEF] text-[#5A6565] rounded-2xl font-instrument text-sm hover:bg-[#D4DCDC] transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleChangePassword}
                  className="flex-1 px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl font-instrument text-sm hover:bg-[#027A94] transition-colors"
                >
                  Changer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MonProfil;
