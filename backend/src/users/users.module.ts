import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { TimeEntry, TimeEntrySchema } from '../attendance/schemas/time-entry.schema';
import { InvitationsModule } from '../invitations/invitations.module';
import { CompaniesModule } from '../companies/companies.module';
import { CompanyInvitationsModule } from '../company-invitations/company-invitations.module';
import { CompanySubscriptionsModule } from '../company-subscriptions/company-subscriptions.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { FaceRecognitionModule } from '../face-recognition/face-recognition.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: TimeEntry.name, schema: TimeEntrySchema },
    ]),
    InvitationsModule,
    CompaniesModule,
    CompanyInvitationsModule,
    CompanySubscriptionsModule,
    SchedulesModule,
    FaceRecognitionModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
