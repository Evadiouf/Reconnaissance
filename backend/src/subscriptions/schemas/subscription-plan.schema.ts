import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SubscriptionPlan extends Document {
  @Prop({ required: true, trim: true })
  name: string; // e.g., 'Starter', 'Business', 'Enterprise'

  @Prop({ required: true })
  amount: number; // in smallest currency unit or major unit depending on your billing integration

  @Prop({ required: true })
  recurrenceMonths: number; // 1 = monthly, 6 = semiannual, 12 = yearly, etc.

  @Prop({ required: true, trim: true })
  currency: string; // e.g., 'XOF', 'USD', 'EUR'

   // Constraints
  @Prop({ required: false })
  employeeLimit?: number; // max employees allowed under this plan (undefined = unlimited)

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: true })
  visible: boolean; // visible on platform
}

export const SubscriptionPlanSchema = SchemaFactory.createForClass(SubscriptionPlan);
