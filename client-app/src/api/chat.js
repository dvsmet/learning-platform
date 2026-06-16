import { apiFetch } from './client';

export const getChatThreads = () => apiFetch('/Chat/threads');
export const getChatMessages = (userId, courseId) =>
  apiFetch(`/Chat/messages?userId=${userId}&courseId=${courseId}`);
export const sendChatMessage = (data) =>
  apiFetch('/Chat/messages', { method: 'POST', body: data });
export const updateChatMessage = (id, text) =>
  apiFetch(`/Chat/messages/${id}`, { method: 'PUT', body: { text } });
export const deleteChatMessage = (id, forSelf = false) =>
  apiFetch(`/Chat/messages/${id}?forSelf=${forSelf}`, { method: 'DELETE' });
export const markChatRead = (userId, courseId) =>
  apiFetch(`/Chat/mark-read?userId=${userId}&courseId=${courseId}`, { method: 'POST' });
