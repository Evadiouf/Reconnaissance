import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Request, UseGuards, Version, HttpException, Param, NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { InviteRHDto } from './dto/invite-rh.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@UseGuards(JwtAuthGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto, req.user.userId);
  }

  @Get()
  @Version('1')
  async myCompanies(@Request() req: any) {
    return this.companiesService.findByOwner(req.user.userId);
  }

  @Get('all')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin')
  async allCompanies() {
    return this.companiesService.findAll();
  }

  @Get('my-company-id')
  @Version('1')
  async getMyCompanyId(@Request() req: any) {
    const companyId = await this.companiesService.findCompanyIdByUserId(req.user.userId);
    if (!companyId) {
      return { companyId: null, message: 'Aucune entreprise associée à cet utilisateur' };
    }
    return { companyId };
  }

  @Post('invite-rh')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin')
  @HttpCode(HttpStatus.OK)
  async inviteRH(@Request() req: any, @Body() dto: InviteRHDto) {
    try {
      await this.companiesService.inviteRH(dto, req.user.userId);
      return { message: 'Invitation envoyée avec succès' };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Erreur lors de l\'envoi de l\'invitation',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /** Supprimer définitivement une entreprise (company + employés + pointages + photos Naratech) */
  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async deleteCompany(@Request() req: any, @Param('id') id: string) {
    return this.companiesService.deleteCompany(id, req.user.userId);
  }

  /** Rattacher un utilisateur existant à mon entreprise (réparation pointage "n'appartient pas à cette entreprise") */
  @Post('my/employees/:userId')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async attachEmployeeToMyCompany(@Request() req: any, @Param('userId') userId: string) {
    const companyId = await this.companiesService.findCompanyIdByUserId(req.user.userId);
    if (!companyId) {
      throw new NotFoundException('Aucune entreprise associée à votre compte');
    }
    await this.companiesService.addEmployeeToCompany(companyId, userId);
    return { message: 'Employé rattaché à l\'entreprise avec succès', companyId, userId };
  }

  @Get('employees')
  @Version('1')
  async getCompanyEmployees(@Request() req: any) {
    return this.companiesService.getCompanyEmployees(req.user.userId);
  }

  @Get('all-with-employees')
  @Version('1')
  @UseGuards(RolesGuard)
  @Roles('admin', 'superadmin')
  async getAllCompaniesWithEmployees() {
    return this.companiesService.getAllCompaniesWithEmployees();
  }
}
