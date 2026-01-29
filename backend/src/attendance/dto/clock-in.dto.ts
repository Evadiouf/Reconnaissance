import { IsMongoId, IsOptional, IsString, IsIn, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  accuracy?: number;
}

export class ClockInDto {
  @IsMongoId()
  companyId: string;

  @IsOptional()
  @IsMongoId()
  employeeId?: string; // ID de l'employé qui se pointe (si différent de l'utilisateur connecté)

  @IsOptional()
  @IsIn(['web', 'mobile', 'kiosk'])
  source?: 'web' | 'mobile' | 'kiosk';

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;

  @IsOptional()
  @IsString()
  notes?: string;
}
