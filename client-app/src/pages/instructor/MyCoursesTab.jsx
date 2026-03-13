import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, IconButton, MenuItem, Select, InputLabel, FormControl,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
  CircularProgress, Typography, Chip, OutlinedInput,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../../api/courses';
import { getCategories } from '../../api/categories';
import { useAuth } from '../../context/AuthContext';

const emptyForm = { title: '', description: '', durationHours: '', categoryIds: [] };

export default function MyCoursesTab() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
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
      const [coursesData, catsData] = await Promise.all([getCourses(), getCategories()]);
      setCourses(coursesData);
      setCategories(catsData);
    } catch {
      setError('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      title: c.title || '',
      description: c.description || '',
      durationHours: c.durationHours ?? '',
      categoryIds: c.categoryIds || [],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setError('');
      const payload = {
        title: form.title,
        description: form.description,
        durationHours: Number(form.durationHours),
        instructorId: user.id,
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5">Мои курсы</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Добавить</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Название</TableCell>
              <TableCell>Часы</TableCell>
              <TableCell>Категория</TableCell>
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
            {courses.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">Курсы не найдены</TableCell>
              </TableRow>
            )}
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
                    <Chip key={id} label={categories.find((cat) => cat.id === id)?.categoryName || id} size="small" />
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
