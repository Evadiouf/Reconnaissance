import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async validateUser(email: string, pass: string) {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);
    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    if (!user.password) {
      throw new UnauthorizedException('Compte invalide : mot de passe manquant');
    }
    const match = await bcrypt.compare(pass, user.password);
    if (!match) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }
    const obj = user.toObject();
    delete (obj as any).password;
    return obj as any;
  }

  async login(user: any) {
    const payload = {
      sub: user._id?.toString?.() || user.id,
      email: user.email,
      roles: user.roles || [],
    };
    return { access_token: await this.jwtService.signAsync(payload) };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user || !user.password) throw new UnauthorizedException();
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) throw new UnauthorizedException('Invalid current password');
    await this.usersService.setPasswordById((user as any)._id.toString(), newPassword);
  }

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = (email || '').toLowerCase().trim();
    if (!normalizedEmail) {
      return;
    }

    const user = await this.usersService.findByEmail(normalizedEmail);
    
    // Always return success to prevent email enumeration
    if (!user) {
      return;
    }

    // Generate a secure random token
    const token = randomBytes(32).toString('hex');
    const redisKey = `password-reset:${token}`;

    try {
      // Store the token in Redis with user email and expire in 30 minutes
      await this.redis.setex(redisKey, 1800, user.email);
    } catch (err: any) {
      this.logger.error(`Redis error while creating password reset token for ${normalizedEmail}`, err?.stack || err);
      return;
    }

    try {
      // Send email with the token
      await this.emailService.sendResetPasswordEmail(user.email, token);
    } catch (err: any) {
      // Ne pas remonter l'erreur pour éviter un 500 côté client
      this.logger.error(`Email error while sending password reset link to ${normalizedEmail}`, err?.stack || err);
      return;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    const redisKey = `password-reset:${token}`;
    const email = await this.redis.get(redisKey);

    if (!email) {
      throw new NotFoundException('Invalid or expired token');
    }

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update the password
    await this.usersService.setPasswordById((user as any)._id.toString(), newPassword);

    // Delete the token from Redis
    await this.redis.del(redisKey);
  }
}
