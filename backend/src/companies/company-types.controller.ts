import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { CompanyTypesService } from './company-types.service';
import { CreateCompanyTypeDto } from './dto/create-company-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('company-types')
export class CompanyTypesController {
  constructor(private readonly service: CompanyTypesService) {}

  @Get('public')
  @Version('1')
  async listPublic() {
    return this.service.listAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCompanyTypeDto) {
    return this.service.create(dto);
  }
}
