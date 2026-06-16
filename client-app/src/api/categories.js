import { apiFetch } from './client';

export const getCategories = () => apiFetch('/CourseCategories');
export const createCategory = (data) => apiFetch('/CourseCategories', { method: 'POST', body: data });
export const updateCategory = (id, data) => apiFetch(`/CourseCategories/${id}`, { method: 'PUT', body: data });
export const deleteCategory = (id) => apiFetch(`/CourseCategories/${id}`, { method: 'DELETE' });
