import http from './http.js';

export const authApi = {
  me: () => http.get('/auth/me'),
  login: (payload) => http.post('/auth/login', payload),
  register: (payload) => http.post('/auth/register', payload),
  updateProfile: (payload) => http.put('/auth/profile', payload),
  uploadAvatar: (formData) => http.post('/auth/avatar', formData, { headers: { 'Content-Type': undefined } }),
  deleteAvatar: () => http.delete('/auth/avatar'),
  logout: () => http.post('/auth/logout'),
};

export const bugApi = {
  list: (params = {}) => http.get('/bugs', { params }),
  stats: () => http.get('/bugs/stats'),
  get: (id) => http.get(`/bugs/${id}`),
  create: (payload) => http.post('/bugs', payload),
  update: (id, payload) => http.put(`/bugs/${id}`, payload),
  remove: (id) => http.delete(`/bugs/${id}`),
  comment: (id, text) => http.post(`/bugs/${id}/comments`, { text }),
  export: (format) => http.post('/bugs/export', { format }, { responseType: 'blob' }),
};

export const workspaceApi = {
  activity: (params = {}) => http.get('/activity', { params }),
  team: () => http.get('/team/connections'),
  directory: (search) => http.get('/team/directory', { params: { search } }),
  requests: () => http.get('/team/requests'),
  sendRequest: (payload) => http.post('/team/requests', payload),
  respond: (id, action) => http.patch(`/team/requests/${id}/${action}`),
  cancelRequest: (id) => http.delete(`/team/requests/${id}`),
  removeConnection: (userId) => http.delete(`/team/connections/${userId}`),
};

export const adminApi = {
  overview: () => http.get('/admin/overview'),
  users: (params = {}) => http.get('/admin/users', { params }),
  changeRole: (id, role) => http.patch(`/admin/users/${id}/role`, { role }),
  suspend: (id, reason) => http.patch(`/admin/users/${id}/suspend`, { reason }),
  activate: (id) => http.patch(`/admin/users/${id}/activate`),
  removeUser: (id) => http.delete(`/admin/users/${id}`),
  audit: (params = {}) => http.get('/admin/audit', { params }),
};
