import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, IconButton, MenuItem, Select, InputLabel, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getQuizzes, getQuiz, createQuiz, updateQuiz, deleteQuiz } from '../../api/quizzes';
import { getLessons } from '../../api/lessons';
import QuizEditor from '../../components/QuizEditor';

const defaultQuestions = () => [
  {
    questionText: '',
    options: [
      { optionText: '', isCorrect: true },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
      { optionText: '', isCorrect: false },
    ],
  },
];

export default function QuizzesTab() {
  const [quizzes, setQuizzes] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [maxScore, setMaxScore] = useState(10);
  const [questions, setQuestions] = useState(defaultQuestions());
  const [dialogError, setDialogError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [quizzesData, lessonsData] = await Promise.all([getQuizzes(), getLessons()]);
      setQuizzes(quizzesData);
      setLessons(lessonsData);
    } catch {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const lessonTitle = (q) => {
    const l = lessons.find((l) => l.id === q.lessonId);
    return l ? l.title : q.lesson?.title || 'Урок ' + q.lessonId;
  };

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setLessonId('');
    setMaxScore(10);
    setQuestions(defaultQuestions());
    setDialogError('');
    setDialogOpen(true);
  };

  const openEdit = async (q) => {
    try {
      setError('');
      const full = await getQuiz(q.id);
      setEditingId(full.id);
      setTitle(full.title || '');
      setLessonId(full.lessonId ?? '');
      setMaxScore(full.maxScore ?? 10);
      setQuestions(
        full.questions?.length
          ? full.questions.map((qn) => ({
              questionText: qn.questionText,
              options: (qn.options || []).map((o) => ({
                optionText: o.optionText,
                isCorrect: !!o.isCorrect,
              })),
            }))
          : defaultQuestions(),
      );
      setDialogOpen(true);
    } catch (e) {
      setError('Не удалось загрузить тест: ' + (e.message || e));
    }
  };

  const handleSave = async () => {
    setDialogError('');
    if (!title.trim()) {
      setDialogError('Введите название теста');
      return;
    }
    if (!lessonId) {
      setDialogError('Выберите урок');
      return;
    }
    if (questions.some((q) => !q.questionText.trim() || q.options.some((o) => !o.optionText.trim()))) {
      setDialogError('Заполните все поля вопросов и вариантов');
      return;
    }
    if (questions.some((q) => !q.options.some((o) => o.isCorrect))) {
      setDialogError('В каждом вопросе должен быть отмечен правильный ответ');
      return;
    }

    try {
      const payload = {
        title,
        lessonId: Number(lessonId),
        maxScore: Number(maxScore),
        questions,
      };
      if (editingId) {
        await updateQuiz(editingId, payload);
      } else {
        await createQuiz(payload);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setDialogError(e.message || 'Не удалось сохранить тест');
    }
  };

  const handleDelete = async () => {
    try {
      setError('');
      await deleteQuiz(confirmDeleteId);
      setConfirmDeleteId(null);
      await load();
    } catch (e) {
      setError('Ошибка удаления: ' + (e.message || e));
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Button variant="contained" sx={{ mb: 2 }} onClick={openCreate}>Добавить</Button>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Урок</TableCell>
              <TableCell>Макс. баллов</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {quizzes.map((q) => (
              <TableRow key={q.id}>
                <TableCell>{q.id}</TableCell>
                <TableCell>{q.title}</TableCell>
                <TableCell>{lessonTitle(q)}</TableCell>
                <TableCell>{q.maxScore}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(q)} title="Редактировать">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setConfirmDeleteId(q.id)} title="Удалить">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editingId ? 'Редактировать тест' : 'Новый тест'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField label="Название" value={title} onChange={(e) => setTitle(e.target.value)} required fullWidth />
          <FormControl fullWidth required>
            <InputLabel>Урок</InputLabel>
            <Select value={lessonId} label="Урок" onChange={(e) => setLessonId(e.target.value)}>
              {lessons.map((l) => (
                <MenuItem key={l.id} value={l.id}>{l.title} (ID:{l.id})</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Макс. баллов" type="number" value={maxScore} onChange={(e) => setMaxScore(e.target.value)} required fullWidth />

          <Typography variant="subtitle1" sx={{ mt: 1 }}>Вопросы</Typography>
          <QuizEditor questions={questions} setQuestions={setQuestions} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave}>Сохранить</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={confirmDeleteId !== null} onClose={() => setConfirmDeleteId(null)}>
        <DialogTitle>Подтверждение</DialogTitle>
        <DialogContent>
          <Typography>Вы уверены, что хотите удалить этот тест?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
