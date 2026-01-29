import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { File, FileDocument } from './schemas/file.schema';
import { UploadFileDto } from './dto/upload-file.dto';
import { UpdateFileDto } from './dto/update-file.dto';
import { QueryFilesDto } from './dto/query-files.dto';
import * as Minio from 'minio';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import * as mime from 'mime-types';

@Injectable()
export class FileManagerService {
  private readonly logger = new Logger(FileManagerService.name);
  private minioClient: Minio.Client;

  constructor(
    @InjectModel(File.name) private fileModel: Model<FileDocument>,
    private configService: ConfigService,
  ) {
    // Configuration MinIO avec validation
    const endpoint = this.configService.get('MINIO_ENDPOINT', 'localhost');
    const port = parseInt(this.configService.get('MINIO_PORT', '9000'));
    const useSSL = this.configService.get('MINIO_USE_SSL', 'false') === 'true';
    const accessKey = this.configService.get('MINIO_ACCESS_KEY');
    const secretKey = this.configService.get('MINIO_SECRET_KEY');

    // Nettoyer l'endpoint s'il contient une URL complète
    let cleanEndpoint = endpoint;
    if (endpoint.includes('://')) {
      // Extraire seulement le hostname de l'URL
      try {
        const url = new URL(endpoint);
        cleanEndpoint = url.hostname;
        this.logger.warn(`MINIO_ENDPOINT contient une URL complète. Utilisation de l'hostname: ${cleanEndpoint}`);
      } catch (error) {
        this.logger.error(`URL MinIO invalide: ${endpoint}`);
        throw new Error(`Configuration MinIO invalide: ${endpoint}`);
      }
    }

    this.logger.log(`Configuration MinIO: ${cleanEndpoint}:${port} (SSL: ${useSSL})`);

    try {
      this.minioClient = new Minio.Client({
        endPoint: cleanEndpoint,
        port: port,
        useSSL: useSSL,
        accessKey: accessKey,
        secretKey: secretKey,
      });
    } catch (error) {
      this.logger.error(`Erreur de configuration MinIO: ${error.message}`);
      throw error;
    }

    // Test de connexion au démarrage
    this.testConnection();
  }

  /**
   * Tester la connexion MinIO au démarrage
   */
  private async testConnection(): Promise<void> {
    try {
      // Test simple : lister les buckets
      await this.minioClient.listBuckets();
      this.logger.log('✅ Connexion MinIO établie avec succès');
    } catch (error) {
      this.logger.warn(`⚠️ Impossible de se connecter à MinIO: ${error.message}`);
      this.logger.warn('Le service FileManager fonctionnera mais les uploads échoueront');
    }
  }

  /**
   * Upload un fichier vers MinIO et enregistre les métadonnées en base
   */
  async uploadFile(
    file: Express.Multer.File,
    uploadDto: UploadFileDto,
    userId: string,
    companyId: string,
  ): Promise<FileDocument> {
    try {
      const bucketName = this.configService.get('MINIO_DEFAULT_BUCKET', 'senpointage-files');
      
      // Vérifier si le bucket existe, sinon le créer
      await this.ensureBucketExists(bucketName);

      // Générer un nom unique pour le fichier
      const fileExtension = path.extname(file.originalname);
      const uniqueFilename = `${uuidv4()}${fileExtension}`;
      const objectKey = `${companyId}/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${uniqueFilename}`;

      // Upload vers MinIO
      await this.minioClient.putObject(bucketName, objectKey, file.buffer, file.size, {
        'Content-Type': file.mimetype,
        'Original-Name': file.originalname,
        'Uploaded-By': userId,
        'Company-Id': companyId,
      });

      // Générer l'URL du fichier
      const url = await this.generateFileUrl(bucketName, objectKey, uploadDto.isPublic || false);

      // Déterminer le type de fichier
      const fileType = this.determineFileType(file.mimetype);

      // Créer l'enregistrement en base
      const fileRecord = new this.fileModel({
        filename: uniqueFilename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        bucketName,
        objectKey,
        url,
        description: uploadDto.description,
        uploadedBy: new Types.ObjectId(userId),
        companyId: new Types.ObjectId(companyId),
        fileType,
        tags: uploadDto.tags || [],
        isPublic: uploadDto.isPublic || false,
        expiresAt: uploadDto.expiresAt ? new Date(uploadDto.expiresAt) : null,
        metadata: uploadDto.metadata || {},
        downloadCount: 0,
      });

      const savedFile = await fileRecord.save();
      this.logger.log(`Fichier uploadé avec succès: ${savedFile._id}`);

      return savedFile;
    } catch (error) {
      this.logger.error(`Erreur lors de l'upload du fichier: ${error.message}`);
      throw new BadRequestException(`Erreur lors de l'upload: ${error.message}`);
    }
  }

