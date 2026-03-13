import { apiFetch } from './client';

export const getUsers = () => apiFetch('/Users');
export const getUser = (id) => apiFetch(`/Users/${id}`);
export const createUser = (data) => apiFetch('/Users', { method: 'POST', body: data });
export const updateUser = (id, data) => apiFetch(`/Users/${id}`, { method: 'PUT', body: data });
export const deleteUser = (id) => apiFetch(`/Users/${id}`, { method: 'DELETE' });
export const login = (email, password) =>
  apiFetch('/Users/login', { method: 'POST', body: { email, password } });
export const resetPassword = (id) =>
  apiFetch(`/Users/${id}/reset-password-admin`, { method: 'POST' });
export const changePassword = (id, newPassword) =>
  apiFetch(`/Users/${id}/change-password`, { method: 'POST', body: { newPassword } });
