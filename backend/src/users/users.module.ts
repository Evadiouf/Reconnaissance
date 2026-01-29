import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, UserSchema } from './schemas/user.schema';
import { InvitationsModule } from '../invitations/invitations.module';
import { CompaniesModule } from '../companies/companies.module';
import { CompanyInvitationsModule } from '../company-invitations/company-invitations.module';
import { CompanySubscriptionsModule } from '../company-subscriptions/company-subscriptions.module';
import { SchedulesModule } from '../schedules/schedules.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    InvitationsModule,
    CompaniesModule,
    CompanyInvitationsModule,
    CompanySubscriptionsModule,
    SchedulesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
