import React, { useRef, useEffect, useState } from 'react';
import faceRecognitionService from '../services/faceRecognitionService';

/**
 * Composant de capture webcam pour la reconnaissance faciale
 */
const FaceCapture = ({ 
  onCapture, 
  onRecognition, 
  autoRecognize = false,
  showPreview = true,
  captureButtonText = "Capturer",
  className = ""
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

  // Démarrer la webcam
  const startCamera = async () => {
    try {
      setError(null);
      console.log('FaceCapture: Tentative de démarrage de la caméra...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log('FaceCapture: Stream obtenu:', stream);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Attendre que la vidéo soit prête avec plusieurs événements
        const handleVideoReady = () => {
          console.log('FaceCapture: Vidéo prête, dimensions:', videoRef.current?.videoWidth, 'x', videoRef.current?.videoHeight);
          setIsStreaming(true);
        };

        videoRef.current.onloadedmetadata = handleVideoReady;
        videoRef.current.oncanplay = handleVideoReady;
        
        // Fallback au cas où les événements ne se déclenchent pas
        setTimeout(() => {
          if (videoRef.current && videoRef.current.readyState >= 2) {
            console.log('FaceCapture: Fallback - forcer l\'activation du streaming');
            setIsStreaming(true);
          }
        }, 2000);
        
        console.log('FaceCapture: Caméra démarrée avec succès');
      }
    } catch (err) {
      console.error('FaceCapture: Erreur accès webcam:', err);
      setError('Impossible d\'accéder à la webcam. Vérifiez les permissions.');
    }
  };

  // Arrêter la webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsStreaming(false);
  };

  // Capturer une image
  const captureImage = async () => {
    console.log('FaceCapture: Tentative de capture...');
    console.log('FaceCapture: videoRef.current:', videoRef.current);
    console.log('FaceCapture: canvasRef.current:', canvasRef.current);
    console.log('FaceCapture: isStreaming:', isStreaming);

    if (!videoRef.current || !canvasRef.current) {
      console.error('FaceCapture: Références vidéo ou canvas manquantes');
      setError('Erreur: Caméra non initialisée');
      return;
    }

    if (!isStreaming) {
      console.error('FaceCapture: Pas de stream actif');
      setError('Erreur: Caméra non active');
      return;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      console.log('FaceCapture: Dimensions vidéo:', video.videoWidth, 'x', video.videoHeight);

      // Vérifier que la vidéo a des dimensions valides
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Vidéo non prête - dimensions invalides');
      }

      // Définir les dimensions du canvas
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Dessiner l'image du video sur le canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convertir en base64
      const imageBase64 = faceRecognitionService.canvasToBase64(canvas);
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

      console.log('FaceCapture: Image capturée avec succès');
      setCapturedImage(imageDataUrl);

      // Callback avec l'image capturée
      if (onCapture) {
        console.log('FaceCapture: Appel du callback onCapture');
        onCapture({
          base64: imageBase64,
          dataUrl: imageDataUrl,
          canvas: canvas
        });
      }

      // Reconnaissance automatique si activée
      if (autoRecognize) {
        console.log('FaceCapture: Démarrage de la reconnaissance automatique');
        await performRecognition(imageBase64);
      }

    } catch (err) {
      console.error('FaceCapture: Erreur capture:', err);
      setError('Erreur lors de la capture: ' + err.message);
    } finally {
      setIsCapturing(false);
    }
  };

  // Effectuer la reconnaissance faciale
  const performRecognition = async (imageBase64) => {
    setIsRecognizing(true);
    setError(null);

    try {
      const result = await faceRecognitionService.recognizeFace(imageBase64, {
        confidenceThreshold: 0.45, // Seuil plus bas pour plus de détections
        returnQualityInfo: true
      });

      setRecognitionResult(result);

      // Callback avec le résultat
      if (onRecognition) {
        onRecognition(result);
      }

    } catch (err) {
      console.error('Erreur reconnaissance:', err);
      setError('Erreur lors de la reconnaissance faciale: ' + err.message);
    } finally {
      setIsRecognizing(false);
    }
  };

  // Recommencer (nouvelle capture)
  const resetCapture = () => {
    setCapturedImage(null);
    setRecognitionResult(null);
    setError(null);
  };

  // Démarrer la caméra au montage du composant
  useEffect(() => {
    console.log('FaceCapture: Composant monté, démarrage de la caméra...');
    startCamera();

    // Nettoyage au démontage
    return () => {
      console.log('FaceCapture: Composant démonté, arrêt de la caméra...');
      stopCamera();
    };
  }, []);

  return (
    <div className={`face-capture ${className}`}>
      {/* Debug info */}
      <div className="mb-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
        <div>Debug FaceCapture: Streaming={isStreaming.toString()}, Error={error || 'none'}</div>
        <div>Video Ready State: {videoRef.current?.readyState || 'N/A'}</div>
        <div>Video Dimensions: {videoRef.current?.videoWidth || 0} x {videoRef.current?.videoHeight || 0}</div>
        {!isStreaming && videoRef.current?.readyState >= 2 && (
          <button 
            onClick={() => setIsStreaming(true)}
            className="mt-1 px-2 py-1 bg-blue-500 text-white text-xs rounded"
          >
            Forcer l'activation
          </button>
        )}
      </div>

      {/* Titre */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Reconnaissance Faciale
        </h3>
        <p className="text-sm text-gray-600">
          Positionnez votre visage face à la caméra et cliquez sur "Capturer"
        </p>
      </div>

      {/* Zone de capture */}
      <div className="relative bg-gray-200 rounded-lg overflow-hidden mb-4 min-h-[300px]">
        {/* Vidéo en direct */}
        {isStreaming && !capturedImage && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto max-h-96 object-cover"
            style={{ backgroundColor: '#f0f0f0', minHeight: '300px' }}
          />
        )}

        {/* Image capturée */}
        {capturedImage && showPreview && (
          <img
            src={capturedImage}
            alt="Image capturée"
            className="w-full h-auto max-h-96 object-cover"
          />
        )}

        {/* Canvas caché pour la capture */}
        <canvas
          ref={canvasRef}
          className="hidden"
        />

        {/* Message si pas de stream */}
        {!isStreaming && !capturedImage && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center text-gray-600">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto mb-2"></div>
              <p className="text-sm">Chargement de la caméra...</p>
            </div>
          </div>
        )}

        {/* Overlay de chargement */}
        {(isCapturing || isRecognizing) && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p className="text-sm">
                {isCapturing ? 'Capture en cours...' : 'Reconnaissance en cours...'}
              </p>
            </div>
          </div>
        )}

        {/* Indicateur de statut */}
        {isStreaming && !capturedImage && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
            ● En direct
          </div>
        )}
      </div>

      {/* Boutons de contrôle */}
      <div className="flex gap-3 mb-4">
        {!capturedImage ? (
          <button
            onClick={captureImage}
            disabled={!isStreaming || isCapturing}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              !isStreaming || isCapturing
                ? 'bg-gray-400 cursor-not-allowed text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg'
            }`}
          >
            {isCapturing ? (
              <div className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Capture en cours...
              </div>
            ) : (
              captureButtonText || 'Capturer'
            )}
          </button>
        ) : (
          <>
            <button
              onClick={resetCapture}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Recommencer
            </button>
            {!autoRecognize && (
              <button
                onClick={() => performRecognition(faceRecognitionService.canvasToBase64(canvasRef.current))}
                disabled={isRecognizing}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                {isRecognizing ? 'Reconnaissance...' : 'Reconnaître'}
              </button>
            )}
          </>
        )}
      </div>

      {/* Résultats de reconnaissance */}
      {recognitionResult && (
        <div className="bg-gray-800 rounded-lg p-4 mb-4">
          <h4 className="text-white font-semibold mb-2">Résultat de la reconnaissance</h4>
          
          {recognitionResult.hasRecognizedFace ? (
            <div className="space-y-2">
              {recognitionResult.detections.map((detection, index) => {
                const confidence = faceRecognitionService.getConfidenceLevel(detection.similarity);
                return (
                  <div key={index} className="bg-gray-700 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-white font-medium">{detection.name}</span>
                      <span 
                        className={`px-2 py-1 rounded text-xs font-semibold text-white`}
                        style={{ backgroundColor: confidence.color }}
                      >
                        {confidence.level}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300 space-y-1">
                      <p>Similarité: {(detection.similarity * 100).toFixed(1)}%</p>
                      <p>Qualité: {(detection.quality_score * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-gray-400 mt-2">
                Temps de traitement: {recognitionResult.processingTime?.toFixed(1)}ms
              </p>
            </div>
          ) : (
            <div className="text-yellow-400">
              <p>Aucun visage reconnu</p>
              <p className="text-sm text-gray-400 mt-1">{recognitionResult.message}</p>
            </div>
          )}
        </div>
      )}

      {/* Messages d'erreur */}
      {error && (
        <div className="bg-red-600 text-white p-3 rounded-lg mb-4">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Conseils */}
      <div className="bg-blue-900 bg-opacity-50 rounded-lg p-3">
        <h5 className="text-white font-medium mb-2">💡 Conseils pour une bonne reconnaissance</h5>
        <ul className="text-sm text-gray-300 space-y-1">
          <li>• Assurez-vous d'avoir un bon éclairage</li>
          <li>• Regardez directement la caméra</li>
          <li>• Évitez les ombres sur le visage</li>
          <li>• Une seule personne doit être visible</li>
        </ul>
      </div>
    </div>
  );
};

export default FaceCapture;




