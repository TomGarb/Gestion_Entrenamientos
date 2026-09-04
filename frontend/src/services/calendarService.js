import api from './api';

export const getMyCalendar = async (year = null, month = null) => {
  let url = '/api/calendar/me';
  const params = [];
  if (year) params.push(`year=${year}`);
  if (month) params.push(`month=${month}`);
  if (params.length > 0) url += `?${params.join('&')}`;
  
  const response = await api.get(url);
  return response.data;
};

export const getFriendCalendar = async (friendId, year = null, month = null) => {
  let url = `/api/calendar/friends/${friendId}`;
  const params = [];
  if (year) params.push(`year=${year}`);
  if (month) params.push(`month=${month}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const response = await api.get(url);
  return response.data;
};

export const createScheduledWorkout = async (data) => {
  const response = await api.post('/api/calendar/schedule', data);
  return response.data;
};

export const updateScheduledWorkout = async (scheduleId, data) => {
  const response = await api.put(`/api/calendar/schedule/${scheduleId}`, data);
  return response.data;
};

export const deleteScheduledWorkout = async (scheduleId) => {
  const response = await api.delete(`/api/calendar/schedule/${scheduleId}`);
  return response.data;
};
