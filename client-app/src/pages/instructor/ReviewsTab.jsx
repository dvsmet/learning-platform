import { useState, useEffect } from 'react';
import {
  Box, Typography, Alert, CircularProgress, Rating,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
} from '@mui/material';
import { getReviews } from '../../api/reviews';
import { getCourses } from '../../api/courses';

export default function ReviewsTab() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [allReviews, courses] = await Promise.all([getReviews(), getCourses()]);
        const courseIds = new Set(courses.map((c) => c.id));
        setReviews(allReviews.filter((r) => courseIds.has(r.courseId)));
      } catch {
        setError('Не удалось загрузить отзывы');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Отзывы</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Пользователь</TableCell>
              <TableCell>Курс</TableCell>
              <TableCell>Текст</TableCell>
              <TableCell>Рейтинг</TableCell>
              <TableCell>Дата</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reviews.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.id}</TableCell>
                <TableCell>{r.user?.name || '—'}</TableCell>
                <TableCell>{r.course?.title || '—'}</TableCell>
                <TableCell>{r.reviewText}</TableCell>
                <TableCell>
                  <Rating value={r.rating} readOnly size="small" />
                </TableCell>
                <TableCell>{new Date(r.reviewDate).toLocaleDateString('ru-RU')}</TableCell>
              </TableRow>
            ))}
            {reviews.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">Отзывов нет</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
