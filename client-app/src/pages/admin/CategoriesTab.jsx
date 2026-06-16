import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../api/categories';

export default function CategoriesTab() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [categoryName, setCategoryName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getCategories();
      setCategories(data.sort((a, b) => a.id - b.id));
    } catch {
      setError('Не удалось загрузить категории');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setCategoryName('');
    setDialogOpen(true);
  };

  const openEdit = (c) => {
    setEditingId(c.id);
    setCategoryName(c.categoryName);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setError('');
      if (editingId) {
        await updateCategory(editingId, { id: editingId, categoryName });
      } else {
        await createCategory({ categoryName });
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
      await deleteCategory(confirmDeleteId);
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
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.id}</TableCell>
                <TableCell>{c.categoryName}</TableCell>
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
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingId ? 'Редактировать категорию' : 'Новая категория'}</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <TextField
            label="Название категории"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
            fullWidth
            autoFocus
          />
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
          <Typography>Вы уверены, что хотите удалить эту категорию?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
