import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import companiesService from '../services/companiesService';
import authService from '../services/authService';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';

function Entreprises() {
  const { language } = useLanguage();
  
  // Fonction pour obtenir la traduction
  const t = (key) => {
    return translations[language]?.[key] || key;
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Tous les statuts');
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  
  const [isEditCompanyModalOpen, setIsEditCompanyModalOpen] = useState(false);
  const [isDisableCompanyModalOpen, setIsDisableCompanyModalOpen] = useState(false);
  const [isDeleteCompanyModalOpen, setIsDeleteCompanyModalOpen] = useState(false);
  const [isViewDetailsModalOpen, setIsViewDetailsModalOpen] = useState(false);
  const [isInviteRHModalOpen, setIsInviteRHModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [companyToDisable, setCompanyToDisable] = useState(null);
  const [companyToDelete, setCompanyToDelete] = useState(null);
  const [companyToView, setCompanyToView] = useState(null);
  const [openActionMenu, setOpenActionMenu] = useState(null);
  const [isEditSectorDropdownOpen, setIsEditSectorDropdownOpen] = useState(false);
  const [isEditPlanDropdownOpen, setIsEditPlanDropdownOpen] = useState(false);
  const [isCompanyTypeDropdownOpen, setIsCompanyTypeDropdownOpen] = useState(false);
  const editSectorDropdownRef = useRef(null);
  const editPlanDropdownRef = useRef(null);
  const companyTypeDropdownRef = useRef(null);
  const companyTypeButtonRef = useRef(null);
  const inviteModalBodyRef = useRef(null);
  const [companyTypeDropdownPos, setCompanyTypeDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  

  const [editCompanyFormData, setEditCompanyFormData] = useState({
    companyName: '',
    sector: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    contactName: '',
    contactEmail: '',
    employees: '0',
    cameras: '0',
    plan: 'Standard',
    description: ''
  });

  const [inviteRHFormData, setInviteRHFormData] = useState({
    email: '',
    companyName: '',
    typeId: '',
  });

  const [companyTypes, setCompanyTypes] = useState([]);
  const [createdInvitationLink, setCreatedInvitationLink] = useState('');

  // État pour les invitations envoyées
  const [rhInvitations, setRhInvitations] = useState(() => {
    try {
      const saved = localStorage.getItem('rhInvitations');
      if (saved) {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Erreur lors du chargement des invitations:', error);
    }
    return [];
  });

  // État pour les notifications toast
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  
  // État pour le chargement de l'invitation
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);

  // Charger les types d'entreprise (secteurs)
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const types = await companiesService.getCompanyTypesPublic();
        if (Array.isArray(types)) {
          setCompanyTypes(types);
        }
      } catch (error) {
        console.error('Erreur lors du chargement des types d\'entreprise:', error);
        setCompanyTypes([]);
      }
    };
    loadTypes();
  }, []);

  // Positionner le menu déroulant (évite qu'il soit coupé par le scroll du modal)
  useEffect(() => {
    const updatePos = () => {
      const el = companyTypeButtonRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setCompanyTypeDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };

    if (!isCompanyTypeDropdownOpen) return;
    updatePos();

    const handleScroll = () => updatePos();
    window.addEventListener('resize', handleScroll);
    window.addEventListener('scroll', handleScroll, true);

    const modalBody = inviteModalBodyRef.current;
    if (modalBody) {
      modalBody.addEventListener('scroll', handleScroll, { passive: true });
    }

    return () => {
      window.removeEventListener('resize', handleScroll);
      window.removeEventListener('scroll', handleScroll, true);
      if (modalBody) {
        modalBody.removeEventListener('scroll', handleScroll);
      }
    };
  }, [isCompanyTypeDropdownOpen]);

  // Sauvegarder les invitations dans localStorage
  useEffect(() => {
    try {
      localStorage.setItem('rhInvitations', JSON.stringify(rhInvitations));
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des invitations:', error);
    }
  }, [rhInvitations]);

  // Fermer automatiquement le toast après 3 secondes
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '', type: 'success' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  // Fermer les dropdowns si on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      try {
        if (!event.target) return;
        const target = event.target;
        
        // Vérifier si le clic est sur un élément du menu d'actions
        const actionMenuElement = target.closest('[data-action-menu]');
        if (actionMenuElement) {
          return; // Ne pas fermer si on clique dans le menu
        }

        if (statusDropdownRef.current && !statusDropdownRef.current.contains(target)) {
          setIsStatusDropdownOpen(false);
        }
        if (editSectorDropdownRef.current && !editSectorDropdownRef.current.contains(target)) {
          setIsEditSectorDropdownOpen(false);
        }
        if (editPlanDropdownRef.current && !editPlanDropdownRef.current.contains(target)) {
          setIsEditPlanDropdownOpen(false);
        }
        if (companyTypeDropdownRef.current && !companyTypeDropdownRef.current.contains(target)) {
          setIsCompanyTypeDropdownOpen(false);
        }
        // Fermer le menu d'actions si on clique en dehors
        if (openActionMenu !== null) {
          setOpenActionMenu(null);
        }
      } catch (error) {
        console.error('Erreur dans handleClickOutside:', error);
      }
    };

    const hasOpenDropdown = isStatusDropdownOpen || 
                           isEditSectorDropdownOpen || isEditPlanDropdownOpen ||
                           isCompanyTypeDropdownOpen || openActionMenu !== null;
    
    if (hasOpenDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusDropdownOpen, isEditSectorDropdownOpen, isEditPlanDropdownOpen, isCompanyTypeDropdownOpen, openActionMenu]);

  // Fonction pour formater les données des entreprises depuis l'API
  const formatCompaniesData = (companiesData) => {
    // Gérer différents formats de réponse de l'API
    let companiesArray = [];
    
    if (Array.isArray(companiesData)) {
      companiesArray = companiesData;
    } else if (companiesData && Array.isArray(companiesData.data)) {
      companiesArray = companiesData.data;
    } else if (companiesData && Array.isArray(companiesData.items)) {
      companiesArray = companiesData.items;
    } else if (companiesData && companiesData.companies && Array.isArray(companiesData.companies)) {
      companiesArray = companiesData.companies;
    }
    
    if (companiesArray.length === 0) {
      return [];
    }
    
    return companiesArray.map((company, index) => {
      // Gérer les différents formats possibles
      const companyId = company._id || company.id || `company-${index + 1}`;
      const companyName = company.name || 'Sans nom';
      const employeesArray = Array.isArray(company.employees) ? company.employees : [];
      const employeesCount =
        employeesArray.length > 0
          ? employeesArray.length
          : typeof company.employeeCount === 'number'
            ? company.employeeCount
            : 0;
      
      // Extraire le nom du secteur depuis le type peuplé
      let sectorName = 'Non spécifié';
      if (company.type) {
        if (typeof company.type === 'object' && company.type.name) {
          sectorName = company.type.name;
        } else if (typeof company.type === 'string') {
          sectorName = company.type;
        }
      } else if (company.typeId) {
        sectorName = company.typeId;
      } else if (company.sector) {
        sectorName = company.sector;
      }
      
      return {
        id: companyId,
        name: companyName,
        email: company.email || '',
        sector: sectorName,
        location: company.location || company.address || company.addressLine1 || '',
        contact: {
          name: company.contactName || company.contact?.name || company.contactPerson || '',
          phone: company.phone || company.contact?.phone || company.contactPhone || '',
          email: company.contactEmail || company.contact?.email || company.contactMail || ''
        },
        employees: employeesCount,
        cameras: company.cameras || company.cameraCount || 0,
        plan: company.plan || company.subscription?.plan?.name || company.subscriptionPlan || 'Standard',
        status: company.status || (company.isActive !== false ? 'Actif' : 'Inactif'),
        // Conserver les données brutes pour référence
        _raw: company
      };
    });
  };

  // Charger les entreprises depuis l'API et localStorage au montage
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const { user } = authService.getStoredAuth();
        const roles = Array.isArray(user?.roles) ? user.roles : [];
        const isAdmin = roles.includes('admin') || roles.includes('superadmin');

        // Charger depuis l'API (admin voit tout, sinon seulement ses entreprises)
        const companiesData = isAdmin
          ? await companiesService.getAllCompanies()
          : await companiesService.getMyCompanies();
        const formattedCompanies = formatCompaniesData(companiesData);

        // IMPORTANT:
        // - Pour admin: ne pas fusionner avec localStorage (sinon les anciennes entreprises supprimées réapparaissent)
        // - Synchroniser localStorage sur la vérité API
        if (isAdmin) {
          setCompanies(formattedCompanies);
          try {
            localStorage.setItem('companies', JSON.stringify([]));
          } catch (e) {
            // ignore
          }
          return;
        }
        
        // Charger aussi depuis localStorage
        const localCompanies = JSON.parse(localStorage.getItem('companies') || '[]');
        
        // Combiner les deux sources (éviter les doublons par ID)
        const allCompanies = [...formattedCompanies];
        localCompanies.forEach(localCompany => {
          if (!allCompanies.find(c => c.id === localCompany.id)) {
            // S'assurer que le format est correct pour les données de localStorage
            const formattedLocalCompany = {
              id: localCompany.id,
              name: localCompany.name,
              email: localCompany.email || '',
              sector: localCompany.sector || 'Non spécifié',
              location: localCompany.location || '',
              contact: localCompany.contact || {
                name: '',
                phone: '',
                email: ''
              },
              employees: typeof localCompany.employees === 'number' ? localCompany.employees : 0,
              cameras: typeof localCompany.cameras === 'number' ? localCompany.cameras : 0,
              plan: localCompany.plan || 'Standard',
              status: localCompany.status || 'Actif',
              website: localCompany.website || '',
              description: localCompany.description || ''
            };
            allCompanies.push(formattedLocalCompany);
          }
        });
        
        setCompanies(allCompanies);
      } catch (error) {
        console.error('Erreur lors du chargement des entreprises depuis l\'API:', error);
        // En cas d'erreur API, charger depuis localStorage uniquement
        try {
          const localCompanies = JSON.parse(localStorage.getItem('companies') || '[]');
          // Formater les données de localStorage
          const formattedLocalCompanies = localCompanies.map(localCompany => ({
            id: localCompany.id,
            name: localCompany.name,
            email: localCompany.email || '',
            sector: localCompany.sector || 'Non spécifié',
            location: localCompany.location || '',
            contact: localCompany.contact || {
              name: '',
              phone: '',
              email: ''
            },
            employees: typeof localCompany.employees === 'number' ? localCompany.employees : 0,
            cameras: typeof localCompany.cameras === 'number' ? localCompany.cameras : 0,
            plan: localCompany.plan || 'Standard',
            status: localCompany.status || 'Actif',
            website: localCompany.website || '',
            description: localCompany.description || ''
          }));
          setCompanies(formattedLocalCompanies);
        } catch (localError) {
          console.error('Erreur lors du chargement depuis localStorage:', localError);
          setCompanies([]);
        }
      }
    };
    
    loadCompanies();
    
    // Écouter les changements dans localStorage (pour les autres onglets)
    const handleStorageChange = (e) => {
      if (e.key === 'companies') {
        loadCompanies();
      }
    };
    
    // Écouter aussi les événements personnalisés pour les changements dans le même onglet
    const handleCompaniesUpdated = () => {
      loadCompanies();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('companiesUpdated', handleCompaniesUpdated);
    
    // Recharger les données quand la page redevient visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadCompanies();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('companiesUpdated', handleCompaniesUpdated);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Les données des entreprises sont maintenant chargées depuis l'API
  // Plus besoin de données mockées - initialisation à zéro

  const [companies, setCompanies] = useState([]);

  // Calcul des statistiques
  const stats = {
    total: companies.length,
    actives: companies.filter(c => c.status === 'Actif').length,
    enAttente: companies.filter(c => c.status === 'En attente').length,
    employees: companies.reduce((sum, c) => sum + c.employees, 0),
    cameras: companies.reduce((sum, c) => sum + c.cameras, 0)
  };

  // Icônes SVG
  const MailIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="L22 6L12 13L2 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const MailIconWhite = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="L22 6L12 13L2 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const AddCircleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M12 8V16M8 12H16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const SearchIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="11" cy="11" r="8" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 21L16.65 16.65" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ArrowDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const UserIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.25 3.75L13.5 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const BuildingIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 21H21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 21V7L12 3L19 7V21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 9V13" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 17V21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 9V13" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 17V21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const MoreVerticalIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="6" r="1.5" fill="#5A6565"/>
      <circle cx="12" cy="12" r="1.5" fill="#5A6565"/>
      <circle cx="12" cy="18" r="1.5" fill="#5A6565"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CancelCircleIcon = () => (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="16" fill="rgba(252, 18, 27, 0.1)"/>
      <circle cx="30" cy="30" r="12.5" stroke="#D84343" strokeWidth="2.5" fill="none"/>
      <path d="M22 22L38 38M38 22L22 38" stroke="#D84343" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const DeleteIcon = () => (
    <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="60" height="60" rx="16" fill="rgba(216, 67, 67, 0.1)"/>
      <path d="M22.5 15H37.5M22.5 15L18.75 11.25M22.5 15V18.75M37.5 15L41.25 11.25M37.5 15V18.75M18.75 11.25H41.25M18.75 11.25L15 15V48.75C15 49.5 15.5 50 16.25 50H43.75C44.5 50 45 49.5 45 48.75V15L41.25 11.25M22.5 22.5V42.5M30 22.5V42.5M37.5 22.5V42.5" stroke="#D84343" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icônes pour le menu d'actions
  const ViewIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3C4.5 3 1.5 6.75 1.5 9C1.5 11.25 4.5 15 9 15C13.5 15 16.5 11.25 16.5 9C16.5 6.75 13.5 3 9 3Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="9" r="2.25" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const FileEditIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.75 2.25L13.5 6L6 13.5H2.25V9.75L9.75 2.25Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.25 3.75L13.5 6" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CancelCircleSmallIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="7.5" stroke="#5A6565" strokeWidth="1.5" fill="none"/>
      <path d="M6 6L12 12M12 6L6 12" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const DeleteSmallIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6.75 4.5H11.25M6.75 4.5L5.25 3M6.75 4.5V5.625M11.25 4.5L12.75 3M11.25 4.5V5.625M5.25 3H12.75M5.25 3L4.5 4.5V14.625C4.5 15.375 4.875 15.75 5.625 15.75H12.375C13.125 15.75 13.5 15.375 13.5 14.625V4.5L12.75 3M6.75 6.75V13.5M9 6.75V13.5M11.25 6.75V13.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icônes pour le modal de détails
  const BuildingSmallIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 17.5H17.5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.17 17.5V5.83L10 2.5L15.83 5.83V17.5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.5 7.5V10.83" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M7.5 14.17V17.5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.5 7.5V10.83" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12.5 14.17V17.5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const UserSmallIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 10C11.8409 10 13.3333 8.50762 13.3333 6.66667C13.3333 4.82572 11.8409 3.33333 10 3.33333C8.15905 3.33333 6.66667 4.82572 6.66667 6.66667C6.66667 8.50762 8.15905 10 10 10Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.6667 17.5V16.6667C16.6667 15.0076 15.0076 13.3333 13.3333 13.3333H6.66667C4.99238 13.3333 3.33333 15.0076 3.33333 16.6667V17.5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône mail pour le modal Inviter un RH
  const MailIconModal = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône pour les statistiques
  const StatsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 21H21" stroke="#0389A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 21V7L12 3L19 7V21" stroke="#0389A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 9V13" stroke="#0389A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 17V21" stroke="#0389A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 9V13" stroke="#0389A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M15 17V21" stroke="#0389A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Icône de profil utilisateur
  const ProfileIcon = () => (
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="36" height="36" rx="16" fill="rgba(3, 137, 166, 0.1)" stroke="#0389A6" strokeWidth="1"/>
      <path d="M19 14C21.2091 14 23 12.2091 23 10C23 7.79086 21.2091 6 19 6C16.7909 6 15 7.79086 15 10C15 12.2091 16.7909 14 19 14Z" fill="#0389A6"/>
      <path d="M19 16C15.6863 16 13 18.6863 13 22V26H25V22C25 18.6863 22.3137 16 19 16Z" fill="#0389A6"/>
    </svg>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Header */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-[50px] flex items-center justify-between">
          <div className="font-audiowide text-2xl" style={{ color: '#002222' }}>Sen Pointage</div>
          <NotificationIcon />
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-[300px_1fr]" style={{ minHeight: 'calc(100vh - 70px)' }}>
        <Sidebar />
        
        <main className="flex-1 p-8">
          {/* Header Section */}
          <div className="flex justify-between items-start mb-5">
            <div className="flex flex-col gap-2.5">
              <h1 className="font-audiowide text-[26px] font-normal text-[#002222] leading-[30px]">
                {t('Gestion des Entreprise')}
              </h1>
              <p className="font-instrument text-base text-[#5A6565] leading-[26px]">
                {t('Gérez votre équipe et suivez les informations des employés')}
              </p>
            </div>
            
            {/* Boutons d'action */}
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsInviteRHModalOpen(true);
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-[#0389A6] hover:bg-[#027A94] transition-colors cursor-pointer"
              >
                <MailIconWhite />
                <span className="font-instrument text-base text-white leading-[19.52px]">{t('Inviter une entreprise')}</span>
              </button>
            </div>
          </div>

          {/* Cartes statistiques */}
          <div className="flex gap-4 mb-5">
            {/* Total */}
            <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl p-4 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">{t('Total')}</span>
                <span className="font-audiowide text-[32px] font-normal text-[#002222] leading-[30px]">{stats.total}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <StatsIcon />
              </div>
            </div>

            {/* Actives */}
            <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl p-4 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">{t('Actives')}</span>
                <span className="font-audiowide text-[32px] font-normal text-[#002222] leading-[30px]">{stats.actives}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <StatsIcon />
              </div>
            </div>

            {/* En attente */}
            <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl p-4 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">{t('En attente')}</span>
                <span className="font-audiowide text-[32px] font-normal text-[#002222] leading-[30px]">{stats.enAttente}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <StatsIcon />
              </div>
            </div>

            {/* Employés */}
            <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl p-4 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <span className="font-audiowide text-[26px] font-normal text-[#002222] leading-[30px]">{t('Employés')}</span>
                <div className="flex items-end gap-2.5">
                  <span className="font-audiowide text-[32px] font-normal text-[#002222] leading-[30px]">{stats.employees}</span>
                </div>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <StatsIcon />
              </div>
            </div>

            {/* Caméras */}
            <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl p-4 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <span className="font-audiowide text-[26px] font-normal text-[#002222] leading-[30px]">{t('Caméras')}</span>
                <div className="flex items-end gap-2.5">
                  <span className="font-audiowide text-[32px] font-normal text-[#002222] leading-[30px]">{stats.cameras}</span>
                </div>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <StatsIcon />
              </div>
            </div>
          </div>

          {/* Section Invitations */}
          {rhInvitations.length > 0 && (
            <div className="bg-white border border-[#D4DCDC] rounded-2xl p-5 mb-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                  Invitations envoyées ({rhInvitations.length})
                </h3>
                <button
                  onClick={() => setRhInvitations([])}
                  className="px-3 py-1.5 text-xs font-instrument text-[#DC2626] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                >
                  Tout effacer
                </button>
              </div>
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                {rhInvitations.map((invitation) => (
                  <div 
                    key={invitation.id}
                    className="flex justify-between items-center p-3 bg-[#ECEFEF] rounded-xl hover:bg-[#E5E9E9] transition-colors"
                  >
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-instrument text-sm font-medium text-[#002222]">
                          {invitation.email}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-instrument ${
                          invitation.status === 'En attente' 
                            ? 'bg-yellow-100 text-yellow-700'
                            : invitation.status === 'Acceptée'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {invitation.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-instrument text-[#5A6565]">
                        <span>{invitation.companyName || 'Entreprise'}</span>
                        <span>•</span>
                        <span>{new Date(invitation.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (window.confirm(`Voulez-vous supprimer l'invitation pour ${invitation.email} ?`)) {
                          setRhInvitations(rhInvitations.filter(inv => inv.id !== invitation.id));
                          setToast({ show: true, message: 'Invitation supprimée', type: 'success' });
                        }
                      }}
                      className="ml-3 p-1.5 hover:bg-[#FEE2E2] rounded-lg transition-colors"
                      title="Supprimer l'invitation"
                    >
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L4 12M4 4L12 12" stroke="#DC2626" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barre de recherche et filtre */}
          <div className="flex gap-5 mb-5">
            <div className="flex-1 bg-white border border-[#D4DCDC] rounded-2xl px-4 py-2.5 flex items-center gap-10 focus-within:ring-2 focus-within:ring-[#0389A6] focus-within:border-transparent transition-all">
              <input
                type="text"
                placeholder="rechercher par nom, email ou poste..."
                value={searchQuery}
                onChange={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setSearchQuery(e.target.value);
                  console.log('Recherche:', e.target.value);
                }}
                onFocus={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="flex-1 font-instrument text-base text-[#5A6565] leading-[19.52px] outline-none bg-transparent placeholder:text-[#5A6565]"
              />
              <SearchIcon />
            </div>
            <div className="relative" ref={statusDropdownRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                }}
                className="bg-white border border-[#D4DCDC] rounded-2xl px-4 py-2.5 flex items-center gap-2.5 hover:bg-[#ECEFEF] transition-colors cursor-pointer"
              >
                <span className="font-instrument text-base text-[#5A6565] leading-[19.52px]">{statusFilter}</span>
                <ArrowDownIcon />
              </button>
              {isStatusDropdownOpen && (
                <div
                  className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  {['Tous les statuts', 'Actif', 'En attente', 'Inactif'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setStatusFilter(status);
                        setIsStatusDropdownOpen(false);
                        console.log('Filtre de statut sélectionné:', status);
                      }}
                      className="w-full px-4 py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tableau */}
          <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
            {/* Header du tableau */}
            <div className="flex items-center bg-white border-b border-[#D4DCDC] px-5 py-4 gap-4">
              <UserIcon />
              <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                Historique des pointages
              </h2>
            </div>

            {/* Sous-titre */}
            <div className="px-5 py-4 border-b border-[#D4DCDC]">
              <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                Vos pointages des derniers jours
              </p>
            </div>

            {/* En-têtes de colonnes */}
            <div className="flex items-center bg-white border-b border-[#D4DCDC]">
              <div className="w-[243px] px-4 py-2.5 border-r border-[#D4DCDC]">
                <span className="font-audiowide text-xs font-normal text-[#002222] leading-[24px]">{t('Employé')}</span>
              </div>
              <div className="w-[158px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                <span className="font-audiowide text-xs font-normal text-[#002222] leading-[24px]">{t('Secteur')}</span>
              </div>
              <div className="w-[116px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                <span className="font-audiowide text-xs font-normal text-[#002222] leading-[24px]">{t('Localisation')}</span>
              </div>
              <div className="w-[133px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                <span className="font-audiowide text-xs font-normal text-[#002222] leading-[24px]">{t('Contact')}</span>
              </div>
              <div className="w-[101px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                <span className="font-audiowide text-xs font-normal text-[#002222] leading-[24px]">{t('Employés')}</span>
              </div>
              <div className="w-[88px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                <span className="font-audiowide text-xs font-normal text-[#002222] leading-[24px]">{t('Caméras')}</span>
              </div>
              <div className="w-[86px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                <span className="font-audiowide text-xs font-normal text-[#002222] leading-[24px]">{t('Plan')}</span>
              </div>
              <div className="w-[78px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                <span className="font-audiowide text-xs font-normal text-[#002222] leading-[24px]">{t('Statut')}</span>
              </div>
              <div className="w-[77px] px-2.5 py-2.5">
                <span className="font-audiowide text-xs font-normal text-[#002222] leading-[24px]">{t('Actions')}</span>
              </div>
            </div>

            {/* Lignes de données */}
            {(() => {
              const filteredCompanies = companies.filter((company) => {
                // Filtrage par recherche
                const matchesSearch = searchQuery === '' || 
                  company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  company.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (company.sector && company.sector.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (company.location && company.location.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (company.contact?.name && company.contact.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                  (company.contact?.phone && company.contact.phone.includes(searchQuery));
                
                // Filtrage par statut
                const matchesStatus = statusFilter === 'Tous les statuts' || 
                  company.status === statusFilter;
                
                return matchesSearch && matchesStatus;
              });

              if (filteredCompanies.length === 0) {
                return (
                  <div className="flex flex-col items-center justify-center py-12 px-5">
                    <div className="w-16 h-16 rounded-full bg-[#ECEFEF] flex items-center justify-center mb-4">
                      <UserIcon />
                    </div>
                    <p className="font-instrument text-base text-[#5A6565] mb-2 text-center">
                      {companies.length === 0 
                        ? 'Aucune entreprise enregistrée'
                        : 'Aucune entreprise ne correspond à votre recherche'
                      }
                    </p>
                    {companies.length === 0 && (
                      <p className="font-instrument text-sm text-[#5A6565] text-center">
                        Créez un compte via le formulaire d'inscription pour ajouter votre entreprise
                      </p>
                    )}
                  </div>
                );
              }

              return filteredCompanies.map((company, index) => (
              <div key={company.id} className={`flex items-center ${index < filteredCompanies.length - 1 ? 'border-b border-[#D4DCDC]' : ''}`}>
                {/* Employé */}
                <div className="w-[243px] px-4 py-2.5 border-r border-[#D4DCDC] flex items-center gap-2.5">
                  <ProfileIcon />
                  <div className="flex flex-col gap-0.5">
                    <span className="font-instrument text-sm font-semibold text-[#002222] leading-[18px]">{company.name}</span>
                    <span className="font-instrument text-xs text-[#5A6565] leading-[18px]">{company.email}</span>
                  </div>
                </div>

                {/* Secteur */}
                <div className="w-[158px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                  <span className="font-instrument text-sm text-[#002222] leading-[18px]">{company.sector}</span>
                </div>

                {/* Localisation */}
                <div className="w-[116px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                  <span className="font-instrument text-sm text-[#002222] leading-[18px]">
                    {company.location || '-'}
                  </span>
                </div>

                {/* Contact */}
                <div className="w-[133px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                  <div className="flex flex-col">
                    <span className="font-instrument text-sm text-[#002222] leading-[18px]">
                      {company.contact.name || '-'}
                    </span>
                    <span className="font-instrument text-sm text-[#002222] leading-[18px]">
                      {company.contact.phone || '-'}
                    </span>
                  </div>
                </div>

                {/* Employés */}
                <div className="w-[101px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                  <span className="font-instrument text-sm text-[#002222] leading-[18px]">{company.employees}</span>
                </div>

                {/* Caméras */}
                <div className="w-[88px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                  <span className="font-instrument text-sm text-[#002222] leading-[18px]">{company.cameras}</span>
                </div>

                {/* Plan */}
                <div className="w-[86px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded-md font-instrument text-[10px] font-medium leading-[18px] ${
                      company.plan === 'Premium'
                        ? 'bg-[rgba(3,137,166,0.1)] text-[#0389A6]'
                        : company.plan === 'Enterprise'
                        ? 'bg-[rgba(151,71,255,0.1)] text-[#9747FF]'
                        : company.plan === 'Standard'
                        ? 'bg-[#ECEFEF] text-[#002222]'
                        : 'bg-[rgba(3,137,166,0.1)] text-[#0389A6]'
                    }`}
                  >
                    {company.plan}
                  </span>
                </div>

                {/* Statut */}
                <div className="w-[78px] px-2.5 py-2.5 border-r border-[#D4DCDC]">
                  <span
                    className={`inline-block px-1.5 py-0.5 rounded-md font-instrument text-[10px] font-medium leading-[18px] ${
                      company.status === 'Actif'
                        ? 'bg-[rgba(1,160,78,0.1)] text-[#01A04E]'
                        : company.status === 'En attente'
                        ? 'bg-[rgba(255,143,24,0.1)] text-[#FF8F18]'
                        : company.status === 'Inactif'
                        ? 'bg-[rgba(216,67,67,0.1)] text-[#D84343]'
                        : 'bg-[rgba(1,160,78,0.1)] text-[#01A04E]'
                    }`}
                  >
                    {company.status}
                  </span>
                </div>

                {/* Actions */}
                <div className="w-[77px] px-2.5 py-2.5 flex justify-center relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOpenActionMenu(openActionMenu === company.id ? null : company.id);
                    }}
                    className="p-2.5 hover:bg-[#ECEFEF] rounded-md transition-colors cursor-pointer"
                  >
                    <MoreVerticalIcon />
                  </button>
                  {openActionMenu === company.id && (
                    <div 
                      data-action-menu
                      className="absolute bottom-full right-0 mb-2 bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-20 w-[153px] p-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Voir détails cliqué pour:', company.name);
                          setCompanyToView(company);
                          setIsViewDetailsModalOpen(true);
                          setOpenActionMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-1.5 py-1 rounded-[10px] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                      >
                        <ViewIcon />
                        <span className="font-instrument text-xs text-[#5A6565] leading-[20px]" style={{ letterSpacing: '-0.02em' }}>
                          {t('Voir détails')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Modifier cliqué pour:', company.name);
                          setEditingCompany(company);
                          setEditCompanyFormData({
                            companyName: company.name,
                            sector: company.sector,
                            address: company.location,
                            city: company.location.includes('Dakar') ? 'Dakar' : (company.location.includes('Thies') ? 'Thies' : 'Dakar'),
                            country: 'Sénégal',
                            phone: company.contact.phone,
                            email: company.email,
                            website: company.email.includes('@') ? 'www.' + company.email.split('@')[1] : '',
                            contactName: company.contact.name,
                            contactEmail: company.contact.email || '',
                            employees: company.employees.toString(),
                            cameras: (company.cameras || 0).toString(),
                            plan: company.plan,
                            description: ''
                          });
                          setIsEditCompanyModalOpen(true);
                          setOpenActionMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-1.5 py-1 rounded-[10px] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                      >
                        <FileEditIcon />
                        <span className="font-instrument text-xs text-[#5A6565] leading-[20px]" style={{ letterSpacing: '-0.02em' }}>
                          {t('Modifier')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Désactiver cliqué pour:', company.name);
                          setCompanyToDisable(company);
                          setIsDisableCompanyModalOpen(true);
                          setOpenActionMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-1.5 py-1 rounded-[10px] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                      >
                        <CancelCircleSmallIcon />
                        <span className="font-instrument text-xs text-[#5A6565] leading-[20px]" style={{ letterSpacing: '-0.02em' }}>
                          {t('Désactiver')}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          console.log('Supprimer cliqué pour:', company.name);
                          setCompanyToDelete(company);
                          setIsDeleteCompanyModalOpen(true);
                          setOpenActionMenu(null);
                        }}
                        className="w-full flex items-center gap-3 px-1.5 py-1 rounded-[10px] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                      >
                        <DeleteSmallIcon />
                        <span className="font-instrument text-xs text-[#5A6565] leading-[20px]" style={{ letterSpacing: '-0.02em' }}>
                          {t('Supprimer')}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
              ));
            })()}
          </div>
        </main>
      </div>

      {/* Modal Ajouter une entreprise - SUPPRIMÉ (les entreprises sont créées via le formulaire d'inscription) */}

      {/* Modal Modifier une entreprise */}
      {isEditCompanyModalOpen && editingCompany && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsEditCompanyModalOpen(false);
              setEditingCompany(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl w-[600px] flex flex-col overflow-hidden max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-2.5 border-b border-[#D4DCDC]">
              <h2 className="font-instrument text-base font-bold text-[#002222] leading-[34px]">
                Modifier l'entreprise
              </h2>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditCompanyModalOpen(false);
                  setEditingCompany(null);
                }}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-5 px-[30px] py-2.5 pb-[30px] overflow-y-auto max-h-[524px]">
              <p className="font-instrument text-base font-medium text-[#3E4B4B] leading-[24px]">
                Modifiez les informations de l'entreprise
              </p>

              {/* Formulaire */}
              <div className="flex flex-col gap-5">
                {/* Row 1: Nom de l'entreprise et Secteur d'activité */}
                <div className="flex gap-5">
                  {/* Nom de l'entreprise */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Nom de l'entreprise *
                    </label>
                    <input
                      type="text"
                      value={editCompanyFormData.companyName}
                      onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, companyName: e.target.value })}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>

                  {/* Secteur d'activité */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Secteur d'activité *
                    </label>
                    <div className="relative" ref={editSectorDropdownRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsEditSectorDropdownOpen(!isEditSectorDropdownOpen);
                          setIsEditPlanDropdownOpen(false);
                        }}
                        className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                      >
                        <span className="font-instrument text-base text-[#002222] leading-[26px]">
                          {editCompanyFormData.sector}
                        </span>
                        <ArrowDownIcon />
                      </button>
                      
                      {isEditSectorDropdownOpen && (
                        <div
                          className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {['Technologie', 'Finance', 'Télécommunications', 'Hôtellerie', 'Agriculture', 'Santé', 'Éducation', 'Commerce'].map((sector) => (
                            <button
                              key={sector}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditCompanyFormData({ ...editCompanyFormData, sector });
                                setIsEditSectorDropdownOpen(false);
                              }}
                              className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                            >
                              {sector}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Adresse */}
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={editCompanyFormData.address}
                    onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, address: e.target.value })}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                  />
                </div>

                {/* Row 2: Ville et Pays */}
                <div className="flex gap-5">
                  {/* Ville */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Ville
                    </label>
                    <input
                      type="text"
                      value={editCompanyFormData.city}
                      onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, city: e.target.value })}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>

                  {/* Pays */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Pays
                    </label>
                    <input
                      type="text"
                      value={editCompanyFormData.country}
                      onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, country: e.target.value })}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Row 3: Téléphone et Email */}
                <div className="flex gap-5">
                  {/* Téléphone */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Téléphone *
                    </label>
                    <input
                      type="text"
                      value={editCompanyFormData.phone}
                      onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, phone: e.target.value })}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>

                  {/* Email */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={editCompanyFormData.email}
                      onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, email: e.target.value })}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Site web */}
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Site web *
                  </label>
                  <input
                    type="text"
                    value={editCompanyFormData.website}
                    onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, website: e.target.value })}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                  />
                </div>

                {/* Row 4: Personne de contact et Email contact */}
                <div className="flex gap-5">
                  {/* Personne de contact */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Personne de contact
                    </label>
                    <input
                      type="text"
                      value={editCompanyFormData.contactName}
                      onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, contactName: e.target.value })}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>

                  {/* Email contact */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Email contact
                    </label>
                    <input
                      type="email"
                      value={editCompanyFormData.contactEmail}
                      onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, contactEmail: e.target.value })}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Row 5: Nombre d'employés et Nombre de caméras */}
                <div className="flex gap-5">
                  {/* Nombre d'employés */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Nombre d'employés
                    </label>
                    <input
                      type="number"
                      value={editCompanyFormData.employees}
                      onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, employees: e.target.value })}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>

                  {/* Nombre de caméras */}
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Nombre de caméras
                    </label>
                    <input
                      type="number"
                      value={editCompanyFormData.cameras}
                      onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, cameras: e.target.value })}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Plan d'abonnement */}
                <div className="flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Plan d'abonnement
                    </label>
                    <div className="relative" ref={editPlanDropdownRef}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsEditPlanDropdownOpen(!isEditPlanDropdownOpen);
                          setIsEditSectorDropdownOpen(false);
                        }}
                        className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                      >
                        <span className="font-instrument text-base text-[#002222] leading-[26px]">
                          {editCompanyFormData.plan}
                        </span>
                        <ArrowDownIcon />
                      </button>
                      
                      {isEditPlanDropdownOpen && (
                        <div
                          className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {['Standard', 'Enterprise', 'Premium'].map((plan) => (
                            <button
                              key={plan}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setEditCompanyFormData({ ...editCompanyFormData, plan });
                                setIsEditPlanDropdownOpen(false);
                              }}
                              className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                            >
                              {plan}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Description
                  </label>
                  <textarea
                    value={editCompanyFormData.description}
                    onChange={(e) => setEditCompanyFormData({ ...editCompanyFormData, description: e.target.value })}
                    rows={4}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#D4DCDC] flex justify-end items-center gap-5 px-[30px] py-2.5 bg-white rounded-b-[25px]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsEditCompanyModalOpen(false);
                  setEditingCompany(null);
                }}
                className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Validation des champs obligatoires
                  if (!editCompanyFormData.companyName || !editCompanyFormData.sector || !editCompanyFormData.phone || !editCompanyFormData.email || !editCompanyFormData.website) {
                    alert('Veuillez remplir tous les champs obligatoires (*)');
                    return;
                  }
                  
                  // Mettre à jour l'entreprise
                  setCompanies(prevCompanies => {
                    const updated = prevCompanies.map(company => 
                      company.id === editingCompany.id
                        ? {
                            ...company,
                            name: editCompanyFormData.companyName,
                            email: editCompanyFormData.email,
                            sector: editCompanyFormData.sector,
                            location: editCompanyFormData.address || company.location,
                          contact: {
                            name: editCompanyFormData.contactName || company.contact.name,
                            phone: editCompanyFormData.phone,
                            email: editCompanyFormData.contactEmail || company.contact.email || ''
                          },
                            employees: parseInt(editCompanyFormData.employees) || company.employees,
                            cameras: parseInt(editCompanyFormData.cameras) || company.cameras || 0,
                            plan: editCompanyFormData.plan,
                            website: editCompanyFormData.website || company.website || '',
                            description: editCompanyFormData.description || company.description || ''
                          }
                        : company
                    );
                    console.log('Entreprise modifiée:', editingCompany.id);
                    
                    // Mettre à jour localStorage
                    try {
                      const localCompanies = JSON.parse(localStorage.getItem('companies') || '[]');
                      const updatedLocalCompanies = localCompanies.map(localCompany => 
                        localCompany.id === editingCompany.id
                          ? {
                              ...localCompany,
                              name: editCompanyFormData.companyName,
                              email: editCompanyFormData.email,
                              sector: editCompanyFormData.sector,
                              location: editCompanyFormData.address || localCompany.location,
                              contact: {
                                name: editCompanyFormData.contactName || localCompany.contact?.name || '',
                                phone: editCompanyFormData.phone,
                                email: editCompanyFormData.contactEmail || localCompany.contact?.email || ''
                              },
                              employees: parseInt(editCompanyFormData.employees) || localCompany.employees || 0,
                              cameras: parseInt(editCompanyFormData.cameras) || localCompany.cameras || 0,
                              plan: editCompanyFormData.plan,
                              website: editCompanyFormData.website || localCompany.website || '',
                              description: editCompanyFormData.description || localCompany.description || ''
                            }
                          : localCompany
                      );
                      localStorage.setItem('companies', JSON.stringify(updatedLocalCompanies));
                      window.dispatchEvent(new Event('companiesUpdated'));
                    } catch (error) {
                      console.error('Erreur lors de la mise à jour de localStorage:', error);
                    }
                    
                    return updated;
                  });
                  
                  // Fermer le modal
                  setIsEditCompanyModalOpen(false);
                  setEditingCompany(null);
                  
                  // Afficher un message de succès (non-bloquant)
                  setTimeout(() => {
                    alert(`Entreprise "${editCompanyFormData.companyName}" modifiée avec succès !`);
                  }, 100);
                }}
                className="px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl hover:bg-[#027A94] transition-colors font-instrument text-base leading-[19.52px] cursor-pointer"
              >
                Ajouter l'entreprise
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Désactiver l'entreprise */}
      {isDisableCompanyModalOpen && companyToDisable && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDisableCompanyModalOpen(false);
              setCompanyToDisable(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-[30px] w-[469px] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-2.5 border-b border-[#D4DCDC] rounded-t-[25px]">
              <h2 className="font-instrument text-base font-bold text-[#002222] leading-[34px]">
                Désactiver l'entreprise
              </h2>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDisableCompanyModalOpen(false);
                  setCompanyToDisable(null);
                }}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-5 px-[30px] py-[30px]">
              <div className="flex flex-col items-center gap-[26px]">
                {/* Icône de cercle rouge */}
                <div className="flex justify-center items-center">
                  <CancelCircleIcon />
                </div>

                {/* Texte de confirmation */}
                <div className="flex flex-col items-center gap-1.5">
                  <p className="font-instrument text-base font-bold text-[#002222] leading-[24px] text-center">
                    Êtes-vous sûr de vouloir désactiver l'entreprise {companyToDisable.name} ?
                  </p>
                  <p className="font-instrument text-sm text-[#5A6565] leading-[24px] text-center">
                    Cette action empêchera l'entreprise d'accéder à la plateforme et désactivera tous les comptes employés associés.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#D4DCDC] flex justify-stretch items-center gap-5 px-10 py-5 bg-white rounded-b-[25px]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDisableCompanyModalOpen(false);
                  setCompanyToDisable(null);
                }}
                className="flex-1 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Désactiver l'entreprise
                  setCompanies(prevCompanies => prevCompanies.map(company => 
                    company.id === companyToDisable.id
                      ? { ...company, status: 'Inactif' }
                      : company
                  ));
                  
                  console.log('Entreprise désactivée:', companyToDisable.id);
                  
                  // Fermer le modal
                  setIsDisableCompanyModalOpen(false);
                  setCompanyToDisable(null);
                  
                  // Afficher un message de succès (non-bloquant)
                  setTimeout(() => {
                    alert(`Entreprise "${companyToDisable.name}" désactivée avec succès !`);
                  }, 100);
                }}
                className="flex-1 px-4 py-2.5 bg-[#D84343] text-white rounded-2xl hover:bg-[#C03A3A] transition-colors font-instrument text-base leading-[19.52px] cursor-pointer"
              >
                Désactiver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Supprimer l'entreprise */}
      {isDeleteCompanyModalOpen && companyToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDeleteCompanyModalOpen(false);
              setCompanyToDelete(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-[30px] w-[469px] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-2.5 border-b border-[#D4DCDC] rounded-t-[25px]">
              <h2 className="font-instrument text-base font-bold text-[#002222] leading-[34px]">
                Supprimer l'entreprise
              </h2>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDeleteCompanyModalOpen(false);
                  setCompanyToDelete(null);
                }}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-5 px-[30px] py-[30px]">
              <div className="flex flex-col items-center gap-[26px]">
                {/* Icône de suppression */}
                <div className="flex justify-center items-center">
                  <DeleteIcon />
                </div>

                {/* Texte de confirmation */}
                <div className="flex flex-col items-center gap-1.5">
                  <p className="font-instrument text-base font-bold text-[#002222] leading-[24px] text-center">
                    Êtes-vous sûr de vouloir supprimer définitivement l'entreprise {companyToDelete.name} ?
                  </p>
                  <p className="font-instrument text-sm text-[#5A6565] leading-[24px] text-center">
                    Cette action est irréversible et supprimera toutes les données associées (employés, historiques de pointage, rapports, etc.).
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#D4DCDC] flex justify-center items-center gap-5 px-10 py-5 bg-white rounded-b-[25px]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDeleteCompanyModalOpen(false);
                  setCompanyToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Supprimer l'entreprise
                  setCompanies(prevCompanies => prevCompanies.filter(company => company.id !== companyToDelete.id));
                  
                  console.log('Entreprise supprimée:', companyToDelete.id);
                  
                  // Fermer le modal
                  setIsDeleteCompanyModalOpen(false);
                  setCompanyToDelete(null);
                  
                  // Afficher un message de succès (non-bloquant)
                  setTimeout(() => {
                    alert(`Entreprise "${companyToDelete.name}" supprimée définitivement !`);
                  }, 100);
                }}
                className="px-4 py-2.5 bg-[#D84343] text-white rounded-2xl hover:bg-[#C03A3A] transition-colors font-instrument text-base leading-[19.52px] cursor-pointer"
              >
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Voir les détails */}
      {isViewDetailsModalOpen && companyToView && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsViewDetailsModalOpen(false);
              setCompanyToView(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl w-[600px] max-w-[90vw] max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-2.5 border-b border-[#D4DCDC] rounded-t-[25px]">
              <div className="flex items-center gap-2.5">
                <BuildingIcon />
                <h2 className="font-instrument text-base font-bold text-[#002222] leading-[34px]">
                  {companyToView.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsViewDetailsModalOpen(false);
                  setCompanyToView(null);
                }}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-4 px-[30px] py-2.5 pb-[30px] overflow-y-auto max-h-[calc(90vh-140px)]">
              <p className="font-instrument text-base font-medium text-[#3E4B4B] leading-[24px]">
                Détails complets de l'entreprise
              </p>

              {/* Badges Plan et Statut */}
              <div className="flex items-center gap-4">
                <span className={`inline-block px-1.5 py-0.5 rounded-md font-instrument text-xs font-medium leading-[18px] ${
                  companyToView.plan === 'Premium'
                    ? 'bg-[rgba(3,137,166,0.1)] text-[#0389A6]'
                    : companyToView.plan === 'Enterprise'
                    ? 'bg-[rgba(151,71,255,0.1)] text-[#9747FF]'
                    : 'bg-[#ECEFEF] text-[#002222]'
                }`}>
                  {companyToView.plan}
                </span>
                <span className={`inline-block px-1.5 py-0.5 rounded-md font-instrument text-xs font-medium leading-[18px] ${
                  companyToView.status === 'Actif'
                    ? 'bg-[rgba(1,160,78,0.1)] text-[#01A04E]'
                    : companyToView.status === 'En attente'
                    ? 'bg-[rgba(255,143,24,0.1)] text-[#FF8F18]'
                    : 'bg-[rgba(216,67,67,0.1)] text-[#D84343]'
                }`}>
                  {companyToView.status}
                </span>
              </div>

              {/* Section Informations générales */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-4 px-2.5">
                  <BuildingSmallIcon />
                  <h3 className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Informations générales
                  </h3>
                </div>
                <div className="bg-[rgba(236,239,239,0.3)] border border-[#D4DCDC] rounded-2xl px-4 py-2.5 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Secteur:</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">{companyToView.sector}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Employés:</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">{companyToView.employees}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Caméras actives:</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">{companyToView.cameras}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Adresse</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">{companyToView.location}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Ville</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      {companyToView.location.includes('Dakar') ? 'Dakar' : (companyToView.location.includes('Thies') ? 'Thies' : 'Dakar')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Pays</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">Sénégal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Site web</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      {companyToView.email.includes('@') ? 'www.' + companyToView.email.split('@')[1] : 'Non spécifié'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Date d'inscription:</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">15/01/2024</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Date d'expiration:</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">15/01/2025</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Description</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      {companyToView.description || 'Leader en solutions technologiques au Sénégal'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section Personne de contact */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center gap-4 px-2.5">
                  <UserSmallIcon />
                  <h3 className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Personne de contact
                  </h3>
                </div>
                <div className="bg-[rgba(236,239,239,0.3)] border border-[#D4DCDC] rounded-2xl px-4 py-2.5 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Nom complet:</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">{companyToView.contact.name}</span>
                  </div>
                  {companyToView.contact.email && (
                    <div className="flex justify-between items-center">
                      <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Email:</span>
                      <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">{companyToView.contact.email}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-instrument text-base text-[#5A6565] leading-[26px]">Téléphone:</span>
                    <span className="font-instrument text-base font-semibold text-[#002222] leading-[26px]">{companyToView.contact.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#D4DCDC] flex justify-end items-center gap-5 px-[30px] py-2.5 bg-white rounded-b-[25px]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsViewDetailsModalOpen(false);
                  setCompanyToView(null);
                }}
                className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsViewDetailsModalOpen(false);
                  setCompanyToView(null);
                }}
                className="px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl hover:bg-[#027A94] transition-colors font-instrument text-base leading-[19.52px] cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Inviter un RH */}
      {isInviteRHModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsInviteRHModalOpen(false);
              setCreatedInvitationLink('');
              setInviteRHFormData({
                email: '',
                companyName: '',
                typeId: '',
              });
            }
          }}
        >
          <div 
            className="bg-white rounded-2xl w-[600px] flex flex-col overflow-visible max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', zIndex: 10000 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-2.5 border-b border-[#D4DCDC] rounded-t-[25px]">
              <div className="flex items-center gap-2.5">
                <MailIconModal />
                <h2 className="font-instrument text-base font-bold text-[#002222] leading-[34px]">
                  Inviter une entreprise (RH client)
                </h2>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsInviteRHModalOpen(false);
                  setCreatedInvitationLink('');
                  setInviteRHFormData({
                    email: '',
                    companyName: '',
                    typeId: '',
                  });
                }}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Content */}
            <div ref={inviteModalBodyRef} className="flex flex-col gap-5 px-[30px] py-2.5 pb-[30px] overflow-y-auto max-h-[524px] relative">
              <p className="font-instrument text-base font-medium text-[#3E4B4B] leading-[24px]">
                Envoyez une invitation au client (RH) : il devra d'abord s'abonner (Tarifs) puis s'inscrire.
              </p>

              {/* Formulaire */}
              <div className="flex flex-col gap-5">
                {/* Email professionnel */}
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Email professionnel*
                  </label>
                  <input
                    type="email"
                    value={inviteRHFormData.email}
                    onChange={(e) => setInviteRHFormData({ ...inviteRHFormData, email: e.target.value })}
                    placeholder="client@entreprise.com"
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent placeholder:text-[#5A6565]"
                  />
                </div>

                {/* Nom de l'entreprise */}
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Nom de l'entreprise*
                  </label>
                  <input
                    type="text"
                    value={inviteRHFormData.companyName}
                    onChange={(e) => setInviteRHFormData({ ...inviteRHFormData, companyName: e.target.value })}
                    placeholder="Nom de l'entreprise"
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent placeholder:text-[#5A6565]"
                  />
                </div>

                {/* Secteur (type d'entreprise) */}
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Secteur *
                  </label>
                  <div className="relative z-50" ref={companyTypeDropdownRef}>
                    <button
                      ref={companyTypeButtonRef}
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsCompanyTypeDropdownOpen(!isCompanyTypeDropdownOpen);
                      }}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                    >
                      <span className="font-instrument text-base text-[#5A6565] leading-[26px]">
                        {companyTypes.find((t) => (t._id || t.id) === inviteRHFormData.typeId)?.name || 'Sélectionnez un secteur'}
                      </span>
                      <ArrowDownIcon />
                    </button>
                    
                    {isCompanyTypeDropdownOpen && (
                      <div
                        className="bg-white border-2 border-[#0389A6] rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        onWheel={(e) => e.stopPropagation()}
                        style={{
                          position: 'fixed',
                          top: companyTypeDropdownPos.top,
                          left: companyTypeDropdownPos.left,
                          width: companyTypeDropdownPos.width,
                          maxHeight: '300px',
                          zIndex: 10050,
                          overflowY: 'auto',
                        }}
                      >
                        <div className="flex flex-col">
                          {(companyTypes.length > 0 ? companyTypes : []).map((ct) => (
                            <button
                              key={ct._id || ct.id}
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setInviteRHFormData({ ...inviteRHFormData, typeId: ct._id || ct.id });
                                setIsCompanyTypeDropdownOpen(false);
                              }}
                              className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#002222] hover:bg-[#ECEFEF] transition-colors"
                            >
                              {ct.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {createdInvitationLink && (
                  <div className="flex flex-col gap-2">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Lien d'invitation (à envoyer au client)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createdInvitationLink}
                        className="flex-1 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-sm text-[#002222] leading-[26px]"
                      />
                      <button
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          try {
                            await navigator.clipboard.writeText(createdInvitationLink);
                            setToast({ show: true, message: 'Lien copié !', type: 'success' });
                          } catch {
                            setToast({ show: true, message: 'Impossible de copier automatiquement. Copiez manuellement.', type: 'error' });
                          }
                        }}
                        className="px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl hover:bg-[#027A94] transition-colors font-instrument text-base leading-[19.52px] cursor-pointer"
                      >
                        Copier
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-[#D4DCDC] flex justify-end items-center gap-5 px-[30px] py-2.5 bg-white rounded-b-[25px]">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsInviteRHModalOpen(false);
                  setCreatedInvitationLink('');
                  setInviteRHFormData({
                    email: '',
                    companyName: '',
                    typeId: '',
                  });
                }}
                className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Validation des champs obligatoires
                  if (!inviteRHFormData.email || !inviteRHFormData.companyName || !inviteRHFormData.typeId) {
                    setToast({ show: true, message: 'Veuillez remplir tous les champs obligatoires (*)', type: 'error' });
                    return;
                  }
                  
                  // Validation de l'email
                  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                  if (!emailRegex.test(inviteRHFormData.email)) {
                    setToast({ show: true, message: 'Veuillez entrer une adresse email valide', type: 'error' });
                    return;
                  }
                  
                  // Vérifier si l'email a déjà été invité
                  const emailExists = rhInvitations.some(inv => inv.email.toLowerCase() === inviteRHFormData.email.toLowerCase());
                  if (emailExists) {
                    setToast({ show: true, message: 'Cet email a déjà reçu une invitation', type: 'error' });
                    return;
                  }
                  
                  setIsSendingInvitation(true);
                  
                  try {
                    const res = await companiesService.createCompanyInvitation({
                      email: inviteRHFormData.email,
                      companyName: inviteRHFormData.companyName,
                      typeId: inviteRHFormData.typeId,
                    });

                    if (res?.invitationLink) {
                      setCreatedInvitationLink(res.invitationLink);
                    }
                    
                    // Créer la nouvelle invitation pour l'affichage local
                    const newInvitation = {
                      id: Date.now().toString(),
                      email: inviteRHFormData.email,
                      companyName: inviteRHFormData.companyName,
                      typeId: inviteRHFormData.typeId,
                      invitationLink: res?.invitationLink,
                      emailSent: res?.emailSent,
                      emailError: res?.emailError,
                      date: new Date().toISOString(),
                      status: 'En attente'
                    };
                    
                    // Ajouter à la liste des invitations
                    setRhInvitations([...rhInvitations, newInvitation]);
                  
                    // Afficher un message clair selon l'envoi d'email
                    if (res?.emailSent) {
                      setToast({ show: true, message: `Invitation envoyée par email à ${inviteRHFormData.email} !`, type: 'success' });
                    } else {
                      const reason = res?.emailError ? ` (${res.emailError})` : '';
                      setToast({ show: true, message: `Invitation créée, mais l'email n'a pas été envoyé${reason}. Copiez le lien et envoyez-le manuellement.`, type: 'error' });
                    }
                  } catch (error) {
                    console.error('Erreur lors de l\'envoi de l\'invitation:', error);
                    
                    // Extraire le message d'erreur de manière plus détaillée
                    let errorMessage = 'Erreur lors de l\'envoi de l\'invitation. Veuillez réessayer.';
                    
                    if (error.response) {
                      // Erreur HTTP (400, 401, 500, etc.)
                      if (error.response.data) {
                        if (typeof error.response.data === 'string') {
                          errorMessage = error.response.data;
                        } else if (error.response.data.message) {
                          errorMessage = error.response.data.message;
                        } else if (error.response.data.error) {
                          errorMessage = error.response.data.error;
                        }
                      } else if (error.response.status === 401) {
                        errorMessage = 'Vous n\'êtes pas authentifié. Veuillez vous reconnecter.';
                      } else if (error.response.status === 403) {
                        errorMessage = 'Vous n\'avez pas la permission d\'envoyer des invitations.';
                      } else if (error.response.status >= 500) {
                        errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
                      }
                    } else if (error.request) {
                      // Pas de réponse du serveur
                      errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
                    } else if (error.message) {
                      errorMessage = error.message;
                    }
                    
                    setToast({ 
                      show: true, 
                      message: errorMessage,
                      type: 'error' 
                    });
                  } finally {
                    setIsSendingInvitation(false);
                  }
                }}
                disabled={isSendingInvitation}
                className={`px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl hover:bg-[#027A94] transition-colors font-instrument text-base leading-[19.52px] cursor-pointer ${
                  isSendingInvitation ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {isSendingInvitation ? 'Envoi en cours...' : 'Envoyer l\'invitation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div 
          className={`fixed top-5 right-5 z-[10000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-in ${
            toast.type === 'success' 
              ? 'bg-[#01A04E] text-white' 
              : 'bg-[#DC2626] text-white'
          }`}
          style={{ 
            animation: 'slideIn 0.3s ease-out',
            minWidth: '300px',
            maxWidth: '500px'
          }}
        >
          <div className="flex-shrink-0">
            {toast.type === 'success' ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M6 10L9 13L14 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M10 6V10M10 14H10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            )}
          </div>
          <span className="font-instrument text-sm leading-[20px] flex-1">{toast.message}</span>
          <button
            onClick={() => setToast({ show: false, message: '', type: 'success' })}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default Entreprises;