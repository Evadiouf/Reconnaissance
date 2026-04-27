import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import faceRecognitionService from '../services/faceRecognitionService';
import { attendanceService } from '../services/attendanceService';
import companiesService from '../services/companiesService';
import cameraSyncService from '../services/cameraSyncService';

/**
 * Page Kiosque — mode automatique plein écran
 * L'employé passe devant la caméra → reconnaissance automatique → pointage enregistré
 * Doit tourner sur le même PC que MediaMTX (http://localhost:8888/camera/index.m3u8)
 */

const DEFAULT_HLS_URL = 'http://localhost:8888/camera/index.m3u8';
const CAPTURE_INTERVAL_MS = 2500;       // Capture toutes les 2,5 secondes
const COOLDOWN_PER_PERSON_MS = 30000;   // 30s entre deux pointages du même employé
const CONFIDENCE_THRESHOLD = 0.50;      // Seuil de confiance minimum
const FEEDBACK_DURATION_MS = 4000;      // Durée d'affichage du feedback

export default function Kiosque() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const hlsRef = useRef(null);
  const captureTimerRef = useRef(null);
  const recentlyRecognized = useRef(new Map()); // employeeId → timestamp

  const [currentTime, setCurrentTime] = useState(new Date());
  const [companyId, setCompanyId] = useState(null);
  const [companyName, setCompanyName] = useState('SenPointage');
  const [hlsUrl, setHlsUrl] = useState(DEFAULT_HLS_URL);
  const [videoConnected, setVideoConnected] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [feedback, setFeedback] = useState(null); // { name, type: 'in'|'out', photo }
  const [recentEvents, setRecentEvents] = useState([]);
  const [apiStatus, setApiStatus] = useState(null);
  const [isActive, setIsActive] = useState(false);

  // Horloge en temps réel
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Charger companyId et infos entreprise
  useEffect(() => {
    const loadCompany = async () => {
      try {
        const id = await companiesService.getMyCompanyId();
        if (id) {
          setCompanyId(id);
          try {
            const info = await companiesService.getMyCompany();
            if (info?.name) setCompanyName(info.name);
          } catch (_) {}
        }
      } catch (err) {
        console.error('Impossible de charger le companyId:', err);
      }
    };
    loadCompany();
  }, []);

  // Charger l'URL HLS depuis la caméra active configurée
  useEffect(() => {
    try {
      const saved = localStorage.getItem('cameras');
      if (saved) {
        const cameras = JSON.parse(saved);
        const activeCamera = cameraSyncService.getActiveCamera();
        const cam = activeCamera
          ? cameras.find(c => c.id === activeCamera.id)
          : cameras.find(c => c.active);
        if (cam?.hlsUrl) {
          setHlsUrl(cam.hlsUrl);
          console.log('📡 URL HLS chargée depuis la config caméra:', cam.hlsUrl);
        }
      }
    } catch (_) {}
  }, []);

  // Vérifier l'API Naratech
  useEffect(() => {
    faceRecognitionService.checkHealth()
      .then(h => setApiStatus(h?.status === 'ok' || h?.status === 'operational' ? 'ok' : 'warn'))
      .catch(() => setApiStatus('warn'));
  }, []);

  // Initialiser le lecteur HLS
  useEffect(() => {
    if (!isActive || !videoRef.current) return;

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
        console.log('✅ Flux HLS connecté:', hlsUrl);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error('❌ Erreur HLS fatale:', data.type, data.details);
          setVideoConnected(false);
          setVideoError(
            'Impossible de se connecter au flux vidéo.\n' +
            'Vérifiez que MediaMTX est démarré sur ce PC.\n' +
            `URL : ${hlsUrl}`
          );
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari — support HLS natif
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
        setVideoConnected(true);
      });
      video.addEventListener('error', () => {
        setVideoConnected(false);
        setVideoError(`Impossible de lire le flux. Vérifiez MediaMTX.\nURL : ${hlsUrl}`);
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
  }, [isActive, hlsUrl]);

  // Capturer une image depuis la vidéo
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.85);
  }, []);

  // Afficher le feedback de pointage
  const showFeedback = useCallback((name, type) => {
    setFeedback({ name, type });
    setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
  }, []);

  // Ajouter un événement récent
  const addRecentEvent = useCallback((name, type) => {
    const event = {
      id: Date.now(),
      name,
      type,
      time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setRecentEvents(prev => [event, ...prev].slice(0, 6));
  }, []);

  // Boucle principale de reconnaissance
  const runRecognition = useCallback(async () => {
    if (isRecognizing || !videoConnected || !companyId) return;

    const imageData = captureFrame();
    if (!imageData) return;

    setIsRecognizing(true);
    try {
      const result = await faceRecognitionService.recognizeFace(imageData, {
        confidenceThreshold: CONFIDENCE_THRESHOLD,
      });

      const person = result?.recognizedPerson;
      if (!person || !faceRecognitionService.isValidDetection(person, CONFIDENCE_THRESHOLD)) {
        return; // Personne non reconnue ou confiance trop faible
      }

      const employeeId = person.name; // L'ID MongoDB est stocké comme "name" dans Naratech
      if (!employeeId) return;

      // Anti-doublon : ignorer si déjà pointé récemment
      const lastTime = recentlyRecognized.current.get(employeeId);
      if (lastTime && Date.now() - lastTime < COOLDOWN_PER_PERSON_MS) {
        console.log(`⏭️ ${employeeId} déjà pointé, cooldown actif`);
        return;
      }

      recentlyRecognized.current.set(employeeId, Date.now());
      console.log(`✅ Personne reconnue: ${employeeId} (${(person.similarity * 100).toFixed(1)}%)`);

      // Rattacher l'employé à l'entreprise (idempotent)
      try {
        await companiesService.attachEmployeeToMyCompany(employeeId);
      } catch (_) {}

      // Déterminer si c'est une entrée ou sortie en tentant clock-in d'abord
      let pointageType = 'in';
      let displayName = person.displayName || employeeId;

      try {
        const res = await attendanceService.clockIn({
          companyId,
          employeeId,
          source: 'kiosk',
          notes: `Kiosque automatique — ${(person.similarity * 100).toFixed(1)}% confiance`,
        });
        displayName = res?.employeeName || displayName;
        pointageType = 'in';
        console.log('⏱️ Clock-in enregistré pour', employeeId);
      } catch (clockInErr) {
        // Si déjà pointé en entrée → tenter clock-out
        if (clockInErr?.response?.status === 409 || clockInErr?.response?.status === 400) {
          try {
            const res = await attendanceService.clockOut({
              companyId,
              employeeId,
              notes: `Kiosque automatique — sortie`,
            });
            displayName = res?.employeeName || displayName;
            pointageType = 'out';
            console.log('⏱️ Clock-out enregistré pour', employeeId);
          } catch (clockOutErr) {
            console.error('Erreur clock-out:', clockOutErr?.message);
            return;
          }
        } else {
          console.error('Erreur clock-in:', clockInErr?.message);
          return;
        }
      }

      showFeedback(displayName, pointageType);
      addRecentEvent(displayName, pointageType);

    } catch (err) {
      // Pas de visage ou erreur légère → ignorer silencieusement
      if (!err?.message?.includes('Aucun visage') && !err?.message?.includes('confiance')) {
        console.warn('Reconnaissance:', err?.message);
      }
    } finally {
      setIsRecognizing(false);
    }
  }, [isRecognizing, videoConnected, companyId, captureFrame, showFeedback, addRecentEvent]);

  // Démarrer/arrêter la boucle de capture
  useEffect(() => {
    if (!isActive || !videoConnected) return;

    captureTimerRef.current = setInterval(runRecognition, CAPTURE_INTERVAL_MS);
    return () => clearInterval(captureTimerRef.current);
  }, [isActive, videoConnected, runRecognition]);

  const formattedDate = currentTime.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  const formattedTime = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });

  return (
    <div className="min-h-screen bg-[#002222] flex flex-col select-none" style={{ fontFamily: "'Instrument Sans', sans-serif" }}>

      {/* En-tête */}
      <div className="flex items-center justify-between px-10 pt-8 pb-4">
        <div>
          <h1 className="text-white text-2xl font-bold">{companyName}</h1>
          <p className="text-[#ECEFEF] text-sm opacity-70 capitalize">{formattedDate}</p>
        </div>
        <div className="text-right">
          <p className="text-white text-5xl font-bold tracking-widest">{formattedTime}</p>
        </div>
        <div className="flex items-center gap-3">
          {apiStatus === 'ok' && (
            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-900 text-green-300 rounded-full text-xs">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              API connectée
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

      {/* Zone principale */}
      <div className="flex flex-1 gap-6 px-10 pb-8">

        {/* Flux vidéo */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative bg-black rounded-3xl overflow-hidden flex-1" style={{ minHeight: '400px' }}>
            {isActive ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-cover ${!videoConnected ? 'hidden' : ''}`}
                />

                {/* Badge En direct */}
                {videoConnected && (
                  <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 bg-black bg-opacity-50 rounded-full">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-white text-xs font-medium">En direct</span>
                  </div>
                )}

                {/* Spinner connexion */}
                {!videoConnected && !videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <svg className="animate-spin w-12 h-12 text-[#0389A6] mb-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <p className="text-white text-sm">Connexion à la caméra...</p>
                    <p className="text-gray-400 text-xs mt-1">{hlsUrl}</p>
                  </div>
                )}

                {/* Erreur vidéo */}
                {videoError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center px-8">
                    <svg className="w-16 h-16 text-red-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                    <p className="text-red-400 text-sm text-center whitespace-pre-line">{videoError}</p>
                    <button
                      onClick={() => { setIsActive(false); setTimeout(() => setIsActive(true), 500); }}
                      className="mt-4 px-4 py-2 bg-[#0389A6] text-white rounded-xl text-sm hover:bg-[#027A94]"
                    >
                      Réessayer
                    </button>
                  </div>
                )}

                {/* Overlay reconnaissance en cours */}
                {isRecognizing && videoConnected && (
                  <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-black bg-opacity-60 rounded-full">
                    <svg className="animate-spin w-4 h-4 text-[#0389A6]" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                    </svg>
                    <span className="text-white text-xs">Analyse...</span>
                  </div>
                )}

                {/* Feedback pointage */}
                {feedback && (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center ${
                    feedback.type === 'in' ? 'bg-green-900 bg-opacity-80' : 'bg-orange-900 bg-opacity-80'
                  }`}>
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
                      feedback.type === 'in' ? 'bg-green-500' : 'bg-orange-500'
                    }`}>
                      {feedback.type === 'in' ? (
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                        </svg>
                      ) : (
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-white text-4xl font-bold mb-2">{feedback.name}</p>
                    <p className={`text-2xl font-semibold ${feedback.type === 'in' ? 'text-green-300' : 'text-orange-300'}`}>
                      {feedback.type === 'in' ? '✓ Entrée enregistrée' : '✓ Sortie enregistrée'}
                    </p>
                    <p className="text-gray-300 text-lg mt-2">{formattedTime}</p>
                  </div>
                )}
              </>
            ) : (
              /* Écran d'accueil avant démarrage */
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <svg className="w-20 h-20 text-[#0389A6] mb-6 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                <p className="text-white text-xl mb-2">Kiosque de pointage</p>
                <p className="text-gray-400 text-sm mb-8">Cliquez sur Démarrer pour activer la reconnaissance</p>
                <button
                  onClick={() => setIsActive(true)}
                  className="px-8 py-3 bg-[#0389A6] text-white rounded-2xl text-lg font-semibold hover:bg-[#027A94] transition-colors"
                >
                  ▶ Démarrer le kiosque
                </button>
              </div>
            )}
          </div>

          {/* Instructions */}
          {isActive && videoConnected && !feedback && (
            <div className="bg-[#003333] rounded-2xl px-6 py-4 text-center">
              <p className="text-[#ECEFEF] text-lg">Positionnez votre visage face à la caméra</p>
              <p className="text-gray-400 text-sm mt-1">La reconnaissance est automatique — restez immobile 2 secondes</p>
            </div>
          )}
        </div>

        {/* Panneau droit — derniers pointages */}
        <div className="w-72 flex flex-col gap-4">
          <div className="bg-[#003333] rounded-2xl p-5 flex-1">
            <h2 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
              <svg className="w-4 h-4 text-[#0389A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              Derniers pointages
            </h2>

            {recentEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 opacity-40">
                <svg className="w-10 h-10 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
                <p className="text-gray-400 text-sm text-center">Aucun pointage<br/>pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentEvents.map(evt => (
                  <div key={evt.id} className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      evt.type === 'in' ? 'bg-green-800' : 'bg-orange-800'
                    }`}>
                      {evt.type === 'in' ? (
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7"/>
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{evt.name}</p>
                      <p className={`text-xs ${evt.type === 'in' ? 'text-green-400' : 'text-orange-400'}`}>
                        {evt.type === 'in' ? 'Entrée' : 'Sortie'} · {evt.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contrôles */}
          <div className="bg-[#003333] rounded-2xl p-4 space-y-2">
            {isActive ? (
              <button
                onClick={() => { setIsActive(false); setVideoConnected(false); setVideoError(null); }}
                className="w-full px-4 py-2.5 bg-red-800 text-red-200 rounded-xl text-sm hover:bg-red-700 transition-colors"
              >
                ⏹ Arrêter le kiosque
              </button>
            ) : (
              <button
                onClick={() => setIsActive(true)}
                className="w-full px-4 py-2.5 bg-[#0389A6] text-white rounded-xl text-sm hover:bg-[#027A94] transition-colors"
              >
                ▶ Démarrer le kiosque
              </button>
            )}

            <div className="pt-2 border-t border-[#004444]">
              <p className="text-gray-500 text-xs mb-1">URL flux vidéo (HLS)</p>
              <input
                type="text"
                value={hlsUrl}
                onChange={e => setHlsUrl(e.target.value)}
                className="w-full bg-[#002222] border border-[#004444] rounded-lg px-2 py-1.5 text-gray-300 text-xs focus:outline-none focus:border-[#0389A6]"
                placeholder="http://localhost:8888/camera/index.m3u8"
              />
              <p className="text-gray-600 text-xs mt-1">MediaMTX doit tourner sur ce PC</p>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas caché pour capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
