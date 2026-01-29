export class CreateCompanySubscriptionDto {
  companyId: string;
  planId: string;
  activationDate?: string; // ISO date, defaults to now
  amount?: number; // optional override, defaults to plan.amount
  currency?: string; // optional override, defaults to plan.currency
}
