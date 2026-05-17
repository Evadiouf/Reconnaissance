import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Hls from 'hls.js';
import faceRecognitionService from '../services/faceRecognitionService';
import { attendanceService } from '../services/attendanceService';
import companiesService from '../services/companiesService';
import cameraSyncService from '../services/cameraSyncService';
import authService from '../services/authService';
import { useKioskSession } from '../contexts/KioskSessionContext';
import {
  getKioskSlotsForEmployee,
  pickKioskActionForNow,
  hasKioskScheduleConfig,
  isAnyKioskSlotActiveNow,
  normalizeDepartmentKey,
} from '../utils/kioskSchedule';

const DEFAULT_HLS_URL = 'http://localhost:8888/camera/index.m3u8';
const CAPTURE_INTERVAL_MS = 2500;
const COOLDOWN_PER_PERSON_MS = 30000;
/** Seuil similarité (0–1). 0,50 était trop strict avec éclairage / balance caméra ; 0,40 aligne ~niveau « utile » sans descendre en FAIBLE extrême. */
const CONFIDENCE_THRESHOLD = 0.4;
const FEEDBACK_DURATION_MS = 4000;

export default function KioskGlobalEngine() {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, isAuthenticated } = authService.getStoredAuth();
  const isLoggedIn = !!token && !!isAuthenticated;
  const isKioskRoute = location.pathname === '/kiosque';

  const { kioskActive, startKiosk, stopKiosk, setKioskRunning, userPausedKioskRef } = useKioskSession();

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hlsRef = useRef(null);
  const captureTimerRef = useRef(null);
  const recentlyRecognized = useRef(new Map());
  const noFaceStreakRef = useRef(0);
  const lastNoFaceHintAtRef = useRef(0);
  const kioskAttendanceRef = useRef(null);
  const employeeDeptByIdRef = useRef(new Map());
  const audioRef = useRef({ success: null, failure: null, checkout: null });

  const [currentTime, setCurrentTime] = useState(new Date());
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState('SenPointage');
  const [hlsUrl, setHlsUrl] = useState(DEFAULT_HLS_URL);
  const [videoConnected, setVideoConnected] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [recentEvents, setRecentEvents] = useState([]);
  const [apiStatus, setApiStatus] = useState(null);
  const [kioskAttendance, setKioskAttendance] = useState(null);
  const [isSoundMuted] = useState(() => {
    try {
      return localStorage.getItem('attendanceSoundMuted') === 'true';
    } catch {
      return false;
    }
  });
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const unlockAudio = useCallback(async () => {
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
    } catch (_) {}
  }, [isAudioUnlocked]);

  useEffect(() => {
    kioskAttendanceRef.current = kioskAttendance;
  }, [kioskAttendance]);

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
      } catch (_) {}
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(init);
    } else {
      setTimeout(init, 0);
    }
  }, [isSoundMuted]);

  useEffect(() => {
    if (isAudioUnlocked) return undefined;
    const handler = () => {
      unlockAudio();
    };
    document.addEventListener('click', handler, { once: true, capture: true });
    return () => document.removeEventListener('click', handler, { capture: true });
  }, [isAudioUnlocked, unlockAudio]);

  const playSound = useCallback(
    async (key) => {
      if (isSoundMuted || !isAudioUnlocked) return;
      const a = audioRef.current[key];
      if (!a) return;
      try {
        a.currentTime = 0;
        await a.play();
      } catch (_) {}
    },
    [isSoundMuted, isAudioUnlocked],
  );

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isLoggedIn) return;
    setKioskRunning(false);
    setCompanyId(null);
  }, [isLoggedIn, setKioskRunning]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const loadCompany = async () => {
      try {
        const id = await companiesService.getMyCompanyId();
        if (id) setCompanyId(id);
        const info = await companiesService.getMyCompany();
        if (info?.name) setCompanyName(info.name);
        const ka = info?.kioskAttendance ?? null;
        setKioskAttendance(ka);
        kioskAttendanceRef.current = ka;

        // ka.enabled contrôle le MODE PLAGES HORAIRES, pas l'arrêt du kiosque.
        // On ne force jamais l'arrêt automatiquement : l'utilisateur garde le contrôle.
        // On démarre automatiquement seulement si le schedule est configuré et que
        // l'utilisateur n'a pas explicitement arrêté le kiosque.
        if (ka?.enabled && hasKioskScheduleConfig(ka) && !userPausedKioskRef.current) {
          setKioskRunning(true);
        }
      } catch (err) {
        console.error('Impossible de charger le companyId / entreprise:', err);
      }
    };

    loadCompany();
    const t = setInterval(loadCompany, 60000);
    return () => clearInterval(t);
  }, [isLoggedIn, setKioskRunning, userPausedKioskRef]);

  useEffect(() => {
    if (!isLoggedIn) return undefined;

    const loadDepts = async () => {
      try {
        const list = await companiesService.getCompanyEmployees();
        const map = new Map();
        for (const e of Array.isArray(list) ? list : []) {
          const id = e?.id || e?._id;
          if (id) map.set(String(id), e?.department || '');
        }
        employeeDeptByIdRef.current = map;
      } catch (_) {}
    };

    loadDepts();
    const t = setInterval(loadDepts, 120000);
    return () => clearInterval(t);
  }, [isLoggedIn]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cameras');
      if (saved) {
        const cameras = JSON.parse(saved);
        const activeCamera = cameraSyncService.getActiveCamera();
        const cam = activeCamera
          ? cameras.find((c) => c.id === activeCamera.id)
          : cameras.find((c) => c.active);
        if (cam?.hlsUrl) {
          setHlsUrl(cam.hlsUrl);
        }
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    faceRecognitionService
      .checkHealth()
      .then((h) => setApiStatus(h?.status === 'ok' || h?.status === 'operational' ? 'ok' : 'warn'))
      .catch(() => setApiStatus('warn'));
  }, [isLoggedIn]);

  useEffect(() => {
    if (!isLoggedIn || !kioskActive || !videoRef.current) return undefined;

    setVideoError(null);
    setVideoConnected(false);

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 3,
        maxBufferLength: 5,
      });
      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setVideoConnected(true);
        setVideoError(null);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setVideoConnected(false);
          setVideoError(
            'Impossible de se connecter au flux video.\n' +
              'Verifiez que MediaMTX est demarre sur ce PC.\n' +
              `URL : ${hlsUrl}`,
          );
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setVideoConnected(true);
      });
      video.addEventListener('error', () => {
        setVideoConnected(false);
        setVideoError(`Impossible de lire le flux. Verifiez MediaMTX.\nURL : ${hlsUrl}`);
      });
    } else {
      setVideoError('Ce navigateur ne supporte pas la lecture HLS. Utilisez Chrome ou Edge.');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  // isKioskRoute retiré des dépendances : on ne veut pas recréer HLS à chaque
  // changement de route (fullscreen ↔ widget flottant), cela causait des
  // reconnexions inutiles et les logs "destroyed: not used anymore" dans MediaMTX.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, kioskActive, hlsUrl]);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return null;
    if (video.readyState < 2) return null;
    const w = video.videoWidth || video.clientWidth || 640;
    const h = video.videoHeight || video.clientHeight || 480;
    if (!w || !h) return null;
    canvas.width = w;
    canvas.height = h;
    try {
      canvas.getContext('2d').drawImage(video, 0, 0, w, h);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (_) {
      return null;
    }
  }, []);

  const showFeedback = useCallback((name, type, message = null) => {
    setFeedback({ name, type, message });
    setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
  }, []);

  const addRecentEvent = useCallback((name, type) => {
    const event = {
      id: Date.now(),
      name,
      type,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setRecentEvents((prev) => [event, ...prev].slice(0, 6));
  }, []);

  const runRecognition = useCallback(async () => {
    if (!isLoggedIn || !kioskActive || isRecognizing || !videoConnected || !companyId) return;

    const imageData = captureFrame();
    if (!imageData) return;

    setIsRecognizing(true);
    try {
      const result = await faceRecognitionService.recognizeFace(imageData, {
        confidenceThreshold: CONFIDENCE_THRESHOLD,
      });

      const person = result?.recognizedPerson;
      if (!person || !faceRecognitionService.isValidDetection(person, CONFIDENCE_THRESHOLD)) {
        noFaceStreakRef.current += 1;
        const now = Date.now();
        if (
          noFaceStreakRef.current >= 4 &&
          now - lastNoFaceHintAtRef.current > 20000
        ) {
          lastNoFaceHintAtRef.current = now;
          noFaceStreakRef.current = 0;
          showFeedback(
            'Reconnaissance',
            'warn',
            'Aucun visage identifie avec assez de confiance. Verifiez la lumiere, la distance, et que la photo employe est bien enregistree sur le serveur.',
          );
        }
        return;
      }

      noFaceStreakRef.current = 0;

      const employeeId = person.name;
      if (!employeeId) return;

      const lastTime = recentlyRecognized.current.get(employeeId);
      if (lastTime && Date.now() - lastTime < COOLDOWN_PER_PERSON_MS) return;

      try {
        await companiesService.attachEmployeeToMyCompany(employeeId);
      } catch (_) {}

      const ka = kioskAttendanceRef.current;
      const strict = ka?.enabled && hasKioskScheduleConfig(ka);
      const dept = employeeDeptByIdRef.current.get(employeeId) || '';
      const slots = strict ? getKioskSlotsForEmployee(ka, dept) : null;
      const scheduledAction = strict && slots?.length ? pickKioskActionForNow(slots, new Date()) : null;

      let pointageType = 'in';
      let displayName = person.displayName || employeeId;

      if (strict && slots?.length) {
        if (!scheduledAction) {
          showFeedback(displayName, 'warn', 'Hors creneau actif pour ce profil');
          await playSound('failure');
          return;
        }
        if (scheduledAction === 'clock_in') {
          try {
            const res = await attendanceService.clockIn({
              companyId,
              employeeId,
              source: 'kiosk',
              notes: `Kiosque (plage entree) — ${(person.similarity * 100).toFixed(1)}%`,
            });
            displayName = res?.employeeName || displayName;
            pointageType = 'in';
          } catch (clockInErr) {
            if (clockInErr?.response?.status === 409 || clockInErr?.response?.status === 400) {
              showFeedback(displayName, 'warn', "Entree deja ouverte ou employee non autorise");
              await playSound('failure');
              return;
            }
            showFeedback(displayName, 'warn', 'Echec du pointage entree');
            await playSound('failure');
            return;
          }
        } else {
          try {
            const res = await attendanceService.clockOut({
              companyId,
              employeeId,
              notes: `Kiosque (plage sortie) — ${(person.similarity * 100).toFixed(1)}%`,
            });
            displayName = res?.employeeName || displayName;
            pointageType = 'out';
          } catch (clockOutErr) {
            if (clockOutErr?.response?.status === 409 || clockOutErr?.response?.status === 400) {
              showFeedback(displayName, 'warn', 'Aucune entree ouverte pour effectuer une sortie');
              await playSound('failure');
              return;
            }
            showFeedback(displayName, 'warn', 'Echec du pointage sortie');
            await playSound('failure');
            return;
          }
        }
      } else {
        // Mode de base (plages horaires désactivées) :
        // On consulte quand même les créneaux configurés pour savoir si on est
        // dans un créneau "Sortie". Si oui → clockOut directement.
        // Si non → clockIn avec bascule auto sur clockOut si l'API retourne 409.
        const baseDept = normalizeDepartmentKey(
          employeeDeptByIdRef.current.get(employeeId) || '',
        );
        const baseOverrides = Array.isArray(ka?.teamOverrides) ? ka.teamOverrides : [];
        let softSlots = null;
        for (const t of baseOverrides) {
          if (!t?.enabled) continue;
          const tKey = normalizeDepartmentKey(t.departmentKey);
          if (tKey && tKey === baseDept && Array.isArray(t.slots) && t.slots.length > 0) {
            softSlots = t.slots;
            break;
          }
        }
        if (!softSlots && Array.isArray(ka?.defaultSlots) && ka.defaultSlots.length > 0) {
          softSlots = ka.defaultSlots;
        }
        const softAction = softSlots?.length ? pickKioskActionForNow(softSlots, new Date()) : null;

        if (softAction === 'clock_out') {
          // Créneau "Sortie" détecté → effectuer la sortie directement
          try {
            const res = await attendanceService.clockOut({
              companyId,
              employeeId,
              notes: `Kiosque automatique (créneau sortie) — ${(person.similarity * 100).toFixed(1)}% confiance`,
            });
            displayName = res?.employeeName || displayName;
            pointageType = 'out';
          } catch (clockOutErr) {
            if (clockOutErr?.response?.status === 409 || clockOutErr?.response?.status === 400) {
              showFeedback(displayName, 'warn', 'Aucune entree ouverte pour effectuer une sortie');
            } else {
              showFeedback(displayName, 'warn', 'Echec du pointage sortie');
            }
            await playSound('failure');
            return;
          }
        } else {
          // Créneau "Entrée" ou aucun créneau → clockIn avec bascule sur clockOut si 409
          try {
            const res = await attendanceService.clockIn({
              companyId,
              employeeId,
              source: 'kiosk',
              notes: `Kiosque automatique — ${(person.similarity * 100).toFixed(1)}% confiance`,
            });
            displayName = res?.employeeName || displayName;
            pointageType = 'in';
          } catch (clockInErr) {
            if (clockInErr?.response?.status === 409 || clockInErr?.response?.status === 400) {
              try {
                const res = await attendanceService.clockOut({
                  companyId,
                  employeeId,
                  notes: 'Kiosque automatique — sortie',
                });
                displayName = res?.employeeName || displayName;
                pointageType = 'out';
              } catch (_) {
                showFeedback(displayName, 'warn', 'Impossible de faire la sortie automatique');
                await playSound('failure');
                return;
              }
            } else {
              showFeedback(displayName, 'warn', 'Echec du pointage automatique');
              await playSound('failure');
              return;
            }
          }
        }
      }

      recentlyRecognized.current.set(employeeId, Date.now());
      showFeedback(displayName, pointageType);
      addRecentEvent(displayName, pointageType);
      await playSound(pointageType === 'in' ? 'success' : 'checkout');
    } catch (err) {
      console.warn('Reconnaissance:', err?.message || err);
    } finally {
      setIsRecognizing(false);
    }
  }, [
    isLoggedIn,
    kioskActive,
    isRecognizing,
    videoConnected,
    companyId,
    captureFrame,
    showFeedback,
    addRecentEvent,
    playSound,
  ]);

  useEffect(() => {
    if (!kioskActive || !videoConnected) return undefined;
    captureTimerRef.current = setInterval(runRecognition, CAPTURE_INTERVAL_MS);
    return () => clearInterval(captureTimerRef.current);
  }, [kioskActive, videoConnected, runRecognition]);

  const formattedDate = currentTime.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const strictSchedule = !!kioskAttendance?.enabled && hasKioskScheduleConfig(kioskAttendance);
  const inAnyCompanySlot = useMemo(
    () => isAnyKioskSlotActiveNow(kioskAttendance, currentTime),
    [kioskAttendance, currentTime],
  );

  /** Action du premier créneau « défaut entreprise » qui contient l'heure actuelle (affichage seulement). */
  const defaultCompanyActionNow = useMemo(() => {
    if (!kioskAttendance?.enabled) return null;
    const def = kioskAttendance.defaultSlots;
    if (!Array.isArray(def) || def.length === 0) return null;
    return pickKioskActionForNow(def, currentTime);
  }, [kioskAttendance, currentTime]);

  if (!isLoggedIn) return null;

  const renderStartButton = (className) => (
    <button
      onClick={() => {
        unlockAudio();
        startKiosk();
      }}
      className={className}
    >
      ▶ Demarrer le kiosque
    </button>
  );

  const renderStopButton = (className) => (
    <button
      onClick={() => {
        stopKiosk();
        setVideoConnected(false);
        setVideoError(null);
      }}
      className={className}
    >
      ⏹ Arreter le kiosque
    </button>
  );

  return (
    <>
      {isKioskRoute && (
        <div className="fixed inset-0 z-40 bg-[#002222] flex flex-col select-none" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
          <div className="flex items-center justify-between px-10 pt-8 pb-4">
            <div>
              <h1 className="text-white text-2xl font-bold">{companyName}</h1>
              <p className="text-[#ECEFEF] text-sm opacity-70 capitalize">{formattedDate}</p>
            </div>
            <div className="text-right">
              <p className="text-white text-5xl font-bold tracking-widest">{formattedTime}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/dashboard')}
                className="px-3 py-1.5 bg-[#0389A6] text-white rounded-lg text-xs hover:bg-[#027A94]"
              >
                Ouvrir les autres pages
              </button>
              {apiStatus === 'ok' && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-green-900 text-green-300 rounded-full text-xs">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  API connectee
                </span>
              )}
              {apiStatus === 'warn' && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-900 text-yellow-300 rounded-full text-xs">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  API indisponible
                </span>
              )}
            </div>
          </div>

          {kioskActive && strictSchedule && !inAnyCompanySlot && (
            <div className="mx-10 mb-2 px-4 py-3 rounded-xl bg-amber-900/90 border border-amber-600/50 text-amber-100 text-sm text-center leading-snug">
              <strong className="text-amber-50">Hors plage horaire.</strong>{' '}
              L'heure actuelle du PC est <strong>{formattedTime}</strong> - aucun pointage automatique n'est enregistre en dehors des creneaux.
            </div>
          )}

          {kioskActive && strictSchedule && inAnyCompanySlot && (
            <div className="mx-10 mb-2 px-4 py-2 rounded-xl bg-emerald-900/50 border border-emerald-600/40 text-emerald-100 text-xs text-center leading-snug">
              {defaultCompanyActionNow === 'clock_in' && (
                <>
                  Créneau <strong>entreprise (défaut)</strong> à cette heure : <strong>Entrée</strong>. Les équipes avec
                  plages propres utilisent leurs créneaux à la place.
                </>
              )}
              {defaultCompanyActionNow === 'clock_out' && (
                <>
                  Créneau <strong>entreprise (défaut)</strong> à cette heure : <strong>Sortie</strong>. Les équipes avec
                  plages propres utilisent leurs créneaux à la place.
                </>
              )}
              {!defaultCompanyActionNow && (
                <>
                  Plage active (équipe ou entreprise). Le kiosque enregistre <strong>Entrée</strong> ou{' '}
                  <strong>Sortie</strong> selon le <strong>créneau</strong> qui correspond à l&apos;heure et au{' '}
                  <strong>département</strong> de la personne reconnue.
                </>
              )}
            </div>
          )}

          {kioskActive && videoConnected && !companyId && (
            <div className="mx-10 mb-2 px-4 py-2 rounded-xl bg-yellow-900/60 border border-yellow-600/40 text-yellow-100 text-xs text-center">
              Chargement de l&apos;entreprise… Le pointage démarre dès que l&apos;identifiant société est disponible.
            </div>
          )}

          <div className="flex flex-1 gap-6 px-10 pb-8">
            <div className="flex-1 flex flex-col gap-4">
              <div className="relative bg-black rounded-3xl overflow-hidden flex-1" style={{ minHeight: '400px' }}>
                {kioskActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      className={`w-full h-full object-cover ${!videoConnected ? 'hidden' : ''}`}
                    />

                    {!videoConnected && !videoError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <p className="text-white text-sm">Connexion a la camera...</p>
                        <p className="text-gray-400 text-xs mt-1">{hlsUrl}</p>
                      </div>
                    )}

                    {videoError && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
                        <p className="text-red-400 text-sm text-center whitespace-pre-line">{videoError}</p>
                        <button
                          onClick={() => {
                            setKioskRunning(false);
                            setTimeout(() => setKioskRunning(true), 500);
                          }}
                          className="mt-4 px-4 py-2 bg-[#0389A6] text-white rounded-xl text-sm hover:bg-[#027A94]"
                        >
                          Reessayer
                        </button>
                      </div>
                    )}

                    {isRecognizing && videoConnected && (
                      <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black bg-opacity-60 rounded-full">
                        <span className="text-white text-xs">Analyse...</span>
                      </div>
                    )}

                    {feedback && (
                      <div className={`absolute inset-0 flex flex-col items-center justify-center ${
                        feedback.type === 'in'
                          ? 'bg-green-900 bg-opacity-80'
                          : feedback.type === 'out'
                            ? 'bg-orange-900 bg-opacity-80'
                            : 'bg-amber-900 bg-opacity-80'
                      }`}>
                        <p className="text-white text-4xl font-bold mb-2">{feedback.name}</p>
                        <p className={`text-2xl font-semibold ${
                          feedback.type === 'in'
                            ? 'text-green-300'
                            : feedback.type === 'out'
                              ? 'text-orange-300'
                              : 'text-amber-200'
                        }`}>
                          {feedback.type === 'in'
                            ? 'Entree enregistree'
                            : feedback.type === 'out'
                              ? 'Sortie enregistree'
                              : 'Pointage refuse'}
                        </p>
                        {feedback.message && <p className="text-amber-100 mt-2 text-sm">{feedback.message}</p>}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-white text-xl mb-2">Kiosque de pointage</p>
                    <p className="text-gray-400 text-sm mb-8">
                      Cliquez sur Demarrer pour activer la reconnaissance
                    </p>
                    {renderStartButton('px-8 py-3 bg-[#0389A6] text-white rounded-2xl text-lg font-semibold hover:bg-[#027A94] transition-colors')}
                  </div>
                )}
              </div>

              {kioskActive && videoConnected && !feedback && (
                <div className="bg-[#003333] rounded-2xl px-6 py-4 text-center">
                  <p className="text-[#ECEFEF] text-lg">Positionnez votre visage face a la camera</p>
                </div>
              )}
            </div>

            <div className="w-72 flex flex-col gap-4">
              <div className="bg-[#003333] rounded-2xl p-5 flex-1">
                <h2 className="text-white font-semibold text-base mb-4">Derniers pointages</h2>
                {recentEvents.length === 0 ? (
                  <p className="text-gray-400 text-sm">Aucun pointage pour le moment</p>
                ) : (
                  <div className="space-y-3">
                    {recentEvents.map((evt) => (
                      <div key={evt.id} className="text-sm">
                        <p className="text-white truncate">{evt.name}</p>
                        <p className={evt.type === 'in' ? 'text-green-400 text-xs' : 'text-orange-400 text-xs'}>
                          {evt.type === 'in' ? 'Entree' : 'Sortie'} - {evt.time}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-[#003333] rounded-2xl p-4 space-y-2">
                {kioskActive
                  ? renderStopButton('w-full px-4 py-2.5 bg-red-800 text-red-200 rounded-xl text-sm hover:bg-red-700 transition-colors')
                  : renderStartButton('w-full px-4 py-2.5 bg-[#0389A6] text-white rounded-xl text-sm hover:bg-[#027A94] transition-colors')}
                <div className="pt-2 border-t border-[#004444]">
                  <p className="text-gray-500 text-xs mb-1">URL flux video (HLS)</p>
                  <input
                    type="text"
                    value={hlsUrl}
                    onChange={(e) => setHlsUrl(e.target.value)}
                    className="w-full bg-[#002222] border border-[#004444] rounded-lg px-2 py-1.5 text-gray-300 text-xs focus:outline-none focus:border-[#0389A6]"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isKioskRoute && kioskActive && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-[#002222] border border-[#004444] rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-3 py-2 flex items-center justify-between bg-[#003333]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-white text-xs font-semibold">Kiosque actif</span>
            </div>
            <span className="text-gray-300 text-xs">{formattedTime}</span>
          </div>
          <div className="relative h-40 bg-black">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${!videoConnected ? 'hidden' : ''}`}
            />
            {!videoConnected && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-300 text-xs">Connexion camera...</p>
              </div>
            )}
          </div>
          <div className="p-3 flex items-center gap-2">
            <button
              onClick={() => navigate('/kiosque')}
              className="flex-1 px-3 py-2 bg-[#0389A6] text-white rounded-lg text-xs hover:bg-[#027A94]"
            >
              Ouvrir le kiosque
            </button>
            {renderStopButton('flex-1 px-3 py-2 bg-red-800 text-red-200 rounded-lg text-xs hover:bg-red-700')}
          </div>
          {feedback && (
            <div className="px-2 py-2 border-t border-[#004444] bg-[#003333] text-[11px] text-amber-100 leading-snug">
              <span className="font-semibold text-white">{feedback.name}</span>
              {' — '}
              {feedback.message ||
                (feedback.type === 'in'
                  ? 'Entrée enregistrée'
                  : feedback.type === 'out'
                    ? 'Sortie enregistrée'
                    : 'Pointage refusé')}
            </div>
          )}
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </>
  );
}
