import { apiFetch } from './client';

export const getReviews = () => apiFetch('/Reviews');
export const createReview = (data) => apiFetch('/Reviews', { method: 'POST', body: data });
export const deleteReview = (id) => apiFetch(`/Reviews/${id}`, { method: 'DELETE' });
