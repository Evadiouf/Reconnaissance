import { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import fileUploadService from '../services/fileUploadService';
import faceRecognitionService from '../services/faceRecognitionService';
import Logo from '../components/Logo';
import viewIcon from '../assets/icons/view.svg';
import fileEditIcon from '../assets/icons/file-edit.svg';
import cancelCircleIcon from '../assets/icons/cancel-circle.svg';
import deleteIcon from '../assets/icons/delete-02.svg';
import attendanceService from '../services/attendanceService';
import authService from '../services/authService';
import usersService from '../services/usersService';
import companiesService from '../services/companiesService';
import schedulesService from '../services/schedulesService';

function Employes() {
  // État simple pour les employés
  const [employees, setEmployees] = useState([]);
  const [employeesLoaded, setEmployeesLoaded] = useState(false); // Nouveau flag pour éviter l'écrasement
  const [employeesStorageKey, setEmployeesStorageKey] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('historique');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  // État pour les statistiques mensuelles (initialisées à zéro)
  const [monthlyStats, setMonthlyStats] = useState({
    joursPresents: 0,
    retards: 0,
    absences: 0,
    moyenneQuotidienne: 0
  });

  // État pour les statistiques annuelles (initialisées à zéro)
  const [yearlyStats, setYearlyStats] = useState({
    heuresTravaillées: 0,
    heuresSupplementaires: 0,
    joursCongé: 0,
    joursMaladie: 0,
    incidentsRetard: 0,
    evaluation: 'N/A'
  });

  // État pour l'historique des pointages
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);
  
  // État pour le formulaire d'ajout
  const [formData, setFormData] = useState({
    nomComplet: '',
    email: '',
    telephone: '',
    departement: '',
    poste: '',
    lieuDeTravail: '',
    isActive: true,
    workingScheduleId: ''
  });

  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
  const [scheduleMenuOpen, setScheduleMenuOpen] = useState(false);

  const formatScheduleLabel = (schedule) => {
    const name = schedule?.name || '';
    const start = schedule?.startTime || '';
    const end = schedule?.endTime || '';
    if (!name) return '';
    if (start && end) return `${name} (${start} - ${end})`;
    return name;
  };

  // État pour l'upload de photo
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePreview, setProfileImagePreview] = useState(null);
  const [uploadedPhotoData, setUploadedPhotoData] = useState(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Fonction pour convertir un User de l'API au format Employee
  const formatUserToEmployee = (user) => {
    const firstName = user.firstName || user.prenom || '';
    const lastName = user.lastName || user.nom || '';
    const fullName = `${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || 'Employé';
    const initials = `${firstName.charAt(0).toUpperCase()}${lastName.charAt(0).toUpperCase()}` || '??';
    
    return {
      id: user._id || user.id || Date.now().toString(),
      nomComplet: fullName,
      name: fullName,
      email: user.email || '',
      telephone: user.phone || user.telephone || 'Non renseigné',
      phone: user.phone || user.telephone || '',
      departement: user.department || user.departement || 'Non spécifié',
      department: user.department || user.departement || 'Non spécifié',
      poste: user.position || user.poste || 'Non spécifié',
      position: user.position || user.poste || 'Non spécifié',
      lieuDeTravail: user.location || user.lieuDeTravail || 'Non spécifié',
      location: user.location || user.lieuDeTravail || 'Non spécifié',
      isActive: user.isActive !== false,
      status: user.isActive !== false ? 'Actif' : 'Inactif',
      statusBg: user.isActive !== false ? '#E6F7F9' : '#FEE2E2',
      statusColor: user.isActive !== false ? '#01A04E' : '#DC2626',
      attendance: '0%',
      initials: initials,
      roles: user.roles || []
    };
  };

  // Fonction pour synchroniser localStorage avec le state
  const getEmployeesStorageKey = ({ companyId, userEmail }) => {
    const normalizedCompanyId = (companyId || '').toString().trim();
    if (normalizedCompanyId) return `employees:${normalizedCompanyId}`;
    const normalizedEmail = (userEmail || '').toString().trim().toLowerCase();
    if (normalizedEmail) return `employees:user:${normalizedEmail}`;
    return null;
  };

  const syncLocalStorage = (employeesList, keyOverride) => {
    const key = keyOverride || employeesStorageKey;
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(employeesList));
    console.log('💾 localStorage synchronisé (%s) avec %s employé(s)', key, employeesList.length);
  };

  // Charger les employés depuis l'API et synchroniser localStorage
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        // Essayer de charger depuis l'API d'abord
        console.log('🔄 Chargement des employés depuis l\'API...');
        
        // Récupérer l'entreprise de l'utilisateur connecté
        const { user } = authService.getStoredAuth();
        if (!user) {
          console.log('⚠️ Utilisateur non connecté, chargement depuis localStorage uniquement');
          const key = getEmployeesStorageKey({ companyId: null, userEmail: null });
          setEmployeesStorageKey(key);
          const savedEmployees = key ? localStorage.getItem(key) : null;
          if (savedEmployees) {
            const parsed = JSON.parse(savedEmployees);
            if (Array.isArray(parsed)) {
              setEmployees(parsed);
            }
          }
          setEmployeesLoaded(true);
          return;
        }

        const fallbackKey = getEmployeesStorageKey({ companyId: null, userEmail: user.email });
        setEmployeesStorageKey(fallbackKey);

        // Récupérer l'ID de l'entreprise
        let companyId = null;
        try {
          // companiesService.getMyCompanyId() retourne directement un companyId (string) ou null
          companyId = await companiesService.getMyCompanyId();
        } catch (error) {
          console.log('⚠️ Impossible de récupérer l\'entreprise, utilisation de localStorage');
        }

        // Si on a une entreprise, récupérer les employés depuis l'API
        // Source de vérité alignée avec Suivi des présences: GET /api/v1/companies/employees
        if (companyId) {
          try {
            const apiUsers = await companiesService.getCompanyEmployees();
            const apiEmployees = Array.isArray(apiUsers) ? apiUsers : [];

            const formattedEmployees = apiEmployees.map(formatUserToEmployee);
            setEmployees(formattedEmployees);
            const scopedKey = getEmployeesStorageKey({ companyId, userEmail: user.email });
            setEmployeesStorageKey(scopedKey);
            syncLocalStorage(formattedEmployees, scopedKey);
            console.log('✅ Employés chargés depuis l\'API:', formattedEmployees.length);
            setEmployeesLoaded(true);
            return;
          } catch (apiError) {
            console.error('❌ Erreur lors du chargement depuis l\'API:', apiError);
          }
        }

        // Fallback: charger depuis localStorage
        const savedEmployees = fallbackKey ? localStorage.getItem(fallbackKey) : null;
        if (savedEmployees) {
          const parsed = JSON.parse(savedEmployees);
          if (Array.isArray(parsed)) {
            setEmployees(parsed);
            console.log('✅ Employés chargés depuis localStorage (fallback):', parsed.length);
          }
        } else {
          setEmployees([]);
          console.log('📝 Aucun employé trouvé');
        }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des employés:', error);
        // En cas d'erreur, charger depuis localStorage
        try {
          const { user } = authService.getStoredAuth();
          const fallbackKey = getEmployeesStorageKey({ companyId: null, userEmail: user?.email });
          setEmployeesStorageKey(fallbackKey);
          const savedEmployees = fallbackKey ? localStorage.getItem(fallbackKey) : null;
          if (savedEmployees) {
            const parsed = JSON.parse(savedEmployees);
            if (Array.isArray(parsed)) {
              setEmployees(parsed);
            }
          }
        } catch (localError) {
          console.error('❌ Erreur lors du chargement depuis localStorage:', localError);
          setEmployees([]);
        }
      } finally {
        setEmployeesLoaded(true);
      }
    };
    
    loadEmployees();
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

  // Synchroniser localStorage quand les employés changent (seulement après le chargement initial)
  useEffect(() => {
    if (employeesLoaded && employeesStorageKey) {
      syncLocalStorage(employees);
    }
  }, [employees, employeesLoaded, employeesStorageKey]);


  // Charger les statistiques depuis l'API
  useEffect(() => {
    const loadStatistics = async () => {
      setLoadingStats(true);
      try {
        const { user } = authService.getStoredAuth();
        const companyId = user?.companyId || user?.company?.id || user?.companyId || null;
        
        if (!companyId) {
          console.log('Aucun companyId trouvé, statistiques initialisées à zéro');
          setLoadingStats(false);
          return;
        }

        // Calculer les dates pour le mois actuel
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const fromMonth = monthStart.toISOString();
        const toMonth = monthEnd.toISOString();

        // Calculer les dates pour l'année actuelle
        const yearStart = new Date(now.getFullYear(), 0, 1);
        const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        const fromYear = yearStart.toISOString();
        const toYear = yearEnd.toISOString();

        // Charger les données de pointage pour le mois
        const monthlyAttendance = await attendanceService.getMyAttendance({
          companyId,
          from: fromMonth,
          to: toMonth,
          page: 1,
          limit: 1000
        });

        // Charger les données de pointage pour l'année
        const yearlyAttendance = await attendanceService.getMyAttendance({
          companyId,
          from: fromYear,
          to: toYear,
          page: 1,
          limit: 10000
        });

        // Calculer les statistiques mensuelles
        // Compter les jours uniques avec présence
        const uniquePresentDays = new Set();
        const uniqueLateDays = new Set();
        const uniqueAbsentDays = new Set();
        
        monthlyAttendance.forEach(record => {
          const recordDate = record.clockInTime || record.clockOutTime || record.time || record.createdAt;
          if (!recordDate) return;
          
          const dateKey = new Date(recordDate).toDateString();
          const status = (record.status || '').toLowerCase();
          
          if (status.includes('retard') || status.includes('late') || record.status === 'Retard') {
            uniqueLateDays.add(dateKey);
            uniquePresentDays.add(dateKey); // Un retard compte aussi comme présent
          } else if (status.includes('absent') || record.status === 'Absent' || record.status === 'Absence') {
            uniqueAbsentDays.add(dateKey);
          } else if (record.clockInTime || record.status === 'Arrivée' || record.status === 'Présent' || record.status === 'present') {
            uniquePresentDays.add(dateKey);
          }
        });

        const presentDays = uniquePresentDays.size;
        const lateDays = uniqueLateDays.size;
        const absentDays = uniqueAbsentDays.size;

        // Calculer la moyenne quotidienne (heures travaillées)
        const totalHours = monthlyAttendance.reduce((total, record) => {
          if (record.clockInTime && record.clockOutTime) {
            try {
              const clockIn = new Date(record.clockInTime);
              const clockOut = new Date(record.clockOutTime);
              const hours = (clockOut - clockIn) / (1000 * 60 * 60);
              return total + (hours > 0 && hours < 24 ? hours : 0); // Valider que les heures sont raisonnables
            } catch (e) {
              return total;
            }
          }
          return total;
        }, 0);
        
        const workingDays = presentDays > 0 ? presentDays : 1;
        const moyenneQuotidienne = totalHours / workingDays;

        setMonthlyStats({
          joursPresents: presentDays,
          retards: lateDays,
          absences: absentDays,
          moyenneQuotidienne: Math.round(moyenneQuotidienne * 10) / 10
        });

        // Calculer les statistiques annuelles
        const yearlyUniquePresentDays = new Set();
        const yearlyUniqueLateDays = new Set();
        const yearlyUniqueAbsentDays = new Set();
        
        yearlyAttendance.forEach(record => {
          const recordDate = record.clockInTime || record.clockOutTime || record.time || record.createdAt;
          if (!recordDate) return;
          
          const dateKey = new Date(recordDate).toDateString();
          const status = (record.status || '').toLowerCase();
          
          if (status.includes('retard') || status.includes('late') || record.status === 'Retard') {
            yearlyUniqueLateDays.add(dateKey);
            yearlyUniquePresentDays.add(dateKey);
          } else if (status.includes('absent') || record.status === 'Absent' || record.status === 'Absence') {
            yearlyUniqueAbsentDays.add(dateKey);
          } else if (record.clockInTime || record.status === 'Arrivée' || record.status === 'Présent' || record.status === 'present') {
            yearlyUniquePresentDays.add(dateKey);
          }
        });

        const yearlyPresentDays = yearlyUniquePresentDays.size;

        const yearlyTotalHours = yearlyAttendance.reduce((total, record) => {
          if (record.clockInTime && record.clockOutTime) {
            try {
              const clockIn = new Date(record.clockInTime);
              const clockOut = new Date(record.clockOutTime);
              const hours = (clockOut - clockIn) / (1000 * 60 * 60);
              return total + (hours > 0 && hours < 24 ? hours : 0);
            } catch (e) {
              return total;
            }
          }
          return total;
        }, 0);

        // Heures supplémentaires (au-delà de 8h par jour)
        const overtimeHours = yearlyAttendance.reduce((total, record) => {
          if (record.clockInTime && record.clockOutTime) {
            try {
              const clockIn = new Date(record.clockInTime);
              const clockOut = new Date(record.clockOutTime);
              const hours = (clockOut - clockIn) / (1000 * 60 * 60);
              return total + (hours > 8 && hours < 24 ? hours - 8 : 0);
            } catch (e) {
              return total;
            }
          }
          return total;
        }, 0);

        const yearlyLateIncidents = yearlyUniqueLateDays.size;
        const yearlyAbsentDays = yearlyUniqueAbsentDays.size;

        // Calculer l'évaluation basée sur l'assiduité
        const totalDays = yearlyPresentDays + yearlyAbsentDays;
        const assiduite = totalDays > 0 ? (yearlyPresentDays / totalDays) * 100 : 0;
        let evaluation = 'N/A';
        if (assiduite >= 95) evaluation = 'Excellent';
        else if (assiduite >= 85) evaluation = 'Très bon';
        else if (assiduite >= 75) evaluation = 'Bon';
        else if (assiduite >= 60) evaluation = 'Moyen';
        else if (assiduite > 0) evaluation = 'À améliorer';

        setYearlyStats({
          heuresTravaillées: Math.round(yearlyTotalHours),
          heuresSupplementaires: Math.round(overtimeHours),
          joursCongé: 0, // À calculer depuis d'autres sources si disponibles
          joursMaladie: yearlyAbsentDays,
          incidentsRetard: yearlyLateIncidents,
          evaluation
        });

        // Mettre à jour l'historique des pointages (les 5 plus récents)
        const sortedHistory = [...monthlyAttendance]
          .sort((a, b) => {
            const dateA = new Date(a.clockInTime || a.clockOutTime || a.time || a.createdAt || 0);
            const dateB = new Date(b.clockInTime || b.clockOutTime || b.time || b.createdAt || 0);
            return dateB - dateA;
          })
          .slice(0, 5);
        setAttendanceHistory(sortedHistory);

      } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
        // En cas d'erreur, garder les valeurs à zéro (déjà initialisées)
      } finally {
        setLoadingStats(false);
      }
    };

    loadStatistics();
  }, []);

  // Générer les initiales
  const generateInitials = (name) => {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Générer un ID unique
  const generateId = () => {
    return `emp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  };

  // Formater le nom complet pour l'API de reconnaissance faciale (Prenom_Nom)
  const formatEmployeeNameForAPI = (fullName) => {
    if (!fullName || typeof fullName !== 'string') {
      return '';
    }
    
    // Nettoyer et normaliser le nom
    // Remplacer les espaces multiples par un seul espace
    // Garder les lettres (y compris les accents), chiffres, espaces et tirets
    const cleaned = fullName.trim()
      .replace(/\s+/g, ' ') // Remplacer les espaces multiples par un seul
      .replace(/[^\p{L}\p{N}\s-]/gu, '') // Supprimer les caractères spéciaux sauf lettres (avec accents), chiffres, espaces et tirets
      .trim();
    
    // Séparer en mots
    const parts = cleaned.split(' ').filter(part => part.length > 0);
    
    if (parts.length === 0) {
      return '';
    }
    
    // Si un seul mot, le retourner tel quel
    if (parts.length === 1) {
      return parts[0];
    }
    
    // Prendre le premier mot comme prénom et le reste comme nom
    const firstName = parts[0];
    const lastName = parts.slice(1).join('_'); // Joindre les parties du nom avec des underscores
    
    // Retourner au format Prenom_Nom
    return `${firstName}_${lastName}`;
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
        
        // Afficher un message différent selon le type de stockage
        if (uploadResult.data.isLocal) {
          setUploadError('Photo stockée localement (serveur non disponible)');
        } else {
          setUploadError(null); // Pas d'erreur, upload réussi
          console.log('Photo uploadée avec succès sur le serveur:', uploadResult.data);
        }
      } else {
        throw new Error(uploadResult.message || 'Erreur lors de l\'upload');
      }
      
    } catch (error) {
      console.error('Erreur upload photo:', error);
      
      // Message d'erreur plus spécifique
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        setUploadError('Non autorisé - Photo stockée localement');
      } else if (error.message.includes('ECONNREFUSED')) {
        setUploadError('Serveur non disponible - Photo stockée localement');
      } else {
        setUploadError('Erreur upload - Photo stockée localement');
      }
      
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
    const fileInput = document.querySelector('#photo-upload-modal');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Ajouter un employé
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    
    if (!formData.nomComplet || !formData.email) {
      alert('Veuillez remplir au moins le nom et l\'email');
      return;
    }

    // Générer l'ID de l'employé avant de l'utiliser pour l'API
    const employeeId = generateId();
    const employeeName = formData.nomComplet.trim();
    // Formater le nom pour l'API (Prenom_Nom)
    const formattedNameForAPI = formatEmployeeNameForAPI(employeeName);

    const newEmployee = {
      id: employeeId,
      initials: generateInitials(formData.nomComplet),
      name: formData.nomComplet.trim(),
      email: formData.email.trim(),
      phone: formData.telephone.trim() || '',
      department: formData.departement || 'Non spécifié',
      position: formData.poste || 'Non spécifié',
      location: formData.lieuDeTravail || 'Non spécifié',
      status: formData.isActive ? 'Actif' : 'Inactif',
      attendance: '0%',
      statusColor: formData.isActive ? '#01A04E' : '#5A6565',
      statusBg: formData.isActive ? 'rgba(1, 160, 78, 0.1)' : 'rgba(90, 101, 101, 0.1)',
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

    // Essayer de créer l'employé dans l'API
    try {
      const { user } = authService.getStoredAuth();
      console.log('👤 User from auth:', user);

      let createdInDb = false;
      
      if (!user) {
        console.error('❌ Aucun utilisateur connecté trouvé');
      } else {
        // Récupérer l'ID de l'entreprise depuis plusieurs sources
        let companyId = user?.companyId || user?.company?._id || user?.company?.id || user?.company;
        console.log('🏢 CompanyId depuis user:', companyId);
        
        // Si pas de companyId dans user, essayer de le récupérer via l'API
        if (!companyId) {
          try {
            const companyData = await companiesService.getMyCompanyId();
            companyId = companyData?.companyId || companyData?._id || companyData?.id;
            console.log('🏢 CompanyId depuis API:', companyId);
          } catch (err) {
            console.error('❌ Erreur lors de la récupération du companyId:', err);
          }
        }
        
        if (!companyId) {
          console.error('❌ Aucun companyId trouvé - l\'employé ne sera pas créé dans MongoDB');
          alert("Impossible de créer l'employé: aucune entreprise associée.");
          return;
        } else {
          // Créer l'utilisateur dans l'API
          const userData = {
            firstName: formData.nomComplet.split(' ')[0] || formData.nomComplet,
            lastName: formData.nomComplet.split(' ').slice(1).join(' ') || '',
            email: formData.email.trim(),
            password: 'TempPassword123!',
            companyId: companyId.toString()
          };

          if (formData.workingScheduleId) {
            userData.workingScheduleId = formData.workingScheduleId;
          }
          
          try {
            console.log('🔵 Appel API pour créer l\'employé:', userData);
            const createdUser = await usersService.createEmployee(userData);
            console.log('📥 Réponse de l\'API:', createdUser);
            
            // Utiliser l'ID de l'API si disponible
            if (createdUser._id || createdUser.id) {
              const mongoId = (createdUser._id || createdUser.id).toString();
              newEmployee.id = mongoId;
              newEmployee._id = mongoId;
              console.log('✅ Employé créé dans l\'API avec ID MongoDB:', mongoId);
              createdInDb = true;
            } else {
              console.error('❌ L\'API n\'a pas retourné d\'ID MongoDB!');
              console.error('📋 Réponse complète:', JSON.stringify(createdUser, null, 2));
            }
          } catch (apiError) {
            console.error('❌ Erreur lors de la création dans l\'API:', apiError);
            console.error('📋 Détails de l\'erreur:', apiError.response?.data || apiError.message);
            
            // Si l'erreur est 409 (Conflict), l'utilisateur existe déjà
            // Essayer de le récupérer via l'API
            if (apiError.response?.status === 409) {
              console.log('⚠️ Utilisateur existe déjà, tentative de récupération...');
              try {
                // Chercher l'utilisateur par email dans la liste des employés de l'entreprise
                const companyUsers = await companiesService.getCompanyEmployees();
                console.log('📋 Employés de l\'entreprise:', companyUsers);
                const existingUser = companyUsers.find(u => u.email === userData.email);
                
                if (existingUser && (existingUser._id || existingUser.id)) {
                  const mongoId = (existingUser._id || existingUser.id).toString();
                  newEmployee.id = mongoId;
                  newEmployee._id = mongoId;
                  console.log('✅ Utilisateur existant récupéré avec ID MongoDB:', mongoId);
                  createdInDb = true;
                } else {
                  console.error('❌ Impossible de récupérer l\'ID de l\'utilisateur existant');
                  console.error('📋 Utilisateur recherché:', userData.email);
                }
              } catch (fetchError) {
                console.error('❌ Erreur lors de la récupération de l\'utilisateur existant:', fetchError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'employé:', error);
    }

    const mongoIdCandidate = (newEmployee._id || newEmployee.id) ? String(newEmployee._id || newEmployee.id) : '';
    const hasMongoId = /^[0-9a-fA-F]{24}$/.test(mongoIdCandidate);
    if (!hasMongoId) {
      alert("Création échouée: l'employé n'a pas été créé dans la base de données.");
      return;
    }

    // Enregistrer la photo dans l'API Naratech si disponible
    if (profileImage || profileImagePreview) {
      try {
        const imageSource = profileImage || profileImagePreview;
        const faceEmployeeId = mongoIdCandidate;
        await faceRecognitionService.registerEmployeeFace(faceEmployeeId, employeeName, imageSource);
        console.log(`✅ Photo de ${employeeName} (employee_id: ${faceEmployeeId}) enregistrée dans l'API Naratech`);
      } catch (error) {
        console.error('⚠️ Erreur lors de l\'enregistrement de la photo dans l\'API Naratech:', error);
      }
    }

    // Ajouter à la liste locale
    setEmployees(prev => {
      const updatedEmployees = [...prev, newEmployee];
      console.log('📊 Total employés après ajout:', updatedEmployees.length);
      syncLocalStorage(updatedEmployees);
      return updatedEmployees;
    });
    
    // Réinitialiser le formulaire
    setFormData({
      nomComplet: '',
      email: '',
      telephone: '',
      departement: '',
      poste: '',
      lieuDeTravail: '',
      isActive: true
    });

    // Réinitialiser les données de photo
    setProfileImage(null);
    setProfileImagePreview(null);
    setUploadedPhotoData(null);
    setUploadError(null);
    setIsUploadingPhoto(false);
    
    console.log('🔒 Fermeture du modal d\'ajout');
    setIsAddModalOpen(false);
    alert('Employé ajouté avec succès !');
  };

  // Voir les détails d'un employé
  const handleViewDetails = (employee) => {
    setSelectedEmployee(employee);
    setIsViewModalOpen(true);
  };

  // Modifier un employé
  const handleEditEmployee = (employee) => {
    setSelectedEmployee(employee);
    setFormData({
      nomComplet: employee.name || '',
      email: employee.email || '',
      telephone: employee.phone || '',
      departement: employee.department || '',
      poste: employee.position || '',
      lieuDeTravail: employee.location || '',
      isActive: employee.status === 'Actif'
    });
    
    // Initialiser les états de la photo avec les données existantes
    if (employee.photo) {
      setProfileImagePreview(employee.photo.url);
      setUploadedPhotoData(employee.photo);
    } else {
      setProfileImagePreview(null);
      setUploadedPhotoData(null);
    }
    setProfileImage(null);
    setUploadError(null);
    setIsUploadingPhoto(false);
    
    setIsEditModalOpen(true);
  };

  // Basculer le statut actif/inactif d'un employé
  const handleToggleEmployeeStatus = async (employee) => {
    const isCurrentlyActive = employee.status === 'Actif';
    const action = isCurrentlyActive ? 'désactiver' : 'réactiver';
    
    if (confirm(`Êtes-vous sûr de vouloir ${action} cet employé ?`)) {
      // Mettre à jour dans l'API si l'employé a un ID MongoDB valide
      const employeeId = employee.id;
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(employeeId);
      
      if (isMongoId) {
        try {
          await usersService.update(employeeId, { isActive: !isCurrentlyActive });
          console.log('✅ Statut de l\'employé mis à jour dans l\'API:', employeeId);
        } catch (apiError) {
          console.error('⚠️ Erreur lors de la mise à jour du statut dans l\'API:', apiError);
          // Continuer quand même la mise à jour locale
        }
      }

      setEmployees(prev => {
        const updated = prev.map(emp => 
          emp.id === employee.id 
            ? { 
                ...emp, 
                status: isCurrentlyActive ? 'Inactif' : 'Actif',
                statusColor: isCurrentlyActive ? '#5A6565' : '#01A04E',
                statusBg: isCurrentlyActive ? 'rgba(90, 101, 101, 0.1)' : 'rgba(1, 160, 78, 0.1)',
                isActive: !isCurrentlyActive
              }
            : emp
        );
        syncLocalStorage(updated);
        return updated;
      });
      alert(`Employé ${isCurrentlyActive ? 'désactivé' : 'réactivé'} avec succès !`);
    }
  };

  // Ouvrir la modale de confirmation de suppression
  const handleOpenDeleteModal = (employee) => {
    setEmployeeToDelete(employee);
    setIsDeleteModalOpen(true);
  };

  // Confirmer la suppression d'un employé
  const handleConfirmDelete = async () => {
    if (!employeeToDelete) return;

    try {
      // Supprimer dans l'API si l'employé a un ID MongoDB valide
      const employeeId = employeeToDelete.id;
      const isMongoId = /^[0-9a-fA-F]{24}$/.test(employeeId);
      
      if (isMongoId) {
        try {
          await usersService.delete(employeeId);
          console.log('✅ Employé supprimé de l\'API:', employeeId);
        } catch (apiError) {
          console.error('⚠️ Erreur lors de la suppression dans l\'API:', apiError);
          alert("Suppression échouée côté serveur. L'employé n'a pas été supprimé en base.");
          return;
        }
      } else {
        alert("Suppression impossible: ID employé invalide (MongoDB ObjectId manquant)." );
        return;
      }

      // Supprimer du state et localStorage
      setEmployees(prev => {
        const updated = prev.filter(emp => emp.id !== employeeToDelete.id);
        syncLocalStorage(updated);
        return updated;
      });
      
      setIsDeleteModalOpen(false);
      setEmployeeToDelete(null);
      alert('Employé supprimé avec succès !');
    } catch (error) {
      console.error('❌ Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'employé');
    }
  };

  // Annuler la suppression
  const handleCancelDelete = () => {
    setIsDeleteModalOpen(false);
    setEmployeeToDelete(null);
  };

  // Sauvegarder les modifications
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    
    if (!formData.nomComplet || !formData.email) {
      alert('Veuillez remplir au moins le nom et l\'email');
      return;
    }

    // Enregistrer la nouvelle photo dans l'API Naratech si une nouvelle photo a été uploadée
    if (profileImage || (profileImagePreview && profileImage)) {
      try {
        const imageSource = profileImage || profileImagePreview;
        const employeeName = formData.nomComplet.trim();
        const mongoIdCandidate = selectedEmployee?.id ? String(selectedEmployee.id) : '';
        const isMongoId = /^[0-9a-fA-F]{24}$/.test(mongoIdCandidate);
        if (!isMongoId) {
          setUploadError(
            "Impossible d'enregistrer le visage: l'employé n'a pas d'ID MongoDB valide. Veuillez d'abord recréer l'employé dans la base (API) puis réessayer."
          );
          throw new Error('Invalid employee MongoDB ID for face registration');
        }

        const faceEmployeeId = mongoIdCandidate;
        await faceRecognitionService.registerEmployeeFace(faceEmployeeId, employeeName, imageSource);
        console.log(`✅ Photo de ${employeeName} (employee_id: ${faceEmployeeId}) mise à jour dans l'API Naratech`);
      } catch (error) {
        console.error('⚠️ Erreur lors de la mise à jour de la photo dans l\'API Naratech:', error);
        // Continuer quand même la modification de l'employé même si l'enregistrement de la photo échoue
      }
    }

    // Mettre à jour dans l'API si l'employé a un ID MongoDB valide
    const employeeId = selectedEmployee.id;
    const isMongoId = /^[0-9a-fA-F]{24}$/.test(employeeId);
    
    if (isMongoId) {
      try {
        const updateData = {
          firstName: formData.nomComplet.split(' ')[0] || formData.nomComplet,
          lastName: formData.nomComplet.split(' ').slice(1).join(' ') || '',
          email: formData.email.trim(),
          phone: formData.telephone.trim() || undefined,
          department: formData.departement || undefined,
          position: formData.poste || undefined,
          location: formData.lieuDeTravail || undefined,
        };
        
        await usersService.update(employeeId, updateData);
        console.log('✅ Employé mis à jour dans l\'API:', employeeId);
      } catch (apiError) {
        console.error('⚠️ Erreur lors de la mise à jour dans l\'API:', apiError);
        // Continuer quand même la mise à jour locale
      }
    }

    setEmployees(prev => {
      const updated = prev.map(emp => 
        emp.id === selectedEmployee.id 
          ? {
              ...emp,
              initials: generateInitials(formData.nomComplet),
              name: formData.nomComplet.trim(),
              email: formData.email.trim(),
              phone: formData.telephone.trim() || '',
              department: formData.departement || 'Non spécifié',
              position: formData.poste || 'Non spécifié',
              location: formData.lieuDeTravail || 'Non spécifié',
              status: formData.isActive ? 'Actif' : 'Inactif',
              statusColor: formData.isActive ? '#01A04E' : '#5A6565',
              statusBg: formData.isActive ? 'rgba(1, 160, 78, 0.1)' : 'rgba(90, 101, 101, 0.1)',
              // Mettre à jour la photo si une nouvelle a été uploadée
              photo: uploadedPhotoData ? {
                id: uploadedPhotoData.id,
                url: uploadedPhotoData.url,
                filename: uploadedPhotoData.filename
              } : (profileImagePreview && profileImage ? {
                id: `local_${Date.now()}`,
                url: profileImagePreview,
                filename: profileImage?.name || 'photo.jpg',
                isLocal: true
              } : emp.photo) // Garder l'ancienne photo si aucune nouvelle
            }
          : emp
      );
      syncLocalStorage(updated);
      return updated;
    });

    // Réinitialiser les états de la photo
    setProfileImage(null);
    setProfileImagePreview(null);
    setUploadedPhotoData(null);
    setUploadError(null);
    setIsUploadingPhoto(false);
    
    setIsEditModalOpen(false);
    setSelectedEmployee(null);
    setFormData({
      nomComplet: '',
      email: '',
      telephone: '',
      departement: '',
      poste: '',
      lieuDeTravail: '',
      isActive: true
    });
    
    console.log('✏️ Employé modifié avec succès');
    alert('Employé modifié avec succès !');
  };

  // Icône Plus
  const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4.16667V15.8333M4.16667 10H15.8333" stroke="white" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône caméra pour l'upload de photo
  const CameraIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Header */}
      <div className="bg-white border-b border-[#D4DCDC] px-5 py-2.5">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-5">
            <NotificationIcon />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr]" style={{ minHeight: 'calc(100vh - 70px)' }}>
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <main className="p-5 md:p-8 space-y-5">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="space-y-2.5">
              <h2 className="font-audiowide text-[26px] text-[#002222]">Employés</h2>
              <p className="font-instrument text-base text-[#5A6565]">
                Gérez vos employés et suivez leurs présences
              </p>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2.5 px-6 py-2.5 bg-[#0389A6] rounded-2xl font-instrument text-base text-white hover:bg-[#027A8F] transition-colors"
            >
              <PlusIcon />
              Ajouter un employé
            </button>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="bg-white rounded-2xl p-5 border border-[#D4DCDC]">
              <div className="space-y-2">
                <p className="font-instrument text-sm text-[#5A6565]">Total employés</p>
                <p className="font-audiowide text-2xl text-[#002222]">{employees.length}</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#D4DCDC]">
              <div className="space-y-2">
                <p className="font-instrument text-sm text-[#5A6565]">Actifs</p>
                <p className="font-audiowide text-2xl text-[#01A04E]">
                  {employees.filter(emp => emp.status === 'Actif').length}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#D4DCDC]">
              <div className="space-y-2">
                <p className="font-instrument text-sm text-[#5A6565]">Inactifs</p>
                <p className="font-audiowide text-2xl text-[#D84343]">
                  {employees.filter(emp => emp.status === 'Inactif').length}
                </p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-5 border border-[#D4DCDC]">
              <div className="space-y-2">
                <p className="font-instrument text-sm text-[#5A6565]">Départements</p>
                <p className="font-audiowide text-2xl text-[#0389A6]">
                  {new Set(employees.map(emp => emp.department)).size}
                </p>
              </div>
            </div>
          </div>

          {/* Grille des employés */}
          <div className="bg-white rounded-2xl border border-[#D4DCDC] overflow-hidden">
            {/* Header de la grille */}
            <div className="bg-[#F8F9FA] border-b border-[#D4DCDC] px-5 py-4">
              <div className="flex items-center">
                <div className="w-[280px] font-instrument text-sm font-semibold text-[#002222]">Employé</div>
                <div className="w-[140px] font-instrument text-sm font-semibold text-[#002222]">Téléphone</div>
                <div className="w-[167px] font-instrument text-sm font-semibold text-[#002222]">Département</div>
                <div className="w-[215px] font-instrument text-sm font-semibold text-[#002222]">Poste</div>
                <div className="w-[101px] font-instrument text-sm font-semibold text-[#002222]">Lieu</div>
                <div className="w-[106px] font-instrument text-sm font-semibold text-[#002222]">Statut</div>
                <div className="w-[119px] font-instrument text-sm font-semibold text-[#002222]">Assiduité</div>
                <div className="w-[200px] font-instrument text-sm font-semibold text-[#002222] text-center">Actions</div>
              </div>
            </div>

            {/* Corps de la grille */}
            <div className="divide-y divide-[#D4DCDC]">
              {employees.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <p className="font-instrument text-base text-[#5A6565]">
                    Aucun employé trouvé. Utilisez le bouton "Ajouter un employé" pour en créer un.
                  </p>
                </div>
              ) : (
                employees.map((employee) => (
                  <div key={employee.id} className="flex items-center px-5 py-4 hover:bg-[#F8F9FA] transition-colors">
                    {/* Employé */}
                    <div className="w-[280px] flex items-center gap-4">
                      <div className="w-9 h-9 rounded-xl bg-[#0389A6]/10 border border-[#0389A6] flex items-center justify-center font-instrument text-[#0389A6] font-bold text-base">
                        {employee.initials}
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-instrument text-sm font-semibold text-[#002222]">{employee.name}</div>
                        <div className="font-instrument text-xs text-[#5A6565]">{employee.email}</div>
                      </div>
                    </div>
                    
                    {/* Téléphone */}
                    <div className="w-[140px] font-instrument text-sm text-[#002222]">
                      {employee.phone ? (
                        <span className="flex items-center gap-1">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#5A6565]">
                            <path d="M3 5C3 3.89543 3.89543 3 5 3H8.27924C8.70967 3 9.09181 3.27543 9.22792 3.68377L10.7257 8.17721C10.8831 8.64932 10.6694 9.16531 10.2243 9.38787L7.96701 10.5165C9.06925 12.9612 11.0388 14.9308 13.4835 16.033L14.6121 13.7757C14.8347 13.3306 15.3507 13.1169 15.8228 13.2743L20.3162 14.7721C20.7246 14.9082 21 15.2903 21 15.7208V19C21 20.1046 20.1046 21 19 21H18C9.71573 21 3 14.2843 3 6V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>{employee.phone}</span>
                        </span>
                      ) : (
                        <span className="text-[#5A6565] italic">Non renseigné</span>
                      )}
                    </div>
                    
                    {/* Département */}
                    <div className="w-[167px] font-instrument text-sm text-[#002222]">{employee.department}</div>
                    
                    {/* Poste */}
                    <div className="w-[215px] font-instrument text-sm text-[#002222]">{employee.position}</div>
                    
                    {/* Lieu */}
                    <div className="w-[101px] font-instrument text-sm text-[#002222]">{employee.location}</div>
                    
                    {/* Statut */}
                    <div className="w-[106px]">
                      <div 
                        className="inline-flex items-center px-2.5 py-0.5 rounded-md"
                        style={{ 
                          backgroundColor: employee.statusBg,
                          color: employee.statusColor
                        }}
                      >
                        <span className="font-instrument text-xs font-medium">{employee.status}</span>
                      </div>
                    </div>
                    
                    {/* Assiduité */}
                    <div 
                      className="w-[119px] font-instrument text-sm font-semibold"
                      style={{ color: employee.statusColor }}
                    >
                      {employee.attendance}
                    </div>
                    
                    {/* Actions */}
                    <div className="w-[200px] flex items-center justify-center gap-2">
                      {/* Voir détails */}
                      <button
                        onClick={() => handleViewDetails(employee)}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded-[10px] hover:bg-[#ECEFEF] transition-colors"
                        title="Voir détails"
                      >
                        <img src={viewIcon} alt="Voir détails" className="w-[18px] h-[18px]" />
                      </button>
                      
                      {/* Modifier */}
                      <button
                        onClick={() => handleEditEmployee(employee)}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded-[10px] hover:bg-[#ECEFEF] transition-colors"
                        title="Modifier"
                      >
                        <img src={fileEditIcon} alt="Modifier" className="w-[18px] h-[18px]" />
                      </button>
                      
                      {/* Désactiver/Réactiver */}
                      <button
                        onClick={() => handleToggleEmployeeStatus(employee)}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded-[10px] hover:bg-[#ECEFEF] transition-colors"
                        title={employee.status === 'Actif' ? 'Désactiver' : 'Réactiver'}
                      >
                        <img src={cancelCircleIcon} alt={employee.status === 'Actif' ? 'Désactiver' : 'Réactiver'} className="w-[18px] h-[18px]" />
                      </button>
                      
                      {/* Supprimer */}
                      <button
                        onClick={() => handleOpenDeleteModal(employee)}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded-[10px] hover:bg-[#ECEFEF] transition-colors"
                        title="Supprimer"
                      >
                        <img src={deleteIcon} alt="Supprimer" className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section Historique/Statistiques/Calendrier */}
          <div className="bg-white rounded-2xl border border-[#D4DCDC] overflow-hidden">
            {/* Onglets */}
            <div className="flex border-b border-[#D4DCDC]">
              <button
                onClick={() => setActiveTab('historique')}
                className={`flex-1 px-6 py-4 font-instrument text-base font-medium transition-colors ${
                  activeTab === 'historique'
                    ? 'bg-[#D1FAE5] text-[#002222] border-b-2 border-[#01A04E]'
                    : 'text-[#5A6565] hover:bg-[#F8F9FA]'
                }`}
              >
                Historique de présence
              </button>
              <button
                onClick={() => setActiveTab('statistiques')}
                className={`flex-1 px-6 py-4 font-instrument text-base font-medium transition-colors ${
                  activeTab === 'statistiques'
                    ? 'bg-[#D1FAE5] text-[#002222] border-b-2 border-[#01A04E]'
                    : 'text-[#5A6565] hover:bg-[#F8F9FA]'
                }`}
              >
                Statistiques
              </button>
              <button
                onClick={() => setActiveTab('calendrier')}
                className={`flex-1 px-6 py-4 font-instrument text-base font-medium transition-colors ${
                  activeTab === 'calendrier'
                    ? 'bg-[#D1FAE5] text-[#002222] border-b-2 border-[#01A04E]'
                    : 'text-[#5A6565] hover:bg-[#F8F9FA]'
                }`}
              >
                Vue calendrier
              </button>
            </div>

            {/* Contenu des onglets */}
            <div className="p-6">
              {/* Onglet Historique de présence */}
              {activeTab === 'historique' && (
                <div className="space-y-5">
                  {/* Header */}
                  <div className="flex items-center gap-3 pb-4 border-b border-[#D4DCDC]">
                    <div className="w-10 h-10 rounded-xl bg-[#0389A6]/10 border border-[#0389A6] flex items-center justify-center">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M10 9.16667C11.3807 9.16667 12.5 8.04738 12.5 6.66667C12.5 5.28595 11.3807 4.16667 10 4.16667C8.61929 4.16667 7.5 5.28595 7.5 6.66667C7.5 8.04738 8.61929 9.16667 10 9.16667Z" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16.6667 15.8333C16.6667 13.9924 13.6819 12.5 10 12.5C6.3181 12.5 3.33334 13.9924 3.33334 15.8333" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-instrument text-lg font-bold text-[#002222]">Historique des pointages</h3>
                      <p className="font-instrument text-sm text-[#5A6565]">Vos pointages des derniers jours</p>
                    </div>
                  </div>

                  {/* Liste des pointages */}
                  <div className="space-y-3">
                    {loadingStats ? (
                      <div className="text-center py-8">
                        <p className="font-instrument text-base text-[#5A6565]">Chargement des pointages...</p>
                      </div>
                    ) : attendanceHistory.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="font-instrument text-base text-[#5A6565]">Aucun pointage enregistré pour le moment.</p>
                      </div>
                    ) : (
                      attendanceHistory.map((record, index) => {
                        const recordDate = new Date(record.clockInTime || record.clockOutTime || record.time || record.createdAt || Date.now());
                        const dateStr = recordDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
                        
                        const clockIn = record.clockInTime ? new Date(record.clockInTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
                        const clockOut = record.clockOutTime ? new Date(record.clockOutTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-';
                        
                        let hours = '0h';
                        if (record.clockInTime && record.clockOutTime) {
                          const clockInDate = new Date(record.clockInTime);
                          const clockOutDate = new Date(record.clockOutTime);
                          const diffHours = (clockOutDate - clockInDate) / (1000 * 60 * 60);
                          hours = diffHours > 0 ? `${Math.round(diffHours * 10) / 10}h` : '0h';
                        }

                        const status = record.status || 'Présent';
                        const isPresent = status === 'Arrivée' || status === 'Présent' || status === 'present';
                        const isLate = status?.toLowerCase().includes('retard') || status === 'Retard';
                        const isAbsent = status === 'Absent' || status?.toLowerCase().includes('absent');
                        const isPartial = status === 'Partiel';

                        let bgColor = '#D1FAE5';
                        let textColor = '#01A04E';
                        let icon = (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M16.6667 5L7.50001 14.1667L3.33334 10" stroke="#01A04E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        );
                        let statusText = 'Présent';

                        if (isAbsent) {
                          bgColor = '#FEE2E2';
                          textColor = '#DC2626';
                          icon = (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15 5L5 15M5 5L15 15" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          );
                          statusText = 'Absent';
                        } else if (isLate) {
                          bgColor = '#FEF3C7';
                          textColor = '#F59E0B';
                          icon = (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 6.66667V10L12.5 12.5M17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5C14.1421 2.5 17.5 5.85786 17.5 10Z" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          );
                          statusText = 'Retard';
                        } else if (isPartial) {
                          bgColor = '#DBEAFE';
                          textColor = '#3B82F6';
                          icon = (
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M10 6.66667V10L12.5 12.5M17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5C14.1421 2.5 17.5 5.85786 17.5 10Z" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          );
                          statusText = 'Partiel';
                        }

                        return (
                          <div key={index} className="flex items-start gap-4 p-4 bg-white border border-[#D4DCDC] rounded-xl hover:shadow-sm transition-shadow">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: bgColor }}>
                              {icon}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-instrument text-base font-bold text-[#002222]">{dateStr}</h4>
                              </div>
                              <div className="space-y-1 mb-2">
                                <p className="font-instrument text-sm text-[#5A6565]">Arrivée: <span className="text-[#002222] font-medium">{clockIn}</span></p>
                                <p className="font-instrument text-sm text-[#5A6565]">Départ: <span className="text-[#002222] font-medium">{clockOut}</span></p>
                                <p className="font-instrument text-sm text-[#5A6565]">Heures: <span className="text-[#002222] font-medium">{hours}</span></p>
                              </div>
                              {record.notes && (
                                <p className="font-instrument text-sm text-[#5A6565] mb-2">{record.notes}</p>
                              )}
                              <div className="inline-flex items-center px-2.5 py-1 rounded-md" style={{ backgroundColor: bgColor }}>
                                <span className="font-instrument text-xs font-medium" style={{ color: textColor }}>{statusText}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Onglet Statistiques */}
              {activeTab === 'statistiques' && (
                <div className="space-y-6">
                  {/* Section Statistiques mensuelles */}
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-[#D4DCDC]">
                      <div className="w-10 h-10 rounded-xl bg-[#0389A6]/10 border border-[#0389A6] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.5 15.8333L10 2.5L17.5 15.8333H2.5Z" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10 12.5V15.8333" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-instrument text-lg font-bold text-[#002222]">Statistiques mensuelles</h3>
                      </div>
                    </div>

                    {/* Cartes de statistiques mensuelles */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {/* Jours présents */}
                      <div className="bg-white border border-[#D4DCDC] rounded-xl p-5">
                        <div className="space-y-2">
                          <p className="font-instrument text-sm text-[#5A6565]">Jours présents</p>
                          <p className="font-audiowide text-2xl text-[#01A04E]">
                            {loadingStats ? '...' : monthlyStats.joursPresents}
                          </p>
                        </div>
                      </div>

                      {/* Retards */}
                      <div className="bg-white border border-[#D4DCDC] rounded-xl p-5">
                        <div className="space-y-2">
                          <p className="font-instrument text-sm text-[#5A6565]">Retards</p>
                          <p className="font-audiowide text-2xl text-[#F59E0B]">
                            {loadingStats ? '...' : monthlyStats.retards}
                          </p>
                        </div>
                      </div>

                      {/* Absences */}
                      <div className="bg-white border border-[#D4DCDC] rounded-xl p-5">
                        <div className="space-y-2">
                          <p className="font-instrument text-sm text-[#5A6565]">Absences</p>
                          <p className="font-audiowide text-2xl text-[#DC2626]">
                            {loadingStats ? '...' : monthlyStats.absences}
                          </p>
                        </div>
                      </div>

                      {/* Moy. quotidienne */}
                      <div className="bg-white border border-[#D4DCDC] rounded-xl p-5">
                        <div className="space-y-2">
                          <p className="font-instrument text-sm text-[#5A6565]">Moy. quotidienne</p>
                          <p className="font-audiowide text-2xl text-[#0389A6]">
                            {loadingStats ? '...' : `${monthlyStats.moyenneQuotidienne}h`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section Vue d'ensemble annuelle */}
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center gap-3 pb-4 border-b border-[#D4DCDC]">
                      <div className="w-10 h-10 rounded-xl bg-[#0389A6]/10 border border-[#0389A6] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.5 15.8333H17.5M5 15.8333V8.33333M10 15.8333V5.83333M15 15.8333V11.6667" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-instrument text-lg font-bold text-[#002222]">Vue d'ensemble annuelle</h3>
                      </div>
                    </div>

                    {/* Liste des métriques annuelles */}
                    <div className="bg-white border border-[#D4DCDC] rounded-xl p-6 space-y-4">
                      {/* Heures travaillées */}
                      <div className="flex items-center justify-between py-3 border-b border-[#D4DCDC]">
                        <span className="font-instrument text-base text-[#002222]">Heures travaillées</span>
                        <span className="font-instrument text-base font-semibold text-[#002222]">
                          {loadingStats ? '...' : `${yearlyStats.heuresTravaillées}h`}
                        </span>
                      </div>

                      {/* Heures supplémentaires */}
                      <div className="flex items-center justify-between py-3 border-b border-[#D4DCDC]">
                        <span className="font-instrument text-base text-[#002222]">Heures supplémentaires</span>
                        <span className="font-instrument text-base font-semibold text-[#3B82F6]">
                          {loadingStats ? '...' : `${yearlyStats.heuresSupplementaires}h`}
                        </span>
                      </div>

                      {/* Jours de congé */}
                      <div className="flex items-center justify-between py-3 border-b border-[#D4DCDC]">
                        <span className="font-instrument text-base text-[#002222]">Jours de congé</span>
                        <span className="font-instrument text-base font-semibold text-[#01A04E]">
                          {loadingStats ? '...' : yearlyStats.joursCongé}
                        </span>
                      </div>

                      {/* Jours de maladie */}
                      <div className="flex items-center justify-between py-3 border-b border-[#D4DCDC]">
                        <span className="font-instrument text-base text-[#002222]">Jours de maladie</span>
                        <span className="font-instrument text-base font-semibold text-[#DC2626]">
                          {loadingStats ? '...' : yearlyStats.joursMaladie}
                        </span>
                      </div>

                      {/* Incidents de retard */}
                      <div className="flex items-center justify-between py-3 border-b border-[#D4DCDC]">
                        <span className="font-instrument text-base text-[#002222]">Incidents de retard</span>
                        <span className="font-instrument text-base font-semibold text-[#F59E0B]">
                          {loadingStats ? '...' : yearlyStats.incidentsRetard}
                        </span>
                      </div>

                      {/* Évaluation */}
                      <div className="flex items-center justify-between py-3">
                        <span className="font-instrument text-base text-[#002222]">Évaluation</span>
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-full ${
                          yearlyStats.evaluation === 'Excellent' ? 'bg-[#D1FAE5]' :
                          yearlyStats.evaluation === 'Très bon' || yearlyStats.evaluation === 'Bon' ? 'bg-[#DBEAFE]' :
                          yearlyStats.evaluation === 'Moyen' ? 'bg-[#FEF3C7]' :
                          yearlyStats.evaluation === 'À améliorer' ? 'bg-[#FEE2E2]' :
                          'bg-[#ECEFEF]'
                        }`}>
                          <span className={`font-instrument text-sm font-medium ${
                            yearlyStats.evaluation === 'Excellent' ? 'text-[#01A04E]' :
                            yearlyStats.evaluation === 'Très bon' || yearlyStats.evaluation === 'Bon' ? 'text-[#3B82F6]' :
                            yearlyStats.evaluation === 'Moyen' ? 'text-[#F59E0B]' :
                            yearlyStats.evaluation === 'À améliorer' ? 'text-[#DC2626]' :
                            'text-[#5A6565]'
                          }`}>
                            {loadingStats ? '...' : yearlyStats.evaluation}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Onglet Vue calendrier */}
              {activeTab === 'calendrier' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Calendrier */}
                  <div className="bg-white border border-[#D4DCDC] rounded-xl p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#D4DCDC]">
                      <div className="w-10 h-10 rounded-xl bg-[#0389A6]/10 border border-[#0389A6] flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M2.5 6.66667H17.5M5 2.5V4.16667M15 2.5V4.16667M4.16667 3.33333H15.8333C16.7538 3.33333 17.5 4.07989 17.5 5V16.6667C17.5 17.5866 16.7538 18.3333 15.8333 18.3333H4.16667C3.24619 18.3333 2.5 17.5866 2.5 16.6667V5C2.5 4.07989 3.24619 3.33333 4.16667 3.33333Z" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <h3 className="font-instrument text-lg font-bold text-[#002222]">Calendrier</h3>
                    </div>

                    {/* Navigation du mois */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => {
                          const newDate = new Date(currentDate);
                          newDate.setMonth(newDate.getMonth() - 1);
                          setCurrentDate(newDate);
                        }}
                        className="p-2 hover:bg-[#ECEFEF] rounded-lg transition-colors"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12.5 15L7.5 10L12.5 5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      <h4 className="font-instrument text-base font-semibold text-[#002222]">
                        {currentDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </h4>
                      <button
                        onClick={() => {
                          const newDate = new Date(currentDate);
                          newDate.setMonth(newDate.getMonth() + 1);
                          setCurrentDate(newDate);
                        }}
                        className="p-2 hover:bg-[#ECEFEF] rounded-lg transition-colors"
                      >
                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M7.5 15L12.5 10L7.5 5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    </div>

                    {/* Jours de la semaine */}
                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((day, index) => (
                        <div key={index} className="text-center font-instrument text-xs font-semibold text-[#5A6565] py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    {/* Grille du calendrier */}
                    <div className="grid grid-cols-7 gap-2">
                      {(() => {
                        const year = currentDate.getFullYear();
                        const month = currentDate.getMonth();
                        const firstDay = new Date(year, month, 1);
                        const lastDay = new Date(year, month + 1, 0);
                        const daysInMonth = lastDay.getDate();
                        const startingDayOfWeek = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // L = 0, M = 1, etc.
                        
                        const days = [];
                        
                        // Jours du mois précédent (optionnel, pour remplir la grille)
                        const prevMonthLastDay = new Date(year, month, 0).getDate();
                        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
                          const day = prevMonthLastDay - i;
                          days.push(
                            <div
                              key={`prev-${day}`}
                              className="text-center font-instrument text-sm text-[#D4DCDC] py-2"
                            >
                              {day}
                            </div>
                          );
                        }
                        
                        // Jours du mois actuel
                        for (let day = 1; day <= daysInMonth; day++) {
                          const date = new Date(year, month, day);
                          const isSelected = selectedDate.getDate() === day && 
                                           selectedDate.getMonth() === month && 
                                           selectedDate.getFullYear() === year;
                          const isToday = new Date().toDateString() === date.toDateString();
                          
                          days.push(
                            <button
                              key={day}
                              onClick={() => setSelectedDate(date)}
                              className={`text-center font-instrument text-sm py-2 rounded-lg transition-colors ${
                                isSelected
                                  ? 'bg-[#0389A6] text-white font-semibold'
                                  : isToday
                                  ? 'bg-[#ECEFEF] text-[#002222] font-semibold'
                                  : 'text-[#002222] hover:bg-[#F8F9FA]'
                              }`}
                            >
                              {day}
                            </button>
                          );
                        }
                        
                        // Jours du mois suivant (pour compléter la grille)
                        const remainingCells = 42 - days.length; // 6 semaines * 7 jours
                        for (let day = 1; day <= remainingCells; day++) {
                          days.push(
                            <div
                              key={`next-${day}`}
                              className="text-center font-instrument text-sm text-[#D4DCDC] py-2"
                            >
                              {day}
                            </div>
                          );
                        }
                        
                        return days;
                      })()}
                    </div>
                  </div>

                  {/* Panneau de détails */}
                  <div className="bg-white border border-[#D4DCDC] rounded-xl p-6">
                    {/* Header */}
                    <div className="mb-6 pb-4 border-b border-[#D4DCDC]">
                      <h3 className="font-instrument text-lg font-bold text-[#002222]">
                        Détails du {selectedDate.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </h3>
                    </div>

                    {/* Contenu */}
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="w-16 h-16 rounded-xl bg-[#ECEFEF] flex items-center justify-center mb-4">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M8 4H24C25.1046 4 26 4.89543 26 6V26C26 27.1046 25.1046 28 24 28H8C6.89543 28 6 27.1046 6 26V6C6 4.89543 6.89543 4 8 4Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M6 10H26M12 6V8M20 6V8" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10 14H14M10 18H18M10 22H16" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <p className="font-instrument text-base text-[#5A6565] text-center">
                        Aucun pointage enregistré pour cette date
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Modal d'ajout d'employé */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[500px] max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#D4DCDC]">
              <h2 className="font-instrument text-lg font-bold text-[#002222]">Ajouter un employé</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 hover:bg-[#ECEFEF] rounded-full transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4" onClick={() => setScheduleMenuOpen(false)}>
              {/* Section Photo de profil */}
              <div className="flex flex-col items-center gap-3 pb-4 border-b border-[#D4DCDC]">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#ECEFEF] border-2 border-[#D4DCDC] flex items-center justify-center font-instrument text-[#22364D] font-medium text-sm overflow-hidden">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      generateInitials(formData.nomComplet)
                    )}
                    
                    {/* Indicateur de chargement */}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Boutons d'action */}
                  <div className="absolute -bottom-1 -right-1 flex gap-1">
                    <label className="w-6 h-6 bg-white border border-[#D4DCDC] rounded-md flex items-center justify-center cursor-pointer hover:bg-[#ECEFEF] transition-colors">
                      <CameraIcon />
                      <input
                        id="photo-upload-modal"
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
                        className="w-6 h-6 bg-red-500 border border-red-600 rounded-md flex items-center justify-center cursor-pointer hover:bg-red-600 transition-colors"
                        disabled={isUploadingPhoto}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Statut et messages */}
                <div className="text-center">
                  {isUploadingPhoto && (
                    <p className="font-instrument text-xs text-blue-600">Upload en cours...</p>
                  )}
                  {uploadedPhotoData && !isUploadingPhoto && (
                    <p className="font-instrument text-xs text-green-600">✓ Photo uploadée</p>
                  )}
                  {uploadError && (
                    <p className={`font-instrument text-xs ${
                      uploadError.includes('stockée localement') 
                        ? 'text-orange-600' 
                        : 'text-red-600'
                    }`}>
                      {uploadError.includes('stockée localement') ? '📱' : '⚠'} {uploadError}
                    </p>
                  )}
                  <p className="font-instrument text-xs text-[#5A6565] mt-1">
                    JPG, PNG, WebP (max 5MB)
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={formData.nomComplet}
                    onChange={(e) => setFormData({...formData, nomComplet: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="Ex: Jean Dupont"
                    required
                  />
                </div>
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="jean.dupont@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="+221 77 123 45 67"
                  />
                </div>
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Département
                  </label>
                  <input
                    type="text"
                    value={formData.departement}
                    onChange={(e) => setFormData({...formData, departement: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="Ex: IT, Commercial, RH"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Poste
                  </label>
                  <input
                    type="text"
                    value={formData.poste}
                    onChange={(e) => setFormData({...formData, poste: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="Ex: Développeur, Manager"
                  />
                </div>
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Lieu de travail
                  </label>
                  <input
                    type="text"
                    value={formData.lieuDeTravail}
                    onChange={(e) => setFormData({...formData, lieuDeTravail: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="Ex: Siège social, Usine A"
                  />
                </div>
              </div>

              <div>
                <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                  Horaire de travail
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setScheduleMenuOpen((v) => !v);
                    }}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6] flex items-center justify-between"
                  >
                    <span>
                      {formData.workingScheduleId
                        ? formatScheduleLabel(
                            availableSchedules.find((s) => (s?._id || s?.id) === formData.workingScheduleId)
                          )
                        : (isLoadingSchedules ? 'Chargement des horaires...' : 'Sélectionnez un horaire')}
                    </span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M6 9L12 15L18 9" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {scheduleMenuOpen && (
                    <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-[#D4DCDC] rounded-xl shadow-lg z-10 max-h-56 overflow-auto">
                      {availableSchedules.map((schedule) => (
                        <button
                          key={schedule?._id || schedule?.id}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFormData((prev) => ({
                              ...prev,
                              workingScheduleId: (schedule?._id || schedule?.id || '').toString(),
                            }));
                            setScheduleMenuOpen(false);
                          }}
                          className="w-full text-left px-4 py-2.5 font-instrument text-sm text-[#002222] hover:bg-[#ECEFEF] transition-colors"
                        >
                          {formatScheduleLabel(schedule)}
                        </button>
                      ))}
                      {availableSchedules.length === 0 && !isLoadingSchedules && (
                        <div className="px-4 py-2.5 font-instrument text-sm text-[#5A6565]">
                          Aucun horaire configuré
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 text-[#0389A6] border-[#D4DCDC] rounded focus:ring-[#0389A6]"
                  />
                  <span className="font-instrument text-sm text-[#002222]">Employé actif</span>
                </label>
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 border border-[#D4DCDC] rounded-xl font-instrument text-sm text-[#002222] hover:bg-[#ECEFEF] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#0389A6] rounded-xl font-instrument text-sm text-white hover:bg-[#027A8F] transition-colors"
                >
                  Ajouter l'employé
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Voir détails */}
      {isViewModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[500px] max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#D4DCDC]">
              <h2 className="font-instrument text-lg font-bold text-[#002222]">Détails de l'employé</h2>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedEmployee(null);
                }}
                className="p-1.5 hover:bg-[#ECEFEF] rounded-full transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-[#D4DCDC]">
                <div className="w-16 h-16 rounded-xl bg-[#0389A6]/10 border border-[#0389A6] flex items-center justify-center font-instrument text-[#0389A6] font-bold text-xl">
                  {selectedEmployee.initials}
                </div>
                <div className="space-y-1">
                  <h3 className="font-instrument text-xl font-bold text-[#002222]">{selectedEmployee.name}</h3>
                  <p className="font-instrument text-base text-[#5A6565]">{selectedEmployee.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-instrument text-sm font-semibold text-[#5A6565]">Département</label>
                  <p className="font-instrument text-base text-[#002222] mt-1">{selectedEmployee.department}</p>
                </div>
                <div>
                  <label className="font-instrument text-sm font-semibold text-[#5A6565]">Poste</label>
                  <p className="font-instrument text-base text-[#002222] mt-1">{selectedEmployee.position}</p>
                </div>
                <div>
                  <label className="font-instrument text-sm font-semibold text-[#5A6565]">Lieu de travail</label>
                  <p className="font-instrument text-base text-[#002222] mt-1">{selectedEmployee.location}</p>
                </div>
                <div>
                  <label className="font-instrument text-sm font-semibold text-[#5A6565]">Statut</label>
                  <div className="mt-1">
                    <div 
                      className="inline-flex items-center px-2.5 py-0.5 rounded-md"
                      style={{ 
                        backgroundColor: selectedEmployee.statusBg,
                        color: selectedEmployee.statusColor
                      }}
                    >
                      <span className="font-instrument text-xs font-medium">{selectedEmployee.status}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="font-instrument text-sm font-semibold text-[#5A6565]">Assiduité</label>
                  <p className="font-instrument text-base font-semibold mt-1" style={{ color: selectedEmployee.statusColor }}>
                    {selectedEmployee.attendance}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 py-4 border-t border-[#D4DCDC]">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedEmployee(null);
                }}
                className="px-4 py-2.5 bg-[#0389A6] rounded-xl font-instrument text-sm text-white hover:bg-[#027A8F] transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier */}
      {isEditModalOpen && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[500px] max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#D4DCDC]">
              <h2 className="font-instrument text-lg font-bold text-[#002222]">Modifier l'employé</h2>
              <button
                onClick={() => {
                  // Réinitialiser les états de la photo
                  setProfileImage(null);
                  setProfileImagePreview(null);
                  setUploadedPhotoData(null);
                  setUploadError(null);
                  setIsUploadingPhoto(false);
                  
                  setIsEditModalOpen(false);
                  setSelectedEmployee(null);
                  setFormData({
                    nomComplet: '',
                    email: '',
                    telephone: '',
                    departement: '',
                    poste: '',
                    lieuDeTravail: '',
                    isActive: true,
                    workingScheduleId: ''
                  });
                }}
                className="p-1.5 hover:bg-[#ECEFEF] rounded-full transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Formulaire */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {/* Section Photo de profil */}
              <div className="flex flex-col items-center gap-3 pb-4 border-b border-[#D4DCDC]">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-[#ECEFEF] border-2 border-[#D4DCDC] flex items-center justify-center font-instrument text-[#22364D] font-medium text-sm overflow-hidden">
                    {profileImagePreview ? (
                      <img src={profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : selectedEmployee?.photo?.url ? (
                      <img src={selectedEmployee.photo.url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      selectedEmployee?.initials || generateInitials(formData.nomComplet)
                    )}
                    
                    {/* Indicateur de chargement */}
                    {isUploadingPhoto && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  {/* Boutons d'action */}
                  <div className="absolute -bottom-1 -right-1 flex gap-1">
                    <button
                      type="button"
                      onClick={() => document.getElementById('edit-photo-input').click()}
                      className="w-6 h-6 bg-[#0389A6] rounded-full flex items-center justify-center hover:bg-[#027A8F] transition-colors"
                      disabled={isUploadingPhoto}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23 19C23 20.1046 22.1046 21 21 21H3C1.89543 21 1 20.1046 1 19V8C1 6.89543 1.89543 6 3 6H7L9 4H15L17 6H21C22.1046 6 23 6.89543 23 8V19Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 17C14.2091 17 16 15.2091 16 13C16 10.7909 14.2091 9 12 9C9.79086 9 8 10.7909 8 13C8 15.2091 9.79086 17 12 17Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    
                    {(profileImagePreview || selectedEmployee?.photo) && (
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M18 6L6 18M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Input file caché */}
                <input
                  id="edit-photo-input"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                
                {/* Boutons d'upload */}
                <div className="flex flex-col items-center gap-2">
                  {!isUploadingPhoto && !profileImagePreview && !selectedEmployee?.photo && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('edit-photo-input').click()}
                      className="px-3 py-1.5 bg-[#0389A6] text-white rounded-lg text-xs font-instrument hover:bg-[#027A8F] transition-colors"
                    >
                      Choisir une photo
                    </button>
                  )}
                  
                  {profileImage && !uploadedPhotoData && !isUploadingPhoto && (
                    <button
                      type="button"
                      onClick={handleImageUpload}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-instrument hover:bg-green-700 transition-colors"
                    >
                      Uploader
                    </button>
                  )}
                  
                  {/* Messages de statut */}
                  {isUploadingPhoto && (
                    <p className="font-instrument text-xs text-blue-600">
                      📤 Upload en cours...
                    </p>
                  )}
                  
                  {uploadedPhotoData && (
                    <p className="font-instrument text-xs text-green-600">✅ Photo uploadée avec succès</p>
                  )}
                  
                  {uploadError && (
                    <p className={`font-instrument text-xs ${
                      uploadError.includes('stockée localement') 
                        ? 'text-orange-600' 
                        : 'text-red-600'
                    }`}>
                      {uploadError.includes('stockée localement') ? '📱' : '⚠'} {uploadError}
                    </p>
                  )}
                  
                  <p className="font-instrument text-xs text-[#5A6565] text-center">
                    Formats acceptés: JPG, PNG, GIF<br/>
                    Taille max: 5MB
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    value={formData.nomComplet}
                    onChange={(e) => setFormData({...formData, nomComplet: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="Ex: Jean Dupont"
                    required
                  />
                </div>
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="jean.dupont@email.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="+221 77 123 45 67"
                  />
                </div>
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Département
                  </label>
                  <input
                    type="text"
                    value={formData.departement}
                    onChange={(e) => setFormData({...formData, departement: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="Ex: IT, Commercial, RH"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Poste
                  </label>
                  <input
                    type="text"
                    value={formData.poste}
                    onChange={(e) => setFormData({...formData, poste: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="Ex: Développeur, Manager"
                  />
                </div>
                <div>
                  <label className="block font-instrument text-sm font-semibold text-[#002222] mb-1">
                    Lieu de travail
                  </label>
                  <input
                    type="text"
                    value={formData.lieuDeTravail}
                    onChange={(e) => setFormData({...formData, lieuDeTravail: e.target.value})}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-xl px-4 py-2.5 font-instrument text-sm text-[#002222] focus:outline-none focus:border-[#0389A6]"
                    placeholder="Ex: Siège social, Usine A"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    className="w-4 h-4 text-[#0389A6] border-[#D4DCDC] rounded focus:ring-[#0389A6]"
                  />
                  <span className="font-instrument text-sm text-[#002222]">Employé actif</span>
                </label>
              </div>

              {/* Boutons */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    // Réinitialiser les états de la photo
                    setProfileImage(null);
                    setProfileImagePreview(null);
                    setUploadedPhotoData(null);
                    setUploadError(null);
                    setIsUploadingPhoto(false);
                    
                    setIsEditModalOpen(false);
                    setSelectedEmployee(null);
                    setFormData({
                      nomComplet: '',
                      email: '',
                      telephone: '',
                      departement: '',
                      poste: '',
                      lieuDeTravail: '',
                      isActive: true
                    });
                  }}
                  className="px-4 py-2.5 border border-[#D4DCDC] rounded-xl font-instrument text-sm text-[#002222] hover:bg-[#ECEFEF] transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-[#0389A6] rounded-xl font-instrument text-sm text-white hover:bg-[#027A8F] transition-colors"
                >
                  Enregistrer les modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {isDeleteModalOpen && employeeToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-[400px] p-6">
            {/* Icône de poubelle */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-xl bg-[#FEE2E2] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3 6H5H21M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M10 11V17M14 11V17" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>

            {/* Texte principal */}
            <h3 className="font-instrument text-lg font-bold text-[#002222] text-center mb-3">
              Êtes-vous sûr de vouloir supprimer définitivement cet employé ?
            </h3>

            {/* Message d'avertissement */}
            <p className="font-instrument text-sm text-[#5A6565] text-center mb-6">
              Cette action est irréversible et supprimera toutes les données associées à cet employé.
            </p>

            {/* Boutons */}
            <div className="flex gap-3">
              <button
                onClick={handleCancelDelete}
                className="flex-1 px-4 py-2.5 border border-[#D4DCDC] rounded-xl bg-white font-instrument text-sm font-medium text-[#002222] hover:bg-[#ECEFEF] transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2.5 bg-[#DC2626] rounded-xl font-instrument text-sm font-medium text-white hover:bg-[#B91C1C] transition-colors"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Employes;