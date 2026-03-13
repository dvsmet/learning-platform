import { apiFetch } from './client';

export const getQuizzes = () => apiFetch('/Quizzes');
export const getQuiz = (id) => apiFetch(`/Quizzes/${id}`);
export const createQuiz = (data) => apiFetch('/Quizzes', { method: 'POST', body: data });
export const updateQuiz = (id, data) => apiFetch(`/Quizzes/${id}`, { method: 'PUT', body: data });
export const deleteQuiz = (id) => apiFetch(`/Quizzes/${id}`, { method: 'DELETE' });
export const submitQuiz = (data) => apiFetch('/QuizResults', { method: 'POST', body: data });
export const getQuizResults = () => apiFetch('/QuizResults');
