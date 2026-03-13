import { apiFetch } from './client';

export const getProgress = () => apiFetch('/LearningProgress');
