import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Rating, Typography, Alert, Stack, Box,
} from '@mui/material';
import { createReview } from '../api/reviews';
import { useAuth } from '../context/AuthContext';

export default function ReviewModal({ courseId, courseTitle, open, onClose, onDone }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await createReview({
        userId: user.id,
        courseId,
        rating,
        reviewText: text,
        reviewDate: new Date().toISOString(),
      });
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Отзыв — {courseTitle}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Box>
            <Typography variant="body2" gutterBottom>Рейтинг</Typography>
            <Rating value={rating} onChange={(_, v) => v && setRating(v)} />
          </Box>
          <TextField
            label="Текст отзыва"
            multiline
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>Отправить</Button>
      </DialogActions>
    </Dialog>
  );
}
