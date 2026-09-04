import api from './api';

export const searchUsers = async (query) => {
  const response = await api.get('/api/users/search', {
    params: { q: query }
  });
  return response.data;
};

export const getFriends = async () => {
  const response = await api.get('/api/community/friends');
  return response.data;
};

export const getRequests = async () => {
  const response = await api.get('/api/community/requests');
  return response.data;
};

export const sendFriendRequest = async (targetId) => {
  const response = await api.post(`/api/community/request/${targetId}`);
  return response.data;
};

export const acceptFriendRequest = async (requestId) => {
  const response = await api.post(`/api/community/accept/${requestId}`);
  return response.data;
};

export const rejectFriendRequest = async (requestId) => {
  const response = await api.post(`/api/community/reject/${requestId}`);
  return response.data;
};

export const cancelFriendRequest = async (requestId) => {
  const response = await api.post(`/api/community/cancel/${requestId}`);
  return response.data;
};

export const removeFriend = async (friendId) => {
  const response = await api.delete(`/api/community/friend/${friendId}`);
  return response.data;
};

