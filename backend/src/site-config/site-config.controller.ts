import { Body, Controller, Get, HttpCode, HttpStatus, Put, UseGuards, Version } from '@nestjs/common';
import { SiteConfigService } from './site-config.service';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('site-config')
export class SiteConfigController {
  constructor(private readonly service: SiteConfigService) {}

  @Get()
  @Version('1')
  async get() {
    return this.service.get();
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async update(@Body() dto: UpdateSiteConfigDto) {
    return this.service.upsert(dto);
  }
}
