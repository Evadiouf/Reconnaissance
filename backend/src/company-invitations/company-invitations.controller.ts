import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Request, UseGuards, Version } from '@nestjs/common';
import { CompanyInvitationsService } from './company-invitations.service';
import { CreateCompanyInvitationDto } from './dto/create-company-invitation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('company-invitations')
export class CompanyInvitationsController {
  constructor(private readonly service: CompanyInvitationsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateCompanyInvitationDto) {
    return this.service.createInvitation(dto, req.user.userId);
  }

  @Get('validate')
  @Version('1')
  async validate(@Query('token') token: string) {
    if (!token) {
      return { valid: false, message: 'Token requis' };
    }

    try {
      const inv = await this.service.validateToken(token, undefined);
      const company: any = inv.company as any;
      return {
        valid: true,
        invitation: {
          email: inv.email,
          companyId: company?._id?.toString?.() || company?.toString?.() || inv.company,
          companyName: company?.name,
          companyTypeId: company?.type?._id?.toString?.() || company?.type?.toString?.() || company?.type,
          companyAddress: company?.address,
          companyPhone: company?.phone,
          companyWebsite: company?.website,
          companyEmail: company?.email,
          status: inv.status,
          subscribedAt: (inv as any).subscribedAt,
          subscriptionFormData: (inv as any).subscriptionFormData,
        },
      };
    } catch (error: any) {
      return { valid: false, message: error.message || 'Token invalide' };
    }
  }
}
