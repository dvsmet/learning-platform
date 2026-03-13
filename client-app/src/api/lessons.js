import { apiFetch } from './client';

export const getLessons = () => apiFetch('/Lessons');
export const getLesson = (id) => apiFetch(`/Lessons/${id}`);
export const createLesson = (data) => apiFetch('/Lessons', { method: 'POST', body: data });
export const updateLesson = (id, data) => apiFetch(`/Lessons/${id}`, { method: 'PUT', body: data });
export const deleteLesson = (id) => apiFetch(`/Lessons/${id}`, { method: 'DELETE' });
