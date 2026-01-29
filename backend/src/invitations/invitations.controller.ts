import { Body, Controller, Get, Post, Request, UseGuards, Version, Query } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { ValidateInvitationDto } from './dto/validate-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get('validate')
  @Version('1')
  async validateToken(@Query('token') token: string) {
    if (!token) {
      return { valid: false, message: 'Token requis' };
    }

    try {
      const invitation = await this.invitationsService.validateToken(token);
      return {
        valid: true,
        invitation: {
          email: invitation.email,
          role: invitation.role,
          department: invitation.department,
        },
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message || 'Token invalide',
      };
    }
  }

  @Get()
  @Version('1')
  @UseGuards(JwtAuthGuard)
  async getMyInvitations(@Request() req: any) {
    const invitations = await this.invitationsService.findByInviter(
      req.user.userId,
    );
    return invitations;
  }
}





