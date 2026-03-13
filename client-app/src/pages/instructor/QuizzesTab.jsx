import { useState, useEffect } from 'react';
import {
  Box, Typography, Alert, CircularProgress, Button, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getQuizzes, getQuiz, createQuiz, updateQuiz, deleteQuiz } from '../../api/quizzes';
import { getLessons } from '../../api/lessons';
import QuizEditor from '../../components/QuizEditor';

const defaultQuestions = [
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

const emptyForm = { title: '', lessonId: '', maxScore: 10 };

export default function QuizzesTab() {
  const [quizzes, setQuizzes] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [questions, setQuestions] = useState(defaultQuestions);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [qs, ls] = await Promise.all([getQuizzes(), getLessons()]);
      setQuizzes(qs);
      setLessons(ls);
    } catch {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const lessonMap = Object.fromEntries(lessons.map((l) => [l.id, l.title]));

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setQuestions(structuredClone(defaultQuestions));
    setDialogError('');
    setOpen(true);
  };

  const openEdit = async (quiz) => {
    try {
      setError('');
      const full = await getQuiz(quiz.id);
      setEditId(full.id);
      setForm({ title: full.title, lessonId: full.lessonId, maxScore: full.maxScore });
      setQuestions(
        full.questions?.length
          ? full.questions.map((q) => ({
              questionText: q.questionText,
              options: q.options.map((o) => ({ optionText: o.optionText, isCorrect: o.isCorrect })),
            }))
          : structuredClone(defaultQuestions),
      );
      setOpen(true);
    } catch {
      setError('Не удалось загрузить данные теста');
    }
  };

  const handleSave = async () => {
    setDialogError('');
    try {
      const payload = {
        title: form.title,
        lessonId: Number(form.lessonId),
        maxScore: Number(form.maxScore),
        questions,
      };
      if (!form.title || !form.lessonId) {
        setDialogError('Заполните название и выберите урок');
        return;
      }
      if (editId) {
        await updateQuiz(editId, { id: editId, ...payload });
      } else {
        await createQuiz(payload);
      }
      setOpen(false);
      await load();
    } catch (e) {
      setDialogError(e.message || 'Не удалось сохранить тест');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить тест?')) return;
    try {
      await deleteQuiz(id);
      await load();
    } catch {
      setError('Не удалось удалить тест');
    }
  };

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Тесты</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Добавить тест
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
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
                <TableCell>{lessonMap[q.lessonId] || q.lessonId}</TableCell>
                <TableCell>{q.maxScore}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(q)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(q.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {quizzes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">Тестов нет</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>{editId ? 'Редактировать тест' : 'Новый тест'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {dialogError && <Alert severity="error">{dialogError}</Alert>}
          <TextField label="Название" value={form.title} onChange={set('title')} required fullWidth />
          <TextField
            label="Урок"
            select
            value={form.lessonId}
            onChange={set('lessonId')}
            required
            fullWidth
          >
            {lessons.map((l) => (
              <MenuItem key={l.id} value={l.id}>{l.title}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Макс. баллов"
            type="number"
            value={form.maxScore}
            onChange={set('maxScore')}
            required
            fullWidth
          />
          <Typography variant="subtitle1" sx={{ mt: 1 }}>Вопросы</Typography>
          <QuizEditor questions={questions} setQuestions={setQuestions} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
