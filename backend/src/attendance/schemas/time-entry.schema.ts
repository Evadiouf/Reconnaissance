import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GeoLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
};

@Schema({ timestamps: true })
export class TimeEntry extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Company', required: true })
  company: Types.ObjectId;

  @Prop({ type: Date, required: true })
  clockInAt: Date;

  @Prop({ type: Date })
  clockOutAt?: Date;

  @Prop({ type: Number })
  durationSec?: number;

  @Prop({ type: String, enum: ['web', 'mobile', 'kiosk'], required: false })
  source?: 'web' | 'mobile' | 'kiosk';

  @Prop({ type: Object, required: false })
  location?: GeoLocation;

  @Prop({ type: String })
  notes?: string;
}

export const TimeEntrySchema = SchemaFactory.createForClass(TimeEntry);

TimeEntrySchema.index({ user: 1, company: 1, clockInAt: -1 });
