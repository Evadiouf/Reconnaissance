import { IsMongoId } from 'class-validator';

export class QueryDashboardDto {
  @IsMongoId()
  companyId: string;
}
