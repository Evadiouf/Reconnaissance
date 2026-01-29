import { IsString, IsNotEmpty } from 'class-validator';

export class ValidateInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}








