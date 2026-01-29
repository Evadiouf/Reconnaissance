import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SiteConfig extends Document {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({
    type: [
      {
        code: { type: String, required: true, trim: true },
        name: { type: String, trim: true },
        enabled: { type: Boolean, default: true },
      },
    ],
    default: [{ code: 'fr', name: 'Français', enabled: true }],
  })
  languages: { code: string; name?: string; enabled: boolean }[];

  @Prop({ required: true, trim: true, default: 'fr' })
  defaultLanguage: string;

  @Prop({
    type: [
      {
        code: { type: String, required: true, trim: true },
        symbol: { type: String, trim: true },
        enabled: { type: Boolean, default: true },
      },
    ],
    default: [{ code: 'XOF', symbol: 'XOF', enabled: true }],
  })
  currencies: { code: string; symbol?: string; enabled: boolean }[];

  @Prop({ required: true, trim: true, default: 'XOF' })
  defaultCurrency: string;

  @Prop({ trim: true })
  logoUrl?: string;

  @Prop({ trim: true })
  primaryColor?: string;

  @Prop({ trim: true })
  secondaryColor?: string;

  @Prop({ trim: true, default: 'UTC' })
  timezone?: string;
}

export const SiteConfigSchema = SchemaFactory.createForClass(SiteConfig);
