import { Type } from 'class-transformer';
import { IsDate, IsMongoId, IsOptional } from 'class-validator';

export class QueryReportDto {
  @IsMongoId()
  companyId: string;

  @IsOptional()
  @IsMongoId()
  userId?: string;

  @Type(() => Date)
  @IsDate()
  from: Date;

  @Type(() => Date)
  @IsDate()
  to: Date;
}
