import api from './api';

export const startWorkout = async (data) => {
  const response = await api.post('/api/workouts/start', data);
  return response.data;
};

export const addSet = async (logId, setData) => {
  const response = await api.post(`/api/workouts/${logId}/sets`, setData);
  return response.data;
};

export const removeSet = async (setId) => {
  const response = await api.delete(`/api/workouts/sets/${setId}`);
  return response.data;
};

export const finishWorkout = async (logId) => {
  const response = await api.put(`/api/workouts/${logId}/finish`);
  return response.data;
};

export const getWorkoutHistory = async () => {
  const response = await api.get('/api/workouts/history');
  return response.data;
};