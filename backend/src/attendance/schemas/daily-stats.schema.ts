import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DailyStatsDocument = DailyStats & Document;

@Schema({ timestamps: true })
export class DailyStats {
  @Prop({ type: Types.ObjectId, required: true, ref: 'Company' })
  company: Types.ObjectId;

  @Prop({ required: true })
  date: Date; // Date du jour (début de journée)

  @Prop({ required: true, default: 0 })
  totalEmployees: number;

  @Prop({ required: true, default: 0 })
  presentCount: number;

  @Prop({ required: true, default: 0 })
  absentCount: number;

  @Prop({ required: true, default: 0 })
  lateCount: number;

  @Prop({ required: true, default: 0 })
  attendanceRate: number; // Pourcentage

  @Prop([{ userId: { type: Types.ObjectId, required: true }, clockInAt: Date, clockOutAt: Date }])
  attendanceDetails: Array<{
    userId: Types.ObjectId;
    clockInAt: Date;
    clockOutAt?: Date;
    isLate: boolean;
  }>;
}

export const DailyStatsSchema = SchemaFactory.createForClass(DailyStats);

// Index pour optimiser les requêtes
DailyStatsSchema.index({ company: 1, date: -1 });
DailyStatsSchema.index({ date: 1 });
