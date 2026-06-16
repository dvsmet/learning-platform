import { apiFetch } from './client';

export const getOrders = () => apiFetch('/Orders');
export const getOrdersByUser = (userId) => apiFetch(`/Orders/user/${userId}`);
export const createOrder = (data) => apiFetch('/Orders', { method: 'POST', body: data });
export const deleteOrder = (id) => apiFetch(`/Orders/${id}`, { method: 'DELETE' });
export const approveOrder = (id) => apiFetch(`/Orders/${id}/approve`, { method: 'POST' });
export const rejectOrder = (id) => apiFetch(`/Orders/${id}/reject`, { method: 'POST' });
