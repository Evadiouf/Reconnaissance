import { IsEmail, IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRHInvitationDto {
  @ApiProperty({ description: 'Email de l\'invité' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Nom de l\'invité' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Message personnalisé' })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({ description: 'Rôle de l\'invité' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ description: 'Département de l\'invité' })
  @IsOptional()
  @IsString()
  department?: string;

  @ApiPropertyOptional({ description: 'Timeout de session en minutes' })
  @IsOptional()
  @IsNumber()
  sessionTimeout?: number;
}

