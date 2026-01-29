import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import cameraIconPause from '../assets/images/camera-icon-pause.svg';
import authService from '../services/authService';
import cameraSyncService from '../services/cameraSyncService';

function Cameras() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('Caméras');
  const [imageSettings, setImageSettings] = useState({
    brightness: 50,
    contrast: 50,
    saturation: 50,
    exposure: 50
  });
  const [recognitionSettings, setRecognitionSettings] = useState({
    sensitivity: 50,
    minConfidence: 50,
    maxFaces: 50
  });
  const [advancedOptions, setAdvancedOptions] = useState({
    eventLogging: true,
    videoRecording: false
  });
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const dropdownRef = useRef(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState(null);
  const [editingCamera, setEditingCamera] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    type: 'IP',
    customType: '', // Pour stocker le type personnalisé quand "Autre" est sélectionné
    location: '',
    ip: '',
    port: '',
    rtspUrl: '',
    webcamDeviceId: '',
    username: '',
    password: '',
    active: true,
    facialRecognition: true
  });
  const [addFormData, setAddFormData] = useState({
    name: '',
    type: 'IP',
    customType: '', // Pour stocker le type personnalisé quand "Autre" est sélectionné
    location: '',
    ip: '',
    port: '',
    rtspUrl: '',
    webcamDeviceId: '',
    username: '',
    password: '',
    active: true,
    facialRecognition: true
  });
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isAddTypeDropdownOpen, setIsAddTypeDropdownOpen] = useState(false);
  
  // Initialiser la liste des caméras à zéro
  const [cameras, setCameras] = useState([]);
  const [isCamerasLoaded, setIsCamerasLoaded] = useState(false);

  const [webcamDevices, setWebcamDevices] = useState([]);

  // Charger les caméras depuis localStorage au montage du composant et synchroniser avec la caméra active
  useEffect(() => {
    try {
      const { user } = authService.getStoredAuth();
      if (!user || !user.email) {
        console.warn('Aucun utilisateur connecté, impossible de charger les caméras');
        setIsCamerasLoaded(true);
        return;
      }
      
      const savedCameras = localStorage.getItem('cameras');
      if (savedCameras) {
        const parsedCameras = JSON.parse(savedCameras);
        if (Array.isArray(parsedCameras)) {
          // Filtrer les caméras pour n'afficher que celles de l'utilisateur connecté
          const userCameras = parsedCameras.filter(camera => {
            // Si la caméra n'a pas de userEmail, elle est considérée comme ancienne et sera ignorée
            // ou on peut la laisser si on veut la migration
            return camera.userEmail === user.email;
          });
          setCameras(userCameras);
          console.log('Caméras chargées depuis localStorage:', userCameras.length, 'pour l\'utilisateur', user.email);
          
          // Synchroniser avec la caméra active depuis Pointage
          const activeCamera = cameraSyncService.syncActiveCamera(userCameras);
          if (activeCamera && activeTab === 'Surveillance') {
            setSelectedCamera(activeCamera);
            console.log('📹 Caméra active synchronisée depuis Pointage:', activeCamera.name);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des caméras:', error);
    } finally {
      setIsCamerasLoaded(true);
    }
  }, []);
  
  // Écouter les changements de caméra active depuis Pointage
  useEffect(() => {
    const handleActiveCameraChange = (e) => {
      const activeCamera = e.detail;
      if (activeCamera && activeTab === 'Surveillance') {
        // Vérifier que la caméra existe dans la liste
        const found = cameras.find(cam => cam.id === activeCamera.id);
        if (found) {
          setSelectedCamera(found);
          console.log('📹 Caméra synchronisée depuis Pointage:', found.name);
        }
      }
    };
    
    window.addEventListener('activeCameraChanged', handleActiveCameraChange);
    
    return () => {
      window.removeEventListener('activeCameraChanged', handleActiveCameraChange);
    };
  }, [cameras, activeTab]);
  
  // Gérer les paramètres URL pour la navigation contextuelle depuis Pointage
  useEffect(() => {
    if (!isCamerasLoaded || cameras.length === 0) return;
    
    const tabParam = searchParams.get('tab');
    const cameraIdParam = searchParams.get('camera');
    
    // Si un onglet est spécifié dans l'URL, l'ouvrir
    if (tabParam && ['Caméras', 'Paramètres globaux', 'Surveillance'].includes(tabParam)) {
      setActiveTab(tabParam);
      
      // Si une caméra est spécifiée et qu'on est sur l'onglet Surveillance
      if (cameraIdParam && tabParam === 'Surveillance') {
        const camera = cameras.find(cam => cam.id === cameraIdParam);
        if (camera) {
          setSelectedCamera(camera);
          cameraSyncService.setActiveCamera(camera);
          setIsVideoPlaying(true);
          console.log('📹 Caméra chargée depuis URL:', camera.name);
          
          // Nettoyer les paramètres URL après utilisation
          setSearchParams({});
        }
      }
    }
  }, [searchParams, cameras, isCamerasLoaded, setSearchParams]);

  // Sauvegarder les caméras dans localStorage chaque fois qu'elles changent
  useEffect(() => {
    if (!isCamerasLoaded) return; // Ne pas sauvegarder avant le chargement initial
    
    try {
      const { user } = authService.getStoredAuth();
      if (!user || !user.email) return;
      
      // Charger toutes les caméras de localStorage
      const allCameras = JSON.parse(localStorage.getItem('cameras') || '[]');
      
      // Séparer les caméras de l'utilisateur actuel et celles des autres utilisateurs
      const otherUsersCameras = allCameras.filter(c => c.userEmail && c.userEmail !== user.email);
      
      // Fusionner les caméras de l'utilisateur actuel avec celles des autres utilisateurs
      const updatedAllCameras = [...otherUsersCameras, ...cameras];
      
      localStorage.setItem('cameras', JSON.stringify(updatedAllCameras));
      console.log('Caméras sauvegardées dans localStorage:', cameras.length, 'pour l\'utilisateur', user.email);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des caméras:', error);
    }
  }, [cameras, isCamerasLoaded]);

  useEffect(() => {
    const shouldLoad =
      (isAddModalOpen && addFormData.type === 'WEBCAM') ||
      (isEditModalOpen && editFormData.type === 'WEBCAM');

    if (!shouldLoad) return;

    const load = async () => {
      try {
        if (!navigator?.mediaDevices?.enumerateDevices) {
          setWebcamDevices([]);
          return;
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setWebcamDevices(videoInputs);
      } catch (error) {
        console.error('Erreur lors du chargement des webcams:', error);
        setWebcamDevices([]);
      }
    };

    load();
  }, [isAddModalOpen, isEditModalOpen, addFormData.type, editFormData.type]);

  const toggleCamera = (id) => {
    setCameras(prevCameras => prevCameras.map(cam => 
      cam.id === id ? { ...cam, active: !cam.active } : cam
    ));
  };

  // Statistiques calculées dynamiquement à partir de la liste des caméras
  // Ces statistiques sont recalculées automatiquement à chaque rendu lorsque 'cameras' change
  const stats = {
    total: cameras.length,
    online: cameras.filter(c => c.status === 'online').length,
    offline: cameras.filter(c => c.status === 'offline').length,
    error: cameras.filter(c => c.status === 'error').length
  };
  
  // Charger les paramètres sauvegardés au chargement de la page
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('cameraGlobalSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.imageSettings) {
          setImageSettings(parsedSettings.imageSettings);
        }
        if (parsedSettings.recognitionSettings) {
          setRecognitionSettings(parsedSettings.recognitionSettings);
        }
        if (parsedSettings.advancedOptions) {
          setAdvancedOptions(parsedSettings.advancedOptions);
        }
        console.log('Paramètres chargés depuis localStorage');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des paramètres:', error);
    }
  }, []);

  // Debug: log des statistiques quand la liste des caméras change
  useEffect(() => {
    console.log('📊 Statistiques mises à jour:');
    console.log('  - Total caméras:', stats.total);
    console.log('  - En ligne:', stats.online);
    console.log('  - Hors ligne:', stats.offline);
    console.log('  - En erreur:', stats.error);
    console.log('  - Liste des caméras:', cameras);
  }, [cameras.length, stats.total, stats.online, stats.offline, stats.error]);

  // Sélectionner automatiquement la première caméra active quand on ouvre l'onglet Surveillance
  useEffect(() => {
    if (activeTab === 'Surveillance' && !selectedCamera && cameras.length > 0) {
      const firstActiveCamera = cameras.find(cam => cam.active);
      if (firstActiveCamera) {
        setSelectedCamera(firstActiveCamera);
      }
    }
  }, [activeTab, cameras, selectedCamera]);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event) => {
      try {
        if (!event.target) return;
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsDropdownOpen(false);
        }
      } catch (error) {
        console.error('Erreur dans handleClickOutside:', error);
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Icônes SVG
  const UploadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M4 4V20H20" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 12L12 8L16 12" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 8V20" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const AddCircleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 8V16M8 12H16M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CheckmarkIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.33" stroke="#01A04E" strokeWidth="1.5"/>
      <path d="M7 10L9 12L13 8" stroke="#01A04E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const WifiOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Arc wifi externe (partiellement barré) */}
      <path d="M4 7C6 5 8.5 4 10 4C11.5 4 14 5 16 7" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Arc wifi moyen (partiellement barré) */}
      <path d="M5.5 10C7 8.5 8.5 8 10 8C11.5 8 13 8.5 14.5 10" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Point wifi */}
      <circle cx="10" cy="13" r="1.5" fill="#002222"/>
      {/* Ligne diagonale qui barre les signaux */}
      <path d="M2.5 2.5L17.5 17.5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  const CancelCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="10" cy="10" r="8.33" stroke="#D84343" strokeWidth="1.5"/>
      <path d="M7 7L13 13M13 7L7 13" stroke="#D84343" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  const ToggleOnIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.33" y="10" width="33.33" height="20" rx="10" fill="#01A04E"/>
      <circle cx="15" cy="20" r="8.33" fill="white"/>
    </svg>
  );

  const ToggleOffIcon = () => (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3.33" y="10" width="33.33" height="20" rx="10" fill="#D4DCDC"/>
      <circle cx="25" cy="20" r="8.33" fill="white"/>
    </svg>
  );

  const EditIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M11.667 2.5L17.5 8.333L6.25 19.583H0.833V14.167L11.667 2.5Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.167 5L14.167 10" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const RefreshIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M17.5 10C17.5 14.1421 14.1421 17.5 10 17.5C5.85786 17.5 2.5 14.1421 2.5 10C2.5 5.85786 5.85786 2.5 10 2.5C12.6548 2.5 14.9688 3.75868 16.3854 5.625" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.0833 2.08331V5.83331H13.3333" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const DeleteIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M2.5 5H4.16667H17.5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.66667 5V3.33333C6.66667 2.89131 6.84226 2.46738 7.15482 2.15482C7.46738 1.84226 7.89131 1.66667 8.33333 1.66667H11.6667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5M15.8333 5V16.6667C15.8333 17.1087 15.6577 17.5326 15.3452 17.8452C15.0326 18.1577 14.6087 18.3333 14.1667 18.3333H5.83333C5.39131 18.3333 4.96738 18.1577 4.65482 17.8452C4.34226 17.5326 4.16667 17.1087 4.16667 16.6667V5H15.8333Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.33333 9.16667V14.1667" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.6667 9.16667V14.1667" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <path d="M1.667 10C1.667 10 4.583 4.167 10 4.167C15.417 4.167 18.333 10 18.333 10C18.333 10 15.417 15.833 10 15.833C4.583 15.833 1.667 10 1.667 10Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="10" cy="10" r="2.5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const MonitorIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: 'none' }}>
      <rect x="2.5" y="3.33333" width="15" height="11.6667" rx="1" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.33333 15H11.6667" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 15V17.5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.66667 17.5H13.3333" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CameraIcon = () => (
    <svg width="51" height="50" viewBox="0 0 51 50" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3H18C19.1046 3 20 3.89543 20 5V15C20 16.1046 19.1046 17 18 17H6C4.89543 17 4 16.1046 4 15V5C4 3.89543 4.89543 3 6 3Z" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M20 8H34C35.1046 8 36 8.89543 36 10V20C36 21.1046 35.1046 22 34 22H20V8Z" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="27" cy="15" r="4.5" stroke="#002222" strokeWidth="2"/>
      <path d="M4 3H16" stroke="#002222" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 3H32" stroke="#002222" strokeWidth="2" strokeLinecap="round"/>
      <path d="M4 27H16" stroke="#002222" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 27H32" stroke="#002222" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );

  const CameraIconSmall = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 2H8C9.10457 2 10 2.89543 10 4V8C10 9.10457 9.10457 10 8 10H3C1.89543 10 1 9.10457 1 8V4C1 2.89543 1.89543 2 3 2Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 5H17C18.1046 5 19 5.89543 19 7V13C19 14.1046 18.1046 15 17 15H10V5Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="14" cy="10" r="2.5" stroke="#002222" strokeWidth="1.5"/>
      <path d="M1 2H6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 2H15" stroke="#002222" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M1 16H6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M10 16H15" stroke="#002222" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );

  const TickIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.33 8L6.67 11.33L12.67 4.67" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M18 6L6 18M6 6L18 18" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const SettingsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.4 15C19.2669 15.3016 19.2272 15.6362 19.286 15.9606C19.3448 16.285 19.4995 16.5843 19.73 16.82L19.79 16.88C19.976 17.0657 20.1235 17.2863 20.2241 17.5291C20.3248 17.7719 20.3766 18.0322 20.3766 18.295C20.3766 18.5578 20.3248 18.8181 20.2241 19.0609C20.1235 19.3037 19.976 19.5243 19.79 19.71C19.6043 19.896 19.3837 20.0435 19.1409 20.1441C18.8981 20.2448 18.6378 20.2966 18.375 20.2966C18.1122 20.2966 17.8519 20.2448 17.6091 20.1441C17.3663 20.0435 17.1457 19.896 16.96 19.71L16.9 19.65C16.6643 19.4195 16.365 19.2648 16.0406 19.206C15.7162 19.1472 15.3816 19.1869 15.08 19.32C14.7842 19.4468 14.532 19.6572 14.3543 19.9255C14.1766 20.1938 14.0813 20.5082 14.08 20.83V21C14.08 21.5304 13.8693 22.0391 13.4942 22.4142C13.1191 22.7893 12.6104 23 12.08 23C11.5496 23 11.0409 22.7893 10.6658 22.4142C10.2907 22.0391 10.08 21.5304 10.08 21V20.91C10.0723 20.579 9.96512 20.2569 9.77251 19.9859C9.5799 19.7148 9.31074 19.5063 9 19.385C8.69838 19.2522 8.36381 19.2125 8.03941 19.2713C7.71502 19.3301 7.41568 19.4848 7.18 19.715L7.12 19.775C6.93425 19.961 6.71368 20.1085 6.47088 20.2091C6.22808 20.3098 5.96783 20.3616 5.705 20.3616C5.44217 20.3616 5.18192 20.3098 4.93912 20.2091C4.69632 20.1085 4.47575 19.961 4.29 19.775C4.10405 19.5893 3.95653 19.3687 3.85588 19.1259C3.75523 18.8831 3.70343 18.6228 3.70343 18.36C3.70343 18.0972 3.75523 17.8369 3.85588 17.5941C3.95653 17.3513 4.10405 17.1307 4.29 16.945L4.35 16.885C4.58054 16.6493 4.73519 16.35 4.794 16.0256C4.85282 15.7012 4.81312 15.3666 4.68 15.065C4.55324 14.7692 4.34276 14.517 4.07447 14.3393C3.80618 14.1616 3.49179 14.0663 3.17 14.065H3C2.46957 14.065 1.96086 13.8543 1.58579 13.4792C1.21071 13.1041 1 12.5954 1 12.065C1 11.5346 1.21071 11.0259 1.58579 10.6508C1.96086 10.2757 2.46957 10.065 3 10.065H3.09C3.42099 10.0573 3.742 9.95013 4.01309 9.75752C4.28417 9.56491 4.49268 9.29575 4.615 8.985C4.74775 8.68338 4.78745 8.34881 4.72863 8.02441C4.66982 7.70002 4.51517 7.40068 4.285 7.165L4.225 7.105C4.03905 6.91925 3.89153 6.69868 3.79088 6.45588C3.69023 6.21308 3.63843 5.95283 3.63843 5.69C3.63843 5.42717 3.69023 5.16692 3.79088 4.92412C3.89153 4.68132 4.03905 4.46075 4.225 4.275C4.41075 4.08905 4.63132 3.94153 4.87412 3.84088C5.11692 3.74023 5.37717 3.68843 5.64 3.68843C5.90283 3.68843 6.16308 3.74023 6.40588 3.84088C6.64868 3.94153 6.86925 4.08905 7.055 4.275L7.115 4.335C7.35068 4.56554 7.65002 4.72019 7.97441 4.779C8.29881 4.83782 8.63338 4.79812 8.935 4.665H9C9.29577 4.53824 9.54802 4.32776 9.72569 4.05947C9.90337 3.79118 9.99872 3.47679 10 3.155V3C10 2.46957 10.2107 1.96086 10.5858 1.58579C10.9609 1.21071 11.4696 1 12 1C12.5304 1 13.0391 1.21071 13.4142 1.58579C13.7893 1.96086 14 2.46957 14 3V3.09C14.0013 3.41179 14.0966 3.72618 14.2743 3.99447C14.452 4.26276 14.7042 4.47324 15 4.6C15.3016 4.73275 15.6362 4.77245 15.9606 4.71363C16.285 4.65482 16.5843 4.50017 16.82 4.27L16.88 4.21C17.0657 4.02405 17.2863 3.87653 17.5291 3.77588C17.7719 3.67523 18.0322 3.62343 18.295 3.62343C18.5578 3.62343 18.8181 3.67523 19.0609 3.77588C19.3037 3.87653 19.5243 4.02405 19.71 4.21C19.896 4.39575 20.0435 4.61632 20.1441 4.85912C20.2448 5.10192 20.2966 5.36217 20.2966 5.625C20.2966 5.88783 20.2448 6.14808 20.1441 6.39088C20.0435 6.63368 19.896 6.85425 19.71 7.04L19.65 7.1C19.4195 7.33568 19.2648 7.63502 19.206 7.95941C19.1472 8.28381 19.1869 8.61838 19.32 8.92V9C19.4468 9.29577 19.6572 9.54802 19.9255 9.72569C20.1938 9.90337 20.5082 9.99872 20.83 10H21C21.5304 10 22.0391 10.2107 22.4142 10.5858C22.7893 10.9609 23 11.4696 23 12C23 12.5304 22.7893 13.0391 22.4142 13.4142C22.0391 13.7893 21.5304 14 21 14H20.91C20.5882 14.0013 20.2738 14.0966 20.0055 14.2743C19.7372 14.452 19.5268 14.7042 19.4 15Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Top bar */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="flex items-center justify-between w-full px-12">
          <h1 className="font-audiowide text-2xl font-normal text-[#002222]">Sen Pointage</h1>
          
          <div className="flex items-center gap-4">
            <NotificationIcon />
            <ProfileDropdown />
          </div>
        </div>
      </div>

      <div className="flex min-h-screen">
        <Sidebar />
        
        <main className="flex-1 p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2.5">
              <h1 className="font-audiowide text-[26px] font-normal text-[#002222] leading-[30px]">
                Configuration des caméras
              </h1>
              <p className="font-instrument text-base text-[#5A6565]">
                Gérez et configurez vos caméras de reconnaissance faciale
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  // Activer l'animation de chargement
                  setIsRefreshingAll(true);
                  
                  // Actualiser toutes les caméras
                  setCameras(prevCameras => {
                    const now = new Date();
                    return prevCameras.map(camera => ({
                      ...camera,
                      lastConnection: now.toLocaleString('fr-FR', { 
                        year: 'numeric', 
                        month: '2-digit', 
                        day: '2-digit', 
                        hour: '2-digit', 
                        minute: '2-digit', 
                        second: '2-digit' 
                      }).replace(',', ''),
                      status: camera.status === 'error' ? 'offline' : camera.status
                    }));
                  });
                  
                  // Désactiver l'animation après 1 seconde
                  setTimeout(() => {
                    setIsRefreshingAll(false);
                  }, 1000);
                  
                  console.log('Toutes les caméras ont été actualisées');
                }}
                disabled={isRefreshingAll}
                className={`flex items-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors cursor-pointer ${isRefreshingAll ? 'opacity-75' : ''}`}
              >
                <div className={isRefreshingAll ? 'animate-spin' : ''}>
                  <UploadIcon />
                </div>
                <span className="font-instrument text-base text-[#002222]">
                  {isRefreshingAll ? 'Actualisation...' : 'Actualiser tout'}
                </span>
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Button clicked, opening modal');
                  setAddFormData({
                    name: '',
                    type: 'IP',
                    customType: '',
                    location: '',
                    ip: '',
                    port: '',
                    rtspUrl: '',
                    webcamDeviceId: '',
                    username: '',
                    password: '',
                    active: true,
                    facialRecognition: true
                  });
                  setIsAddModalOpen(true);
                  console.log('Modal state set to true');
                }}
                className="flex items-center gap-2.5 px-4 py-2.5 bg-[#0389A6] rounded-2xl hover:bg-[#027A94] transition-colors cursor-pointer"
              >
                <AddCircleIcon />
                <span className="font-instrument text-base text-white">Ajouter une caméra</span>
              </button>
            </div>
          </div>

          {/* Cartes statistiques */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {/* Total caméras */}
            <div className="bg-white border border-[#D4DCDC] rounded-2xl p-4 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">Total caméras</span>
                <span className="font-audiowide text-[32px] font-normal text-[#002222] leading-[30px]">{stats.total}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <CameraIcon />
              </div>
            </div>

            {/* En ligne */}
            <div className="bg-white border border-[#D4DCDC] rounded-2xl p-4 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">En ligne</span>
                <span className="font-audiowide text-[32px] font-normal text-[#002222] leading-[30px]">{stats.online}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <CheckmarkIcon />
              </div>
            </div>

            {/* Hors ligne */}
            <div className="bg-white border border-[#D4DCDC] rounded-2xl p-4 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">Hors ligne</span>
                <span className="font-audiowide text-[32px] font-normal text-[#002222] leading-[30px]">{stats.offline}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <WifiOffIcon />
              </div>
            </div>

            {/* En erreur */}
            <div className="bg-white border border-[#D4DCDC] rounded-2xl p-4 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <span className="font-instrument text-sm font-semibold text-[#002222] leading-[26px]">En erreur</span>
                <span className="font-audiowide text-[32px] font-normal text-[#002222] leading-[30px]">{stats.error}</span>
              </div>
              <div className="w-[51px] h-[50px] bg-[rgba(3,137,166,0.1)] rounded-2xl flex items-center justify-center">
                <CancelCircleIcon />
              </div>
            </div>
          </div>

          {/* Onglets */}
          <div className="flex items-center gap-1 p-1 bg-[#D4DCDC] rounded-2xl mb-6 w-fit">
            <button
              onClick={() => setActiveTab('Caméras')}
              className={`px-2.5 py-2.5 rounded-xl transition-colors ${
                activeTab === 'Caméras'
                  ? 'bg-white text-[#002222]'
                  : 'text-[#002222] hover:bg-white/50'
              }`}
            >
              <span className="font-instrument text-base leading-[19.52px]">Caméras</span>
            </button>
            <button
              onClick={() => setActiveTab('Paramètres globaux')}
              className={`px-2.5 py-2.5 rounded-xl transition-colors ${
                activeTab === 'Paramètres globaux'
                  ? 'bg-white text-[#002222]'
                  : 'text-[#002222] hover:bg-white/50'
              }`}
            >
              <span className="font-instrument text-base leading-[19.52px]">Paramètres globaux</span>
            </button>
            <button
              onClick={() => setActiveTab('Surveillance')}
              className={`px-2.5 py-2.5 rounded-xl transition-colors ${
                activeTab === 'Surveillance'
                  ? 'bg-white text-[#002222]'
                  : 'text-[#002222] hover:bg-white/50'
              }`}
            >
              <span className="font-instrument text-base leading-[19.52px]">Surveillance</span>
            </button>
          </div>

          {/* Contenu conditionnel selon l'onglet actif */}
          {activeTab === 'Caméras' && (
            <div className="grid grid-cols-3 gap-5 auto-rows-max">
            {cameras.length === 0 ? (
              <div className="col-span-3 flex flex-col items-center justify-center py-12 px-5 bg-white border border-[#D4DCDC] rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-[#ECEFEF] flex items-center justify-center mb-4">
                  <CameraIcon />
                </div>
                <p className="font-instrument text-base text-[#5A6565] mb-2 text-center">
                  Aucune caméra configurée
                </p>
                <p className="font-instrument text-sm text-[#5A6565] text-center">
                  Cliquez sur "Ajouter une caméra" pour commencer
                </p>
              </div>
            ) : (
              cameras.map((camera) => (
              <div key={camera.id} className="bg-white border border-[#D4DCDC] rounded-2xl p-5 flex flex-col gap-5">
                {/* Header de la carte */}
                <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2.5">
                      {camera.status === 'online' && <CheckmarkIcon />}
                      {camera.status === 'offline' && <WifiOffIcon />}
                      {camera.status === 'error' && <CancelCircleIcon />}
                      <div className="flex flex-col">
                        <span className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">{camera.name}</span>
                        <span className="font-instrument text-xs text-[#5A6565] leading-[14.64px]">{camera.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditingCamera(camera);
                          // Extraire l'IP et le port si l'IP contient ':'
                          const ipParts = camera.ip ? camera.ip.split(':') : [];
                          // Vérifier si le type est dans la liste standard, sinon c'est un type personnalisé
                          const standardTypes = ['IP', 'WEBCAM', 'RTSP'];
                          const isCustomType = !standardTypes.includes(camera.type);
                          
                          setEditFormData({
                            name: camera.name,
                            type: isCustomType ? 'Autre' : camera.type,
                            customType: isCustomType ? camera.type : '',
                            location: camera.location,
                            ip: ipParts.length > 0 ? ipParts[0] : (camera.ip || ''),
                            port: ipParts.length > 1 ? ipParts[1] : '',
                            rtspUrl: camera.rtspUrl || '',
                            webcamDeviceId: camera.webcamDeviceId || '',
                            username: 'Admin',
                            password: 'mot de passe',
                            active: camera.active,
                            facialRecognition: true
                          });
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 hover:bg-[#ECEFEF] rounded-md transition-colors cursor-pointer"
                      >
                        <EditIcon />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Actualiser la caméra spécifique
                          setCameras(prevCameras => {
                            return prevCameras.map(cam => {
                              if (cam.id === camera.id) {
                                return {
                                  ...cam,
                                  lastConnection: new Date().toLocaleString('fr-FR', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit', 
                                    hour: '2-digit', 
                                    minute: '2-digit', 
                                    second: '2-digit' 
                                  }).replace(',', ''),
                                  status: 'online'
                                };
                              }
                              return cam;
                            });
                          });
                          console.log(`Caméra ${camera.name} actualisée`);
                        }}
                        className="p-2 hover:bg-[#ECEFEF] rounded-md transition-colors cursor-pointer"
                      >
                        <RefreshIcon />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCameraToDelete(camera);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-2 hover:bg-[#ECEFEF] rounded-md transition-colors cursor-pointer"
                      >
                        <DeleteIcon />
                      </button>
                    </div>
                  </div>

                  {/* Statut et type */}
                  <div className="flex justify-between items-center gap-5">
                    <div className={`px-2.5 py-1 rounded-2xl ${
                      camera.status === 'online'
                        ? 'bg-[rgba(1,160,78,0.1)] text-[#01A04E]'
                        : camera.status === 'offline'
                        ? 'bg-[#ECEFEF] text-[#002222]'
                        : 'bg-[rgba(216,67,67,0.1)] text-white'
                    }`}>
                      <span className="font-instrument text-xs font-normal leading-[16px]">
                        {camera.status === 'online' ? 'En ligne' : camera.status === 'offline' ? 'Hors ligne' : 'Erreur'}
                      </span>
                    </div>
                    <div className="px-2 py-1 bg-white border border-[#D4DCDC] rounded-[10px]">
                      <span className="font-instrument text-xs font-medium text-[#002222] leading-[14.64px]">{camera.type}</span>
                    </div>
                  </div>

                  {/* Détails techniques */}
                  <div className="flex flex-col gap-2.5">
                    {camera.ip && (
                      <div className="flex justify-between items-center">
                        <span className="font-instrument text-xs font-medium text-[#5A6565] leading-[14.64px]">IP:</span>
                        <span className="font-instrument text-sm text-[#002222] leading-[17.08px]">{camera.ip}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="font-instrument text-xs font-medium text-[#5A6565] leading-[14.64px]">Résolution:</span>
                      <span className="font-instrument text-sm text-[#002222] leading-[17.08px]">{camera.resolution}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-instrument text-xs font-medium text-[#5A6565] leading-[14.64px]">FPS:</span>
                      <span className="font-instrument text-sm text-[#002222] leading-[17.08px]">{camera.fps}</span>
                    </div>
                    {camera.confidence !== null && camera.confidence !== undefined && camera.confidence !== '' && (
                      <div className="flex justify-between items-center">
                        <span className="font-instrument text-xs font-medium text-[#5A6565] leading-[14.64px]">Confiance:</span>
                        <span className="font-instrument text-sm text-[#01A04E] leading-[17.08px]">{camera.confidence}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer avec toggle et dernière connexion */}
                <div className="flex flex-col gap-0.75 pt-2.5 border-t border-[#D4DCDC]">
                  <div className="flex justify-between items-center gap-[229px]">
                    <div className="flex items-center gap-2.5">
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleCamera(camera.id);
                        }}
                        className="cursor-pointer"
                      >
                        {camera.active ? <ToggleOnIcon /> : <ToggleOffIcon />}
                      </button>
                      <span className="font-instrument text-xs font-semibold text-[#002222] leading-[20px]">Actif</span>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Voir la caméra en plein écran
                          setSelectedCamera(camera);
                          setActiveTab('Surveillance');
                          setIsVideoPlaying(true);
                          // Synchroniser la caméra active avec Pointage
                          cameraSyncService.setActiveCamera(camera);
                          console.log(`Visualisation de la caméra ${camera.name}`);
                        }}
                        className="p-2 hover:bg-[#ECEFEF] rounded-md transition-colors cursor-pointer"
                      >
                        <EyeIcon />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          // Ouvrir le flux vidéo dans un nouveau moniteur
                          setSelectedCamera(camera);
                          setActiveTab('Surveillance');
                          setIsVideoPlaying(true);
                          console.log(`Ouverture du flux de la caméra ${camera.name} en mode moniteur`);
                        }}
                        className="p-2 hover:bg-[#ECEFEF] rounded-md transition-colors cursor-pointer"
                      >
                        <MonitorIcon />
                      </button>
                    </div>
                  </div>
                  <span className="font-instrument text-[10px] text-[#5A6565] leading-[12.2px]">
                    Dernière connexion: {camera.lastConnection}
                  </span>
                </div>
              </div>
              ))
            )}
            </div>
          )}

          {activeTab === 'Paramètres globaux' && (
            <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC] bg-white">
                <SettingsIcon />
                <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">Paramètres globaux</h2>
              </div>

              {/* Contenu */}
              <div className="flex flex-col gap-5 px-5 py-2.5 pb-5">
                <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                  Configuration appliquée à toutes les caméras
                </p>

                {/* Paramètres d'image */}
                <div className="flex flex-col gap-5">
                  <h3 className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                    Paramètres d'image
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-5">
                    {/* Luminosité */}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-instrument text-sm font-medium text-[#002222] leading-[17.08px]">
                        Luminosité: {imageSettings.brightness}%
                      </span>
                      <div className="relative w-full h-6 flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={imageSettings.brightness}
                          onChange={(e) => setImageSettings({...imageSettings, brightness: parseInt(e.target.value)})}
                          className="w-full h-[10px] appearance-none bg-transparent cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #0389A6 0%, #0389A6 ${imageSettings.brightness}%, #ECEFEF ${imageSettings.brightness}%, #ECEFEF 100%)`,
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                    </div>

                    {/* Contraste */}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-instrument text-sm font-medium text-[#002222] leading-[17.08px]">
                        Contraste: {imageSettings.contrast}%
                      </span>
                      <div className="relative w-full h-6 flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={imageSettings.contrast}
                          onChange={(e) => setImageSettings({...imageSettings, contrast: parseInt(e.target.value)})}
                          className="w-full h-[10px] appearance-none bg-transparent cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #0389A6 0%, #0389A6 ${imageSettings.contrast}%, #ECEFEF ${imageSettings.contrast}%, #ECEFEF 100%)`,
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                    </div>

                    {/* Saturation */}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-instrument text-sm font-medium text-[#002222] leading-[17.08px]">
                        Saturation: {imageSettings.saturation}%
                      </span>
                      <div className="relative w-full h-6 flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={imageSettings.saturation}
                          onChange={(e) => setImageSettings({...imageSettings, saturation: parseInt(e.target.value)})}
                          className="w-full h-[10px] appearance-none bg-transparent cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #0389A6 0%, #0389A6 ${imageSettings.saturation}%, #ECEFEF ${imageSettings.saturation}%, #ECEFEF 100%)`,
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                    </div>

                    {/* Exposition */}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-instrument text-sm font-medium text-[#002222] leading-[17.08px]">
                        Exposition: {imageSettings.exposure}%
                      </span>
                      <div className="relative w-full h-6 flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={imageSettings.exposure}
                          onChange={(e) => setImageSettings({...imageSettings, exposure: parseInt(e.target.value)})}
                          className="w-full h-[10px] appearance-none bg-transparent cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #0389A6 0%, #0389A6 ${imageSettings.exposure}%, #ECEFEF ${imageSettings.exposure}%, #ECEFEF 100%)`,
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Paramètres de reconnaissance */}
                <div className="flex flex-col gap-5">
                  <h3 className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                    Paramètres de reconnaissance
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-5">
                    {/* Sensibilité de détection */}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-instrument text-sm font-medium text-[#002222] leading-[17.08px]">
                        Sensibilité de détection: {recognitionSettings.sensitivity}%
                      </span>
                      <div className="relative w-full h-6 flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={recognitionSettings.sensitivity}
                          onChange={(e) => setRecognitionSettings({...recognitionSettings, sensitivity: parseInt(e.target.value)})}
                          className="w-full h-[10px] appearance-none bg-transparent cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #0389A6 0%, #0389A6 ${recognitionSettings.sensitivity}%, #ECEFEF ${recognitionSettings.sensitivity}%, #ECEFEF 100%)`,
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                    </div>

                    {/* Confiance minimale */}
                    <div className="flex flex-col gap-0.5">
                      <span className="font-instrument text-sm font-medium text-[#002222] leading-[17.08px]">
                        Confiance minimale: {recognitionSettings.minConfidence}%
                      </span>
                      <div className="relative w-full h-6 flex items-center">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={recognitionSettings.minConfidence}
                          onChange={(e) => setRecognitionSettings({...recognitionSettings, minConfidence: parseInt(e.target.value)})}
                          className="w-full h-[10px] appearance-none bg-transparent cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, #0389A6 0%, #0389A6 ${recognitionSettings.minConfidence}%, #ECEFEF ${recognitionSettings.minConfidence}%, #ECEFEF 100%)`,
                            borderRadius: '5px'
                          }}
                        />
                      </div>
                    </div>

                  </div>

                  {/* Visages simultanés max - Full width */}
                  <div className="flex flex-col gap-0.5">
                    <span className="font-instrument text-sm font-medium text-[#002222] leading-[17.08px]">
                      Visages simultanés max: {recognitionSettings.maxFaces}%
                    </span>
                    <div className="relative w-full h-6 flex items-center" style={{ width: '510px' }}>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={recognitionSettings.maxFaces}
                        onChange={(e) => setRecognitionSettings({...recognitionSettings, maxFaces: parseInt(e.target.value)})}
                        className="w-full h-[10px] appearance-none bg-transparent cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #0389A6 0%, #0389A6 ${recognitionSettings.maxFaces}%, #ECEFEF ${recognitionSettings.maxFaces}%, #ECEFEF 100%)`,
                          borderRadius: '5px'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Options avancées */}
                <div className="flex flex-col gap-2.5">
                  <h3 className="font-instrument text-base font-semibold text-[#002222] leading-[19.52px]">
                    Options avancées
                  </h3>
                  
                  {/* Journalisation des événements */}
                  <div className="flex justify-between items-center gap-[50px]">
                    <div className="flex flex-col gap-2" style={{ width: '379px' }}>
                      <span className="font-instrument text-sm font-semibold text-[#002222] leading-[17.08px]">
                        Journalisation des événements
                      </span>
                      <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Enregistrer tous les événements de reconnaissance
                      </span>
                    </div>
                    <button onClick={() => setAdvancedOptions({...advancedOptions, eventLogging: !advancedOptions.eventLogging})}>
                      {advancedOptions.eventLogging ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </button>
                  </div>

                  {/* Enregistrement vidéo */}
                  <div className="flex justify-between items-center gap-[50px]">
                    <div className="flex flex-col gap-2" style={{ width: '379px' }}>
                      <span className="font-instrument text-sm font-semibold text-[#002222] leading-[17.08px]">
                        Enregistrement vidéo
                      </span>
                      <span className="font-instrument text-sm text-[#5A6565] leading-[17.08px]">
                        Enregistrer les séquences vidéo lors des détections
                      </span>
                    </div>
                    <button onClick={() => setAdvancedOptions({...advancedOptions, videoRecording: !advancedOptions.videoRecording})}>
                      {advancedOptions.videoRecording ? <ToggleOnIcon /> : <ToggleOffIcon />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer avec boutons */}
              <div className="flex justify-end items-center gap-5 px-[30px] py-2.5 border-t border-[#D4DCDC]">
                <button 
                  onClick={() => {
                    // Réinitialiser tous les paramètres à leurs valeurs par défaut
                    setImageSettings({
                      brightness: 50,
                      contrast: 50,
                      saturation: 50,
                      exposure: 50
                    });
                    setRecognitionSettings({
                      sensitivity: 50,
                      minConfidence: 50,
                      maxFaces: 50
                    });
                    setAdvancedOptions({
                      eventLogging: true,
                      videoRecording: false
                    });
                    alert('Paramètres réinitialisés aux valeurs par défaut');
                  }}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors cursor-pointer"
                >
                  <span className="font-instrument text-base text-[#002222] leading-[19.52px]">
                    Réinitialiser par défaut
                  </span>
                </button>
                <button 
                  onClick={() => {
                    // Sauvegarder les paramètres dans localStorage
                    const settingsToSave = {
                      imageSettings,
                      recognitionSettings,
                      advancedOptions,
                      savedAt: new Date().toISOString()
                    };
                    
                    try {
                      localStorage.setItem('cameraGlobalSettings', JSON.stringify(settingsToSave));
                      console.log('Paramètres sauvegardés:', settingsToSave);
                      alert('Paramètres sauvegardés avec succès !');
                    } catch (error) {
                      console.error('Erreur lors de la sauvegarde:', error);
                      alert('Une erreur est survenue lors de la sauvegarde des paramètres');
                    }
                  }}
                  className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#0389A6] rounded-2xl hover:bg-[#027A94] transition-colors cursor-pointer"
                >
                  <span className="font-instrument text-base text-white leading-[19.52px]">
                    Sauvegarder les paramètres
                  </span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'Surveillance' && (
            <div className="flex flex-col gap-5">
              {/* Partie 1: Sélection de la caméra */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-visible">
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC] bg-white">
                  <CameraIconSmall />
                  <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">Surveillance des caméras</h2>
                </div>

                {/* Contenu */}
                <div className="flex flex-col gap-5 px-5 py-2.5 pb-5 relative">
                  <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                    Sélectionnez une caméra pour surveiller son flux en temps réel
                  </p>

                  {/* Input de sélection */}
                  <div className="relative w-full z-50" ref={dropdownRef}>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDropdownOpen(!isDropdownOpen);
                      }}
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl flex justify-between items-center gap-2.5 px-[26px] py-2.5 hover:bg-[#E5E9E9] transition-colors cursor-pointer min-h-[44px]"
                    >
                      <span className="font-instrument text-base text-[#5A6565] leading-[26px] flex-1 text-left">
                        {selectedCamera ? `${selectedCamera.name} - ${selectedCamera.location}` : 'Sélectionner une caméra'}
                      </span>
                      <div className="flex-shrink-0 p-2 -mr-2 cursor-pointer">
                        <svg 
                          width="16" 
                          height="16" 
                          viewBox="0 0 16 16" 
                          fill="none" 
                          xmlns="http://www.w3.org/2000/svg"
                          className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                        >
                          <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                    </button>

                    {/* Menu déroulant */}
                    {isDropdownOpen && (
                      <div 
                        className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-2xl z-[9999] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxHeight: '500px' }}
                      >
                        <div className="flex flex-col p-2.5 gap-1 overflow-y-auto" style={{ maxHeight: '500px' }}>
                          {cameras.filter(cam => cam.active).length > 0 ? (
                            cameras.filter(cam => cam.active).map((camera) => (
                              <button
                                key={camera.id}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedCamera(camera);
                                  setIsDropdownOpen(false);
                                  // Synchroniser la caméra active avec Pointage
                                  cameraSyncService.setActiveCamera(camera);
                                }}
                                className={`flex justify-between items-center gap-3 px-3 py-2.5 rounded-[10px] transition-colors w-full min-h-[48px] cursor-pointer ${
                                  selectedCamera?.id === camera.id
                                    ? 'bg-[#ECEFEF]'
                                    : 'bg-transparent hover:bg-[#ECEFEF]/50'
                                }`}
                              >
                                <div className="flex items-center gap-2 flex-1">
                                <span className="font-instrument text-xs text-[#5A6565] leading-[20px] flex-1 text-left" style={{ letterSpacing: '-0.24px' }}>
                                  {camera.name} - {camera.location}
                                </span>
                                  <span className={`font-instrument text-xs px-2 py-0.5 rounded-full ${
                                    camera.status === 'online' 
                                      ? 'bg-green-100 text-green-700' 
                                      : camera.status === 'offline'
                                      ? 'bg-gray-100 text-gray-600'
                                      : 'bg-red-100 text-red-700'
                                  }`}>
                                    {camera.status === 'online' ? 'En ligne' : camera.status === 'offline' ? 'Hors ligne' : 'Erreur'}
                                  </span>
                                </div>
                                <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                                  {selectedCamera?.id === camera.id && <TickIcon />}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="px-1.5 py-3 text-center">
                              <span className="font-instrument text-xs text-[#5A6565]">Aucune caméra active disponible</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Partie 2: Flux vidéo en direct - TOUJOURS VISIBLE */}
              <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden flex flex-col w-full" style={{ display: 'block', visibility: 'visible', opacity: 1 }}>
                {/* Header */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC] bg-white">
                  <CameraIconSmall />
                  <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">Flux vidéo en direct</h2>
                </div>

                {/* Contenu */}
                <div className="flex flex-col gap-5 p-5">
                  {/* Texte descriptif */}
                  <div className="flex items-center justify-between">
                    <p className="font-instrument text-base font-semibold text-[#5A6565] leading-[24px]">
                      Visualisation du flux de la caméra {selectedCamera ? selectedCamera.name : 'Hall d\'entrée'}
                    </p>
                    {/* Bouton pour utiliser cette caméra dans Pointage */}
                    {selectedCamera && (
                      <button
                        onClick={() => {
                          // Synchroniser la caméra active
                          cameraSyncService.setActiveCamera(selectedCamera);
                          // Naviguer vers Pointage
                          navigate('/pointage');
                        }}
                        className="px-3 py-1.5 bg-[#0389A6] text-white rounded-xl hover:bg-[#027A94] transition-colors font-instrument text-xs"
                        title="Utiliser cette caméra pour le pointage"
                      >
                        Utiliser pour pointage
                      </button>
                    )}
                  </div>

                  {/* Zone de visualisation vidéo */}
                  <div className="relative bg-[#002222] border border-[#D4DCDC] rounded-2xl flex flex-col justify-between items-center px-5 py-[10px]" style={{ height: '361px' }}>
                    {/* Badge Pause en haut à droite */}
                    <div className="absolute top-5 right-5 flex items-center gap-1.5 px-[6px] py-0.5 pr-2.5 bg-white rounded-md">
                      <div className="w-1.5 h-1.5 bg-[#0389A6] rounded-full"></div>
                      <span className="font-instrument text-xs font-medium text-[#002222] leading-[18px]">Pause</span>
                    </div>

                    {/* Contenu central */}
                    <div className="flex flex-col justify-center items-center gap-4 flex-1">
                      {/* Icône caméra avec opacité */}
                      <div className="opacity-60">
                        <img src={cameraIconPause} alt="Caméra" width="50" height="50" />
                      </div>
                      
                      {/* Textes */}
                      <div className="flex flex-col justify-center items-center gap-0">
                        <span className="font-instrument text-base font-semibold text-white leading-[24px]">Caméra en pause</span>
                        <span className="font-instrument text-base font-normal text-[#ECEFEF] leading-[26px]">
                          Cliquez sur Démarrer pour activer la reconnaissance
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Boutons de contrôle */}
                  <div className="flex justify-between items-center gap-5" style={{ width: '430px', alignSelf: 'center' }}>
                    {/* Bouton Lecture */}
                    <button
                      onClick={() => {
                        setIsVideoPlaying(true);
                        console.log('Lecture du flux vidéo');
                      }}
                      className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 4.5L19 12L5 19.5V4.5Z" fill="#002222"/>
                      </svg>
                      <span className="font-instrument text-base text-[#002222] leading-[19.52px]">Lecture</span>
                    </button>

                    {/* Bouton Pause */}
                    <button
                      onClick={() => {
                        setIsVideoPlaying(false);
                        console.log('Pause du flux vidéo');
                      }}
                      className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="6" y="4.5" width="6" height="15" fill="#002222"/>
                        <rect x="12" y="4.5" width="6" height="15" fill="#002222"/>
                      </svg>
                      <span className="font-instrument text-base text-[#002222] leading-[19.52px]">Pause</span>
                    </button>

                    {/* Bouton Capture d'écran */}
                    <button
                      onClick={() => {
                        // Logique de capture d'écran
                        console.log('Capture d\'écran');
                        const timestamp = new Date().toLocaleString('fr-FR');
                        alert(`Capture d'écran effectuée !\nDate: ${timestamp}`);
                      }}
                      className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors"
                    >
                      <span className="font-instrument text-base text-[#002222] leading-[19.52px]">Capture d'écran</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal Ajouter une caméra */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-[600px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', zIndex: 10000 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center gap-2.5 px-6 py-2.5 border-b border-[#D4DCDC] rounded-t-[25px]">
              <h2 className="font-instrument text-base font-bold text-[#002222] leading-[34px]">
                Ajouter une nouvelle caméra
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Contenu */}
            <div className="flex flex-col gap-5 px-[30px] py-2.5 pb-[30px] overflow-y-auto">
              <p className="font-instrument text-base font-medium text-[#3E4B4B] leading-[24px]">
                Configurez une nouvelle caméra pour la reconnaissance faciale
              </p>

              {/* Nom de la caméra */}
              <div className="flex flex-col gap-0.5">
                <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                  Nom de la caméra *
                </label>
                <input
                  type="text"
                  value={addFormData.name}
                  onChange={(e) => setAddFormData({...addFormData, name: e.target.value})}
                  placeholder="Ex: hall d'entrée"
                  className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                />
              </div>

              {/* Type de caméra */}
              <div className="flex flex-col gap-0.5 relative">
                <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                  Type de caméra *
                </label>
                <button
                  onClick={() => setIsAddTypeDropdownOpen(!isAddTypeDropdownOpen)}
                  className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center font-instrument text-base text-[#5A6565] leading-[26px] hover:bg-[#E5E9E9] transition-colors"
                >
                  <span>{addFormData.type === 'Autre' && addFormData.customType ? addFormData.customType : addFormData.type}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {isAddTypeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden">
                    {['IP', 'WEBCAM', 'RTSP', 'Autre'].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          if (type === 'Autre') {
                            setAddFormData({
                              ...addFormData,
                              type: 'Autre',
                              customType: '',
                              rtspUrl: '',
                              ip: '',
                              port: '',
                              webcamDeviceId: '',
                            });
                          } else {
                            setAddFormData({
                              ...addFormData,
                              type,
                              customType: '',
                              rtspUrl: type === 'RTSP' ? addFormData.rtspUrl : '',
                              ip: type === 'IP' ? addFormData.ip : '',
                              port: type === 'IP' ? addFormData.port : '',
                              webcamDeviceId: type === 'WEBCAM' ? addFormData.webcamDeviceId : '',
                            });
                          }
                          setIsAddTypeDropdownOpen(false);
                        }}
                        className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#002222] hover:bg-[#ECEFEF] transition-colors"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
                {/* Champ de saisie pour type personnalisé */}
                {addFormData.type === 'Autre' && (
                  <div className="mt-2 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-sm font-medium text-[#002222] leading-[26px]">
                      Spécifier le type de caméra *
                    </label>
                    <input
                      type="text"
                      value={addFormData.customType}
                      onChange={(e) => setAddFormData({...addFormData, customType: e.target.value})}
                      placeholder="Ex: USB, HDMI, Analogique..."
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                    />
                  </div>
                )}
              </div>

              {/* URL RTSP (si type RTSP) */}
              {addFormData.type === 'RTSP' && (
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    URL RTSP *
                  </label>
                  <input
                    type="text"
                    value={addFormData.rtspUrl}
                    onChange={(e) => setAddFormData({ ...addFormData, rtspUrl: e.target.value })}
                    placeholder="Ex: rtsp://user:pass@192.168.1.10:554/stream1"
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                  />
                </div>
              )}

              {/* WEBCAM (si type WEBCAM) */}
              {addFormData.type === 'WEBCAM' && (
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Webcam *
                  </label>
                  <select
                    value={addFormData.webcamDeviceId}
                    onChange={(e) => setAddFormData({ ...addFormData, webcamDeviceId: e.target.value })}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                  >
                    <option value="">Sélectionner une webcam</option>
                    {webcamDevices.map((d, idx) => (
                      <option key={d.deviceId || idx} value={d.deviceId}>
                        {d.label || `Webcam ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Localisation */}
              <div className="flex flex-col gap-0.5">
                <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                  Localisation *
                </label>
                <input
                  type="text"
                  value={addFormData.location}
                  onChange={(e) => setAddFormData({...addFormData, location: e.target.value})}
                  placeholder="Ex: Entrepôt"
                  className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                />
              </div>

              {/* Adresse IP et Port (si type IP) */}
              {addFormData.type === 'IP' && (
                <div className="flex gap-5">
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Adresse IP *
                    </label>
                    <input
                      type="text"
                      value={addFormData.ip}
                      onChange={(e) => setAddFormData({...addFormData, ip: e.target.value})}
                      placeholder="192.168.1.10"
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Port *
                    </label>
                    <input
                      type="text"
                      value={addFormData.port}
                      onChange={(e) => setAddFormData({...addFormData, port: e.target.value})}
                      placeholder="554"
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                    />
                  </div>
                </div>
              )}

              {/* Nom d'utilisateur et Mot de passe */}
              <div className="flex gap-5">
                <div className="flex-1 flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={addFormData.username}
                    onChange={(e) => setAddFormData({...addFormData, username: e.target.value})}
                    placeholder="Admin"
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={addFormData.password}
                    onChange={(e) => setAddFormData({...addFormData, password: e.target.value})}
                    placeholder="mot de passe"
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setAddFormData({...addFormData, active: !addFormData.active})}>
                    {addFormData.active ? (
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2.5" y="7.5" width="25" height="15" rx="7.5" fill="#01A04E"/>
                        <circle cx="11.25" cy="15" r="6.25" fill="white"/>
                      </svg>
                    ) : (
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2.5" y="7.5" width="25" height="15" rx="7.5" fill="#D4DCDC"/>
                        <circle cx="18.75" cy="15" r="6.25" fill="white"/>
                      </svg>
                    )}
                  </button>
                  <span className="font-instrument text-xs font-semibold text-[#002222] leading-[20px]">
                    Activer la caméra
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setAddFormData({...addFormData, facialRecognition: !addFormData.facialRecognition})}>
                    {addFormData.facialRecognition ? (
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2.5" y="7.5" width="25" height="15" rx="7.5" fill="#01A04E"/>
                        <circle cx="11.25" cy="15" r="6.25" fill="white"/>
                      </svg>
                    ) : (
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2.5" y="7.5" width="25" height="15" rx="7.5" fill="#D4DCDC"/>
                        <circle cx="18.75" cy="15" r="6.25" fill="white"/>
                      </svg>
                    )}
                  </button>
                  <span className="font-instrument text-xs font-semibold text-[#002222] leading-[20px]">
                    Reconnaissance faciale
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-5 px-[30px] py-2.5 border-t border-[#D4DCDC] rounded-b-[25px]">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors"
              >
                <span className="font-instrument text-base text-[#002222] leading-[19.52px]">
                  Annuler
                </span>
              </button>
              <button
                onClick={() => {
                  // Valider les champs obligatoires
                  if (!addFormData.name || !addFormData.type || !addFormData.location) {
                    alert('Veuillez remplir tous les champs obligatoires (*)');
                    return;
                  }

                  // Valider que si "Autre" est sélectionné, le type personnalisé doit être rempli
                  if (addFormData.type === 'Autre' && !addFormData.customType?.trim()) {
                    alert('Veuillez spécifier le type de caméra');
                    return;
                  }

                  // Valider que si RTSP est sélectionné, l'URL RTSP doit être remplie
                  if (addFormData.type === 'RTSP' && !addFormData.rtspUrl?.trim()) {
                    alert('Veuillez renseigner l\'URL RTSP');
                    return;
                  }

                  if (addFormData.type === 'IP') {
                    if (!addFormData.ip?.trim() || !addFormData.port?.trim()) {
                      alert('Veuillez renseigner l\'adresse IP et le port');
                      return;
                    }
                    const portNum = Number(addFormData.port);
                    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
                      alert('Port invalide');
                      return;
                    }
                  }

                  if (addFormData.type === 'WEBCAM' && !addFormData.webcamDeviceId) {
                    alert('Veuillez sélectionner une webcam');
                    return;
                  }

                  // Récupérer l'utilisateur connecté
                  const { user } = authService.getStoredAuth();
                  if (!user || !user.email) {
                    alert('Erreur: Aucun utilisateur connecté. Veuillez vous reconnecter.');
                    return;
                  }

                  // Utiliser la forme fonctionnelle de setState pour éviter les problèmes de closure
                  setCameras(prevCameras => {
                    // Générer un ID unique basé sur la liste actuelle
                    const newId = prevCameras.length > 0 ? Math.max(...prevCameras.map(c => c.id)) + 1 : 1;

                    // Déterminer le type final (type personnalisé si "Autre" est sélectionné)
                    const finalType = addFormData.type === 'Autre' && addFormData.customType?.trim() 
                      ? addFormData.customType.trim() 
                      : addFormData.type;

                    // Créer la nouvelle caméra avec l'email de l'utilisateur
                    const newCamera = {
                      id: newId,
                      name: addFormData.name,
                      location: addFormData.location,
                      status: 'offline', // Nouvelle caméra par défaut hors ligne
                      ip: addFormData.type === 'IP' && addFormData.ip && addFormData.port ? `${addFormData.ip}:${addFormData.port}` : null,
                      rtspUrl: addFormData.type === 'RTSP' ? (addFormData.rtspUrl?.trim() || null) : null,
                      webcamDeviceId: addFormData.type === 'WEBCAM' ? addFormData.webcamDeviceId : null,
                      resolution: '1920x1080',
                      fps: 30,
                      confidence: null,
                      active: addFormData.active,
                      lastConnection: 'Jamais connecté',
                      type: finalType,
                      userEmail: user.email // Associer la caméra à l'utilisateur
                    };

                    console.log('Nouvelle caméra créée:', newCamera);
                    console.log('Ancienne liste des caméras:', prevCameras);
                    
                    const updatedCameras = [...prevCameras, newCamera];
                    console.log('Nouvelle liste des caméras:', updatedCameras);
                    
                    // Sauvegarder toutes les caméras dans localStorage (y compris celles des autres utilisateurs)
                    const allCameras = JSON.parse(localStorage.getItem('cameras') || '[]');
                    const existingCameraIndex = allCameras.findIndex(c => c.id === newCamera.id && c.userEmail === newCamera.userEmail);
                    if (existingCameraIndex === -1) {
                      allCameras.push(newCamera);
                    } else {
                      allCameras[existingCameraIndex] = newCamera;
                    }
                    localStorage.setItem('cameras', JSON.stringify(allCameras));
                    
                    return updatedCameras;
                  });

                  // Réinitialiser le formulaire
                  setAddFormData({
                    name: '',
                    type: 'IP',
                    customType: '',
                    location: '',
                    ip: '',
                    port: '',
                    rtspUrl: '',
                    webcamDeviceId: '',
                    username: '',
                    password: '',
                    active: true,
                    facialRecognition: true
                  });

                  // Fermer la modal
                  setIsAddModalOpen(false);
                }}
                className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#0389A6] rounded-2xl hover:bg-[#027A94] transition-colors"
              >
                <span className="font-instrument text-base text-white leading-[19.52px]">
                  Ajouter la caméra
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifier la caméra */}
      {isEditModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            zIndex: 9999,
            backgroundColor: 'rgba(0, 0, 0, 0.5)'
          }}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl w-[600px] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" 
            onClick={(e) => e.stopPropagation()}
            style={{ position: 'relative', zIndex: 10000 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center gap-2.5 px-6 py-2.5 border-b border-[#D4DCDC] rounded-t-[25px]">
              <h2 className="font-instrument text-base font-bold text-[#002222] leading-[34px]">
                Modifier la caméra
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Contenu */}
            <div className="flex flex-col gap-5 px-[30px] py-2.5 pb-[30px] overflow-y-auto">
              <p className="font-instrument text-base font-medium text-[#3E4B4B] leading-[24px]">
                Modifiez la configuration de la caméra
              </p>

              {/* Nom de la caméra */}
              <div className="flex flex-col gap-0.5">
                <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                  Nom de la caméra *
                </label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                  placeholder="Ex: hall d'entrée"
                  className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                />
              </div>

              {/* Type de caméra */}
              <div className="flex flex-col gap-0.5 relative">
                <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                  Type de caméra *
                </label>
                <button
                  onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                  className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 flex justify-between items-center font-instrument text-base text-[#5A6565] leading-[26px] hover:bg-[#E5E9E9] transition-colors"
                >
                  <span>{editFormData.type === 'Autre' && editFormData.customType ? editFormData.customType : editFormData.type}</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {isTypeDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden">
                    {['IP', 'WEBCAM', 'RTSP', 'Autre'].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          if (type === 'Autre') {
                            setEditFormData({
                              ...editFormData,
                              type: 'Autre',
                              customType: editFormData.customType || '',
                              rtspUrl: '',
                              ip: '',
                              port: '',
                              webcamDeviceId: '',
                            });
                          } else {
                            setEditFormData({
                              ...editFormData,
                              type,
                              customType: '',
                              rtspUrl: type === 'RTSP' ? editFormData.rtspUrl : '',
                              ip: type === 'IP' ? editFormData.ip : '',
                              port: type === 'IP' ? editFormData.port : '',
                              webcamDeviceId: type === 'WEBCAM' ? editFormData.webcamDeviceId : '',
                            });
                          }
                          setIsTypeDropdownOpen(false);
                        }}
                        className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#002222] hover:bg-[#ECEFEF] transition-colors"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
                {/* Champ de saisie pour type personnalisé */}
                {editFormData.type === 'Autre' && (
                  <div className="mt-2 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-sm font-medium text-[#002222] leading-[26px]">
                      Spécifier le type de caméra *
                    </label>
                    <input
                      type="text"
                      value={editFormData.customType}
                      onChange={(e) => setEditFormData({...editFormData, customType: e.target.value})}
                      placeholder="Ex: USB, HDMI, Analogique..."
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                    />
                  </div>
                )}
              </div>

              {/* URL RTSP (si type RTSP) */}
              {editFormData.type === 'RTSP' && (
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    URL RTSP *
                  </label>
                  <input
                    type="text"
                    value={editFormData.rtspUrl}
                    onChange={(e) => setEditFormData({ ...editFormData, rtspUrl: e.target.value })}
                    placeholder="Ex: rtsp://user:pass@192.168.1.10:554/stream1"
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                  />
                </div>
              )}

              {/* WEBCAM (si type WEBCAM) */}
              {editFormData.type === 'WEBCAM' && (
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Webcam *
                  </label>
                  <select
                    value={editFormData.webcamDeviceId}
                    onChange={(e) => setEditFormData({ ...editFormData, webcamDeviceId: e.target.value })}
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                  >
                    <option value="">Sélectionner une webcam</option>
                    {webcamDevices.map((d, idx) => (
                      <option key={d.deviceId || idx} value={d.deviceId}>
                        {d.label || `Webcam ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Localisation */}
              <div className="flex flex-col gap-0.5">
                <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                  Localisation *
                </label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({...editFormData, location: e.target.value})}
                  placeholder="Ex: Entrepôt"
                  className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                />
              </div>

              {/* Adresse IP et Port (si type IP) */}
              {editFormData.type === 'IP' && (
                <div className="flex gap-5">
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Adresse IP *
                    </label>
                    <input
                      type="text"
                      value={editFormData.ip}
                      onChange={(e) => setEditFormData({...editFormData, ip: e.target.value})}
                      placeholder="192.168.1.10"
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5">
                    <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                      Port *
                    </label>
                    <input
                      type="text"
                      value={editFormData.port}
                      onChange={(e) => setEditFormData({...editFormData, port: e.target.value})}
                      placeholder="554"
                      className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                    />
                  </div>
                </div>
              )}

              {/* Nom d'utilisateur et Mot de passe */}
              <div className="flex gap-5">
                <div className="flex-1 flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Nom d'utilisateur
                  </label>
                  <input
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                    placeholder="Admin"
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Mot de passe
                  </label>
                  <input
                    type="password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                    placeholder="mot de passe"
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#5A6565] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:ring-2 focus:ring-[#0389A6]"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setEditFormData({...editFormData, active: !editFormData.active})}>
                    {editFormData.active ? (
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2.5" y="7.5" width="25" height="15" rx="7.5" fill="#01A04E"/>
                        <circle cx="11.25" cy="15" r="6.25" fill="white"/>
                      </svg>
                    ) : (
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2.5" y="7.5" width="25" height="15" rx="7.5" fill="#D4DCDC"/>
                        <circle cx="18.75" cy="15" r="6.25" fill="white"/>
                      </svg>
                    )}
                  </button>
                  <span className="font-instrument text-xs font-semibold text-[#002222] leading-[20px]">
                    Activer la caméra
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <button onClick={() => setEditFormData({...editFormData, facialRecognition: !editFormData.facialRecognition})}>
                    {editFormData.facialRecognition ? (
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2.5" y="7.5" width="25" height="15" rx="7.5" fill="#01A04E"/>
                        <circle cx="11.25" cy="15" r="6.25" fill="white"/>
                      </svg>
                    ) : (
                      <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2.5" y="7.5" width="25" height="15" rx="7.5" fill="#D4DCDC"/>
                        <circle cx="18.75" cy="15" r="6.25" fill="white"/>
                      </svg>
                    )}
                  </button>
                  <span className="font-instrument text-xs font-semibold text-[#002222] leading-[20px]">
                    Reconnaissance faciale
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end items-center gap-5 px-[30px] py-2.5 border-t border-[#D4DCDC] rounded-b-[25px]">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex items-center justify-center gap-2.5 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors"
              >
                <span className="font-instrument text-base text-[#002222] leading-[19.52px]">
                  Annuler
                </span>
              </button>
              <button
                onClick={() => {
                  // Valider les champs obligatoires
                  if (!editFormData.name || !editFormData.type || !editFormData.location) {
                    alert('Veuillez remplir tous les champs obligatoires (*)');
                    return;
                  }

                  // Valider que si "Autre" est sélectionné, le type personnalisé doit être rempli
                  if (editFormData.type === 'Autre' && !editFormData.customType?.trim()) {
                    alert('Veuillez spécifier le type de caméra');
                    return;
                  }

                  // Valider que si RTSP est sélectionné, l'URL RTSP doit être remplie
                  if (editFormData.type === 'RTSP' && !editFormData.rtspUrl?.trim()) {
                    alert('Veuillez renseigner l\'URL RTSP');
                    return;
                  }

                  if (editFormData.type === 'IP') {
                    if (!editFormData.ip?.trim() || !editFormData.port?.trim()) {
                      alert('Veuillez renseigner l\'adresse IP et le port');
                      return;
                    }
                    const portNum = Number(editFormData.port);
                    if (!Number.isFinite(portNum) || portNum < 1 || portNum > 65535) {
                      alert('Port invalide');
                      return;
                    }
                  }

                  if (editFormData.type === 'WEBCAM' && !editFormData.webcamDeviceId) {
                    alert('Veuillez sélectionner une webcam');
                    return;
                  }

                  if (!editingCamera) {
                    console.error('Aucune caméra en cours d\'édition');
                    return;
                  }

                  // Déterminer le type final (type personnalisé si "Autre" est sélectionné)
                  const finalType = editFormData.type === 'Autre' && editFormData.customType?.trim() 
                    ? editFormData.customType.trim() 
                    : editFormData.type;

                  // Utiliser la forme fonctionnelle de setState pour éviter les problèmes de closure
                  setCameras(prevCameras => {
                    const updatedCameras = prevCameras.map(camera => {
                      if (camera.id === editingCamera.id) {
                        return {
                          ...camera,
                          name: editFormData.name,
                          type: finalType,
                          location: editFormData.location,
                          ip: editFormData.type === 'IP' && editFormData.ip && editFormData.port ? `${editFormData.ip}:${editFormData.port}` : null,
                          rtspUrl: editFormData.type === 'RTSP' ? (editFormData.rtspUrl?.trim() || null) : null,
                          webcamDeviceId: editFormData.type === 'WEBCAM' ? editFormData.webcamDeviceId : null,
                          active: editFormData.active,
                          userEmail: camera.userEmail // Préserver l'email de l'utilisateur
                        };
                      }
                      return camera;
                    });
                    
                    // Sauvegarder dans localStorage
                    const { user } = authService.getStoredAuth();
                    if (user && user.email) {
                      const allCameras = JSON.parse(localStorage.getItem('cameras') || '[]');
                      const cameraIndex = allCameras.findIndex(c => c.id === editingCamera.id && c.userEmail === user.email);
                      if (cameraIndex !== -1) {
                        allCameras[cameraIndex] = updatedCameras.find(c => c.id === editingCamera.id);
                        localStorage.setItem('cameras', JSON.stringify(allCameras));
                      }
                    }
                    
                    console.log('Caméra modifiée:', updatedCameras.find(c => c.id === editingCamera.id));
                    return updatedCameras;
                  });

                  // Réinitialiser les données
                  setEditingCamera(null);
                  setEditFormData({
                    name: '',
                    type: 'IP',
                    customType: '',
                    location: '',
                    ip: '',
                    port: '',
                    rtspUrl: '',
                    webcamDeviceId: '',
                    username: '',
                    password: '',
                    active: true,
                    facialRecognition: true
                  });

                  // Fermer la modal
                  setIsEditModalOpen(false);
                }}
                className="flex items-center justify-center gap-2.5 px-4 py-2.5 bg-[#0389A6] rounded-2xl hover:bg-[#027A94] transition-colors"
              >
                <span className="font-instrument text-base text-white leading-[19.52px]">
                  Enregistrer les modifications
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmation de suppression */}
      {isDeleteModalOpen && cameraToDelete && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsDeleteModalOpen(false);
              setCameraToDelete(null);
            }
          }}
        >
          <div 
            className="bg-white rounded-[30px] w-[469px] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-2.5 border-b border-[#D4DCDC]">
              <h2 className="font-instrument text-base font-bold text-[#002222] leading-[34px]">
                Supprimer la caméra
              </h2>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCameraToDelete(null);
                }}
                className="p-1 hover:bg-[#ECEFEF] rounded-md transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex flex-col gap-5 px-[30px] py-[30px] overflow-y-auto">
              <div className="flex flex-col justify-center items-center gap-[26px]">
                {/* Icône de poubelle */}
                <div className="w-[60px] h-[60px] bg-[rgba(216,67,67,0.1)] rounded-2xl flex items-center justify-center">
                  <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M3 6H5H21" stroke="#D84343" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="#D84343" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 11V17" stroke="#D84343" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M14 11V17" stroke="#D84343" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Texte */}
                <div className="flex flex-col items-center gap-[6px]">
                  <p className="font-instrument text-base font-bold text-[#002222] leading-[24px] text-center">
                    Êtes-vous sûr de vouloir supprimer définitivement cette caméra ?
                  </p>
                  <p className="font-instrument text-sm text-[#5A6565] leading-[24px] text-center">
                    Cette action est irréversible et supprimera toutes les données associées à cette caméra.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-center items-center gap-5 px-10 py-5 border-t border-[#D4DCDC] bg-white">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCameraToDelete(null);
                }}
                className="flex-1 px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px]"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  if (cameraToDelete) {
                    const { user } = authService.getStoredAuth();
                    if (user && user.email) {
                      // Supprimer de la liste locale
                      setCameras(prevCameras => prevCameras.filter(cam => cam.id !== cameraToDelete.id));
                      
                      // Supprimer de localStorage (uniquement si c'est la caméra de l'utilisateur connecté)
                      const allCameras = JSON.parse(localStorage.getItem('cameras') || '[]');
                      const updatedAllCameras = allCameras.filter(c => 
                        !(c.id === cameraToDelete.id && c.userEmail === user.email)
                      );
                      localStorage.setItem('cameras', JSON.stringify(updatedAllCameras));
                      
                      console.log(`Caméra ${cameraToDelete.name} supprimée pour l'utilisateur`, user.email);
                    } else {
                      // Fallback si pas d'utilisateur connecté
                    setCameras(prevCameras => prevCameras.filter(cam => cam.id !== cameraToDelete.id));
                    console.log(`Caméra ${cameraToDelete.name} supprimée`);
                    }
                    setIsDeleteModalOpen(false);
                    setCameraToDelete(null);
                  }
                }}
                className="px-4 py-2.5 bg-[#D84343] text-white rounded-2xl hover:bg-[#C73A3A] transition-colors font-instrument text-base leading-[19.52px]"
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

export default Cameras;