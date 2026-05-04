import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export class KioskSlotDto {
  @IsString()
  @Matches(HHMM, { message: 'start doit être au format HH:mm (00:00 à 23:59)' })
  start: string;

  @IsString()
  @Matches(HHMM, { message: 'end doit être au format HH:mm' })
  end: string;

  @IsString()
  @IsIn(['clock_in', 'clock_out'])
  action: 'clock_in' | 'clock_out';
}

export class KioskTeamOverrideDto {
  @IsString()
  @Matches(/\S/, { message: 'departmentKey ne peut pas être vide' })
  departmentKey: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsBoolean()
  enabled: boolean;

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => KioskSlotDto)
  slots: KioskSlotDto[];
}

export class UpdateKioskAttendanceDto {
  @IsBoolean()
  enabled: boolean;

  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => KioskSlotDto)
  defaultSlots: KioskSlotDto[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => KioskTeamOverrideDto)
  teamOverrides?: KioskTeamOverrideDto[];
}
