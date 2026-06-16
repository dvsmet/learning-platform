import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Alert, Box
} from '@mui/material';
import { changePassword } from '../../api/users';
import { useAuth } from '../../context/AuthContext';
import ProfileCard from '../../components/ProfileCard';

export default function ProfileTab() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!newPassword.trim()) {
      setError('Введите новый пароль');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await changePassword(user.id, newPassword);
      setSuccess('Пароль успешно изменён');
      setNewPassword('');
      setOpen(false);
    } catch {
      setError('Не удалось сменить пароль');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Профиль</Typography>

      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
      {error && !open && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <ProfileCard
        onLogout={() => { logout(); navigate('/login'); }}
        onChangePassword={() => { setOpen(true); setError(''); }}
      >
        <Typography variant="subtitle2" color="text.secondary">Имя</Typography>
        <Typography gutterBottom>{user?.name}</Typography>

        <Typography variant="subtitle2" color="text.secondary">Email</Typography>
        <Typography gutterBottom>{user?.email}</Typography>

        <Typography variant="subtitle2" color="text.secondary">Дата регистрации</Typography>
        <Typography>{formatDate(user?.registrationDate)}</Typography>
      </ProfileCard>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Смена пароля</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            label="Новый пароль"
            type="password"
            fullWidth
            margin="normal"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Отмена</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Сохранение…' : 'Сохранить'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
