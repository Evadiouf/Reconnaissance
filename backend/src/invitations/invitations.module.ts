import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { RHInvitation, RHInvitationSchema } from './schemas/rh-invitation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RHInvitation.name, schema: RHInvitationSchema },
    ]),
  ],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}





