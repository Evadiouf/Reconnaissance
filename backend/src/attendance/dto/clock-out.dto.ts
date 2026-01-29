import { IsMongoId, IsOptional, IsString } from 'class-validator';

export class ClockOutDto {
  @IsMongoId()
  companyId: string;

  @IsOptional()
  @IsMongoId()
  employeeId?: string; // ID de l'employé qui se pointe (si différent de l'utilisateur connecté)

  @IsOptional()
  @IsString()
  notes?: string;
}
