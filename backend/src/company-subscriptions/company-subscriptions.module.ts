import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CompanySubscriptionsController, SubscriptionsController } from './company-subscriptions.controller';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { CompanySubscription, CompanySubscriptionSchema } from './schemas/company-subscription.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../subscriptions/schemas/subscription-plan.schema';
import { CompanyInvitationsModule } from '../company-invitations/company-invitations.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CompanySubscription.name, schema: CompanySubscriptionSchema },
      { name: Company.name, schema: CompanySchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
    CompanyInvitationsModule,
    PaymentModule,
  ],
  controllers: [CompanySubscriptionsController, SubscriptionsController],
  providers: [CompanySubscriptionsService],
  exports: [CompanySubscriptionsService],
})
export class CompanySubscriptionsModule {}
