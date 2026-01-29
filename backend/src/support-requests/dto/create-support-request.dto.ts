import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupportRequestDto {
  @IsString()
  @MaxLength(120)
  category: string;

  @IsString()
  @MaxLength(200)
  subject: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;
}
