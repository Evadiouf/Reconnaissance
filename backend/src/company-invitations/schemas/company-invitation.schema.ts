import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum CompanyInvitationStatus {
  PENDING_SUBSCRIPTION = 'pending_subscription',
  SUBSCRIBED = 'subscribed',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class CompanyInvitation extends Document {
  @Prop({ required: true, unique: true, index: true })
  token: string;

  @Prop({ required: true, lowercase: true, trim: true, index: true })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  company: Types.ObjectId;

  @Prop({ type: String, enum: CompanyInvitationStatus, default: CompanyInvitationStatus.PENDING_SUBSCRIPTION })
  status: CompanyInvitationStatus;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  invitedBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CompanySubscription' })
  subscription?: Types.ObjectId;

  @Prop({ type: Object })
  subscriptionFormData?: Record<string, any>;

  @Prop()
  subscribedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  acceptedBy?: Types.ObjectId;

  @Prop()
  acceptedAt?: Date;

  @Prop({ required: true })
  expiresAt: Date;
}

export const CompanyInvitationSchema = SchemaFactory.createForClass(CompanyInvitation);

CompanyInvitationSchema.index({ email: 1, status: 1 });
// token et company ont déjà index: true dans @Prop
