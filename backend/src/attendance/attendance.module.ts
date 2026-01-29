import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TimeEntry, TimeEntrySchema } from './schemas/time-entry.schema';
import { DailyStats, DailyStatsSchema } from './schemas/daily-stats.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { CompanySubscriptionsModule } from '../company-subscriptions/company-subscriptions.module';
import { SubscriptionActiveGuard } from '../auth/guards/subscription-active.guard';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TimeEntry.name, schema: TimeEntrySchema },
      { name: DailyStats.name, schema: DailyStatsSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
    CompanySubscriptionsModule,
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, SubscriptionActiveGuard],
})
export class AttendanceModule {}
