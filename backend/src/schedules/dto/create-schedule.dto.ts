import { IsArray, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsOptional()
  @IsString()
  breakStart?: string;

  @IsOptional()
  @IsString()
  breakEnd?: string;

  @IsOptional()
  @IsNumber()
  breakDurationMinutes?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  workDays?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(240)
  graceMinutes?: number;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  employees?: number;
}
