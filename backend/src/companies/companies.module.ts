import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Company, CompanySchema } from './schemas/company.schema';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { CompanyType, CompanyTypeSchema } from './schemas/company-type.schema';
import { CompanyTypesController } from './company-types.controller';
import { CompanyTypesService } from './company-types.service';
import { EmailModule } from '../email/email.module';
import { InvitationsModule } from '../invitations/invitations.module';
import { RolesGuard } from '../auth/guards/roles.guard';
import { User, UserSchema } from '../users/schemas/user.schema';
import { TimeEntry, TimeEntrySchema } from '../attendance/schemas/time-entry.schema';
import { FaceRecognitionModule } from '../face-recognition/face-recognition.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: CompanyType.name, schema: CompanyTypeSchema },
      { name: User.name, schema: UserSchema },
      { name: TimeEntry.name, schema: TimeEntrySchema },
    ]),
    EmailModule,
    InvitationsModule,
    FaceRecognitionModule,
  ],
  controllers: [CompaniesController, CompanyTypesController],
  providers: [CompaniesService, CompanyTypesService, RolesGuard],
  exports: [CompaniesService, CompanyTypesService],
})
export class CompaniesModule {}
