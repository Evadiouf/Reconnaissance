import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class RHInvitation extends Document {
  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ required: true, trim: true })
  role: string;

  @Prop({ required: true, trim: true })
  department: string;

  @Prop({ type: String, enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  acceptedBy: Types.ObjectId;

  @Prop()
  acceptedAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ trim: true })
  sessionTimeout?: string;
}

export const RHInvitationSchema = SchemaFactory.createForClass(RHInvitation);

// Index pour la recherche par email et statut
RHInvitationSchema.index({ email: 1, status: 1 });
// token a déjà index: true dans @Prop





