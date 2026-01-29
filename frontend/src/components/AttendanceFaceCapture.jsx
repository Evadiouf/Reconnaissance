import React, { useRef, useEffect, useState } from 'react';
import faceRecognitionService from '../services/faceRecognitionService';

/**
 * Composant de capture faciale pour le pointage
 * Utilise l'API Naratech pour la reconnaissance faciale
 */
const AttendanceFaceCapture = ({ 
  mode = 'clockin', // 'clockin' ou 'clockout'
  onRecognitionSuccess,
  onRecognitionError,
  onClose
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [error, setError] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [recognitionResult, setRecognitionResult] = useState(null);
  const [apiStatus, setApiStatus] = useState(null);

  // Vérifier l'état de l'API au montage
  useEffect(() => {
    const checkApiHealth = async () => {
      try {
        const health = await faceRecognitionService.checkHealth();
        console.log('🔍 Health check result:', health);
        setApiStatus(health);
        
        // Vérifier si l'API est opérationnelle
        if (health.status === 'ok' || health.status === 'operational') {
          // API opérationnelle
          console.log('✅ API Naratech opérationnelle');
          setError(null);
        } else if (health.status === 'error') {
          // API en erreur mais on peut quand même essayer
          console.warn('⚠️ API Naratech en erreur:', health.error || health);
          setError(null); // Ne pas bloquer, on peut quand même essayer
        } else {
          // Statut inconnu, considérer comme opérationnel si on a des données
          console.log('ℹ️ Statut API inconnu, mais données présentes:', health);
          setError(null);
        }
      } catch (err) {
        console.error('❌ Erreur lors de la vérification de l\'API:', err);
        // Ne pas bloquer l'interface, juste afficher un avertissement
        setApiStatus({ status: 'error', error: err.message });
        setError(null); // Permettre quand même l'utilisation
      }
    };
    
    checkApiHealth();
  }, []);

  // Démarrer la webcam
  const startCamera = async () => {
    console.log('🎥 Démarrage de la caméra...');
    try {
      setError(null);
      
      // Vérifier si l'API est disponible
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('L\'accès à la caméra n\'est pas supporté par ce navigateur.');
      }
      
      console.log('🎥 Demande d\'accès à la caméra...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      console.log('✅ Stream obtenu:', stream);
      
      // Attendre que l'élément vidéo soit disponible dans le DOM
      let retries = 0;
      const maxRetries = 10;
      
      while (!videoRef.current && retries < maxRetries) {
        console.log(`⏳ Attente de l'élément vidéo... (tentative ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
      }
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsStreaming(true);
        setError(null); // Effacer toute erreur précédente
        console.log('✅ Caméra démarrée avec succès, isStreaming:', true);
        
        // Forcer la lecture de la vidéo
        try {
          await videoRef.current.play();
          console.log('▶️ Vidéo en lecture');
        } catch (playError) {
          console.warn('⚠️ Erreur lors de la lecture automatique:', playError);
        }
      } else {
        console.error('❌ videoRef.current est toujours null après', maxRetries, 'tentatives');
        throw new Error('L\'élément vidéo n\'est pas disponible dans le DOM. Veuillez réessayer.');
      }
    } catch (err) {
      console.error('❌ Erreur lors du démarrage de la caméra:', err);
      let errorMessage = 'Impossible d\'accéder à la caméra.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Permission refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres du navigateur.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'Aucune caméra trouvée. Vérifiez que votre caméra est connectée.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'La caméra est déjà utilisée par une autre application.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMessage = 'Les paramètres de la caméra ne sont pas supportés.';
      } else {
        errorMessage = `Erreur d'accès à la caméra: ${err.message || err.name}`;
      }
      
      setError(errorMessage);
    }
  };

  // Arrêter la webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  };

  // Capturer une image depuis la vidéo
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    // Définir les dimensions du canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Dessiner l'image de la vidéo sur le canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convertir en data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return imageDataUrl;
  };

  // Effectuer la reconnaissance faciale
  const recognizeFace = async () => {
    if (!isStreaming) {
      setError('Veuillez d\'abord démarrer la caméra');
      return;
    }

    setIsCapturing(true);
    setIsRecognizing(true);
    setError(null);
    setRecognitionResult(null);

    try {
      // Capturer l'image
      const imageDataUrl = captureImage();
      if (!imageDataUrl) {
        throw new Error('Impossible de capturer l\'image');
      }

      setCapturedImage(imageDataUrl);

      // Effectuer la reconnaissance via l'API
      console.log('🔍 Envoi de l\'image pour reconnaissance...');
      const result = await faceRecognitionService.recognizeFace(imageDataUrl, {
        returnQualityInfo: true,
        confidenceThreshold: 0.45 // Seuil MOYENNE: Pointage.jsx fera la validation finale (entreprise + ID)
      });

      console.log('📊 Résultat de la reconnaissance:', result);
      setRecognitionResult(result);

      // Vérifier si une personne a été reconnue
      if (result.recognizedPerson) {
        const detection = result.recognizedPerson;
        
        // Vérifier que la détection est valide
        // Seuil MOYENNE: on passe la détection au parent.
        // Pointage.jsx applique ensuite la validation métier (employé dans l'entreprise, etc.)
        if (faceRecognitionService.isValidDetection(detection, 0.45)) {
          // Appeler le callback de succès
          if (onRecognitionSuccess) {
            onRecognitionSuccess({
              personName: detection.name,
              confidence: detection.confidence_level,
              similarity: detection.similarity,
              qualityScore: detection.quality_score,
              image: imageDataUrl,
              processingTime: result.processingTime
            });
          }
        } else {
          throw new Error('Confiance de reconnaissance trop faible');
        }
      } else if (result.detections && result.detections.length > 0) {
        // Visage détecté mais non reconnu
        const detection = result.detections[0];
        const confidenceLevel = detection.confidence_level || 'REJETÉ';
        const similarity = detection.similarity || 0;
        
        // Message plus informatif selon le niveau de confiance
        let errorMessage;
        if (confidenceLevel === 'REJETÉ' || similarity < 0.35) {
          errorMessage = `Visage détecté mais non reconnu. Votre photo n'est peut-être pas enregistrée dans le système. Veuillez contacter l'administrateur pour enregistrer votre photo. (Confiance: ${confidenceLevel}, Similarité: ${(similarity * 100).toFixed(1)}%)`;
        } else if (similarity < 0.45) {
          errorMessage = `Visage détecté mais confiance trop faible (${(similarity * 100).toFixed(1)}%). Veuillez améliorer l'éclairage et repositionner votre visage face à la caméra.`;
        } else {
          errorMessage = `Visage détecté mais non reconnu. Confiance: ${confidenceLevel} (${(similarity * 100).toFixed(1)}%)`;
        }
        
        throw new Error(errorMessage);
      } else {
        throw new Error('Aucun visage détecté dans l\'image. Veuillez vous positionner face à la caméra.');
      }
    } catch (err) {
      console.error('Erreur lors de la reconnaissance:', err);
      const errorMessage = err.message || 'Erreur lors de la reconnaissance faciale';
      setError(errorMessage);
      
      if (onRecognitionError) {
        onRecognitionError(err);
      }
    } finally {
      setIsCapturing(false);
      setIsRecognizing(false);
    }
  };

  // Nettoyer à la fermeture
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Réattacher le stream si l'élément vidéo devient disponible
  useEffect(() => {
    if (isStreaming && streamRef.current && videoRef.current && !videoRef.current.srcObject) {
      console.log('🔧 Réattachement du stream à l\'élément vidéo');
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => {
        console.warn('⚠️ Erreur lors de la lecture automatique:', err);
      });
    }
  }, [isStreaming]);

  return (
    <div className="space-y-4">
      {/* Statut de l'API */}
      {apiStatus && (
        <div className={`p-3 rounded-lg text-sm ${
          (apiStatus.status === 'ok' || apiStatus.status === 'operational') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : apiStatus.status === 'error'
            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
        }`}>
          {(apiStatus.status === 'ok' || apiStatus.status === 'operational') ? (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>API connectée ({apiStatus.loadedPersons || apiStatus.loaded_persons || 0} personne(s) enregistrée(s))</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>
                {apiStatus.error 
                  ? `API: ${apiStatus.error}` 
                  : "Vérification de l'API en cours... Vous pouvez quand même utiliser la caméra"}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Zone de vidéo */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
        {/* Toujours rendre l'élément vidéo pour qu'il soit disponible dans le DOM */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isStreaming ? 'hidden' : ''}`}
          onLoadedMetadata={() => {
            console.log('✅ Vidéo chargée, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
          }}
          onPlay={() => {
            console.log('▶️ Vidéo en lecture');
          }}
          onError={(e) => {
            console.error('❌ Erreur vidéo:', e);
          }}
        />
        
        {/* Message quand la caméra n'est pas démarrée */}
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-sm opacity-75">Caméra non démarrée</p>
            </div>
          </div>
        )}
        
        {/* Image capturée en overlay */}
        {capturedImage && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <img 
              src={capturedImage} 
              alt="Image capturée" 
              className="max-w-full max-h-full"
            />
          </div>
        )}
        
        {/* Canvas caché pour la capture */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Messages d'erreur */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Résultat de la reconnaissance */}
      {recognitionResult && recognitionResult.recognizedPerson && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Personne reconnue !</span>
          </div>
          <div className="text-xs space-y-1">
            <p><strong>Nom:</strong> {recognitionResult.recognizedPerson.name}</p>
            <p><strong>Confiance:</strong> {recognitionResult.recognizedPerson.confidence_level}</p>
            <p><strong>Similarité:</strong> {(recognitionResult.recognizedPerson.similarity * 100).toFixed(1)}%</p>
            <p><strong>Temps de traitement:</strong> {recognitionResult.processingTime.toFixed(0)}ms</p>
          </div>
        </div>
      )}

      {/* Boutons de contrôle */}
      <div className="flex gap-3">
        {!isStreaming ? (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log('🔵 Bouton "Démarrer la caméra" cliqué');
              startCamera();
            }}
            className="flex-1 px-4 py-2.5 bg-[#0389A6] text-white rounded-lg hover:bg-[#027A94] transition-colors font-instrument text-sm"
          >
            Démarrer la caméra
          </button>
        ) : (
          <>
            <button
              onClick={recognizeFace}
              disabled={isRecognizing || isCapturing}
              className="flex-1 px-4 py-2.5 bg-[#01A04E] text-white rounded-lg hover:bg-[#019A47] transition-colors font-instrument text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRecognizing ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Reconnaissance en cours...
                </span>
              ) : (
                `Reconnaître (${mode === 'clockin' ? 'Entrée' : 'Sortie'})`
              )}
            </button>
            <button
              onClick={stopCamera}
              className="px-4 py-2.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-instrument text-sm"
            >
              Arrêter
            </button>
          </>
        )}
        
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors font-instrument text-sm"
          >
            Fermer
          </button>
        )}
      </div>
    </div>
  );
};

export default AttendanceFaceCapture;
