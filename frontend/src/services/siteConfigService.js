import apiClient from './apiClient';

const SITE_CONFIG_ENDPOINT = '/api/v1/site-config';

export const siteConfigService = {
  async get() {
    const response = await apiClient.get(SITE_CONFIG_ENDPOINT);
    return response.data;
  },

  async update({
    name,
    description,
    languages,
    defaultLanguage,
    currencies,
    defaultCurrency,
    logoUrl,
    primaryColor,
    secondaryColor,
    timezone
  }) {
    const payload = {
      ...(name && { name }),
      ...(description && { description }),
      ...(languages && { languages }),
      ...(defaultLanguage && { defaultLanguage }),
      ...(currencies && { currencies }),
      ...(defaultCurrency && { defaultCurrency }),
      ...(logoUrl && { logoUrl }),
      ...(primaryColor && { primaryColor }),
      ...(secondaryColor && { secondaryColor }),
      ...(timezone && { timezone })
    };
    const response = await apiClient.put(SITE_CONFIG_ENDPOINT, payload);
    return response.data;
  }
};

export default siteConfigService;













