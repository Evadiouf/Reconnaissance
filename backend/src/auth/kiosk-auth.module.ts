import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { CompanySubscriptionsModule } from '../company-subscriptions/company-subscriptions.module';
import { KioskTokenGuard } from './guards/kiosk-token.guard';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Company.name, schema: CompanySchema }]),
    CompanySubscriptionsModule,
  ],
  providers: [KioskTokenGuard],
  exports: [KioskTokenGuard, MongooseModule, CompanySubscriptionsModule],
})
export class KioskAuthModule {}
