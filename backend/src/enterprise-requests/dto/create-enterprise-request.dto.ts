import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateEnterpriseRequestDto {
  @IsString()
  @MaxLength(120)
  categorieDemande: string;

  @IsString()
  @MaxLength(200)
  sujet: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  telephone?: string;
}
