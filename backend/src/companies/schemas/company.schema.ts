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

  /**
   * Pointage automatique kiosque (optionnel).
   * defaultSlots = tous les employés sans override actif.
   * teamOverrides = clé département normalisée (trim + lower) ; si enabled + slots, priorité sur defaultSlots pour les employés de ce département.
   */
  @Prop({ type: Object, required: false })
  kioskAttendance?: {
    enabled?: boolean;
    defaultSlots?: Array<{ start: string; end: string; action: 'clock_in' | 'clock_out' }>;
    teamOverrides?: Array<{
      departmentKey: string;
      label?: string;
      enabled?: boolean;
      slots?: Array<{ start: string; end: string; action: 'clock_in' | 'clock_out' }>;
    }>;
  };
}

export const CompanySchema = SchemaFactory.createForClass(Company);
