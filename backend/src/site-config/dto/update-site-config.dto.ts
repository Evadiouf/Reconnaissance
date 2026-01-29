export class UpdateSiteConfigDto {
  name?: string;
  description?: string;

  languages?: { code: string; name?: string; enabled: boolean }[];
  defaultLanguage?: string; // e.g., 'en'

  currencies?: { code: string; symbol?: string; enabled: boolean }[];
  defaultCurrency?: string; // e.g., 'USD'

  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  timezone?: string; // e.g., 'UTC', 'Europe/Paris'
}
