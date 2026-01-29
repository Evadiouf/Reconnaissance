import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class FaceRecognitionService {
  private readonly logger = new Logger(FaceRecognitionService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly axiosInstance: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.apiUrl = this.configService.get<string>(
      'FACE_RECOGNITION_API_URL',
      'http://153.92.223.185:5001',
    );
    this.apiKey = this.configService.get<string>(
      'FACE_RECOGNITION_API_KEY',
      'sk-naratech-key-2024',
    );

    this.axiosInstance = axios.create({
      baseURL: this.apiUrl,
      timeout: 30000,
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    this.logger.log(
      `Service de reconnaissance faciale initialisé - URL: ${this.apiUrl}`,
    );
  }

  /**
   * Vérifie l'état de l'API
   */
  async checkHealth(): Promise<any> {
    try {
      const healthTimeoutMs = parseInt(
        this.configService.get<string>('FACE_RECOGNITION_HEALTH_TIMEOUT_MS', '15000'),
        10,
      );
      const response = await this.axiosInstance.get('/health', {
        timeout: Number.isFinite(healthTimeoutMs) ? healthTimeoutMs : 15000,
      });
      this.logger.log('Health check réussi:', response.data);
      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors du health check:', error.message);
      this.logger.error('Détails de l\'erreur:', {
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      // Retourner un objet avec status: 'error' au lieu de lancer une exception
      // pour permettre au frontend de gérer gracieusement
      return {
        status: 'error',
        error: error.message || 'API de reconnaissance faciale non disponible',
        details: error.response?.data || null,
      };
    }
  }

  /**
   * Reconnaît un visage dans une image (base64)
   */
  async recognizeFace(imageBase64: string, options?: {
    returnEmbeddings?: boolean;
    returnQualityInfo?: boolean;
    confidenceThreshold?: number;
  }): Promise<any> {
    try {
      const payload = {
        image_base64: imageBase64,
        return_embeddings: options?.returnEmbeddings || false,
        return_quality_info: options?.returnQualityInfo !== false,
        confidence_threshold: options?.confidenceThreshold || 0.35,
      };

      const response = await this.axiosInstance.post('/recognize', payload);
      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors de la reconnaissance:', error.message);

      if (error.code === 'ECONNABORTED') {
        throw new HttpException(
          `Timeout lors de l'appel à l'API de reconnaissance faciale (${error.message})`,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      
      if (error.response) {
        throw new HttpException(
          error.response.data?.detail || 'Erreur lors de la reconnaissance faciale',
          error.response.status || HttpStatus.BAD_REQUEST,
        );
      }
      
      throw new HttpException(
        'Erreur de connexion à l\'API de reconnaissance faciale',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Reconnaît un visage via upload de fichier
   */
  async recognizeFaceFromFile(file: Express.Multer.File): Promise<any> {
    try {
      const FormData = require('form-data');
      const formData = new FormData();
      formData.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const formHeaders = formData.getHeaders();
      const response = await this.axiosInstance.post('/recognize/file', formData, {
        headers: {
          ...formHeaders,
        },
      });

      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors de la reconnaissance (file):', error.message);

      if (error.code === 'ECONNABORTED') {
        throw new HttpException(
          `Timeout lors de l'appel à l'API de reconnaissance faciale (${error.message})`,
          HttpStatus.GATEWAY_TIMEOUT,
        );
      }
      
      if (error.response) {
        throw new HttpException(
          error.response.data?.detail || 'Erreur lors de la reconnaissance faciale',
          error.response.status || HttpStatus.BAD_REQUEST,
        );
      }
      
      throw new HttpException(
        'Erreur de connexion à l\'API de reconnaissance faciale',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Enregistre une photo d'employé dans l'API Naratech via /training_image/add
   * Utilise la nouvelle API avec employee_id et employee_name
   */
  async registerEmployeeFace(
    employeeId: string,
    employeeName: string,
    imageBase64: string,
  ): Promise<any> {
    try {
      const payload = {
        employee_id: employeeId,
        employee_name: employeeName,
        image_base64: imageBase64,
      };

      const response = await this.axiosInstance.post('/training_image/add', payload);
      
      this.logger.log(
        `Image d'entraînement ajoutée pour l'employé ${employeeId}: ${employeeName}`,
      );
      
      return response.data;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'enregistrement de la photo de ${employeeId} (${employeeName}):`,
        error.message,
      );
      
      if (error.response) {
        throw new HttpException(
          error.response.data?.message || 'Erreur lors de l\'enregistrement de l\'image d\'entraînement',
          error.response.status || HttpStatus.BAD_REQUEST,
        );
      }
      
      throw new HttpException(
        'Erreur de connexion à l\'API de reconnaissance faciale',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Supprime une image d'entraînement d'un employé
   */
  async deleteEmployeeTrainingImage(employeeId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.delete(`/training_image/delete/${employeeId}`);
      
      this.logger.log(`Image d'entraînement supprimée pour l'employé ${employeeId}`);
      
      return response.data;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la suppression de l'image d'entraînement de ${employeeId}:`,
        error.message,
      );
      
      if (error.response) {
        throw new HttpException(
          error.response.data?.message || 'Erreur lors de la suppression de l\'image d\'entraînement',
          error.response.status || HttpStatus.BAD_REQUEST,
        );
      }
      
      throw new HttpException(
        'Erreur de connexion à l\'API de reconnaissance faciale',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Liste toutes les images d'entraînement
   */
  async listTrainingImages(): Promise<any> {
    try {
      const response = await this.axiosInstance.get('/training_image/list');
      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors de la récupération de la liste des images:', error.message);
      
      if (error.response) {
        throw new HttpException(
          error.response.data?.message || 'Erreur lors de la récupération de la liste',
          error.response.status || HttpStatus.BAD_REQUEST,
        );
      }
      
      throw new HttpException(
        'Erreur de connexion à l\'API de reconnaissance faciale',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Recharge le modèle manuellement
   */
  async reloadModel(): Promise<any> {
    try {
      const response = await this.axiosInstance.post('/training_image/reload');
      this.logger.log('Modèle rechargé avec succès');
      return response.data;
    } catch (error) {
      this.logger.error('Erreur lors du rechargement du modèle:', error.message);
      
      if (error.response) {
        throw new HttpException(
          error.response.data?.message || 'Erreur lors du rechargement du modèle',
          error.response.status || HttpStatus.BAD_REQUEST,
        );
      }
      
      throw new HttpException(
        'Erreur de connexion à l\'API de reconnaissance faciale',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Récupère l'image d'entraînement d'un employé
   */
  async getEmployeeTrainingImage(employeeId: string): Promise<any> {
    try {
      const response = await this.axiosInstance.get(`/training_image/${employeeId}/image`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la récupération de l'image de ${employeeId}:`,
        error.message,
      );
      
      if (error.response) {
        throw new HttpException(
          error.response.data?.message || 'Erreur lors de la récupération de l\'image',
          error.response.status || HttpStatus.BAD_REQUEST,
        );
      }
      
      throw new HttpException(
        'Erreur de connexion à l\'API de reconnaissance faciale',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}