  /**
   * Récupérer la liste des fichiers avec pagination et filtres
   */
  async getFiles(queryDto: QueryFilesDto, companyId: string): Promise<{
    files: FileDocument[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Assurer des valeurs par défaut explicites
    const page: number = queryDto.page ?? 1;
    const limit: number = queryDto.limit ?? 20;
    const sortBy: string = queryDto.sortBy ?? 'createdAt';
    const sortOrder: 'asc' | 'desc' = queryDto.sortOrder ?? 'desc';
    const { search, fileType, status, uploadedBy, tags, publicOnly } = queryDto;

    // Construction du filtre
    const filter: any = { companyId: new Types.ObjectId(companyId) };

    if (search) {
      filter.$or = [
        { filename: { $regex: search, $options: 'i' } },
        { originalName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (fileType) filter.fileType = fileType;
    if (status) filter.status = status;
    if (uploadedBy) filter.uploadedBy = new Types.ObjectId(uploadedBy);
    if (publicOnly) filter.isPublic = true;
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      filter.tags = { $in: tagArray };
    }

    // Construction du tri
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Exécution de la requête avec pagination
    const skip = (page - 1) * limit;
    
    const [files, total] = await Promise.all([
      this.fileModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('uploadedBy', 'name email')
        .exec(),
      this.fileModel.countDocuments(filter),
    ]);

    return {
      files,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Récupérer un fichier par son ID
   */
  async getFileById(fileId: string, companyId: string): Promise<FileDocument> {
    const file = await this.fileModel
      .findOne({ _id: fileId, companyId: new Types.ObjectId(companyId) })
      .populate('uploadedBy', 'name email')
      .exec();

    if (!file) {
      throw new NotFoundException('Fichier non trouvé');
    }

    // Mettre à jour la date de dernier accès et le compteur de téléchargement
    await this.fileModel.updateOne(
      { _id: fileId },
      { 
        $inc: { downloadCount: 1 },
        $set: { lastAccessedAt: new Date() }
      }
    );

    return file;
  }

  /**
   * Mettre à jour les métadonnées d'un fichier
   */
  async updateFile(fileId: string, updateDto: UpdateFileDto, companyId: string): Promise<FileDocument> {
    const file = await this.fileModel.findOne({ 
      _id: fileId, 
      companyId: new Types.ObjectId(companyId) 
    });

    if (!file) {
      throw new NotFoundException('Fichier non trouvé');
    }

    // Mise à jour des champs
    Object.assign(file, updateDto);
    
    if (updateDto.expiresAt) {
      file.expiresAt = new Date(updateDto.expiresAt);
    }

    const updatedFile = await file.save();
    this.logger.log(`Fichier mis à jour: ${updatedFile._id}`);

    return updatedFile;
  }

  /**
   * Supprimer un fichier (soft delete)
   */
  async deleteFile(fileId: string, companyId: string): Promise<void> {
    const file = await this.fileModel.findOne({ 
      _id: fileId, 
      companyId: new Types.ObjectId(companyId) 
    });

    if (!file) {
      throw new NotFoundException('Fichier non trouvé');
    }

    // Soft delete
    file.status = 'deleted';
    await file.save();

    this.logger.log(`Fichier supprimé (soft delete): ${fileId}`);
  }

  /**
   * Supprimer définitivement un fichier
   */
  async permanentDeleteFile(fileId: string, companyId: string): Promise<void> {
    const file = await this.fileModel.findOne({ 
      _id: fileId, 
      companyId: new Types.ObjectId(companyId) 
    });

    if (!file) {
      throw new NotFoundException('Fichier non trouvé');
    }

    try {
      // Supprimer de MinIO
      await this.minioClient.removeObject(file.bucketName, file.objectKey);
      
      // Supprimer de la base de données
      await this.fileModel.deleteOne({ _id: fileId });

      this.logger.log(`Fichier supprimé définitivement: ${fileId}`);
    } catch (error) {
      this.logger.error(`Erreur lors de la suppression définitive: ${error.message}`);
      throw new BadRequestException(`Erreur lors de la suppression: ${error.message}`);
    }
  }

  /**
   * Générer une URL présignée pour télécharger un fichier
   */
  async generateDownloadUrl(fileId: string, companyId: string, expirySeconds: number = 3600): Promise<string> {
    const file = await this.getFileById(fileId, companyId);
    
    try {
      const url = await this.minioClient.presignedGetObject(
        file.bucketName,
        file.objectKey,
        expirySeconds
      );
      
      return url;
    } catch (error) {
      this.logger.error(`Erreur lors de la génération de l'URL: ${error.message}`);
      throw new BadRequestException(`Erreur lors de la génération de l'URL: ${error.message}`);
    }
  }


  /**
   * Obtenir les statistiques des fichiers
   */
  async getFileStats(companyId: string): Promise<any> {
    const stats = await this.fileModel.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId) } },
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: '$size' },
          activeFiles: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          deletedFiles: { $sum: { $cond: [{ $eq: ['$status', 'deleted'] }, 1, 0] } },
          archivedFiles: { $sum: { $cond: [{ $eq: ['$status', 'archived'] }, 1, 0] } },
          totalDownloads: { $sum: '$downloadCount' },
        }
      }
    ]);

    const fileTypeStats = await this.fileModel.aggregate([
      { $match: { companyId: new Types.ObjectId(companyId) } },
      {
        $group: {
          _id: '$fileType',
          count: { $sum: 1 },
          totalSize: { $sum: '$size' }
        }
      }
    ]);

    return {
      general: stats[0] || {
        totalFiles: 0,
        totalSize: 0,
        activeFiles: 0,
        deletedFiles: 0,
        archivedFiles: 0,
        totalDownloads: 0,
      },
      byType: fileTypeStats
    };
  }

  /**
   * Méthodes utilitaires privées
   */
  private async ensureBucketExists(bucketName: string): Promise<void> {
    const exists = await this.minioClient.bucketExists(bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(bucketName);
      this.logger.log(`Bucket créé: ${bucketName}`);
    }
  }

  private async generateFileUrl(bucketName: string, objectKey: string, isPublic: boolean): Promise<string> {
    if (isPublic) {
      // Pour les fichiers publics, générer une URL permanente
      const endpoint = this.configService.get('MINIO_ENDPOINT');
      const port = this.configService.get('MINIO_PORT');
      const useSSL = this.configService.get('MINIO_USE_SSL') === 'true';
      const protocol = useSSL ? 'https' : 'http';
      const portSuffix = (port && port !== '80' && port !== '443') ? `:${port}` : '';
      
      return `${protocol}://${endpoint}${portSuffix}/${bucketName}/${objectKey}`;
    } else {
      // Pour les fichiers privés, générer une URL présignée temporaire
      return await this.minioClient.presignedGetObject(bucketName, objectKey, 24 * 60 * 60); // 24h
    }
  }

  private determineFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
    return 'other';
  }
}
