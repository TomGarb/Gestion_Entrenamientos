import api from './api';

export const getGroups = async () => {
  const response = await api.get('/api/groups');
  return response.data;
};

export const getGroup = async (groupId) => {
  const response = await api.get(`/api/groups/${groupId}`);
  return response.data;
};

export const createGroup = async (groupData) => {
  const response = await api.post('/api/groups', groupData);
  return response.data;
};

export const updateGroup = async (groupId, groupData) => {
  const response = await api.put(`/api/groups/${groupId}`, groupData);
  return response.data;
};

export const deleteGroup = async (groupId) => {
  const response = await api.delete(`/api/groups/${groupId}`);
  return response.data;
};

export const addGroupMember = async (groupId, userId) => {
  const response = await api.post(`/api/groups/${groupId}/members`, { user_id: userId });
  return response.data;
};

export const removeGroupMember = async (groupId, userId) => {
  const response = await api.delete(`/api/groups/${groupId}/members/${userId}`);
  return response.data;
};

export const updateMemberRole = async (groupId, userId, role) => {
  const response = await api.put(`/api/groups/${groupId}/members/${userId}/role`, { role });
  return response.data;
};

export const getGroupFeed = async (groupId, limit = 50, offset = 0, latestPerMember = false) => {
  const response = await api.get(`/api/groups/${groupId}/feed?limit=${limit}&offset=${offset}&latest_per_member=${latestPerMember}`);
  return response.data;
};
