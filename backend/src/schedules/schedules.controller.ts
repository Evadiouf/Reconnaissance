import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards, Version } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('rh', 'admin', 'superadmin')
@Controller('schedules')
export class SchedulesController {
  constructor(private readonly schedules: SchedulesService) {}

  @Get()
  @Version('1')
  async list(@Request() req: any) {
    return this.schedules.listMyCompanySchedules(req.user.userId);
  }

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateScheduleDto) {
    return this.schedules.createForMyCompany(req.user.userId, dto);
  }

  @Patch(':id')
  @Version('1')
  async update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateScheduleDto) {
    return this.schedules.updateMyCompanySchedule(req.user.userId, id, dto);
  }

  @Delete(':id')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async remove(@Request() req: any, @Param('id') id: string) {
    return this.schedules.deleteMyCompanySchedule(req.user.userId, id);
  }
}
