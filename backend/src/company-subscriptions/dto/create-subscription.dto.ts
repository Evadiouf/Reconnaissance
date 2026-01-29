import { IsEnum, IsInt, IsNotEmpty, IsString, Min, ValidateIf } from 'class-validator';

export enum PlanType {
  STARTER = 'starter',
  BUSINESS = 'business',
  ENTERPRISE = 'enterprise',
}

export enum PaymentMethodType {
  WAVE = 'wave',
  ORANGE_MONEY = 'orange_money',
  FREE_MONEY = 'free_money',
  AUTRE = 'autre',
}

export class CreateSubscriptionDto {
  @IsNotEmpty()
  @IsEnum(PlanType)
  plan: PlanType;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  numberOfMonths: number;

  @ValidateIf(o => o.plan !== PlanType.ENTERPRISE)
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  numberOfEmployees?: number;

  @IsNotEmpty()
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @IsNotEmpty()
  @IsString()
  companyId: string;
}
