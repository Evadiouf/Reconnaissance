import { Type } from 'class-transformer';
import { IsDate, IsInt, IsMongoId, IsOptional, Min } from 'class-validator';

export class QueryMyDto {
  @IsMongoId()
  companyId: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
