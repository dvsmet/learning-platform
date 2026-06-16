import { apiFetch } from './client';

export const getCourses = () => apiFetch('/Courses');
export const getCourse = (id) => apiFetch(`/Courses/${id}`);
export const createCourse = (data) => apiFetch('/Courses', { method: 'POST', body: data });
export const updateCourse = (id, data) => apiFetch(`/Courses/${id}`, { method: 'PUT', body: data });
export const deleteCourse = (id) => apiFetch(`/Courses/${id}`, { method: 'DELETE' });
