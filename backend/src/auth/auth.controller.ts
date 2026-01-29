import { Body, Controller, HttpCode, HttpStatus, Post, Request, UseGuards, Version } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async login(@Request() req: any) {
    const tokenData = await this.authService.login(req.user);
    return {
      ...tokenData,
      user: {
        id: req.user._id?.toString?.() || req.user.id,
        email: req.user.email,
        firstName: req.user.firstName || req.user.prenom,
        lastName: req.user.lastName || req.user.nom,
        roles: req.user.roles || [],
      },
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(@Request() req: any, @Body() dto: ChangePasswordDto) {
    await this.authService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }

  @Post('forgot-password')
  @Version('1')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    // Always return success to prevent email enumeration
    return { message: 'If the email exists, a password reset link has been sent' };
  }

  @Post('reset-password')
  @Version('1')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
