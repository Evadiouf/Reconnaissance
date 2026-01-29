import apiClient from './apiClient';

const SCHEDULES_ENDPOINT = '/api/v1/schedules';

export const schedulesService = {
  async list() {
    const response = await apiClient.get(SCHEDULES_ENDPOINT);
    return Array.isArray(response.data) ? response.data : [];
  },

  async create(payload) {
    const response = await apiClient.post(SCHEDULES_ENDPOINT, payload);
    return response.data;
  },

  async update(id, payload) {
    const response = await apiClient.patch(`${SCHEDULES_ENDPOINT}/${id}`, payload);
    return response.data;
  },

  async remove(id) {
    const response = await apiClient.delete(`${SCHEDULES_ENDPOINT}/${id}`);
    return response.data;
  },
};

export default schedulesService;
