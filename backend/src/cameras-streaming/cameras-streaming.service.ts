import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import ffmpeg from 'fluent-ffmpeg';
import * as ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

// Configurer le chemin FFmpeg
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface CameraStream {
  cameraId: string;
  rtspUrl: string;
  process: any;
  clients: Set<any>;
  isActive: boolean;
}

@Injectable()
export class CamerasStreamingService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(CamerasStreamingService.name);
  private activeStreams: Map<string, CameraStream> = new Map();

  /**
   * Construit l'URL RTSP à partir des informations de la caméra
   */
  buildRtspUrl(camera: {
    ip: string;
    port: string | number;
    username?: string;
    password?: string;
    rtspUrl?: string;
  }): string {
    // Si une URL RTSP complète est fournie, l'utiliser
    if (camera.rtspUrl && camera.rtspUrl.startsWith('rtsp://')) {
      return camera.rtspUrl;
    }

    // Sinon, construire l'URL RTSP depuis les paramètres IP
    // Le champ ip peut contenir le port concaténé (ex: "192.168.1.10:554")
    let finalIp = camera.ip;
    let finalPort: string | number = camera.port || 554;

    if (finalIp && finalIp.includes(':')) {
      const parts = finalIp.split(':');
      finalIp = parts[0];
      const parsedPort = parseInt(parts[1], 10);
      if (!isNaN(parsedPort)) {
        finalPort = parsedPort;
      }
    }

    if (!finalIp) {
      throw new Error('Adresse IP manquante pour la caméra');
    }

    // Chemin RTSP par défaut (Dahua / Hikvision compatibles)
    // Dahua: /cam/realmonitor?channel=1&subtype=0
    // Hikvision: /Streaming/Channels/101
    // EZVIZ: /h264_stream
    const defaultPath = '/cam/realmonitor?channel=1&subtype=0';

    // Si username/password sont fournis, les inclure dans l'URL
    if (camera.username && camera.password) {
      const auth = `${encodeURIComponent(camera.username)}:${encodeURIComponent(camera.password)}@`;
      return `rtsp://${auth}${finalIp}:${finalPort}${defaultPath}`;
    }

    return `rtsp://${finalIp}:${finalPort}${defaultPath}`;
  }

  /**
   * Vérifie si une URL RTSP (ou une IP) correspond à un réseau local.
   * Une IP locale n'est pas accessible depuis un backend hébergé dans le cloud.
   */
  isLocalIp(rtspUrlOrIp: string): boolean {
    const localPatterns = [
      /^rtsp:\/\/[^@]*@?192\.168\./,
      /^rtsp:\/\/[^@]*@?10\./,
      /^rtsp:\/\/[^@]*@?172\.(1[6-9]|2\d|3[01])\./,
      /^rtsp:\/\/[^@]*@?127\./,
      /^rtsp:\/\/[^@]*@?localhost/i,
      /^192\.168\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^127\./,
    ];
    return localPatterns.some((pattern) => pattern.test(rtspUrlOrIp));
  }

  /**
   * Démarre un stream MJPEG depuis une caméra RTSP
   */
  startStream(cameraId: string, camera: {
    ip: string;
    port: string | number;
    username?: string;
    password?: string;
    rtspUrl?: string;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      // Si le stream existe déjà, ne pas le recréer
      if (this.activeStreams.has(cameraId)) {
        this.logger.log(`Stream déjà actif pour la caméra ${cameraId}`);
        resolve();
        return;
      }

      try {
        const rtspUrl = this.buildRtspUrl(camera);
        this.logger.log(`Démarrage du stream RTSP pour ${cameraId}: ${rtspUrl.replace(/:[^:@]+@/, ':****@')}`);

        const clients = new Set();
        const stream: CameraStream = {
          cameraId,
          rtspUrl,
          process: null,
          clients,
          isActive: false,
        };

        // Utiliser FFmpeg pour convertir RTSP en MJPEG
        const ffmpegProcess = ffmpeg(rtspUrl)
          .inputOptions([
            '-rtsp_transport', 'tcp', // Utiliser TCP pour plus de stabilité
            '-i', rtspUrl,
          ])
          .outputOptions([
            '-f', 'mjpeg',           // Format MJPEG
            '-q:v', '5',              // Qualité vidéo (1-31, plus bas = meilleure qualité)
            '-r', '15',               // Frame rate (15 fps pour réduire la charge)
            '-vf', 'scale=640:480',   // Redimensionner à 640x480
          ])
          .on('start', (commandLine) => {
            this.logger.log(`FFmpeg démarré pour ${cameraId}: ${commandLine}`);
            stream.isActive = true;
            resolve();
          })
          .on('error', (err) => {
            this.logger.error(`Erreur FFmpeg pour ${cameraId}:`, err.message);
            this.stopStream(cameraId);
            reject(err);
          })
          .on('end', () => {
            this.logger.log(`Stream terminé pour ${cameraId}`);
            this.stopStream(cameraId);
          });

        // Stocker le processus
        stream.process = ffmpegProcess;
        this.activeStreams.set(cameraId, stream);

        // Démarrer le processus (mais ne pas pipe directement, on le fera dans le controller)
        this.logger.log(`Stream configuré pour ${cameraId}`);
      } catch (error) {
        this.logger.error(`Erreur lors de la configuration du stream pour ${cameraId}:`, error);
        reject(error);
      }
    });
  }

  /**
   * Arrête un stream
   */
  stopStream(cameraId: string): void {
    const stream = this.activeStreams.get(cameraId);
    if (!stream) {
      return;
    }

    this.logger.log(`Arrêt du stream pour ${cameraId}`);

    if (stream.process) {
      try {
        stream.process.kill('SIGKILL');
      } catch (error) {
        this.logger.error(`Erreur lors de l'arrêt du processus pour ${cameraId}:`, error);
      }
    }

    stream.clients.clear();
    stream.isActive = false;
    this.activeStreams.delete(cameraId);
  }

  /**
   * Vérifie si un stream est actif
   */
  isStreamActive(cameraId: string): boolean {
    const stream = this.activeStreams.get(cameraId);
    return stream?.isActive || false;
  }

  /**
   * Obtient le processus FFmpeg pour un stream
   */
  getStreamProcess(cameraId: string): any {
    const stream = this.activeStreams.get(cameraId);
    return stream?.process || null;
  }

  /**
   * Ajoute un client au stream
   */
  addClient(cameraId: string, client: any): void {
    const stream = this.activeStreams.get(cameraId);
    if (stream) {
      stream.clients.add(client);
      this.logger.log(`Client ajouté au stream ${cameraId}. Total: ${stream.clients.size}`);
    }
  }

  /**
   * Retire un client du stream
   */
  removeClient(cameraId: string, client: any): void {
    const stream = this.activeStreams.get(cameraId);
    if (stream) {
      stream.clients.delete(client);
      this.logger.log(`Client retiré du stream ${cameraId}. Total: ${stream.clients.size}`);

      // Si plus de clients, arrêter le stream après un délai
      if (stream.clients.size === 0) {
        setTimeout(() => {
          const currentStream = this.activeStreams.get(cameraId);
          if (currentStream && currentStream.clients.size === 0) {
            this.logger.log(`Aucun client pour ${cameraId}, arrêt du stream`);
            this.stopStream(cameraId);
          }
        }, 30000); // Attendre 30 secondes avant d'arrêter
      }
    }
  }

  /**
   * Nettoie tous les streams à la destruction du module
   */
  onModuleDestroy() {
    this.logger.log('Nettoyage de tous les streams actifs');
    for (const cameraId of this.activeStreams.keys()) {
      this.stopStream(cameraId);
    }
  }
}
