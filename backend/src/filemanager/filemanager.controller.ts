import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Req,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { FileManagerService } from './filemanager.service';
import { UploadFileDto } from './dto/upload-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { QueryFilesDto } from './dto/query-files.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('File Manager')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FileManagerController {
  constructor(private readonly fileManagerService: FileManagerService) {}

  @Post('upload')
  @ApiOperation({ 
    summary: 'Upload un fichier',
    description: 'Upload un fichier. Seul le fichier est requis, toutes les autres informations sont optionnelles.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Fichier uploadé avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur lors de l\'upload' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: UploadFileDto = {},
    @Req() req: any,
  ) {
    if (!file) {
      return {
        success: false,
        message: 'Aucun fichier fourni',
        error: 'FILE_REQUIRED'
      };
    }

    try {
      // Utiliser des valeurs par défaut si uploadDto est vide
      const uploadOptions: UploadFileDto = {
        description: uploadDto.description || undefined,
        tags: uploadDto.tags || [],
        isPublic: uploadDto.isPublic || false,
        expiresAt: uploadDto.expiresAt || undefined,
        metadata: uploadDto.metadata || {}
      };

      const uploadedFile = await this.fileManagerService.uploadFile(
        file,
        uploadOptions,
        req.user.userId,
        req.user.companyId,
      );

      return {
        success: true,
        message: 'Fichier uploadé avec succès',
        data: {
          id: uploadedFile._id,
          filename: uploadedFile.filename,
          originalName: uploadedFile.originalName,
          size: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          fileType: uploadedFile.fileType,
          url: uploadedFile.url,
          createdAt: (uploadedFile as any).createdAt
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'UPLOAD_FAILED'
      };
    }
  }

  @Post('simple-upload')
  @ApiOperation({ 
    summary: 'Upload simple d\'un fichier',
    description: 'Upload ultra-simple : envoyez juste un fichier, rien d\'autre n\'est requis.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Fichier uploadé avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur lors de l\'upload' })
  @UseInterceptors(FileInterceptor('file'))
  async simpleUploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    if (!file) {
      return {
        success: false,
        message: 'Aucun fichier fourni',
        error: 'FILE_REQUIRED'
      };
    }

    try {
      const uploadedFile = await this.fileManagerService.uploadFile(
        file,
        {}, // Aucune option supplémentaire
        req.user.userId,
        req.user.companyId,
      );

      return {
        success: true,
        message: 'Fichier uploadé avec succès',
        data: {
          id: uploadedFile._id,
          filename: uploadedFile.filename,
          originalName: uploadedFile.originalName,
          size: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
          fileType: uploadedFile.fileType,
          url: uploadedFile.url,
          createdAt: (uploadedFile as any).createdAt
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: 'UPLOAD_FAILED'
      };
    }
  }

  @Get()
  @ApiOperation({ summary: 'Récupérer la liste des fichiers' })
  @ApiResponse({ status: 200, description: 'Liste des fichiers récupérée' })
  async getFiles(@Query() queryDto: QueryFilesDto, @Req() req: any) {
    try {
      const result = await this.fileManagerService.getFiles(queryDto, req.user.companyId);
      
      return {
        success: true,
        message: 'Fichiers récupérés avec succès',
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtenir les statistiques des fichiers' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées' })
  async getFileStats(@Req() req: any) {
    try {
      const stats = await this.fileManagerService.getFileStats(req.user.companyId);
      
      return {
        success: true,
        message: 'Statistiques récupérées avec succès',
        data: stats,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un fichier par son ID' })
  @ApiResponse({ status: 200, description: 'Fichier récupéré' })
  @ApiResponse({ status: 404, description: 'Fichier non trouvé' })
  async getFileById(@Param('id') id: string, @Req() req: any) {
    try {
      const file = await this.fileManagerService.getFileById(id, req.user.companyId);
      
      return {
        success: true,
        message: 'Fichier récupéré avec succès',
        data: file,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Générer une URL de téléchargement pour un fichier' })
  @ApiResponse({ status: 200, description: 'URL de téléchargement générée' })
  @ApiResponse({ status: 404, description: 'Fichier non trouvé' })
  async getDownloadUrl(
    @Param('id') id: string,
    @Query('expiry') expiry: number = 3600,
    @Req() req: any,
  ) {
    try {
      const url = await this.fileManagerService.generateDownloadUrl(
        id,
        req.user.companyId,
        expiry,
      );
      
      return {
        success: true,
        message: 'URL de téléchargement générée',
        data: { downloadUrl: url, expiresIn: expiry },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour les métadonnées d\'un fichier' })
  @ApiResponse({ status: 200, description: 'Fichier mis à jour' })
  @ApiResponse({ status: 404, description: 'Fichier non trouvé' })
  async updateFile(
    @Param('id') id: string,
    @Body() updateDto: UpdateFileDto,
    @Req() req: any,
  ) {
    try {
      const updatedFile = await this.fileManagerService.updateFile(
        id,
        updateDto,
        req.user.companyId,
      );
      
      return {
        success: true,
        message: 'Fichier mis à jour avec succès',
        data: updatedFile,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un fichier (soft delete)' })
  @ApiResponse({ status: 200, description: 'Fichier supprimé' })
  @ApiResponse({ status: 404, description: 'Fichier non trouvé' })
  async deleteFile(@Param('id') id: string, @Req() req: any) {
    try {
      await this.fileManagerService.deleteFile(id, req.user.companyId);
      
      return {
        success: true,
        message: 'Fichier supprimé avec succès',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Supprimer définitivement un fichier' })
  @ApiResponse({ status: 200, description: 'Fichier supprimé définitivement' })
  @ApiResponse({ status: 404, description: 'Fichier non trouvé' })
  async permanentDeleteFile(@Param('id') id: string, @Req() req: any) {
    try {
      await this.fileManagerService.permanentDeleteFile(id, req.user.companyId);
      
      return {
        success: true,
        message: 'Fichier supprimé définitivement',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

}
