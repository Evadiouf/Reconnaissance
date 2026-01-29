import apiClient from './apiClient';

const SUBSCRIPTION_PLANS_ENDPOINT = '/api/v1/subscription-plans';

const subscriptionService = {
  async getPublicPlans() {
    const response = await apiClient.get(`${SUBSCRIPTION_PLANS_ENDPOINT}/public`);
    return response.data;
  }
};

export default subscriptionService;



