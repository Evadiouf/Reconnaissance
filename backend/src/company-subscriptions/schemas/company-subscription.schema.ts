import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true })
export class CompanySubscription extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  company: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  plan: Types.ObjectId;

  @Prop({ required: true })
  pricePerEmployee: number;

  @Prop({ required: true })
  numberOfEmployees: number;

  @Prop({ required: true })
  numberOfMonths: number;

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ required: true, trim: true })
  currency: string;

  @Prop({ required: true, trim: true })
  paymentMethod: string;

  @Prop({ 
    type: String, 
    enum: Object.values(PaymentStatus), 
    default: PaymentStatus.PENDING 
  })
  paymentStatus: PaymentStatus;

  @Prop({ type: String })
  transactionId?: string;

  @Prop({ 
    type: String, 
    enum: Object.values(SubscriptionStatus), 
    default: SubscriptionStatus.INACTIVE 
  })
  status: SubscriptionStatus;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;

  // Anciens champs pour compatibilité
  @Prop({ type: Number })
  amount?: number;

  @Prop({ type: Date })
  activationDate?: Date;

  @Prop({ type: Date })
  expirationDate?: Date;

  @Prop({ type: Boolean, default: false })
  isActive?: boolean;
}

export const CompanySubscriptionSchema = SchemaFactory.createForClass(CompanySubscription);
