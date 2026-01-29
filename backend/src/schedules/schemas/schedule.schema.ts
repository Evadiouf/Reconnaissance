import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Schedule extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Company', required: true, index: true })
  company: Types.ObjectId;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ required: true, trim: true })
  startTime: string;

  @Prop({ required: true, trim: true })
  endTime: string;

  @Prop({ trim: true })
  breakStart?: string;

  @Prop({ trim: true })
  breakEnd?: string;

  @Prop({ type: Number })
  breakDurationMinutes?: number;

  @Prop({ type: [String], default: [] })
  workDays: string[];

  @Prop({ type: Number, default: 0 })
  graceMinutes: number;

  @Prop({ trim: true, default: 'Tous' })
  department: string;

  @Prop({ type: Number, default: 0 })
  employees: number;
}

export const ScheduleSchema = SchemaFactory.createForClass(Schedule);
