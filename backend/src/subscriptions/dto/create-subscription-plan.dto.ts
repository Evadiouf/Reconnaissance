export class CreateSubscriptionPlanDto {
  name: string; // e.g., 'Starter', 'Business', 'Enterprise'
  amount: number;
  recurrenceMonths: number; // 1, 3, 6, 12, etc.
  isActive?: boolean;
  visible?: boolean;
  currency?: string;
  employeeLimit?: number; // undefined = unlimited
}
