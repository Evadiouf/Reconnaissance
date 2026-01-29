import { IsOptional, IsString, IsBoolean, IsDateString, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateFileDto {
  @ApiPropertyOptional({ description: 'Description du fichier' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Tags associés au fichier' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  tags?: string[];

  @ApiPropertyOptional({ description: 'Indique si le fichier est public' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Date d\'expiration du fichier (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ description: 'Statut du fichier' })
  @IsOptional()
  @IsString()
  status?: string;
}
