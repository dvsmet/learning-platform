import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Checkbox, FormControlLabel, Alert, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Typography, InputAdornment,
  FormControl, Select, MenuItem,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import { getUsers, createUser, updateUser, deleteUser, resetPassword } from '../../api/users';

const emptyForm = { name: '', email: '', password: '', isInstructor: false, isAdmin: false };

export default function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [tempDialogOpen, setTempDialogOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [filterId, setFilterId] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterEmail, setFilterEmail] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterRegistration, setFilterRegistration] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      setError('Не удалось загрузить пользователей');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setConfirmPassword('');
    setDialogError('');
    setDialogOpen(true);
  };

  const openEdit = (u) => {
    setEditingId(u.id);
    setForm({
      name: u.name,
      email: u.email,
      password: '',
      isInstructor: !!u.isInstructor,
      isAdmin: !!u.isAdmin,
    });
    setConfirmPassword('');
    setDialogError('');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      setError('');
      setDialogError('');
      if (editingId) {
        const payload = { ...form, id: editingId };
        if (!payload.password) delete payload.password;
        await updateUser(editingId, payload);
      } else {
        if (form.password !== confirmPassword) {
          setDialogError('Пароли не совпадают');
          return;
        }
        await createUser(form);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setDialogError('Ошибка сохранения: ' + (e.message || e));
    }
  };

  const handleDelete = async () => {
    try {
      setError('');
      await deleteUser(confirmDeleteId);
      setConfirmDeleteId(null);
      await load();
    } catch (e) {
      setError('Ошибка удаления: ' + (e.message || e));
    }
  };

  const handleReset = async (id) => {
    try {
      setError('');
      const data = await resetPassword(id);
      setTempPassword(data.tempPassword || data.TempPassword || '');
      setTempDialogOpen(true);
    } catch (e) {
      setError('Не удалось сбросить пароль: ' + (e.message || e));
    }
  };

  const roleName = (u) =>
    u.isAdmin ? 'Админ' : u.isInstructor ? 'Инструктор' : 'Пользователь';

  const normalized = (s) => (s || '').trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const idStr = filterId.trim();
      if (idStr && !String(u.id).includes(idStr)) return false;
      if (normalized(filterName) && !normalized(u.name).includes(normalized(filterName))) return false;
      if (normalized(filterEmail) && !normalized(u.email).includes(normalized(filterEmail))) return false;
      if (filterRole === 'admin' && !u.isAdmin) return false;
      if (filterRole === 'instructor' && (u.isAdmin || !u.isInstructor)) return false;
      if (filterRole === 'user' && (u.isAdmin || u.isInstructor)) return false;
      const regQ = normalized(filterRegistration);
      if (regQ) {
        const dRu = new Date(u.registrationDate).toLocaleDateString('ru-RU').toLowerCase();
        const raw = String(u.registrationDate || '').toLowerCase();
        if (!dRu.includes(regQ) && !raw.includes(regQ)) return false;
      }
      return true;
    });
  }, [users, filterId, filterName, filterEmail, filterRole, filterRegistration]);

  const clearFilters = () => {
    setFilterId('');
    setFilterName('');
    setFilterEmail('');
    setFilterRole('');
    setFilterRegistration('');
  };

  const hasActiveFilters =
    filterId.trim() ||
    normalized(filterName) ||
    normalized(filterEmail) ||
    filterRole ||
    normalized(filterRegistration);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={openCreate}>Добавить</Button>
        {hasActiveFilters && (
          <Button variant="text" size="small" onClick={clearFilters}>
            Сбросить фильтры
          </Button>
        )}
        <Typography variant="body2" color="text.secondary">
          Показано: {filteredUsers.length} из {users.length}
        </Typography>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Имя</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Роль</TableCell>
              <TableCell>Дата регистрации</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
            <TableRow sx={{ '& .MuiTableCell-root': { pt: 0.5, pb: 1, borderBottomWidth: 1 } }}>
              <TableCell sx={{ verticalAlign: 'bottom', minWidth: 72 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Фильтр ID"
                  value={filterId}
                  onChange={(e) => setFilterId(e.target.value)}
                  aria-label="Фильтр по ID"
                />
              </TableCell>
              <TableCell sx={{ verticalAlign: 'bottom', minWidth: 110 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Фильтр по имени"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  aria-label="Фильтр по имени"
                />
              </TableCell>
              <TableCell sx={{ verticalAlign: 'bottom', minWidth: 140 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Фильтр по email"
                  value={filterEmail}
                  onChange={(e) => setFilterEmail(e.target.value)}
                  aria-label="Фильтр по email"
                />
              </TableCell>
              <TableCell sx={{ verticalAlign: 'bottom', minWidth: 130 }}>
                <FormControl size="small" fullWidth>
                  <Select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    displayEmpty
                    aria-label="Фильтр по роли"
                    renderValue={(v) => {
                      if (!v) return 'Все роли';
                      if (v === 'admin') return 'Админ';
                      if (v === 'instructor') return 'Инструктор';
                      return 'Пользователь';
                    }}
                  >
                    <MenuItem value="">Все роли</MenuItem>
                    <MenuItem value="admin">Админ</MenuItem>
                    <MenuItem value="instructor">Инструктор</MenuItem>
                    <MenuItem value="user">Пользователь</MenuItem>
                  </Select>
                </FormControl>
              </TableCell>
              <TableCell sx={{ verticalAlign: 'bottom', minWidth: 120 }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Фильтр даты"
                  value={filterRegistration}
                  onChange={(e) => setFilterRegistration(e.target.value)}
                  aria-label="Фильтр по дате регистрации"
                />
              </TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography color="text.secondary" sx={{ py: 2 }}>
                    {users.length === 0 ? 'Нет пользователей' : 'Нет записей по выбранным фильтрам'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((u) => (
              <TableRow key={u.id}>
                <TableCell>{u.id}</TableCell>
                <TableCell>{u.name}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>{roleName(u)}</TableCell>
                <TableCell>{new Date(u.registrationDate).toLocaleDateString('ru-RU')}</TableCell>
                <TableCell>
                  <IconButton size="small" onClick={() => openEdit(u)} title="Редактировать">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleReset(u.id)} title="Сброс пароля">
                    <LockResetIcon fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setConfirmDeleteId(u.id)} title="Удалить">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onClose={() => { setDialogOpen(false); setDialogError(''); }} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Редактировать пользователя' : 'Новый пользователь'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {dialogError && <Alert severity="error" onClose={() => setDialogError('')}>{dialogError}</Alert>}
          <TextField label="Имя" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
          <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required fullWidth />
          <TextField
            label="Пароль"
            type={showPassword ? 'text' : 'password'}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required={!editingId}
            fullWidth
            helperText={editingId ? 'Оставьте пустым, чтобы не менять' : ''}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" size="small" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          {!editingId && (
            <TextField
              label="Подтвердить пароль"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              fullWidth
              onPaste={(e) => e.preventDefault()}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((p) => !p)} edge="end" size="small" aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}>
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          )}
          <FormControlLabel
            control={<Checkbox checked={form.isInstructor} onChange={(e) => setForm({ ...form, isInstructor: e.target.checked })} />}
            label="Инструктор"
          />
          <FormControlLabel
            control={<Checkbox checked={form.isAdmin} onChange={(e) => setForm({ ...form, isAdmin: e.target.checked })} />}
            label="Администратор"
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
          <Typography>Вы уверены, что хотите удалить этого пользователя?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteId(null)}>Отмена</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Удалить</Button>
        </DialogActions>
      </Dialog>

      {/* Temp password dialog */}
      <Dialog open={tempDialogOpen} onClose={() => setTempDialogOpen(false)}>
        <DialogTitle>Пароль сброшен</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 1 }}>Временный пароль:</Typography>
          <TextField value={tempPassword} fullWidth InputProps={{ readOnly: true }} onFocus={(e) => e.target.select()} />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Скопируйте пароль и передайте пользователю
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTempDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
