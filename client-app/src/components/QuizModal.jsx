import { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  RadioGroup, FormControlLabel, Radio, Typography, Box, Alert,
} from '@mui/material';
import { submitQuiz } from '../api/quizzes';

export default function QuizModal({ quiz, open, onClose, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!quiz) return null;
  const questions = quiz.questions || [];

  const handleChange = (questionId, optionId) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (Object.keys(answers).length !== questions.length) {
      setError('Ответьте на все вопросы');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        quizId: quiz.id,
        answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
          questionId: Number(questionId),
          selectedOptionId: Number(selectedOptionId),
        })),
      };
      const result = await submitQuiz(payload);
      onComplete(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{quiz.title || 'Тест'}</DialogTitle>
      <DialogContent dividers>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {questions.map((q, idx) => (
          <Box key={q.id} sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              {idx + 1}. {q.questionText}
            </Typography>
            <RadioGroup
              value={answers[q.id] ?? ''}
              onChange={(e) => handleChange(q.id, Number(e.target.value))}
            >
              {(q.options || []).map((opt) => (
                <FormControlLabel
                  key={opt.id}
                  value={opt.id}
                  control={<Radio size="small" />}
                  label={opt.optionText}
                />
              ))}
            </RadioGroup>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Отмена</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Отправка...' : 'Отправить'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
