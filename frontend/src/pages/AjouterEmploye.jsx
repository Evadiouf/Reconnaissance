import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import usersService from '../services/usersService';
import fileUploadService from '../services/fileUploadService';
import companiesService from '../services/companiesService';
import schedulesService from '../services/schedulesService';

function AjouterEmploye() {
  const navigate = useNavigate();
  
  // État du formulaire
  const [formData, setFormData] = useState({
    nomComplet: '',
    email: '',
    telephone: '',
    departement: '',
    lieuDeTravail: '',
    dateEmbauche: '',
    manager: '',
    horaireDeTravail: '',
    poste: '',
    workingScheduleId: '',
  });

  // État pour l'upload de photo
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [uploadedPhotoData, setUploadedPhotoData] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // État pour le companyId de l'utilisateur connecté
  const [companyId, setCompanyId] = useState(null);
  const [isLoadingCompanyId, setIsLoadingCompanyId] = useState(true);

  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  // État pour les selects ouverts
  const [departmentMenuOpen, setDepartmentMenuOpen] = useState(false);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [scheduleMenuOpen, setScheduleMenuOpen] = useState(false);
  
  // État pour les onglets
  const [activeTab, setActiveTab] = useState('historique');

  // Récupérer le companyId de l'utilisateur connecté au chargement
  useEffect(() => {
    const fetchCompanyId = async () => {
      try {
        setIsLoadingCompanyId(true);
        const id = await companiesService.getMyCompanyId();
        if (id) {
          setCompanyId(id);
          console.log('CompanyId récupéré:', id);
        } else {
          console.warn('Aucune entreprise associée à cet utilisateur');
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du companyId:', error);
      } finally {
        setIsLoadingCompanyId(false);
      }
    };

    fetchCompanyId();
  }, []);

  useEffect(() => {
    const fetchSchedules = async () => {
      setIsLoadingSchedules(true);
      try {
        const data = await schedulesService.list();
        setAvailableSchedules(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Erreur lors du chargement des horaires:', error);
        setAvailableSchedules([]);
      } finally {
        setIsLoadingSchedules(false);
      }
    };

    fetchSchedules();
  }, []);

  // Options pour les selects
  const departments = ['IT', 'Commercial', 'Marketing', 'Production', 'Ressources Humaines'];
  const locations = ['Siège social', 'Usine A', 'Usine B'];

  const formatScheduleLabel = (schedule) => {
    const name = schedule?.name || '';
    const start = schedule?.startTime || '';
    const end = schedule?.endTime || '';
    if (!name) return '';
    if (start && end) return `${name} (${start} - ${end})`;
    return name;
  };

  // Gestion de l'upload de photo
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      // Valider le fichier
      fileUploadService.validateImageFile(file);
      
      // Réinitialiser les erreurs
      setUploadError(null);
      setIsUploadingPhoto(true);
      
      // Prévisualisation immédiate
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Upload vers le serveur
      const uploadResult = await fileUploadService.uploadEmployeePhoto(file);
      
      if (uploadResult.success) {
        setUploadedPhotoData(uploadResult.data);
        console.log('Photo uploadée avec succès:', uploadResult.data);
      } else {
        throw new Error(uploadResult.message || 'Erreur lors de l\'upload');
      }
      
    } catch (error) {
      console.error('Erreur upload photo:', error);
      setUploadError(error.message);
      
      // En cas d'erreur, garder quand même la prévisualisation locale
      if (file) {
        setProfileImage(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImagePreview(reader.result);
        };
        reader.readAsDataURL(file);
      }
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Supprimer la photo
  const handleRemovePhoto = () => {
    setProfileImage(null);
    setProfileImagePreview(null);
    setUploadedPhotoData(null);
    setUploadError(null);
    // Réinitialiser l'input file
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Générer les initiales depuis le nom
  const getInitials = (name) => {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Gestion des changements de formulaire
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Générer les initiales depuis le nom complet
  const generateInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Gestion de la soumission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.nomComplet || !formData.email) {
      alert('Veuillez remplir au moins le nom complet et l\'email');
      return;
    }

    // Générer un mot de passe temporaire (à adapter selon vos besoins)
    const tempPassword = 'TempPass123!'; // En production, générer un mot de passe sécurisé ou envoyer un email

    try {
      // Extraire le prénom et nom depuis le nom complet
      const nameParts = formData.nomComplet.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Créer l'utilisateur via l'API avec le companyId pour rattachement automatique
      const userData = {
        firstName,
        lastName,
        email: formData.email,
        password: tempPassword
      };

      // Ajouter le companyId si disponible pour rattacher l'employé à l'entreprise
      if (companyId) {
        userData.companyId = companyId;
        console.log('Création de l\'employé avec companyId:', companyId);
      } else {
        console.warn('CompanyId non disponible - l\'employé ne sera pas rattaché automatiquement');
      }

      if (formData.workingScheduleId) {
        userData.workingScheduleId = formData.workingScheduleId;
      }

      const createdUser = await usersService.createEmployee(userData);
      console.log('✅ Utilisateur créé avec ID MongoDB:', createdUser._id || createdUser.id);

      // Sauvegarder aussi localement pour l'affichage immédiat (optionnel)
      const employeesKey = companyId ? `employees:${companyId}` : 'employees';
      const savedEmployees = localStorage.getItem(employeesKey);
      const existingEmployees = savedEmployees ? JSON.parse(savedEmployees) : [];
      
      const newEmployee = {
        id: createdUser._id || createdUser.id, // Utiliser l'ID MongoDB retourné
        _id: createdUser._id || createdUser.id, // Aussi pour la compatibilité
        initials: generateInitials(formData.nomComplet),
        name: formData.nomComplet,
        email: formData.email,
        department: formData.departement,
        position: formData.poste || 'Non spécifié',
        location: formData.lieuDeTravail,
        status: 'Actif',
        attendance: '0%',
        statusColor: '#01A04E',
        statusBg: 'rgba(1, 160, 78, 0.1)',
        // Ajouter les données de la photo si disponibles
        photo: uploadedPhotoData ? {
          id: uploadedPhotoData.id,
          url: uploadedPhotoData.url,
          filename: uploadedPhotoData.filename
        } : (profileImagePreview ? {
          id: `local_${Date.now()}`,
          url: profileImagePreview,
          filename: profileImage?.name || 'photo.jpg',
          isLocal: true
        } : null)
      };
      
      const updatedEmployees = [...existingEmployees, newEmployee];
      localStorage.setItem(employeesKey, JSON.stringify(updatedEmployees));
      
      console.log('📝 Nouvel employé ajouté au localStorage:', newEmployee);
      console.log('📋 Liste complète des employés:', updatedEmployees.map(e => ({ name: e.name, id: e.id, _id: e._id })));
      
      alert('Employé créé avec succès ! Un email avec les identifiants de connexion sera envoyé.');
      navigate('/employes');
    } catch (error) {
      console.error('Erreur lors de la création de l\'employé:', error);
      const message = error.response?.data?.message || error.message || 'Une erreur est survenue lors de la création de l\'employé.';
      alert(message);
    }
  };

  // Icône arrow down
  const ArrowDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône chevron left
  const ChevronLeftIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 18L9 12L15 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône download
  const DownloadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7 10L12 15L17 10" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 15V3" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône upload photo
  const CameraIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7 10C9.20914 10 11 8.20914 11 6C11 3.79086 9.20914 2 7 2C4.79086 2 3 3.79086 3 6C3 8.20914 4.79086 10 7 10Z" stroke="#002222" strokeWidth="1.5"/>
      <path d="M1 10V12C1 12.5304 1.21071 13.0391 1.58579 13.4142C1.96086 13.7893 2.46957 14 3 14H11C11.5304 14 12.0391 13.7893 12.4142 13.4142C12.7893 13.0391 13 12.5304 13 12V10" stroke="#002222" strokeWidth="1.5"/>
    </svg>
  );

  // Icônes pour les pointages
  const CheckmarkIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.33333" stroke="#01A04E" strokeWidth="1.5"/>
      <path d="M6.66667 10L9.16667 12.5L13.3333 8.33333" stroke="#01A04E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.33333" stroke="#FF8F18" strokeWidth="1.5"/>
      <path d="M10 6.66667V10M10 13.3333H10.0083" stroke="#FF8F18" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  const ClockIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.33333" stroke="#0389A6" strokeWidth="1.5"/>
      <path d="M10 6.66667V10L12.5 12.5" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CancelIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.33333" stroke="#D84343" strokeWidth="1.5"/>
      <path d="M7.5 7.5L12.5 12.5M12.5 7.5L7.5 12.5" stroke="#D84343" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  // Données d'exemple pour l'historique des pointages
  const pointages = [
    {
      date: 'mardi 21 janvier 2025',
      arrivee: '08:15',
      depart: '17:30',
      heures: '8.25h',
      description: 'Journée normale',
      status: 'Présent',
      statusColor: '#01A04E',
      statusBg: 'rgba(1, 160, 78, 0.1)',
      icon: <CheckmarkIcon />
    },
    {
      date: 'lundi 20 janvier 2025',
      arrivee: '08:45',
      depart: '17:15',
      heures: '7.5h',
      description: 'Retard transport',
      status: 'Retard',
      statusColor: '#FF8F18',
      statusBg: 'rgba(255, 143, 24, 0.1)',
      icon: <AlertIcon />
    },
    {
      date: 'dimanche 19 janvier 2025',
      arrivee: '08:00',
      depart: '18:00',
      heures: '9h',
      description: 'Heure supplémentaire',
      status: 'Présent',
      statusColor: '#01A04E',
      statusBg: 'rgba(1, 160, 78, 0.1)',
      icon: <CheckmarkIcon />
    },
    {
      date: 'samedi 18 janvier 2025',
      arrivee: '09:30',
      depart: '13:00',
      heures: '3.5h',
      description: 'Heure supplémentaire',
      status: 'Partiel',
      statusColor: '#0389A6',
      statusBg: 'rgba(3, 137, 166, 0.1)',
      icon: <ClockIcon />
    },
    {
      date: 'vendredi 17 janvier 2025',
      arrivee: '08:00',
      depart: '18:00',
      heures: '9h',
      description: 'Heure supplémentaire',
      status: 'Absent',
      statusColor: '#D84343',
      statusBg: 'rgba(216, 67, 67, 0.1)',
      icon: <CancelIcon />
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }} onClick={() => {
      setDepartmentMenuOpen(false);
      setLocationMenuOpen(false);
      setScheduleMenuOpen(false);
    }}>
      {/* Top bar */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-20 flex items-center justify-between">
          <div className="font-audiowide text-2xl" style={{ color: '#002222' }}>Sen Pointage</div>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-[#ECEFEF] border border-[#D4DCDC] flex items-center justify-center cursor-pointer hover:bg-[#D4DCDC] transition-colors">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div className="flex items-center gap-3 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-1.5 py-1">
              <div className="w-9 h-9 rounded-xl bg-[#0389A6]/10 border border-[#0389A6] flex items-center justify-center font-instrument text-[#0389A6] font-bold text-base">
                AS
              </div>
              <div className="leading-tight">
                <div className="font-instrument text-sm font-semibold text-[#002222]">Abdou Sall</div>
                <div className="font-instrument text-xs text-[#5A6565]">Admin</div>
              </div>
              <ArrowDownIcon />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr]" style={{ minHeight: 'calc(100vh - 70px)' }}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main */}
        <main className="p-5 md:p-8 space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-2.5">
              <h2 className="font-audiowide text-[26px] text-[#002222]">Ajouter un employé</h2>
              <p className="font-instrument text-base text-[#5A6565]">
                Remplissez les informations pour créer un nouveau compte employé
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white font-instrument text-base text-[#002222] hover:bg-[#ECEFEF] transition-colors">
                <DownloadIcon />
                Exporter mon historique
              </button>
              <button
                type="submit"
                form="employe-form"
                className="px-6 py-2.5 bg-[#0389A6] rounded-2xl font-instrument text-base text-white hover:bg-[#027A8F] transition-colors cursor-pointer"
              >
                Ajouter l'employé
              </button>
            </div>
          </div>

          {/* Formulaire principal */}
          <form id="employe-form" onSubmit={handleSubmit}>
          {/* Ligne 1: Informations personnelles et Performance côte à côte */}
          <div className="grid grid-cols-1 md:grid-cols-[700px_1fr] gap-5">
            {/* Section Informations personnelles */}
            <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              {/* Header section */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#D4DCDC]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-md bg-[#ECEFEF] flex items-center justify-center">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="#002222"/>
                      <path d="M10 12C6.68629 12 0 13.6863 0 17V20H20V17C20 13.6863 13.3137 12 10 12Z" fill="#002222"/>
                    </svg>
                  </div>
                  <h3 className="font-instrument text-base font-semibold text-[#002222]">Informations personnelles</h3>
                </div>
                <button className="w-10 h-10 rounded-2xl bg-[#ECEFEF] border border-[#D4DCDC] flex items-center justify-center hover:bg-[#D4DCDC] transition-colors">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M7 7L10 4M10 4H7M10 4V7" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 3C9.76142 3 12 5.23858 12 8C12 10.7614 9.76142 13 7 13C4.23858 13 2 10.7614 2 8C2 5.23858 4.23858 3 7 3Z" stroke="#002222" strokeWidth="1.5"/>
                  </svg>
                </button>
              </div>

              {/* Profil utilisateur avec photo */}
              <div className="p-5 border-b border-[#D4DCDC]">
                <div className="flex items-center justify-center gap-4 mb-5">
                  <div className="relative">
                    <div className="w-[62px] h-[62px] rounded-[31px] bg-[#ECEFEF]/50 border border-[#D4DCDC] flex items-center justify-center font-instrument text-[#22364D] font-medium text-sm">
                      {profileImagePreview ? (
                        <img src={profileImagePreview} alt="Profile" className="w-full h-full rounded-[31px] object-cover" />
                      ) : (
                        getInitials(formData.nomComplet)
                      )}
                      
                      {/* Indicateur de chargement */}
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-[31px] flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    
                    {/* Boutons d'action */}
                    <div className="absolute -bottom-1 -right-1 flex gap-1">
                      <label className="w-5 h-5 bg-white border border-[#D4DCDC] rounded-md flex items-center justify-center cursor-pointer hover:bg-[#ECEFEF] transition-colors">
                        <CameraIcon />
                        <input
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/webp"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isUploadingPhoto}
                        />
                      </label>
                      
                      {/* Bouton supprimer si une photo est présente */}
                      {(profileImagePreview || uploadedPhotoData) && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="w-5 h-5 bg-red-500 border border-red-600 rounded-md flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors"
                          disabled={isUploadingPhoto}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="font-instrument text-base font-bold text-[#22364D]">
                      {formData.nomComplet || 'Nom de l\'employé'}
                    </div>
                    <div className="font-instrument text-sm text-[#5A6565]">
                      {formData.poste || 'Poste'}
                    </div>
                    
                    {/* Statut de l'upload */}
                    {isUploadingPhoto && (
                      <div className="font-instrument text-xs text-blue-600">
                        Upload en cours...
                      </div>
                    )}
                    {uploadedPhotoData && !isUploadingPhoto && (
                      <div className="font-instrument text-xs text-green-600">
                        ✓ Photo uploadée
                      </div>
                    )}
                    {uploadError && (
                      <div className="font-instrument text-xs text-red-600">
                        ⚠ {uploadError}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Messages d'information */}
                {uploadError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg">
                    <p className="font-instrument text-xs text-red-700">
                      {uploadError}
                    </p>
                    <p className="font-instrument text-xs text-red-600 mt-1">
                      La photo sera stockée localement en attendant.
                    </p>
                  </div>
                )}
                
                {uploadedPhotoData && (
                  <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-instrument text-xs text-green-700">
                      ✓ Photo uploadée avec succès sur le serveur
                    </p>
                    <p className="font-instrument text-xs text-green-600">
                      Fichier: {uploadedPhotoData.originalName} ({Math.round(uploadedPhotoData.size / 1024)} KB)
                    </p>
                  </div>
                )}
                
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="px-2.5 py-0.5 bg-white border border-[#D4DCDC] rounded-2xl">
                    <span className="font-instrument text-xs font-medium text-[#22364D]">ID: EMP001</span>
                  </div>
                  
                  {/* Aide pour l'upload de photo */}
                  <div className="text-center">
                    <p className="font-instrument text-xs text-[#5A6565]">
                      Formats supportés: JPG, PNG, WebP (max 5MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Contenu du formulaire */}
              <div className="p-5 space-y-5">
                {/* Ligne 1: Nom complet et Email */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="font-instrument text-base font-semibold text-[#002222] px-2.5">Nom complet</label>
                    <input
                      type="text"
                      name="nomComplet"
                      value={formData.nomComplet}
                      onChange={handleChange}
                      placeholder="Entrez le nom complet"
                      className="w-full px-6 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#5A6565] outline-none focus:border-[#0389A6] transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-instrument text-base font-semibold text-[#002222] px-2.5">Adresse email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="exemple@entreprise.com"
                      className="w-full px-6 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#5A6565] outline-none focus:border-[#0389A6] transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Ligne 2: Téléphone et Département */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="font-instrument text-base font-semibold text-[#002222] px-2.5">Téléphone</label>
                    <input
                      type="tel"
                      name="telephone"
                      value={formData.telephone}
                      onChange={handleChange}
                      placeholder="+221 77 480 09 90"
                      className="w-full px-6 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#5A6565] outline-none focus:border-[#0389A6] transition-colors"
                      required
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="font-instrument text-base font-semibold text-[#002222] px-2.5">Département</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDepartmentMenuOpen(!departmentMenuOpen);
                          setLocationMenuOpen(false);
                          setScheduleMenuOpen(false);
                        }}
                        className="w-full px-6 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#5A6565] flex items-center justify-between hover:bg-[#D4DCDC] transition-colors"
                      >
                        <span>{formData.departement || 'Sélectionnez un département'}</span>
                        <ArrowDownIcon />
                      </button>
                      {departmentMenuOpen && (
                        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10">
                          {departments.map((dept) => (
                            <button
                              key={dept}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({ ...prev, departement: dept }));
                                setDepartmentMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF] transition-colors"
                            >
                              {dept}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ligne 3: Lieu de travail et Date d'embauche */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2 relative">
                    <label className="font-instrument text-base font-semibold text-[#002222] px-2.5">Lieu de travail</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocationMenuOpen(!locationMenuOpen);
                          setDepartmentMenuOpen(false);
                          setScheduleMenuOpen(false);
                        }}
                        className="w-full px-6 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#5A6565] flex items-center justify-between hover:bg-[#D4DCDC] transition-colors"
                      >
                        <span>{formData.lieuDeTravail || 'Sélectionnez un lieu'}</span>
                        <ArrowDownIcon />
                      </button>
                      {locationMenuOpen && (
                        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10">
                          {locations.map((location) => (
                            <button
                              key={location}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({ ...prev, lieuDeTravail: location }));
                                setLocationMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF] transition-colors"
                            >
                              {location}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-instrument text-base font-semibold text-[#002222] px-2.5">Date d'embauche</label>
                    <input
                      type="date"
                      name="dateEmbauche"
                      value={formData.dateEmbauche}
                      onChange={handleChange}
                      className="w-full px-6 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#5A6565] outline-none focus:border-[#0389A6] transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* Ligne 4: Manager et Horaire de travail */}
                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="font-instrument text-base font-semibold text-[#002222] px-2.5">Manager</label>
                    <input
                      type="text"
                      name="manager"
                      value={formData.manager}
                      onChange={handleChange}
                      placeholder="Nom du manager"
                      className="w-full px-6 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#5A6565] outline-none focus:border-[#0389A6] transition-colors"
                    />
                  </div>
                  <div className="space-y-2 relative">
                    <label className="font-instrument text-base font-semibold text-[#002222] px-2.5">Horaire de travail</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScheduleMenuOpen(!scheduleMenuOpen);
                          setDepartmentMenuOpen(false);
                          setLocationMenuOpen(false);
                        }}
                        className="w-full px-6 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#5A6565] flex items-center justify-between hover:bg-[#D4DCDC] transition-colors"
                      >
                        <span>
                          {formData.horaireDeTravail || (isLoadingSchedules ? 'Chargement des horaires...' : 'Sélectionnez un horaire')}
                        </span>
                        <ArrowDownIcon />
                      </button>
                      {scheduleMenuOpen && (
                        <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10">
                          {availableSchedules.map((schedule) => (
                            <button
                              key={schedule?._id || schedule?.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFormData(prev => ({
                                  ...prev,
                                  horaireDeTravail: formatScheduleLabel(schedule),
                                  workingScheduleId: schedule?._id || schedule?.id || ''
                                }));
                                setScheduleMenuOpen(false);
                              }}
                              className="w-full text-left px-4 py-2.5 font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF] transition-colors"
                            >
                              {formatScheduleLabel(schedule)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Champ Poste */}
                <div className="space-y-2">
                  <label className="font-instrument text-base font-semibold text-[#002222] px-2.5">Poste</label>
                  <input
                    type="text"
                    name="poste"
                    value={formData.poste}
                    onChange={handleChange}
                    placeholder="Responsable des ventes"
                    className="w-full px-6 py-2.5 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#5A6565] outline-none focus:border-[#0389A6] transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Section Performance */}
            <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              <div className="flex items-center px-5 py-3 border-b border-[#D4DCDC]">
                <div className="w-10 h-10 rounded-md bg-[#ECEFEF] flex items-center justify-center mr-4">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="#002222"/>
                    <path d="M10 12C6.68629 12 0 13.6863 0 17V20H20V17C20 13.6863 13.3137 12 10 12Z" fill="#002222"/>
                  </svg>
                </div>
                <h3 className="font-instrument text-base font-semibold text-[#002222]">Performance</h3>
              </div>
              <div className="p-5 space-y-4">
                {/* Assiduité et Ponctualité */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-instrument text-sm text-[#002222]">Assiduité ce mois</span>
                      <span className="font-instrument text-base font-semibold text-[#FF8F18]">0%</span>
                    </div>
                    <div className="h-1.5 bg-[#ECEFEF] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF8F18] rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-instrument text-sm text-[#002222]">Ponctualité</span>
                      <span className="font-instrument text-base font-semibold text-[#FF8F18]">0%</span>
                    </div>
                    <div className="h-1.5 bg-[#ECEFEF] rounded-full overflow-hidden">
                      <div className="h-full bg-[#FF8F18] rounded-full" style={{ width: '0%' }}></div>
                    </div>
                  </div>
                </div>
                {/* Note annuelle */}
                <div className="pt-2.5 border-t border-[#D4DCDC]">
                  <div className="flex items-center justify-between">
                    <span className="font-instrument text-sm text-[#5A6565] text-center">Note annuelle</span>
                    <span className="font-instrument text-base font-bold text-[#002222]">N/A</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </form>

          {/* Ligne 2: Onglets et Historique des pointages */}
          <div className="space-y-5">
            {/* Onglets */}
            <div className="bg-[#D4DCDC] rounded-2xl p-1 flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setActiveTab('historique'); }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-instrument text-base transition-colors cursor-pointer ${
                  activeTab === 'historique' ? 'bg-white text-[#002222]' : 'text-[#002222]'
                }`}
              >
                Historique de présence
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveTab('statistiques'); }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-instrument text-base transition-colors cursor-pointer ${
                  activeTab === 'statistiques' ? 'bg-white text-[#002222]' : 'text-[#002222]'
                }`}
              >
                Statistiques
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setActiveTab('calendrier'); }}
                className={`flex-1 px-4 py-2.5 rounded-xl font-instrument text-base transition-colors cursor-pointer ${
                  activeTab === 'calendrier' ? 'bg-white text-[#002222]' : 'text-[#002222]'
                }`}
              >
                Vue calendrier
              </button>
            </div>

            {/* Contenu selon l'onglet actif */}
            {activeTab === 'historique' && (
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                <div className="flex items-center px-5 py-4 border-b border-[#D4DCDC]">
                  <div className="w-10 h-10 rounded-md bg-[#ECEFEF] flex items-center justify-center mr-4">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="#002222"/>
                      <path d="M10 12C6.68629 12 0 13.6863 0 17V20H20V17C20 13.6863 13.3137 12 10 12Z" fill="#002222"/>
                    </svg>
                  </div>
                  <h3 className="font-instrument text-base font-semibold text-[#002222]">Historique des pointages</h3>
                </div>
                <div className="p-5">
                  <p className="font-instrument text-base text-[#5A6565] mb-5">Vos pointages des derniers jours</p>
                  <div className="space-y-2.5">
                    {pointages.map((pointage, index) => (
                      <div key={index} className="flex items-center justify-between gap-[75px] p-5 bg-white border border-[#D4DCDC] rounded-2xl">
                        <div className="flex items-center gap-5">
                          {pointage.icon}
                          <div className="space-y-1.25">
                            <div className="font-instrument text-sm font-bold text-[#002222] leading-tight">{pointage.date}</div>
                            <div className="font-instrument text-xs text-[#5A6565] leading-6">
                              Arrivée:    <span className="inline-block w-16">{pointage.arrivee}</span>
                              Départ:   <span className="inline-block w-16">{pointage.depart}</span>
                              Heures:   {pointage.heures}
                              <br />
                              {pointage.description}
                            </div>
                          </div>
                        </div>
                        <div 
                          className="px-2.5 py-1 rounded-2xl"
                          style={{
                            backgroundColor: pointage.statusBg,
                            color: pointage.statusColor
                          }}
                        >
                          <span className="font-instrument text-xs font-medium">{pointage.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'statistiques' && (
              <div className="space-y-5">
                {/* Section Statistiques mensuelles */}
                <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                  <div className="flex items-center px-5 py-4 border-b border-[#D4DCDC]">
                    <div className="w-10 h-10 rounded-md bg-[#ECEFEF] flex items-center justify-center mr-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 22H2" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M6 18V8" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M10 18V4" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M14 18V12" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18 18V16" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M22 18V10" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h3 className="font-instrument text-base font-semibold text-[#002222]">Statistiques mensuelles</h3>
                  </div>
                  <div className="p-5">
                    {/* 4 cartes de statistiques mensuelles */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Jours présents */}
                      <div className="flex flex-col justify-center items-center gap-2 p-5 bg-white border border-[#D4DCDC] rounded-2xl">
                        <div className="font-instrument text-sm text-[#5A6565]">Jours présents</div>
                        <div className="font-audiowide text-[32px] leading-none text-[#01A04E]">18</div>
                      </div>
                      {/* Retards */}
                      <div className="flex flex-col justify-center items-center gap-2 p-5 bg-white border border-[#D4DCDC] rounded-2xl">
                        <div className="font-instrument text-sm text-[#5A6565]">Retards</div>
                        <div className="font-audiowide text-[32px] leading-none text-[#FF8F18]">4</div>
                      </div>
                      {/* Absences */}
                      <div className="flex flex-col justify-center items-center gap-2 p-5 bg-white border border-[#D4DCDC] rounded-2xl">
                        <div className="font-instrument text-sm text-[#5A6565]">Absences</div>
                        <div className="font-audiowide text-[32px] leading-none text-[#D84343]">1</div>
                      </div>
                      {/* Moyenne quotidienne */}
                      <div className="flex flex-col justify-center items-center gap-2 p-5 bg-white border border-[#D4DCDC] rounded-2xl">
                        <div className="font-instrument text-sm text-[#5A6565] text-center">Moy. quotidienne</div>
                        <div className="font-audiowide text-[32px] leading-none text-[#0389A6]">7.8h</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section Vue d'ensemble annuelle */}
                <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                  <div className="flex items-center px-5 py-4 border-b border-[#D4DCDC]">
                    <div className="w-10 h-10 rounded-md bg-[#ECEFEF] flex items-center justify-center mr-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 6V12L16 14" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <h3 className="font-instrument text-base font-semibold text-[#002222]">Vue d'ensemble annuelle</h3>
                  </div>
                  <div className="p-5 space-y-5">
                    {/* Première ligne */}
                    <div className="grid grid-cols-3 gap-5">
                      <div className="flex flex-col gap-2">
                        <div className="font-instrument text-xs font-medium text-[#5A6565]">Heures travaillées</div>
                        <div className="font-instrument text-sm font-semibold text-[#002222]">1756h</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="font-instrument text-xs font-medium text-[#5A6565]">Heures supplémentaires</div>
                        <div className="font-instrument text-sm font-semibold text-[#0389A6]">45h</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="font-instrument text-xs font-medium text-[#5A6565]">Jours de congé</div>
                        <div className="font-instrument text-sm font-semibold text-[#01A04E]">12</div>
                      </div>
                    </div>
                    {/* Deuxième ligne */}
                    <div className="grid grid-cols-3 gap-5">
                      <div className="flex flex-col gap-2">
                        <div className="font-instrument text-xs font-medium text-[#5A6565]">Jours de maladie</div>
                        <div className="font-instrument text-sm font-semibold text-[#D84343]">3</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="font-instrument text-xs font-medium text-[#5A6565]">Incidents de retard</div>
                        <div className="font-instrument text-sm font-semibold text-[#FF8F18]">8</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="font-instrument text-xs font-medium text-[#5A6565]">Évaluation</div>
                        <div className="px-2.5 py-0.5 rounded-md bg-[#01A04E]/10 inline-flex items-center justify-center">
                          <span className="font-instrument text-xs font-medium text-[#01A04E]">Excellent</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'calendrier' && (
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
                <div className="flex items-center px-5 py-4 border-b border-[#D4DCDC]">
                  <div className="w-10 h-10 rounded-md bg-[#ECEFEF] flex items-center justify-center mr-4">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M10 10C12.7614 10 15 7.76142 15 5C15 2.23858 12.7614 0 10 0C7.23858 0 5 2.23858 5 5C5 7.76142 7.23858 10 10 10Z" fill="#002222"/>
                      <path d="M10 12C6.68629 12 0 13.6863 0 17V20H20V17C20 13.6863 13.3137 12 10 12Z" fill="#002222"/>
                    </svg>
                  </div>
                  <h3 className="font-instrument text-base font-semibold text-[#002222]">Vue calendrier</h3>
                </div>
                <div className="p-5">
                  <p className="font-instrument text-base text-[#5A6565] text-center py-4">Vue calendrier - En développement</p>
                </div>
              </div>
            )}
          </div>

          {/* Bouton Annuler */}
          <div className="flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/employes')}
              className="px-6 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white font-instrument text-base text-[#002222] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}

export default AjouterEmploye;
