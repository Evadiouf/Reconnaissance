import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { CompanyInvitationsController } from './company-invitations.controller';
import { CompanyInvitationsService } from './company-invitations.service';
import { CompanyInvitation, CompanyInvitationSchema } from './schemas/company-invitation.schema';
import { Company, CompanySchema } from '../companies/schemas/company.schema';
import { RolesGuard } from '../auth/guards/roles.guard';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    ConfigModule,
    EmailModule,
    MongooseModule.forFeature([
      { name: CompanyInvitation.name, schema: CompanyInvitationSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [CompanyInvitationsController],
  providers: [CompanyInvitationsService, RolesGuard],
  exports: [CompanyInvitationsService],
})
export class CompanyInvitationsModule {}
