import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCompanyTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
