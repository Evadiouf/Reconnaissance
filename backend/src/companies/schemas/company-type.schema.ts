import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CompanyType extends Document {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;
}

export const CompanyTypeSchema = SchemaFactory.createForClass(CompanyType);
