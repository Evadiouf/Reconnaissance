import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FaceRecognitionService } from './face-recognition.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('face-recognition')
export class FaceRecognitionController {
  constructor(
    private readonly faceRecognitionService: FaceRecognitionService,
  ) {}

  /**
   * Health check de l'API Naratech (public, pas besoin d'authentification)
   */
  @Get('health')
  async checkHealth() {
    try {
      const result = await this.faceRecognitionService.checkHealth();
      // Si le service retourne un objet avec status: 'error', on le retourne tel quel
      // Sinon, on retourne le résultat normal
      if (result.status === 'error') {
        return result;
      }
      return result;
    } catch (error) {
      return {
        status: 'error',
        error: error.message || 'Erreur lors de la vérification de l\'API',
      };
    }
  }

  /**
   * Reconnaissance faciale via base64
   */
  @Post('recognize')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async recognizeFace(
    @Body() body: {
      image_base64: string;
      return_embeddings?: boolean;
      return_quality_info?: boolean;
      confidence_threshold?: number;
      company_id?: string;
    },
    @Req() req: any,
  ) {
    // Note: companyId peut être utilisé pour des logs ou validations futures
    const companyId = req.user?.companyId || body.company_id || null;
    
    return await this.faceRecognitionService.recognizeFace(body.image_base64, {
      returnEmbeddings: body.return_embeddings,
      returnQualityInfo: body.return_quality_info,
      confidenceThreshold: body.confidence_threshold,
    });
  }

  /**
   * Reconnaissance faciale via upload de fichier
   */
  @Post('recognize/file')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('file'))
  async recognizeFaceFromFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Aucun fichier fourni');
    }
    return await this.faceRecognitionService.recognizeFaceFromFile(file);
  }

  /**
   * Enregistrer une photo d'employé dans l'API Naratech (nouvelle API /training_image/add)
   */
  @Post('register')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async registerEmployeeFace(@Body() body: {
    employee_id: string;
    employee_name: string;
    image_base64: string;
  }) {
    return await this.faceRecognitionService.registerEmployeeFace(
      body.employee_id,
      body.employee_name,
      body.image_base64,
    );
  }

  /**
   * Supprimer une image d'entraînement d'un employé
   */
  @Delete('training-image/:employeeId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteEmployeeTrainingImage(@Param('employeeId') employeeId: string) {
    return await this.faceRecognitionService.deleteEmployeeTrainingImage(employeeId);
  }

  /**
   * Lister toutes les images d'entraînement
   */
  @Get('training-image/list')
  @UseGuards(JwtAuthGuard)
  async listTrainingImages() {
    return await this.faceRecognitionService.listTrainingImages();
  }

  /**
   * Recharger le modèle manuellement
   */
  @Post('training-image/reload')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async reloadModel() {
    return await this.faceRecognitionService.reloadModel();
  }

  /**
   * Récupérer l'image d'entraînement d'un employé
   */
  @Get('training-image/:employeeId/image')
  @UseGuards(JwtAuthGuard)
  async getEmployeeTrainingImage(@Param('employeeId') employeeId: string) {
    return await this.faceRecognitionService.getEmployeeTrainingImage(employeeId);
  }
}

