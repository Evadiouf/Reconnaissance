import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Query, Request, UseGuards, Version, BadRequestException } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SubscriptionActiveGuard } from '../auth/guards/subscription-active.guard';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { QueryMyDto } from './dto/query-my.dto';
import { QueryReportDto } from './dto/query-report.dto';
import { QueryCompanyDto } from './dto/query-company.dto';
import { QueryDashboardDto } from './dto/query-dashboard.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionActiveGuard)
  @Permissions('Attendance:clock')
  @Post('clock-in')
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async clockIn(@Request() req: any, @Body() dto: ClockInDto) {
    const loggedInUserId = req.user.userId;
    const loggedInUserEmail = req.user.email;
    const loggedInRoles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : [];
    
    // Utiliser employeeId si fourni (pour permettre à un compte RH de pointer pour un employé)
    // Sinon utiliser l'ID de l'utilisateur connecté
    let targetUserId = dto.employeeId || loggedInUserId;
    
    // Validation et conversion de l'ID
    if (dto.employeeId) {
      // Vérifier si c'est un ObjectId MongoDB valide
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(dto.employeeId);
      if (!isValidObjectId) {
        console.error('❌ employeeId invalide:', dto.employeeId);
        throw new BadRequestException('employeeId must be a valid MongoDB ObjectId');
      }
    }
    
    console.log('🔍 Pointage - Utilisateur connecté:', {
      userId: loggedInUserId,
      email: loggedInUserEmail,
      employeeId: dto.employeeId,
      targetUserId: targetUserId
    });
    
    // Si on pointe pour quelqu'un d'autre, exiger un rôle RH/admin
    if (dto.employeeId && dto.employeeId !== loggedInUserId) {
      const canClockForOthers =
        loggedInRoles.includes('rh') ||
        loggedInRoles.includes('admin') ||
        loggedInRoles.includes('superadmin');
      if (!canClockForOthers) {
        throw new BadRequestException("Vous n'êtes pas autorisé à pointer pour un autre employé");
      }
      return this.attendance.clockInFor(loggedInUserId, targetUserId, dto.companyId, dto);
    }

    return this.attendance.clockIn(loggedInUserId, dto.companyId, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionActiveGuard)
  @Permissions('Attendance:clock')
  @Post('clock-out')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async clockOut(@Request() req: any, @Body() dto: ClockOutDto) {
    const loggedInUserId = req.user.userId;
    const loggedInRoles: string[] = Array.isArray(req.user?.roles) ? req.user.roles : [];
    
    // Utiliser employeeId si fourni (pour permettre à un compte RH de pointer pour un employé)
    // Sinon utiliser l'ID de l'utilisateur connecté
    let targetUserId = dto.employeeId || loggedInUserId;
    
    // Validation et conversion de l'ID
    if (dto.employeeId) {
      // Vérifier si c'est un ObjectId MongoDB valide
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(dto.employeeId);
      if (!isValidObjectId) {
        console.error('❌ employeeId invalide:', dto.employeeId);
        throw new BadRequestException('employeeId must be a valid MongoDB ObjectId');
      }
    }
    
    // Si on pointe pour quelqu'un d'autre, exiger un rôle RH/admin
    if (dto.employeeId && dto.employeeId !== loggedInUserId) {
      const canClockForOthers =
        loggedInRoles.includes('rh') ||
        loggedInRoles.includes('admin') ||
        loggedInRoles.includes('superadmin');
      if (!canClockForOthers) {
        throw new BadRequestException("Vous n'êtes pas autorisé à pointer pour un autre employé");
      }
      return this.attendance.clockOutFor(loggedInUserId, targetUserId, dto.companyId, dto);
    }

    return this.attendance.clockOut(loggedInUserId, dto.companyId, dto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionActiveGuard)
  @Permissions('Attendance:read')
  @Get('my')
  @Version('1')
  async my(@Request() req: any, @Query() q: QueryMyDto) {
    const userId = req.user.userId;
    return this.attendance.findMy(userId, q);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionActiveGuard)
  @Permissions('Attendance:read')
  @Get('company')
  @Version('1')
  async company(@Request() req: any, @Query() q: QueryCompanyDto) {
    const userId = req.user.userId;
    return this.attendance.findCompany(userId, q);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionActiveGuard)
  @Permissions('Attendance:report')
  @Delete('company/history')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async clearCompanyHistory(
    @Request() req: any,
    @Query() q: { companyId: string; from?: string; to?: string },
  ) {
    const userId = req.user.userId;
    if (!q?.companyId) {
      throw new BadRequestException('companyId requis');
    }

    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;
    if (from && isNaN(from.getTime())) {
      throw new BadRequestException('from invalide (date)');
    }
    if (to && isNaN(to.getTime())) {
      throw new BadRequestException('to invalide (date)');
    }

    return this.attendance.clearCompanyHistory(userId, { companyId: q.companyId, from, to });
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionActiveGuard)
  @Permissions('Attendance:read')
  @Get('dashboard')
  @Version('1')
  async dashboard(@Request() req: any, @Query() q: QueryDashboardDto) {
    const userId = req.user.userId;
    return this.attendance.dashboard(userId, q.companyId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionActiveGuard)
  @Permissions('Attendance:read')
  @Get('dashboard/history')
  @Version('1')
  async dashboardHistory(@Request() req: any, @Query() q: { companyId: string; from?: string; to?: string }) {
    const userId = req.user.userId;
    const from = q.from ? new Date(q.from) : undefined;
    const to = q.to ? new Date(q.to) : undefined;
    return this.attendance.getDailyStatsHistory(userId, q.companyId, from, to);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionActiveGuard)
  @Permissions('Attendance:report')
  @Get('report')
  @Version('1')
  async report(@Request() req: any, @Query() q: QueryReportDto) {
    const userId = req.user.userId;
    return this.attendance.report(userId, q.companyId, { userId: q.userId, from: q.from, to: q.to });
  }
}
