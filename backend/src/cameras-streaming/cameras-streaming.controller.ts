import {
  Controller,
  Get,
  Param,
  Res,
  Post,
  Body,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { CamerasStreamingService } from './cameras-streaming.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import ffmpeg from 'fluent-ffmpeg';

@Controller('api/v1/cameras')
export class CamerasStreamingController {
  private readonly logger = new Logger(CamerasStreamingController.name);

  constructor(private readonly streamingService: CamerasStreamingService) {}

  /**
   * Démarre un stream pour une caméra IP
   * POST /api/v1/cameras/:cameraId/stream/start
   */
  @Post(':cameraId/stream/start')
  @UseGuards(JwtAuthGuard)
  async startStream(
    @Param('cameraId') cameraId: string,
    @Body() cameraConfig: {
      ip: string;
      port: string | number;
      username?: string;
      password?: string;
      rtspUrl?: string;
    },
  ) {
    try {
      await this.streamingService.startStream(cameraId, cameraConfig);
      return {
        success: true,
        message: `Stream démarré pour la caméra ${cameraId}`,
        cameraId,
      };
    } catch (error) {
      this.logger.error(`Erreur lors du démarrage du stream:`, error);
      return {
        success: false,
        message: error.message || 'Erreur lors du démarrage du stream',
        cameraId,
      };
    }
  }

  /**
   * Arrête un stream
   * POST /api/v1/cameras/:cameraId/stream/stop
   */
  @Post(':cameraId/stream/stop')
  @UseGuards(JwtAuthGuard)
  async stopStream(@Param('cameraId') cameraId: string) {
    this.streamingService.stopStream(cameraId);
    return {
      success: true,
      message: `Stream arrêté pour la caméra ${cameraId}`,
      cameraId,
    };
  }

  /**
   * Stream MJPEG en direct depuis une caméra IP
   * GET /api/v1/cameras/:cameraId/stream
   * Note: L'authentification est gérée via JwtAuthGuard, mais on accepte aussi le token en query param
   * pour faciliter l'utilisation dans les balises <video> ou <img>
   */
  @Get(':cameraId/stream')
  @UseGuards(JwtAuthGuard)
  async streamCamera(
    @Param('cameraId') cameraId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      // Récupérer les informations de la caméra depuis les query params
      const { ip, port, username, password, rtspUrl } = req.query as any;

      if (!ip && !rtspUrl) {
        return res.status(400).json({
          success: false,
          message: 'Informations de caméra manquantes (ip ou rtspUrl requis)',
        });
      }

      const cameraConfig = {
        ip: ip as string,
        port: port ? parseInt(port as string) : 554,
        username: username as string,
        password: password as string,
        rtspUrl: rtspUrl as string,
      };

      // Construire l'URL RTSP
      const rtspUrlFinal = rtspUrl || this.streamingService.buildRtspUrl(cameraConfig);

      // Détecter les IPs locales non joignables depuis un backend cloud
      const isLocalIp = this.streamingService.isLocalIp(rtspUrlFinal);
      if (isLocalIp) {
        this.logger.warn(`IP locale détectée pour ${cameraId}: ${rtspUrlFinal.replace(/:[^:@]+@/, ':****@')}`);
        return res.status(400).json({
          success: false,
          message:
            'Caméra sur réseau local non joignable depuis le cloud. ' +
            "L'IP de la caméra (192.168.x.x / 10.x.x.x) n'est accessible que sur votre réseau local. " +
            'Pour utiliser la caméra depuis la plateforme en ligne, vous devez : ' +
            '1) Configurer le port forwarding (port 554) sur votre routeur, ' +
            '2) Utiliser votre IP publique (et non 192.168.x.x) dans la configuration de la caméra.',
          errorType: 'LOCAL_IP',
        });
      }

      this.logger.log(`Démarrage du stream MJPEG pour ${cameraId} depuis ${rtspUrlFinal.replace(/:[^:@]+@/, ':****@')}`);

      // Configurer les headers pour le streaming MP4 fragmenté
      // Le MP4 fragmenté (frag_keyframe+empty_moov) est supporté nativement par <video> dans tous les navigateurs
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('Access-Control-Allow-Origin', '*');

      // Classifier l'erreur FFmpeg pour donner un message précis à l'utilisateur
      const classifyFfmpegError = (errMsg: string): string => {
        const msg = errMsg.toLowerCase();
        if (
          msg.includes('connection refused') ||
          msg.includes('network unreachable') ||
          msg.includes('no route to host') ||
          msg.includes('timed out') ||
          msg.includes('connection timed out') ||
          msg.includes('i/o error')
        ) {
          return 'CAMERA_UNREACHABLE';
        }
        if (
          msg.includes('401') ||
          msg.includes('unauthorized') ||
          msg.includes('authentication') ||
          msg.includes('wrong password') ||
          msg.includes('invalid credentials')
        ) {
          return 'AUTH_FAILED';
        }
        if (msg.includes('404') || msg.includes('not found') || msg.includes('no such file')) {
          return 'STREAM_NOT_FOUND';
        }
        return 'UNKNOWN';
      };

      // Utiliser FFmpeg pour convertir RTSP en MP4 fragmenté streamable dans <video>
      // -c:v copy : pas de ré-encodage si la caméra envoie déjà du H.264 (EZVIZ/Hikvision)
      // frag_keyframe+empty_moov : permet de commencer la lecture avant la fin du fichier
      const ffmpegProcess = ffmpeg(rtspUrlFinal)
        .inputOptions([
          '-rtsp_transport', 'tcp',   // TCP plus stable qu'UDP pour RTSP
          '-rtsp_flags', 'prefer_tcp',
          '-timeout', '3000000',      // Timeout connexion RTSP : 3 secondes (µs)
          '-stimeout', '3000000',     // Timeout socket : 3 secondes (µs)
        ])
        .outputOptions([
          '-f', 'mp4',
          '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
          '-c:v', 'copy',             // Copie directe H.264 sans ré-encodage (faible CPU)
          '-an',                      // Pas d'audio (réduit la latence)
          '-reset_timestamps', '1',
        ])
        .on('start', (commandLine) => {
          this.logger.log(`FFmpeg démarré pour ${cameraId}: ${commandLine}`);
        })
        .on('error', (err) => {
          const errorType = classifyFfmpegError(err.message);
          this.logger.error(`Erreur FFmpeg [${errorType}] pour ${cameraId}:`, err.message);

          let userMessage: string;
          switch (errorType) {
            case 'CAMERA_UNREACHABLE':
              userMessage =
                'Caméra injoignable. Vérifiez que la caméra est allumée et connectée au réseau.';
              break;
            case 'AUTH_FAILED':
              userMessage =
                'Identifiants incorrects. Vérifiez le nom d\'utilisateur et le mot de passe de la caméra.';
              break;
            case 'STREAM_NOT_FOUND':
              userMessage =
                'Flux vidéo introuvable. Vérifiez le chemin du stream (URL RTSP) dans la configuration.';
              break;
            default:
              userMessage = `Erreur de connexion à la caméra: ${err.message}`;
          }

          if (!res.headersSent) {
            res.status(500).json({ success: false, message: userMessage, errorType });
          } else {
            res.end();
          }
        })
        .on('end', () => {
          this.logger.log(`Stream terminé pour ${cameraId}`);
          if (!res.headersSent) {
            res.end();
          }
        });

      // Pipe la sortie FFmpeg directement vers la réponse HTTP
      ffmpegProcess.pipe(res, { end: false });

      // Gérer la déconnexion du client
      req.on('close', () => {
        this.logger.log(`Client déconnecté pour ${cameraId}`);
        try {
          ffmpegProcess.kill('SIGKILL');
        } catch (error) {
          this.logger.error(`Erreur lors de l'arrêt du processus:`, error);
        }
        if (!res.headersSent) {
          res.end();
        }
      });

      req.on('aborted', () => {
        this.logger.log(`Requête annulée pour ${cameraId}`);
        try {
          ffmpegProcess.kill('SIGKILL');
        } catch (error) {
          this.logger.error(`Erreur lors de l'arrêt du processus:`, error);
        }
      });

      // Ajouter le client au service
      this.streamingService.addClient(cameraId, res);

      // Nettoyer quand la connexion se ferme
      res.on('close', () => {
        this.streamingService.removeClient(cameraId, res);
      });
    } catch (error) {
      this.logger.error(`Erreur lors du streaming:`, error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: error.message || 'Erreur lors du streaming',
        });
      }
    }
  }

  /**
   * Vérifie l'état d'un stream
   * GET /api/v1/cameras/:cameraId/stream/status
   */
  @Get(':cameraId/stream/status')
  @UseGuards(JwtAuthGuard)
  async getStreamStatus(@Param('cameraId') cameraId: string) {
    const isActive = this.streamingService.isStreamActive(cameraId);
    return {
      success: true,
      cameraId,
      isActive,
    };
  }
}
