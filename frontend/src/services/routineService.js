import api from './api';

export const getRoutines = async () => {
  const response = await api.get('/api/routines/');
  return response.data;
};

export const createRoutine = async (routineData) => {
  const response = await api.post('/api/routines/', routineData);
  return response.data;
};

export const deleteRoutine = async (id) => {
  const response = await api.delete(`/api/routines/${id}`);
  return response.data;
};

export const sendRoutineToTelegram = async (id) => {
  const response = await api.post(`/api/telegram/send-routine/${id}`);
  return response.data;
};
