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
import { getLessons, createLesson, updateLesson, deleteLesson } from '../../api/lessons';
import { getCourses } from '../../api/courses';

const emptyForm = { title: '', courseId: '', lessonNumber: '', content: '', videoUrl: '', materialsNote: '' };

export default function LessonsTab() {
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [ls, cs] = await Promise.all([getLessons(), getCourses()]);
      setLessons(ls);
      setCourses(cs);
    } catch {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const courseMap = Object.fromEntries(courses.map((c) => [c.id, c.title]));

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (lesson) => {
    setEditId(lesson.id);
    setForm({
      title: lesson.title,
      courseId: lesson.courseId,
      lessonNumber: lesson.lessonNumber,
      content: lesson.content || '',
      videoUrl: lesson.videoUrl || '',
      materialsNote: lesson.materialsNote || '',
    });
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        title: form.title,
        courseId: Number(form.courseId),
        lessonNumber: Number(form.lessonNumber),
        content: form.content,
        videoUrl: form.videoUrl || null,
        materialsNote: form.materialsNote || null,
      };
      if (editId) {
        await updateLesson(editId, { id: editId, ...payload });
      } else {
        await createLesson(payload);
      }
      setOpen(false);
      await load();
    } catch {
      setError('Не удалось сохранить урок');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Удалить урок?')) return;
    try {
      await deleteLesson(id);
      await load();
    } catch {
      setError('Не удалось удалить урок');
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
        <Typography variant="h5">Уроки</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openAdd}>
          Добавить урок
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Курс</TableCell>
              <TableCell>Номер</TableCell>
              <TableCell>Видео</TableCell>
              <TableCell>Материалы</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {lessons.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.id}</TableCell>
                <TableCell>{l.title}</TableCell>
                <TableCell>{courseMap[l.courseId] || l.courseId}</TableCell>
                <TableCell>{l.lessonNumber}</TableCell>
                <TableCell>{l.videoUrl ? 'Есть' : '—'}</TableCell>
                <TableCell>{l.materialsNote ? 'Есть' : '—'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(l)}><EditIcon /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(l.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {lessons.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">Уроков нет</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editId ? 'Редактировать урок' : 'Новый урок'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          <TextField label="Название" value={form.title} onChange={set('title')} required fullWidth />
          <TextField
            label="Курс"
            select
            value={form.courseId}
            onChange={set('courseId')}
            required
            fullWidth
          >
            {courses.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Номер урока"
            type="number"
            value={form.lessonNumber}
            onChange={set('lessonNumber')}
            required
            fullWidth
          />
          <TextField
            label="Содержание"
            value={form.content}
            onChange={set('content')}
            multiline
            rows={4}
            fullWidth
          />
          <TextField label="URL видео (YouTube, Rutube, VK)" value={form.videoUrl} onChange={set('videoUrl')} fullWidth placeholder="Можно оставить пустым" />
          <TextField label="Комментарий / материалы к уроку" value={form.materialsNote} onChange={set('materialsNote')} multiline rows={3} fullWidth placeholder="Ссылки на Яндекс.Диск, доп. материалы, комментарий (можно оставить пустым)" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleSave}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
