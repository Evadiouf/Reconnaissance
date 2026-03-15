import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import NotificationIcon from '../components/NotificationIcon';
import ProfileDropdown from '../components/ProfileDropdown';
import FaceCapture from '../components/FaceCapture';
import SimpleFaceCapture from '../components/SimpleFaceCapture';
import AttendanceFaceCapture from '../components/AttendanceFaceCapture';
import attendanceService from '../services/attendanceService';
import authService from '../services/authService';
import { getUserData } from '../services/userDataService';
import notificationService from '../services/notificationService';
import faceRecognitionService from '../services/faceRecognitionService';
import companiesService from '../services/companiesService';
import cameraSyncService, { findCameraByString, cameraToString } from '../services/cameraSyncService';

function Pointage() {
  const navigate = useNavigate();

  // Audio feedback (success/failure/checkout)
  const audioRef = useRef({ success: null, failure: null, checkout: null });
  const [isSoundMuted, setIsSoundMuted] = useState(() => {
    try {
      return localStorage.getItem('attendanceSoundMuted') === 'true';
    } catch {
      return false;
    }
  });
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const unlockAudio = async () => {
    if (isAudioUnlocked) return;
    try {
      const a = audioRef.current.success;
      if (!a) {
        setIsAudioUnlocked(true);
        return;
      }
      const prevMuted = a.muted;
      const prevVolume = a.volume;
      a.muted = true;
      a.volume = 0;
      await a.play();
      a.pause();
      a.currentTime = 0;
      a.muted = prevMuted;
      a.volume = prevVolume;
      setIsAudioUnlocked(true);
    } catch {
      // ignore
    }
  };
  
  // État pour l'horloge temps réel
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRecognitionActive, setIsRecognitionActive] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState('Hall d\'entrée - Rez-de-chaussée');
  const [showCameraDropdown, setShowCameraDropdown] = useState(false);
  const [recentEvents, setRecentEvents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    present: 0
  });
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceError, setAttendanceError] = useState('');
  
  // États pour la reconnaissance faciale
  const [showFaceRecognition, setShowFaceRecognition] = useState(false);
  const [faceRecognitionMode, setFaceRecognitionMode] = useState('clockin'); // 'clockin' ou 'clockout'
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [isProcessingFaceAttendance, setIsProcessingFaceAttendance] = useState(false);

  // Debug: Surveiller l'état de la modal
  useEffect(() => {
    console.log('🔍 État showFaceRecognition:', showFaceRecognition);
    console.log('🔍 État faceRecognitionMode:', faceRecognitionMode);
    console.log('🔍 État isRecognitionActive:', isRecognitionActive);
  }, [showFaceRecognition, faceRecognitionMode, isRecognitionActive]);
  
  // État pour le pointage manuel
  const [currentAttendance, setCurrentAttendance] = useState(null); // Pointage actuel de l'utilisateur
  const [isClockInLoading, setIsClockInLoading] = useState(false);
  const [isClockOutLoading, setIsClockOutLoading] = useState(false);
  const [clockMessage, setClockMessage] = useState({ type: '', text: '' }); // 'success' ou 'error'
  
  // État pour les caméras
  const [availableCameras, setAvailableCameras] = useState([]);
  
  // Référence pour le conteneur du menu déroulant caméra
  const cameraDropdownRef = useRef(null);

  // Mise à jour de l'horloge chaque seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Précharger les audios (non bloquant)
  useEffect(() => {
    const init = () => {
      try {
        audioRef.current.success = new Audio('/audio/success.mp3');
        audioRef.current.failure = new Audio('/audio/failure.mp3');
        audioRef.current.checkout = new Audio('/audio/checkout.mp3');
        Object.values(audioRef.current).forEach((a) => {
          if (!a) return;
          a.preload = 'auto';
          a.muted = isSoundMuted;
        });
      } catch (e) {
        console.warn('Audio init failed:', e);
      }
    };

    const w = window;
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(init);
    } else {
      setTimeout(init, 0);
    }
  }, []);

  // Persister l'état mute
  useEffect(() => {
    try {
      localStorage.setItem('attendanceSoundMuted', String(isSoundMuted));
    } catch {
      // ignore
    }
    Object.values(audioRef.current).forEach((a) => {
      if (a) a.muted = isSoundMuted;
    });
  }, [isSoundMuted]);

  // Débloquer l'audio après première interaction utilisateur
  useEffect(() => {
    if (isAudioUnlocked) return;

    const handler = () => {
      unlockAudio();
    };

    // capture: true pour ne pas être bloqué par stopPropagation() sur certains boutons
    document.addEventListener('click', handler, { once: true, capture: true });
    return () => document.removeEventListener('click', handler, { capture: true });
  }, [isAudioUnlocked]);

  const playSound = async (key) => {
    if (isSoundMuted) return;
    if (!isAudioUnlocked) return;
    const a = audioRef.current[key];
    if (!a) return;
    try {
      a.currentTime = 0;
      await a.play();
    } catch (e) {
      // ignore
    }
  };

  // Système de rappels automatiques pour le pointage
  useEffect(() => {
    const checkAttendanceReminder = () => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Vérifier si c'est l'heure du rappel (par exemple 8h00 pour l'arrivée et 17h00 pour la sortie)
      const reminderTimes = [
        { hour: 8, minute: 0, type: 'arrival' },
        { hour: 17, minute: 0, type: 'departure' }
      ];
      
      reminderTimes.forEach(({ hour, minute, type }) => {
        if (currentHour === hour && currentMinute === minute) {
          // Vérifier si l'utilisateur n'a pas encore pointé
          const userData = getUserData();
          if (userData && userData.email) {
            // Vérifier si l'utilisateur a déjà pointé aujourd'hui
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Envoyer le rappel seulement si les rappels sont activés
            notificationService.sendAttendanceReminder(
              userData.email,
              userData.nomComplet || userData.fullName || 'Utilisateur'
            );
          }
        }
      });
    };
    
    // Vérifier toutes les minutes
    const reminderInterval = setInterval(checkAttendanceReminder, 60000);
    
    return () => clearInterval(reminderInterval);
  }, []);

  // Fermer le menu déroulant quand on clique à l'extérieur
  useEffect(() => {
    if (!showCameraDropdown) return;

    const handleClickOutside = (event) => {
      try {
        // Vérifier si le clic est à l'intérieur du conteneur du menu déroulant
        if (cameraDropdownRef.current && !cameraDropdownRef.current.contains(event.target)) {
          setShowCameraDropdown(false);
        }
      } catch (error) {
        console.error('Erreur dans handleClickOutside:', error);
        setShowCameraDropdown(false);
      }
    };

    // Utiliser un petit délai pour éviter que le clic sur le bouton ne ferme immédiatement le menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showCameraDropdown]);

  // Formatage de l'heure
  const formatTime = (date) => {
    try {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch (error) {
      console.error('Erreur lors du formatage de l\'heure:', error);
      return '';
    }
  };

  // Formatage de la localisation
  const formatLocation = (location) => {
    if (!location) return 'N/A';
    
    // Si c'est déjà une chaîne, la retourner telle quelle
    if (typeof location === 'string') {
      return location;
    }
    
    // Si c'est un objet avec lat/lng, formater en coordonnées
    if (typeof location === 'object' && location !== null) {
      if (location.lat !== undefined && location.lng !== undefined) {
        return `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
      }
      // Si c'est un autre type d'objet, essayer de le convertir en chaîne
      return JSON.stringify(location);
    }
    
    return String(location);
  };

  // Formatage de la date
  const formatDate = (date) => {
    try {
      if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
        return '';
      }
      return date.toLocaleDateString('fr-FR', { 
        weekday: 'long', 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      });
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return '';
    }
  };

  // Charger les caméras depuis localStorage et synchroniser avec la caméra active
  useEffect(() => {
    const loadCameras = () => {
      try {
        const savedCameras = localStorage.getItem('cameras');
        if (savedCameras) {
          const parsed = JSON.parse(savedCameras);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAvailableCameras(parsed);
            
            // Vérifier s'il y a une caméra active synchronisée
            const activeCamera = cameraSyncService.syncActiveCamera(parsed);
            
            if (activeCamera) {
              // Utiliser la caméra active synchronisée
              setSelectedCamera(cameraToString(activeCamera));
            } else {
              // Sinon, sélectionner la première caméra active par défaut (priorité aux caméras en ligne)
              const firstActive = parsed.find(cam => cam.active && cam.status === 'online') 
                || parsed.find(cam => cam.active);
              if (firstActive) {
                const cameraString = cameraToString(firstActive);
                setSelectedCamera(cameraString);
                // Sauvegarder comme caméra active
                cameraSyncService.setActiveCamera(firstActive);
              }
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des caméras:', error);
      }
    };

    loadCameras();
    
    // Écouter les changements de caméras depuis d'autres pages
    const handleStorageChange = (e) => {
      if (e.key === 'cameras') {
        loadCameras();
      }
    };
    
    // Écouter les changements de caméra active depuis la page Cameras
    const handleActiveCameraChange = (e) => {
      const activeCamera = e.detail;
      if (activeCamera) {
        const cameraString = cameraToString(activeCamera);
        // Vérifier que la caméra existe dans availableCameras
        const found = findCameraByString(cameraString, availableCameras);
        if (found) {
          setSelectedCamera(cameraString);
          console.log('📹 Caméra synchronisée depuis Cameras:', cameraString);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('camerasUpdated', loadCameras);
    window.addEventListener('activeCameraChanged', handleActiveCameraChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('camerasUpdated', loadCameras);
      window.removeEventListener('activeCameraChanged', handleActiveCameraChange);
    };
  }, []);

  // Fonction pour récupérer l'état de pointage actuel de l'utilisateur
  const fetchCurrentAttendance = async () => {
    try {
      const companyId = await getCompanyId();
      
      if (!companyId) return;

      // Récupérer les pointages d'aujourd'hui
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      from.setHours(0, 0, 0, 0);
      const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      to.setHours(23, 59, 59, 999);

      const myEvents = await attendanceService.getMyAttendance({
        companyId,
        from: from.toISOString(),
        to: to.toISOString(),
        page: 1,
        limit: 100
      });

      // Trouver le dernier pointage sans sortie (clock-in sans clock-out)
      const openEntry = myEvents.find(event => 
        event.clockInTime && !event.clockOutTime
      );

      if (openEntry) {
        setCurrentAttendance({
          clockInTime: openEntry.clockInTime,
          clockOutTime: null,
          location: formatLocation(openEntry.location)
        });
      } else {
        setCurrentAttendance(null);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération de l\'état de pointage:', error);
    }
  };

  // Fonction pour charger les événements et statistiques
    const fetchAttendance = async () => {
      setAttendanceLoading(true);
      setAttendanceError('');

      const fallbackEvents = [];

      try {
        // Récupérer l'ID de l'entreprise avec fallback
        const companyId = await getCompanyId();
        
        if (!companyId) {
          console.warn('Aucune entreprise associée - Affichage des données locales uniquement');
          setRecentEvents([]);
          setStats({ total: 0, success: 0, failed: 0, present: 0 });
          setAttendanceLoading(false);
          return;
        }

        // Calculer les dates pour la période (aujourd'hui par défaut)
        const now = new Date();
        // Début de la journée en fuseau local
        const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        from.setHours(0, 0, 0, 0);
        // Fin de la journée en fuseau local
        const to = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        to.setHours(23, 59, 59, 999);
        
        const fromISOString = from.toISOString();
        const toISOString = to.toISOString();

        const [reportEvents, myEvents] = await Promise.allSettled([
          attendanceService.getCompanyAttendance({
            companyId,
            from: fromISOString,
            to: toISOString,
            page: 1,
            limit: 20
          }),
          attendanceService.getMyAttendance({
            companyId,
            from: fromISOString,
            to: toISOString,
            page: 1,
            limit: 20
          })
        ]);

        const resolvedReport = reportEvents.status === 'fulfilled' ? (reportEvents.value.items || []) : [];
        const resolvedMy = myEvents.status === 'fulfilled' ? myEvents.value : [];
        const allEvents = resolvedReport.length ? resolvedReport : resolvedMy;

        if (!allEvents.length) {
          setRecentEvents([]);
          setStats({
            total: 0,
            success: 0,
            failed: 0,
            present: 0
          });
          return;
        }

        const mapStatusColors = (event) => {
          // Si c'est un clock-out, c'est un départ
          if (event.clockOutTime) {
            return {
              status: 'Départ',
              statusColor: '#5A6565',
              statusBg: 'rgba(90, 101, 101, 0.1)'
            };
          }
          // Sinon c'est un clock-in (arrivée)
          return {
            status: 'Arrivée',
            statusColor: '#0389A6',
            statusBg: 'rgba(3, 137, 166, 0.1)'
          };
        };

        const normalizedEvents = allEvents.slice(0, 10).map((event, index) => {
          // Déterminer le temps de l'événement (clock-in ou clock-out)
          const eventTime = event.clockOutTime || event.clockInTime || event.time || event.createdAt || new Date().toISOString();
          const colors = mapStatusColors(event);

          const userObj = event?.user && typeof event.user === 'object' ? event.user : null;
          const fullNameFromUser = userObj ? `${userObj.firstName || ''} ${userObj.lastName || ''}`.trim() : '';
          const baseName = (event?.name || event?.employeeName || fullNameFromUser || userObj?.email?.split?.('@')?.[0] || 'Employé').trim();
          const initials = (baseName || 'Employé')
            .split(' ')
            .filter(Boolean)
            .map((part) => part.charAt(0))
            .join('')
            .toUpperCase()
            .slice(0, 2) || 'SP';

          return {
            id: event.id || event._id || `evt-${index}`,
            name: baseName,
            time: eventTime,
            location: formatLocation(event.location) || 'Siège',
            confidence: event.confidence || '—',
            avatar: initials,
            ...colors
          };
        });

        const total = normalizedEvents.length;
        const failed = normalizedEvents.filter(event => event.status === 'Échec').length;
        const success = total - failed;
        const present = Math.max(
          0,
          normalizedEvents.filter(event => event.status === 'Arrivée').length -
          normalizedEvents.filter(event => event.status === 'Départ').length
        );

        setRecentEvents(normalizedEvents);
        setStats({
          total,
          success,
          failed,
          present
        });
      } catch (error) {
        console.error('Erreur lors de la récupération des pointages:', error);
        setAttendanceError('Impossible de récupérer les derniers pointages depuis le serveur.');
        setRecentEvents([]);
        setStats({
          total: 0,
          success: 0,
          failed: 0,
          present: 0
        });
      } finally {
        setAttendanceLoading(false);
      }
    };

  // Charger les données au montage
  useEffect(() => {
    fetchAttendance();
    fetchCurrentAttendance();
  }, []);

  // Rafraîchissement automatique des événements
  useEffect(() => {
    let intervalId;
    
    if (isRecognitionActive) {
      // Rafraîchir toutes les 5 secondes si la reconnaissance est active
      intervalId = setInterval(() => {
        fetchAttendance();
        fetchCurrentAttendance();
      }, 5000);
    } else {
      // Rafraîchir toutes les 30 secondes si inactive
      intervalId = setInterval(() => {
        fetchAttendance();
        fetchCurrentAttendance();
      }, 30000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isRecognitionActive]);

  // Options de caméras disponibles (depuis les caméras chargées)
  // Afficher toutes les caméras actives (même si elles sont hors ligne, pour permettre la sélection)
  const cameraOptions = availableCameras
    .filter(cam => cam.active)
    .map(cam => `${cam.name} - ${cam.location}`);

  // État des caméras (depuis les données réelles)
  const cameras = availableCameras.map(cam => {
    let statusText = 'En ligne';
    let color = '#01A04E';
    let bgColor = 'rgba(1, 160, 78, 0.1)';
    
    if (cam.status === 'offline') {
      statusText = 'Hors ligne';
      color = '#D84343';
      bgColor = 'rgba(216, 67, 67, 0.1)';
    } else if (cam.status === 'error') {
      statusText = 'Erreur';
      color = '#D84343';
      bgColor = 'rgba(216, 67, 67, 0.1)';
    }
    
    return {
      id: cam.id,
      name: cam.name,
      location: cam.location,
      status: statusText,
      color,
      bgColor
    };
  });

  // Si aucune caméra n'est chargée, utiliser des données par défaut
  const defaultCameras = cameras.length === 0 ? [
    { id: 1, name: 'Hall d\'entrée', location: 'Rez-de-chaussée', status: 'Hors ligne', color: '#D84343', bgColor: 'rgba(216, 67, 67, 0.1)' }
  ] : cameras;

  // Icônes SVG
  const ChartIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3V21H21M7 14L12 9L16 13L21 8" stroke="#002222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ClockIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 6V12L16 14" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CameraIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M23 7L16 12L23 17V7Z" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="1" y="5" width="15" height="14" rx="2" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const PlayIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="5,3 19,12 5,21" fill="white"/>
    </svg>
  );

  const VolumeIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19.07 4.93C20.9447 6.80528 21.9979 9.34836 21.9979 12C21.9979 14.6516 20.9447 17.1947 19.07 19.07M15.54 8.46C16.4774 9.39764 17.0039 10.6692 17.0039 12C17.0039 13.3308 16.4774 14.6024 15.54 15.54" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const RepeatIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polyline points="17,1 21,5 17,9" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M3 11V9C3 7.89543 3.89543 7 5 7H21" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="7,23 3,19 7,15" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 13V15C21 16.1046 20.1046 17 19 17H3" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const WifiIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.42 9C5.6 5.22 11.18 3 17 3C22.82 3 28.4 5.22 32.58 9" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8.21 14.89C10.92 12.22 14.76 10.69 18.79 10.69C22.82 10.69 26.66 12.22 29.37 14.89" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="18" cy="20" r="2" fill="#002222"/>
    </svg>
  );

  const ArrowDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.33 8L6.67 11.33L12.67 5.33" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const VolumeOffIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 4L20 20" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Fonction pour pointer l'arrivée (clock-in)
  const handleClockIn = async () => {
    setIsClockInLoading(true);
    setClockMessage({ type: '', text: '' });

    try {
      const companyId = await getCompanyId();
      
      if (!companyId) {
        throw new Error('Aucune entreprise associée. Veuillez contacter l\'administrateur.');
      }

      // Essayer d'obtenir la localisation GPS (optionnel)
      let location = null;
      try {
        if (navigator.geolocation) {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
        }
      } catch (geoError) {
        console.log('Géolocalisation non disponible:', geoError);
        // Continuer sans localisation
      }

      await attendanceService.clockIn({
        companyId,
        source: 'web',
        location,
        notes: `Pointage depuis ${selectedCamera}`
      });

      setClockMessage({ type: 'success', text: 'Pointage d\'arrivée enregistré avec succès !' });
      playSound('success');
      
      // Rafraîchir les données
      await Promise.all([fetchAttendance(), fetchCurrentAttendance()]);
      
      // Effacer le message après 3 secondes
      setTimeout(() => setClockMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Erreur lors du pointage d\'arrivée:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du pointage d\'arrivée';
      setClockMessage({ type: 'error', text: errorMessage });
      playSound('failure');
      
      // Effacer le message après 5 secondes
      setTimeout(() => setClockMessage({ type: '', text: '' }), 5000);
    } finally {
      setIsClockInLoading(false);
    }
  };

  // Fonctions pour la reconnaissance faciale
  const handleFaceRecognitionCapture = (captureData) => {
    console.log('Image capturée pour reconnaissance faciale:', captureData);
  };

  // Vérifier si un ID est un ObjectId MongoDB valide (24 caractères hexadécimaux)
  const isValidMongoId = (id) => {
    if (!id || typeof id !== 'string') return false;
    return /^[0-9a-fA-F]{24}$/.test(id);
  };

  // Récupérer l'ID de l'entreprise avec fallback (uniquement ObjectId MongoDB valide)
  const getCompanyId = async () => {
    const { user } = authService.getStoredAuth();
    const userData = getUserData();
    
    // Essayer d'abord depuis les données utilisateur
    let companyId =
      user?.companyId ||
      user?.company?._id ||
      user?.company?.id ||
      userData?.companyId ||
      userData?.company?._id ||
      userData?.company?.id ||
      null;
    
    // Vérifier si c'est un ObjectId MongoDB valide
    if (companyId && isValidMongoId(companyId)) {
      return companyId;
    }
    
    // Source de vérité: récupérer depuis l'API si pas de companyId valide côté user
    try {
      const apiCompanyId = await companiesService.getMyCompanyId();
      if (apiCompanyId && isValidMongoId(apiCompanyId)) {
        // Mettre à jour les données utilisateur avec le companyId trouvé
        const currentUser = userData || user;
        if (currentUser) {
          currentUser.companyId = apiCompanyId;
          localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        return apiCompanyId;
      }
    } catch (error) {
      console.error('Erreur lors de la récupération du companyId depuis l\'API:', error);
    }
    
    // Si aucun ObjectId valide trouvé, retourner null
    return null;
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

  // Gestion du succès de la reconnaissance faciale
  const handleFaceRecognitionSuccess = async (recognitionData) => {
    setRecognitionResult(recognitionData);
    
    // Vérifier si la détection est valide (similarité >= 0.45 pour MOYENNE)
    if (!recognitionData.similarity || recognitionData.similarity < 0.45) {
      setClockMessage({ 
        type: 'error', 
        text: `Confiance de reconnaissance trop faible (${((recognitionData.similarity || 0) * 100).toFixed(1)}%). Niveau MOYENNE minimum requis (45%).` 
      });
      playSound('failure');
      return;
    }

    // Mode kiosque/RH: le visage reconnu ne doit pas correspondre à l'utilisateur connecté.
    // On valide plutôt que la personne reconnue existe dans la liste des employés.
    const recognizedNameFormatted = (recognitionData.personName || '').trim();
    const recognizedNormalized = recognizedNameFormatted.toLowerCase();
    const recognizedIsMongoId = /^[0-9a-fA-F]{24}$/.test(recognizedNameFormatted);

    const loadEmployeesFromLocalStorage = () => {
      try {
        const { user: storedUser } = authService.getStoredAuth();
        const userEmail = (storedUser?.email || '').toLowerCase();
        const companyId =
          storedUser?.companyId ||
          storedUser?.company?._id ||
          storedUser?.company?.id ||
          null;
        const scopedKey = companyId ? `employees:${companyId}` : (userEmail ? `employees:user:${userEmail}` : null);
        const raw = (scopedKey ? localStorage.getItem(scopedKey) : null) || '[]';
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    };

    let employees = [];
    try {
      // Source principale: API (renvoie des users Mongo avec _id)
      const apiEmployees = await companiesService.getCompanyEmployees();
      employees = Array.isArray(apiEmployees) ? apiEmployees : [];
      console.log('👥 Employés chargés depuis l\'API pour le pointage facial:', employees.length);
    } catch {
      employees = [];
    }

    // companiesService.getCompanyEmployees() retourne [] en cas d'erreur (catch interne).
    // Si l'API renvoie 0 employé, on tente quand même le fallback localStorage.
    if (employees.length === 0) {
      const fallbackEmployees = loadEmployeesFromLocalStorage();
      if (fallbackEmployees.length > 0) {
        employees = fallbackEmployees;
      }
    }

    const extractEmployeeMongoIds = (emp) => {
      const candidates = [
        emp?._id,
        emp?.id,
        emp?.userId,
        emp?.employeeId,
        emp?.employee_id,
      ];
      const out = [];
      for (const c of candidates) {
        if (!c) continue;
        const s = String(c).trim();
        if (/^[0-9a-fA-F]{24}$/.test(s)) out.push(s.toLowerCase());
      }
      return Array.from(new Set(out));
    };

    const matchedEmployee = employees.find((emp) => {
      if (recognizedIsMongoId) {
        const ids = extractEmployeeMongoIds(emp);
        return ids.includes(recognizedNormalized);
      }

      const name = String(
        emp?.name ||
          emp?.nomComplet ||
          `${emp?.firstName || ''} ${emp?.lastName || ''}`
      ).trim();
      const formatted = formatEmployeeNameForAPI(name).toLowerCase();
      return formatted && formatted === recognizedNormalized;
    });

    console.log('🔍 Recherche employé - nom reconnu:', recognitionData.personName);
    console.log('🔍 Recherche employé - normalized:', recognizedNormalized);
    console.log('👥 Liste employés disponibles:', employees.map(e => ({
      name: e.name,
      id: e.id,
      _id: e._id,
      userId: e.userId,
      employeeId: e.employeeId,
      ids: extractEmployeeMongoIds(e),
    })));
    console.log('✅ Employé trouvé:', matchedEmployee);

    if (recognizedIsMongoId && !matchedEmployee) {
      const similarity = typeof recognitionData?.similarity === 'number' ? recognitionData.similarity : null;
      // Accepter les reconnaissances "MOYENNE" (souvent ~0.45-0.65). On ne bloque que si la
      // similarité est vraiment faible. Le backend reste l'arbitre final (multi-tenant).
      const isAcceptableConfidence = similarity !== null ? similarity >= 0.45 : true;

      if (!isAcceptableConfidence) {
        setClockMessage({
          type: 'error',
          text:
            `Visage détecté mais confiance insuffisante (${similarity !== null ? (similarity * 100).toFixed(1) : '—'}%). ` +
            `ID reconnu: ${recognizedNameFormatted}. ` +
            `Veuillez améliorer l'éclairage et vous rapprocher de la caméra, puis réessayer. ` +
            `Si cet ID revient souvent et ne correspond à aucun employé, supprimez-le côté Naratech (training-image) puis ré-enregistrez la photo du bon employé.`,
        });
        playSound('failure');
        return;
      }

      // Ne pas bloquer côté front: si l'API de reconnaissance renvoie déjà un ObjectId,
      // on tente le pointage et on laisse le backend appliquer les règles (employé dans l'entreprise).
      console.warn(
        '⚠️ Reconnaissance a renvoyé un ObjectId mais employé non trouvé côté front. ' +
          'On tente quand même le pointage et on laisse le backend valider. employeeId=',
        recognizedNameFormatted,
      );
    }

    // Si la reconnaissance renvoie déjà un ObjectId Mongo valide, on laisse le backend
    // faire l'arbitrage multi-tenant (l'utilisateur reconnu doit appartenir à l'entreprise).
    // Cela évite de bloquer à cause d'un cache/front pas à jour.
    if (!matchedEmployee && !recognizedIsMongoId) {
      setClockMessage({
        type: 'error',
        text: `Employé reconnu (${recognitionData.personName}) non trouvé dans la liste des employés. Veuillez d'abord l'ajouter via la page Employés.`
      });
      playSound('failure');
      return;
    }

    setIsProcessingFaceAttendance(true);
    try {
      const getValidMongoId = (emp) => {
        const candidates = [emp?._id, emp?.id];
        for (const c of candidates) {
          if (!c) continue;
          const asString = String(c);
          if (/^[0-9a-fA-F]{24}$/.test(asString)) return asString;
        }
        return null;
      };

      const recognizedEmployeeId = recognizedIsMongoId ? recognizedNameFormatted : null;

      const detection = {
        name: recognitionData.personName,
        similarity: recognitionData.similarity,
        quality_score: recognitionData.qualityScore || recognitionData.quality_score,
        confidence_level: recognitionData.confidence || recognitionData.confidence_level,
        employeeId: recognizedEmployeeId || getValidMongoId(matchedEmployee)
      };

      console.log('🎯 Création detection - matchedEmployee:', matchedEmployee);
      console.log('🆔 detection.employeeId brut:', matchedEmployee?.id || matchedEmployee?._id);

      // Valider que l'employeeId est un ObjectId MongoDB valide
      if (detection.employeeId) {
        const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(detection.employeeId);
        console.log('🔍 Validation ObjectId - employeeId:', detection.employeeId, 'valid:', isValidObjectId);
        if (!isValidObjectId) {
          console.warn('⚠️ employeeId invalide, utilisation du pointage pour l\'utilisateur connecté:', detection.employeeId);
          detection.employeeId = null; // Ne pas envoyer d'employeeId invalide
        }
      } else {
        console.warn('⚠️ employeeId est null ou undefined');
      }

      console.log('📝 Detection finale:', detection);

      if (faceRecognitionMode === 'clockin') {
        await performFaceClockIn(detection);
      } else {
        await performFaceClockOut(detection);
      }
    } catch (error) {
      console.error('Erreur pointage facial:', error);
      const apiMessage = error?.response?.data?.message;
      const statusCode = error?.response?.status;
      const isForbidden = statusCode === 403;
      const isNotFound = statusCode === 404;
      setClockMessage({
        type: 'error',
        text:
          'Erreur lors du pointage: ' +
          (isForbidden
            ? "La personne reconnue n'appartient pas à cette entreprise. Vérifiez que l'employé a bien été ajouté à l'entreprise (page Employés) avec sa photo. Réessayez le pointage : le système peut rattacher l'employé automatiquement."
            : isNotFound
              ? "Entreprise ou employé introuvable."
              : (apiMessage || error.message || error.toString()))
      });
      playSound('failure');
    } finally {
      setIsProcessingFaceAttendance(false);
    }
  };

  // Gestion des erreurs de reconnaissance
  const handleFaceRecognitionError = (error) => {
    console.error('Erreur de reconnaissance faciale:', error);
    setClockMessage({ 
      type: 'error', 
      text: error.message || 'Erreur lors de la reconnaissance faciale. Veuillez réessayer.' 
    });
    playSound('failure');
  };

  const performFaceClockIn = async (detection) => {
    const companyId = await getCompanyId();

    if (!companyId) {
      throw new Error('Aucune entreprise associée. Veuillez contacter l\'administrateur.');
    }

    // Obtenir la géolocalisation (avec timeout pour éviter les blocages)
    let location = null;
    try {
      if (navigator.geolocation) {
        const position = await Promise.race([
          new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              timeout: 3000,
              enableHighAccuracy: false,
              maximumAge: 60000
            });
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout géolocalisation')), 3000)
          )
        ]);
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      }
    } catch (geoError) {
      console.log('Géolocalisation non disponible ou timeout:', geoError);
      // Continuer sans géolocalisation
    }

    console.log('🎭 Pointage facial - detection complète:', detection);
    console.log('👤 employeeId envoyé:', detection.employeeId);
    console.log('📝 Nom reconnu:', detection.name);

    await attendanceService.clockIn({
      companyId,
      ...(detection.employeeId && { employeeId: detection.employeeId }), // N'envoyer que si valide
      source: 'kiosk',
      location,
      notes: `Pointage facial - ${detection.name} (${(detection.similarity * 100).toFixed(1)}% de confiance)`,
    });

    setClockMessage({ 
      type: 'success', 
      text: `Pointage d'arrivée enregistré par reconnaissance faciale (${(detection.similarity * 100).toFixed(1)}% de confiance)` 
    });
    playSound('success');
    
    // Rafraîchir les données et fermer le modal
    await Promise.all([fetchAttendance(), fetchCurrentAttendance()]);
    setShowFaceRecognition(false);
    
    // Effacer le message après 3 secondes
    setTimeout(() => setClockMessage({ type: '', text: '' }), 3000);
  };

  const performFaceClockOut = async (detection) => {
    const companyId = await getCompanyId();

    if (!companyId) {
      throw new Error('Aucune entreprise associée. Veuillez contacter l\'administrateur.');
    }

    // Obtenir la géolocalisation (avec timeout pour éviter les blocages)
    let location = null;
    try {
      if (navigator.geolocation) {
        const position = await Promise.race([
          new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { 
              timeout: 3000,
              enableHighAccuracy: false,
              maximumAge: 60000
            });
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout géolocalisation')), 3000)
          )
        ]);
        location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
      }
    } catch (geoError) {
      console.log('Géolocalisation non disponible ou timeout:', geoError);
      // Continuer sans géolocalisation
    }

    // Trouver l'employé correspondant pour obtenir son ID si pas déjà fourni
    let employeeId = detection.employeeId;
    if (!employeeId) {
      let employees = [];
      try {
        const scopedKey = companyId ? `employees:${companyId}` : null;
        const raw = (scopedKey ? localStorage.getItem(scopedKey) : null) || '[]';
        const parsed = JSON.parse(raw);
        employees = Array.isArray(parsed) ? parsed : [];
      } catch {
        employees = [];
      }

      const matchedEmployee = employees.find((emp) => {
        const name = String(emp?.name || emp?.nomComplet || '').trim();
        const formatted = formatEmployeeNameForAPI(name).toLowerCase();
        const recognizedNormalized = (detection.name || '').trim().toLowerCase();
        return formatted && (formatted === recognizedNormalized);
      });

      if (matchedEmployee) {
        employeeId = matchedEmployee.id || matchedEmployee._id;
      }
    }

    // Valider que l'employeeId est un ObjectId MongoDB valide
    if (employeeId) {
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(employeeId);
      if (!isValidObjectId) {
        console.warn('⚠️ employeeId invalide pour clock-out, utilisation de l\'utilisateur connecté:', employeeId);
        employeeId = null; // Ne pas envoyer d'employeeId invalide
      }
    }

    await attendanceService.clockOut({
      companyId,
      ...(employeeId && { employeeId }), // N'envoyer que si valide
      notes: `Pointage facial (kiosk) - ${detection.name} (${(detection.similarity * 100).toFixed(1)}% de confiance)`,
    });

    setClockMessage({ 
      type: 'success', 
      text: `Pointage de sortie enregistré par reconnaissance faciale (${(detection.similarity * 100).toFixed(1)}% de confiance)` 
    });
    playSound('checkout');
    
    // Rafraîchir les données et fermer le modal
    await Promise.all([fetchAttendance(), fetchCurrentAttendance()]);
    setShowFaceRecognition(false);
    
    // Effacer le message après 3 secondes
    setTimeout(() => setClockMessage({ type: '', text: '' }), 3000);
  };

  const openFaceRecognition = (mode) => {
    console.log('🔵 openFaceRecognition appelé avec mode:', mode);
    try {
      setFaceRecognitionMode(mode);
      setShowFaceRecognition(true);
      setRecognitionResult(null);
      setClockMessage({ type: '', text: '' });
      // Activer aussi le flag de reconnaissance active
      setIsRecognitionActive(true);
      console.log('✅ Modal ouverte avec succès');
    } catch (error) {
      console.error('❌ Erreur dans openFaceRecognition:', error);
      setClockMessage({ 
        type: 'error', 
        text: 'Erreur lors de l\'ouverture de la modal: ' + (error.message || 'Erreur inconnue')
      });
    }
  };

  // Fonction pour pointer la sortie (clock-out)
  const handleClockOut = async () => {
    setIsClockOutLoading(true);
    setClockMessage({ type: '', text: '' });

    try {
      const companyId = await getCompanyId();
      
      if (!companyId) {
        throw new Error('Aucune entreprise associée. Veuillez contacter l\'administrateur.');
      }

      await attendanceService.clockOut({
        companyId,
        notes: `Pointage de sortie depuis ${selectedCamera}`
      });

      setClockMessage({ type: 'success', text: 'Pointage de sortie enregistré avec succès !' });
      playSound('checkout');
      
      // Rafraîchir les données
      await Promise.all([fetchAttendance(), fetchCurrentAttendance()]);
      
      // Effacer le message après 3 secondes
      setTimeout(() => setClockMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Erreur lors du pointage de sortie:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Erreur lors du pointage de sortie';
      setClockMessage({ type: 'error', text: errorMessage });
      playSound('failure');
      
      // Effacer le message après 5 secondes
      setTimeout(() => setClockMessage({ type: '', text: '' }), 5000);
    } finally {
      setIsClockOutLoading(false);
    }
  };

  // Calculer la durée de présence si l'utilisateur est pointé
  const calculatePresenceDuration = () => {
    if (!currentAttendance || !currentAttendance.clockInTime) return null;
    
    const clockIn = new Date(currentAttendance.clockInTime);
    const now = new Date();
    const diffMs = now - clockIn;
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Mettre à jour la durée de présence en temps réel
  useEffect(() => {
    if (!currentAttendance) return;
    
    const interval = setInterval(() => {
      // Forcer un re-render pour mettre à jour la durée
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [currentAttendance]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
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
          {/* Header avec titre et horloge */}
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-2.5">
              <h1 className="font-audiowide text-[26px] text-[#002222]">Pointage en temps réel</h1>
              <p className="font-instrument text-base text-[#5A6565]">Surveillance et reconnaissance faciale automatique</p>
            </div>
            <div className="flex items-center gap-6">
              {/* État de pointage de l'utilisateur */}
              {currentAttendance ? (
                <div className="flex items-center gap-3 bg-white border border-[#01A04E] rounded-2xl px-4 py-2.5">
                  <div className="w-2 h-2 bg-[#01A04E] rounded-full"></div>
                  <div className="flex flex-col">
                    <span className="font-instrument text-xs text-[#5A6565]">Pointé depuis</span>
                    <div className="flex items-center gap-2">
                      <span className="font-instrument text-sm font-semibold text-[#01A04E]">
                        {new Date(currentAttendance.clockInTime).toLocaleTimeString('fr-FR', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                      {calculatePresenceDuration() && (
                        <span className="font-instrument text-xs text-[#5A6565]">
                          ({calculatePresenceDuration()})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-white border border-[#D4DCDC] rounded-2xl px-4 py-2.5">
                  <div className="w-2 h-2 bg-[#5A6565] rounded-full"></div>
                  <span className="font-instrument text-sm text-[#5A6565]">Non pointé</span>
                </div>
              )}
            <div className="text-right">
              <div className="font-audiowide text-[26px] text-[#002222]">{formatTime(currentTime)}</div>
              <div className="font-instrument text-base text-[#5A6565]">{formatDate(currentTime)}</div>
            </div>
          </div>
          </div>

          {/* Message de confirmation/erreur pour le pointage */}
          {clockMessage.text && (
            <div className={`mb-5 p-4 rounded-2xl ${
              clockMessage.type === 'success' 
                ? 'bg-[#D1FAE5] border border-[#01A04E] text-[#01A04E]' 
                : 'bg-[#FEE2E2] border border-[#D84343] text-[#D84343]'
            }`}>
              <p className="font-instrument text-sm font-medium">{clockMessage.text}</p>
            </div>
          )}

          {/* Grille principale */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
            {/* Section Contrôles de reconnaissance */}
            <div className="lg:col-span-3 bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                <ChartIcon />
                <h2 className="font-instrument text-base font-semibold text-[#002222]">Contrôles de reconnaissance</h2>
              </div>
              <div className="p-5">

                {/* Section Reconnaissance faciale */}
                <div className="mb-6">
                  <h3 className="font-instrument text-sm font-medium text-[#002222] mb-3">Pointage par reconnaissance faciale</h3>
                  <div className="flex items-center gap-3">
                    {currentAttendance ? (
                      <button
                        onClick={() => openFaceRecognition('clockout')}
                        disabled={isProcessingFaceAttendance}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-instrument text-base transition-colors ${
                          isProcessingFaceAttendance
                            ? 'bg-[#D84343] text-white cursor-not-allowed opacity-70'
                            : 'bg-[#D84343] text-white hover:bg-[#C73E3E]'
                        }`}
                      >
                        {isProcessingFaceAttendance ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            <span>Traitement...</span>
                          </>
                        ) : (
                          <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M12.0012 3.04932C16.5732 3.04932 20.5988 6.20008 21.9506 10.5731C22.016 10.7665 22.016 10.9734 21.9506 11.1668C20.5988 15.5399 16.5732 18.6907 12.0012 18.6907C7.42917 18.6907 3.40356 15.5399 2.05181 11.1668C1.98639 10.9734 1.98639 10.7665 2.05181 10.5731C3.40356 6.20008 7.42917 3.04932 12.0012 3.04932Z" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span>Pointage</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => openFaceRecognition('clockin')}
                        disabled={isProcessingFaceAttendance}
                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-instrument text-base transition-colors ${
                          isProcessingFaceAttendance
                            ? 'bg-[#01A04E] text-white cursor-not-allowed opacity-70'
                            : 'bg-[#01A04E] text-white hover:bg-[#019A47]'
                        }`}
                      >
                        {isProcessingFaceAttendance ? (
                          <>
                            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                            </svg>
                            <span>Traitement...</span>
                          </>
                        ) : (
                          <>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M12.0012 3.04932C16.5732 3.04932 20.5988 6.20008 21.9506 10.5731C22.016 10.7665 22.016 10.9734 21.9506 11.1668C20.5988 15.5399 16.5732 18.6907 12.0012 18.6907C7.42917 18.6907 3.40356 15.5399 2.05181 11.1668C1.98639 10.9734 1.98639 10.7665 2.05181 10.5731C3.40356 6.20008 7.42917 3.04932 12.0012 3.04932Z" stroke="currentColor" strokeWidth="1.5"/>
                            </svg>
                            <span>Pointage</span>
                          </>
                        )}
                      </button>
                    )}
                    <div className="text-xs text-[#5A6565] font-instrument">
                      Reconnaissance faciale sécurisée
                    </div>
                  </div>
                </div>

                {/* Section Caméra active */}
                <div className="mb-5">
                  <h3 className="font-instrument text-sm font-medium text-[#002222] mb-2">Caméra active</h3>
                  <div className="flex items-center gap-5">
                    {/* Menu déroulant caméra */}
                    <div ref={cameraDropdownRef} className="relative flex-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowCameraDropdown(!showCameraDropdown);
                        }}
                        className="w-full flex items-center justify-between gap-3 px-1.5 py-1 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl hover:bg-[#E0E3E3] transition-colors"
                      >
                        <span className="font-instrument text-xs text-[#5A6565] px-1.5 py-1">
                          {cameraOptions.length > 0 ? selectedCamera : 'Aucune caméra disponible'}
                        </span>
                        <ArrowDownIcon />
                      </button>
                      
                      {/* Menu déroulant */}
                      {showCameraDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-20 overflow-hidden">
                          {cameraOptions.length > 0 ? (
                            cameraOptions.map((option) => (
                            <button
                              key={option}
                                onClick={(e) => {
                                  e.stopPropagation();
                                setSelectedCamera(option);
                                setShowCameraDropdown(false);
                                // Synchroniser la caméra active
                                const camera = findCameraByString(option, availableCameras);
                                if (camera) {
                                  cameraSyncService.setActiveCamera(camera);
                                }
                              }}
                              className={`w-full flex items-center justify-between gap-3 px-1.5 py-1 hover:bg-[#ECEFEF] transition-colors ${
                                selectedCamera === option ? 'bg-[#ECEFEF]' : ''
                              }`}
                            >
                              <span className="font-instrument text-xs text-[#5A6565] px-1.5 py-1">
                                {option}
                              </span>
                              {selectedCamera === option && <CheckIcon />}
                            </button>
                            ))
                          ) : (
                            <div className="px-1.5 py-3 text-center">
                              <span className="font-instrument text-xs text-[#5A6565]">
                                Aucune caméra disponible
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Bouton Voir surveillance - Navigue vers Cameras avec la caméra active */}
                    {selectedCamera && cameraOptions.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const camera = findCameraByString(selectedCamera, availableCameras);
                          if (camera) {
                            // Synchroniser la caméra active
                            cameraSyncService.setActiveCamera(camera);
                            // Naviguer vers la page Cameras avec l'onglet Surveillance
                            navigate(`/cameras?tab=Surveillance&camera=${camera.id}`);
                          }
                        }}
                        className="px-3 py-1.5 bg-[#0389A6] text-white rounded-xl hover:bg-[#027A94] transition-colors font-instrument text-xs whitespace-nowrap"
                        title="Voir cette caméra en surveillance"
                      >
                        Voir surveillance
                      </button>
                    )}

                    {/* Bouton Démarrer - Ouvre la modal de reconnaissance faciale */}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🔵 Bouton Démarrer cliqué', { 
                          isRecognitionActive, 
                          currentAttendance,
                          cameraOptionsLength: cameraOptions.length 
                        });
                        try {
                          if (!isRecognitionActive) {
                            // Ouvrir la modal de reconnaissance faciale
                            const mode = currentAttendance ? 'clockout' : 'clockin';
                            console.log('🔵 Ouverture modal avec mode:', mode);
                            openFaceRecognition(mode);
                            // Activer aussi le flag pour que le bouton change d'état
                            setIsRecognitionActive(true);
                          } else {
                            // Arrêter la reconnaissance active
                            console.log('🔵 Arrêt de la reconnaissance');
                            setIsRecognitionActive(false);
                            setShowFaceRecognition(false);
                          }
                        } catch (error) {
                          console.error('❌ Erreur lors du clic sur Démarrer:', error);
                          setClockMessage({ 
                            type: 'error', 
                            text: 'Erreur: ' + (error.message || 'Impossible d\'ouvrir la modal')
                          });
                        }
                      }}
                      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-instrument text-base transition-colors ${
                        isRecognitionActive 
                          ? 'bg-[#D84343] text-white hover:bg-[#C73333]' 
                          : 'bg-[#0389A6] text-white hover:bg-[#027A94]'
                      }`}
                    >
                      <PlayIcon />
                      {isRecognitionActive ? 'Arrêter' : 'Démarrer'}
                    </button>
                    
                    {/* Boutons contrôles */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        unlockAudio();
                        setIsSoundMuted((v) => !v);
                      }}
                      className="p-1.5 border border-[#D4DCDC] rounded-2xl hover:bg-[#ECEFEF] transition-colors"
                      title={isSoundMuted ? 'Activer le son' : 'Couper le son'}
                      aria-label={isSoundMuted ? 'Activer le son' : 'Couper le son'}
                    >
                      {isSoundMuted ? <VolumeOffIcon /> : <VolumeIcon />}
                    </button>
                    <button className="p-1.5 border border-[#D4DCDC] rounded-2xl hover:bg-[#ECEFEF] transition-colors">
                      <RepeatIcon />
                    </button>
                  </div>
                </div>
                {/* Statut de connexion */}
                <div className="flex items-center justify-between bg-[rgba(236,239,239,0.3)] border border-[#D4DCDC] rounded-2xl px-5 py-2.5">
                  <div className="flex items-center gap-4">
                    <WifiIcon />
                  </div>
                  <div className="flex items-center gap-2 bg-[rgba(1,160,78,0.1)] px-2.5 py-1 rounded-md">
                    <div className="w-1.5 h-1.5 bg-[#01A04E] rounded-full"></div>
                    <span className="font-instrument text-xs font-medium text-[#01A04E]">En ligne</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Grille des sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
            {/* Vue caméra - Hall d'entrée */}
            <div className="lg:col-span-2 bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                <CameraIcon />
                <h2 className="font-instrument text-base font-semibold text-[#002222]">Vue caméra - Hall d'entrée</h2>
              </div>
              <div className="p-5">
                {/* Preview caméra */}
                <div className="relative bg-[#1a3a3a] rounded-2xl mb-5 h-[361px] flex flex-col items-center justify-center">
                  {/* Badge Pause */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-md">
                    <div className="w-1.5 h-1.5 bg-[#0389A6] rounded-full"></div>
                    <span className="font-instrument text-xs font-medium text-[#002222]">Pause</span>
                  </div>
                  
                  {/* Icône caméra */}
                  <div className="w-16 h-16 opacity-40 mb-6">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M23 7L16 12L23 17V7Z" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="1" y="5" width="15" height="14" rx="2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  
                  {/* Texte */}
                  <div className="text-center text-white">
                    <h3 className="font-instrument text-lg font-medium mb-2">Caméra en pause</h3>
                    <p className="font-instrument text-sm opacity-80">Cliquez sur Démarrer pour activer la reconnaissance</p>
                  </div>
                </div>
                
                {/* Informations caméra */}
                <div className="flex items-center justify-between">
                  <p className="font-instrument text-base text-[#5A6565]">
                    Résolution: 1920x1080 • FPS: 30 • Qualité: HD
                  </p>
                  <button className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl font-instrument text-base text-[#002222] hover:bg-[#ECEFEF] transition-colors">
                    Paramètres caméra
                  </button>
                </div>
              </div>
            </div>

            {/* Statistiques du jour */}
            <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                <ClockIcon />
                <h2 className="font-instrument text-base font-semibold text-[#002222]">Statistiques du jour</h2>
              </div>
              <div className="p-5 space-y-5">
                {/* Total pointages */}
                <div className="flex items-center justify-between">
                  <span className="font-instrument text-sm text-[#002222]">Total pointages</span>
                  <span className="font-instrument text-base font-semibold text-[#002222]">{stats.total}</span>
                </div>
                {/* Réussis */}
                <div className="flex items-center justify-between">
                  <span className="font-instrument text-sm text-[#002222]">Réussis</span>
                  <span className="font-instrument text-base font-semibold text-[#01A04E]">{stats.success}</span>
                </div>
                {/* Échecs */}
                <div className="flex items-center justify-between">
                  <span className="font-instrument text-sm text-[#002222]">Échecs</span>
                  <span className="font-instrument text-base font-semibold text-[#D84343]">{stats.failed}</span>
                </div>
                
                {/* Barre de progression */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-instrument text-sm text-[#002222]">Taux de réussite</span>
                    <span className="font-instrument text-base font-semibold text-[#002222]">
                      {Math.round((stats.success / stats.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 bg-[#ECEFEF] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[#0389A6] rounded-full transition-all duration-300"
                      style={{ width: `${(stats.success / stats.total) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Présents actuellement */}
                <div className="border-t border-[#D4DCDC] pt-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="#01A04E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="9" cy="7" r="4" stroke="#01A04E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M23 21V19C23 18.1645 22.7155 17.3541 22.2094 16.7006C21.7033 16.047 20.9982 15.5866 20.2 15.3954" stroke="#01A04E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89317 18.7122 8.75608 18.1676 9.45768C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="#01A04E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span className="font-instrument text-sm text-[#002222]">Présents actuellement</span>
                    </div>
                    <span className="font-instrument text-base font-semibold text-[#01A04E]">{stats.present}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Événements récents */}
            <div className="lg:col-span-2 bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                <ChartIcon />
                <h2 className="font-instrument text-base font-semibold text-[#002222]">Événements récents</h2>
              </div>
              <div className="p-5">
                <p className="font-instrument text-base text-[#5A6565] mb-2.5">
                  Historique des pointages en temps réel
                </p>
                {attendanceLoading && (
                  <p className="font-instrument text-sm text-[#5A6565] mb-4">
                    Chargement des données en cours...
                  </p>
                )}
                {attendanceError && (
                  <p className="font-instrument text-sm text-red-500 mb-4">
                    {attendanceError}
                  </p>
                )}
                <div className="space-y-4">
                  {!attendanceLoading && recentEvents.length === 0 && (
                    <p className="font-instrument text-sm text-[#5A6565]">
                      Aucun pointage disponible pour le moment.
                    </p>
                  )}
                  {recentEvents.map((event) => (
                    <div
                      key={`${event?.userId || event?.employeeId || event?.email || 'unknown'}-${event?.time || event?.clockInAt || event?.createdAt || ''}-${event?.type || event?.status || ''}`}
                      className="flex items-center gap-4 p-4 bg-white border border-[#D4DCDC] rounded-2xl"
                    >
                      {/* Icône de statut */}
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#01A04E] text-white">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      
                      {/* Avatar */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#0389A6] text-white font-instrument text-sm font-semibold">
                        {event.avatar}
                      </div>
                      
                      {/* Informations */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-instrument text-sm font-semibold text-[#002222]">{event.name}</span>
                          <span className="font-instrument text-xs text-[#5A6565]">
                            {new Date(event.time).toLocaleTimeString('fr-FR', { 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-[#5A6565]">
                          <span>{formatLocation(event.location)}</span>
                          <span>Confiance: {event.confidence}</span>
                        </div>
                      </div>
                      
                      {/* Badges de statut */}
                      <div className="flex items-center gap-2">
                        <div 
                          className="px-3 py-1 rounded-full"
                          style={{ backgroundColor: event.statusBg }}
                        >
                          <span className="font-instrument text-xs font-medium" style={{ color: event.statusColor }}>
                            {event.status}
                          </span>
                        </div>
                        {event.statusError && (
                          <div 
                            className="px-3 py-1 rounded-full"
                            style={{ backgroundColor: event.errorBg }}
                          >
                            <span className="font-instrument text-xs font-medium" style={{ color: event.errorColor }}>
                              {event.statusError}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* État des caméras */}
            <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
                <CameraIcon />
                <h2 className="font-instrument text-base font-semibold text-[#002222]">État des caméras</h2>
              </div>
              <div className="p-5 space-y-4">
                {defaultCameras.map((camera) => (
                  <div key={camera.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: camera.color }}></div>
                      <div>
                        <div className="font-instrument text-sm font-medium text-[#002222]">{camera.name}</div>
                        <div className="font-instrument text-xs text-[#5A6565]">{formatLocation(camera.location)}</div>
                      </div>
                    </div>
                    <div 
                      className="px-2.5 py-1 rounded-md"
                      style={{ backgroundColor: camera.bgColor }}
                    >
                      <span className="font-instrument text-xs font-medium" style={{ color: camera.color }}>
                        {camera.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de reconnaissance faciale */}
      {showFaceRecognition && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-audiowide text-xl text-[#002222]">
                  {faceRecognitionMode === 'clockin' ? 'Pointage d\'arrivée' : 'Pointage de sortie'} par reconnaissance faciale
                </h2>
                <button
                  onClick={() => {
                    console.log('🔴 Fermeture de la modal');
                    setShowFaceRecognition(false);
                    setIsRecognitionActive(false);
                  }}
                  className="text-[#5A6565] hover:text-[#002222] transition-colors"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
              </div>

              <AttendanceFaceCapture
                mode={faceRecognitionMode}
                onRecognitionSuccess={handleFaceRecognitionSuccess}
                onRecognitionError={handleFaceRecognitionError}
                onClose={() => setShowFaceRecognition(false)}
              />

              {/* Instructions */}
              <div className="bg-[#F8F9FA] rounded-lg p-4 mb-4">
                <h4 className="font-instrument font-semibold text-[#002222] mb-2">Instructions</h4>
                <ul className="font-instrument text-sm text-[#5A6565] space-y-1">
                  <li>• Positionnez votre visage face à la caméra</li>
                  <li>• Assurez-vous d'avoir un bon éclairage</li>
                  <li>• Évitez les ombres sur le visage</li>
                  <li>• Une seule personne doit être visible</li>
                  <li>• La reconnaissance nécessite un niveau de confiance HAUTE</li>
                </ul>
              </div>

              {/* Boutons d'action */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowFaceRecognition(false)}
                  className="flex-1 px-4 py-2.5 border border-[#D4DCDC] text-[#5A6565] rounded-lg hover:bg-[#F8F9FA] transition-colors font-instrument"
                >
                  Annuler
                </button>
                <button
                  onClick={() => openFaceRecognition(faceRecognitionMode === 'clockin' ? 'clockout' : 'clockin')}
                  className="flex-1 px-4 py-2.5 bg-[#0389A6] text-white rounded-lg hover:bg-[#037A94] transition-colors font-instrument"
                >
                  {faceRecognitionMode === 'clockin' ? 'Passer au mode sortie' : 'Passer au mode entrée'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Pointage;