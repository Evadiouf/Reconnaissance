import apiClient from './apiClient';

const COMPANY_SUBSCRIPTIONS_ENDPOINT = '/api/v1/company-subscriptions';

export const companySubscriptionService = {
  async create({
    companyId,
    planId,
    activationDate,
    amount,
    currency
  }) {
    const payload = {
      companyId,
      planId,
      ...(activationDate && { activationDate }),
      ...(amount !== undefined && { amount }),
      ...(currency && { currency })
    };
    const response = await apiClient.post(COMPANY_SUBSCRIPTIONS_ENDPOINT, payload);
    return response.data;
  },

  async createByInvitation({
    token,
    planId,
    activationDate,
    amount,
    currency,
    subscriptionFormData
  }) {
    const payload = {
      token,
      planId,
      ...(activationDate && { activationDate }),
      ...(amount !== undefined && { amount }),
      ...(currency && { currency }),
      ...(subscriptionFormData && { subscriptionFormData })
    };
    const response = await apiClient.post(`${COMPANY_SUBSCRIPTIONS_ENDPOINT}/by-invitation`, payload);
    return response.data;
  },

  async getByCompany(companyId) {
    const response = await apiClient.get(`${COMPANY_SUBSCRIPTIONS_ENDPOINT}/${companyId}`);
    return response.data;
  }
};

export default companySubscriptionService;



















