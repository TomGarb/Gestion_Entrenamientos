import api from './api';

export const generateLinkCode = async () => {
  const response = await api.get('/api/telegram/link-code');
  return response.data;
};

export const testConnection = async () => {
  const response = await api.post('/api/telegram/test-connection');
  return response.data;
};
