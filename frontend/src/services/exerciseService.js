import api from './api';

export const getExercises = async () => {
  const response = await api.get('/api/exercises/');
  return response.data;
};

export const createExercise = async (data) => {
  const response = await api.post('/api/exercises/', data);
  return response.data;
};

export const updateExercise = async (id, data) => {
  const response = await api.put(`/api/exercises/${id}`, data);
  return response.data;
};

export const deleteExercise = async (id) => {
  const response = await api.delete(`/api/exercises/${id}`);
  return response.data;
};
