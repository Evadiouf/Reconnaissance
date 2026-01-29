import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FileDocument = File & Document;

@Schema({ timestamps: true })
export class File {
  @Prop({ required: true })
  filename: string; // Nom unique du fichier sur MinIO

  @Prop({ required: true })
  originalName: string; // Nom original du fichier

  @Prop({ required: true })
  bucketName: string; // Nom du bucket MinIO

  @Prop({ required: true })
  objectKey: string; // Clé de l'objet dans MinIO (chemin complet)

  @Prop({ required: true })
  size: number; // Taille du fichier en octets

  @Prop({ required: true })
  mimeType: string; // Type MIME du fichier

  @Prop({ required: true, enum: ['image', 'document', 'video', 'audio', 'other'] })
  fileType: string; // Catégorie du fichier (image, document, etc.)

  @Prop({ default: '' })
  description: string; // Description du fichier

  @Prop({ type: [String], default: [] })
  tags: string[]; // Tags associés au fichier

  @Prop({ default: false })
  isPublic: boolean; // Si le fichier est accessible publiquement

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  uploadedBy: Types.ObjectId; // Utilisateur qui a uploadé le fichier

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  companyId: Types.ObjectId; // Entreprise à laquelle le fichier appartient

  @Prop({ default: 'active', enum: ['active', 'deleted', 'archived'] })
  status: string; // Statut du fichier (actif, supprimé, archivé)

  @Prop({ type: Date, default: null })
  expiresAt: Date; // Date d'expiration du fichier (pour les fichiers temporaires)

  @Prop()
  url: string; // URL d'accès au fichier (présignée ou publique)
}

export const FileSchema = SchemaFactory.createForClass(File);








