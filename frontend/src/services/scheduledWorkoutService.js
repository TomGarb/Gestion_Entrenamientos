import api from './api';

export const getScheduledWorkouts = async (params = {}) => {
  const response = await api.get('/api/scheduled-workouts', { params });
  return response.data;
};

export const createScheduledWorkout = async (data) => {
  const response = await api.post('/api/scheduled-workouts', data);
  return response.data;
};

export const inviteFriendToWorkout = async (data) => {
  const response = await api.post('/api/scheduled-workouts/invite', data);
  return response.data;
};

export const acceptWorkoutInvitation = async (workoutId) => {
  const response = await api.post(`/api/scheduled-workouts/${workoutId}/accept`);
  return response.data;
};

export const rejectWorkoutInvitation = async (workoutId) => {
  const response = await api.post(`/api/scheduled-workouts/${workoutId}/reject`);
  return response.data;
};

export const updateScheduledWorkout = async (workoutId, data) => {
  const response = await api.put(`/api/scheduled-workouts/${workoutId}`, data);
  return response.data;
};

export const deleteScheduledWorkout = async (workoutId) => {
  const response = await api.delete(`/api/scheduled-workouts/${workoutId}`);
  return response.data;
};
