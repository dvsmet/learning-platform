import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, IconButton, MenuItem, Select, InputLabel, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getLessons, createLesson, updateLesson, deleteLesson } from '../../api/lessons';
import { getCourses } from '../../api/courses';

const emptyForm = { title: '', courseId: '', lessonNumber: '', content: '', videoUrl: '', materialsNote: '' };

export default function LessonsTab() {
  const [lessons, setLessons] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [lessonsData, coursesData] = await Promise.all([getLessons(), getCourses()]);
      lessonsData.sort((a, b) => {
        if ((a.courseId || 0) !== (b.courseId || 0)) return (a.courseId || 0) - (b.courseId || 0);
        return (a.lessonNumber || 0) - (b.lessonNumber || 0);
      });
      setLessons(lessonsData);
      setCourses(coursesData);
    } catch {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const courseName = (l) => {
    const c = courses.find((c) => c.id === l.courseId);
    return c ? c.title : l.course?.title || 'Курс ' + l.courseId;
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (l) => {
    setEditingId(l.id);
    setForm({
      title: l.title || '',
      courseId: l.courseId ?? '',
      lessonNumber: l.lessonNumber ?? '',
      content: l.content || '',
      videoUrl: l.videoUrl || '',
      materialsNote: l.materialsNote || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setError('');
      const payload = {
        title: form.title,
        courseId: Number(form.courseId),
        lessonNumber: Number(form.lessonNumber),
        content: form.content,
        videoUrl: form.videoUrl || null,
        materialsNote: form.materialsNote || null,
      };
      if (editingId) {
        await updateLesson(editingId, { ...payload, id: editingId });
      } else {
        await createLesson(payload);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError('Ошибка сохранения: ' + (e.message || e));
    }
  };

  const handleDelete = async () => {
    try {
      setError('');
      await deleteLesson(confirmDeleteId);
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
                <TableCell>{courseName(l)}</TableCell>
                <TableCell>{l.lessonNumber}</TableCell>
                <TableCell>{l.videoUrl ? 'Да' : 'Нет'}</TableCell>
                <TableCell>{l.materialsNote ? 'Да' : 'Нет'}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(l)} title="Редактировать">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setConfirmDeleteId(l.id)} title="Удалить">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Редактировать урок' : 'Новый урок'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required fullWidth />
          <FormControl fullWidth required>
            <InputLabel>Курс</InputLabel>
            <Select value={form.courseId} label="Курс" onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              {courses.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.title}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Номер урока" type="number" value={form.lessonNumber} onChange={(e) => setForm({ ...form, lessonNumber: e.target.value })} required fullWidth />
          <TextField label="Содержание" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} fullWidth multiline rows={4} />
          <TextField label="URL видео (YouTube, Rutube, VK)" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} fullWidth placeholder="Можно оставить пустым" />
          <TextField label="Комментарий / материалы к уроку" value={form.materialsNote} onChange={(e) => setForm({ ...form, materialsNote: e.target.value })} fullWidth multiline rows={3} placeholder="Ссылки на Яндекс.Диск, доп. материалы, комментарий (можно оставить пустым)" />
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
          <Typography>Вы уверены, что хотите удалить этот урок?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
