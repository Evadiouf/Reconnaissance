import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Company extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: Types.ObjectId, ref: 'CompanyType', required: true })
  type: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  owner: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  employees: Types.ObjectId[];

  @Prop({ default: 0 })
  employeeCount?: number;

  @Prop({ trim: true })
  address?: string;

  @Prop({ trim: true })
  phone?: string;

  @Prop({ trim: true, lowercase: true })
  email?: string;

  @Prop({ trim: true })
  website?: string;

  @Prop({ trim: true })
  contactName?: string;

  @Prop({ trim: true, lowercase: true })
  contactEmail?: string;

  @Prop({ default: 0 })
  cameras?: number;

  @Prop({ trim: true, default: 'Standard' })
  plan?: string;

  @Prop({ trim: true, default: 'Actif' })
  status?: string;
}

export const CompanySchema = SchemaFactory.createForClass(Company);
