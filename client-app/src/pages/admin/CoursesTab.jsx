import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, IconButton, MenuItem, Select, InputLabel, FormControl,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Typography, Chip, OutlinedInput,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../../api/courses';
import { getUsers } from '../../api/users';
import { getCategories } from '../../api/categories';

const emptyForm = { title: '', description: '', durationHours: '', instructorId: '', categoryIds: [] };

export default function CoursesTab() {
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [categories, setCategories] = useState([]);
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
      const [coursesData, usersData, catsData] = await Promise.all([getCourses(), getUsers(), getCategories()]);
      setCourses(coursesData);
      setUsers(usersData);
      setCategories(catsData);
    } catch {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const instructorName = (c) => {
    const u = users.find((u) => u.id === c.instructorId);
    return u ? u.name : c.instructor?.name || '—';
  };

  const categoryNames = (c) => {
    if (!c.categoryIds?.length) return '—';
    return c.categoryIds
      .map((id) => categories.find((cat) => cat.id === id)?.categoryName || id)
      .join(', ');
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const instructors = users.filter(
    (u) => Boolean(u?.isInstructor ?? u?.IsInstructor) || Boolean(u?.isAdmin ?? u?.IsAdmin)
  );

  const openEdit = (c) => {
    setEditingId(c.id);
    const instructorId = c.instructorId ?? '';
    const validInstructor = instructorId && instructors.some((u) => u.id === instructorId);
    setForm({
      title: c.title || '',
      description: c.description || '',
      durationHours: c.durationHours ?? '',
      instructorId: validInstructor ? instructorId : '',
      categoryIds: c.categoryIds || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const instructorId = Number(form.instructorId);
    if (!instructorId || !instructors.some((u) => u.id === instructorId)) {
      setError('Выберите инструктора или админа');
      return;
    }
    try {
      setError('');
      const payload = {
        title: form.title,
        description: form.description,
        durationHours: Number(form.durationHours),
        instructorId,
        categoryIds: form.categoryIds,
      };
      if (editingId) {
        await updateCourse(editingId, { ...payload, id: editingId });
      } else {
        await createCourse(payload);
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
      await deleteCourse(confirmDeleteId);
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
              <TableCell>Часы</TableCell>
              <TableCell>Категория</TableCell>
              <TableCell>Инструктор</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {courses.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.id}</TableCell>
                <TableCell>{c.title}</TableCell>
                <TableCell>{c.durationHours}</TableCell>
                <TableCell>{categoryNames(c)}</TableCell>
                <TableCell>{instructorName(c)}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(c)} title="Редактировать">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setConfirmDeleteId(c.id)} title="Удалить">
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
        <DialogTitle>{editingId ? 'Редактировать курс' : 'Новый курс'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="Название" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required fullWidth />
          <TextField label="Описание" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={3} />
          <TextField label="Длительность (часов)" type="number" value={form.durationHours} onChange={(e) => setForm({ ...form, durationHours: e.target.value })} required fullWidth />
          <FormControl fullWidth required>
            <InputLabel>Инструктор</InputLabel>
            <Select
              value={form.instructorId || ''}
              label="Инструктор"
              onChange={(e) => setForm({ ...form, instructorId: e.target.value })}
            >
              <MenuItem value="">
                <em>Выберите инструктора</em>
              </MenuItem>
              {instructors.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.name} {u.isAdmin || u.IsAdmin ? '(админ)' : '(инструктор)'}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Категории</InputLabel>
            <Select
              multiple
              value={form.categoryIds}
              onChange={(e) => setForm({ ...form, categoryIds: e.target.value })}
              input={<OutlinedInput label="Категории" />}
              renderValue={(selected) => (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {selected.map((id) => (
                    <Chip key={id} label={categories.find((c) => c.id === id)?.categoryName || id} size="small" />
                  ))}
                </Box>
              )}
            >
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={cat.id}>{cat.categoryName}</MenuItem>
              ))}
            </Select>
          </FormControl>
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
          <Typography>Вы уверены, что хотите удалить этот курс?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
