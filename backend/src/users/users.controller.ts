import { Body, Controller, Delete, ForbiddenException, HttpCode, HttpStatus, Param, Patch, Post, Request, UseGuards, Version } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    if (!dto?.invitationToken) {
      throw new ForbiddenException('Invitation requise');
    }
    console.log(' [UsersController.create] Requête reçue pour créer un utilisateur');
    console.log(' Données reçues dans le contrôleur:', {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email: dto.email,
      companyId: dto.companyId,
      hasPassword: !!dto.password
    });
    return this.usersService.create(dto);
  }

  @Post('employees')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('rh', 'admin', 'superadmin')
  @HttpCode(HttpStatus.CREATED)
  createEmployee(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.usersService.createEmployee(req.user.userId, dto);
  }

  @Patch(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('rh', 'admin', 'superadmin')
  updateUser(@Request() req: any, @Param('id') id: string, @Body() body: any) {
    return this.usersService.updateUserById(req.user.userId, id, body);
  }

  @Delete(':id')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('rh', 'admin', 'superadmin')
  deleteUser(@Request() req: any, @Param('id') id: string) {
    return this.usersService.deleteUserById(req.user.userId, id);
  }
}
