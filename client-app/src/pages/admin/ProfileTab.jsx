import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import { changePassword } from '../../api/users';
import ProfileCard from '../../components/ProfileCard';

export default function ProfileTab() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChangePassword = async () => {
    setError('');
    if (!newPassword) {
      setError('Введите новый пароль');
      return;
    }
    if (newPassword !== confirm) {
      setError('Пароли не совпадают');
      return;
    }
    try {
      await changePassword(user.id, newPassword);
      setSuccess('Пароль успешно изменён');
      setOpen(false);
      setNewPassword('');
      setConfirm('');
    } catch {
      setError('Не удалось сменить пароль');
    }
  };

  const closeDialog = () => {
    setOpen(false);
    setNewPassword('');
    setConfirm('');
    setError('');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Профиль</Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <ProfileCard
        onLogout={() => { logout(); navigate('/login'); }}
        onChangePassword={() => setOpen(true)}
      >
        <Typography variant="subtitle2" color="text.secondary">Имя</Typography>
        <Typography gutterBottom>{user?.name}</Typography>

        <Typography variant="subtitle2" color="text.secondary">Email</Typography>
        <Typography gutterBottom>{user?.email}</Typography>

        <Typography variant="subtitle2" color="text.secondary">Роль</Typography>
        <Typography gutterBottom>Администратор</Typography>
      </ProfileCard>

      <Dialog open={open} onClose={closeDialog} fullWidth maxWidth="xs">
        <DialogTitle>Сменить пароль</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '8px !important' }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Новый пароль"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="Подтвердите пароль"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>Отмена</Button>
          <Button variant="contained" onClick={handleChangePassword}>Сохранить</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
