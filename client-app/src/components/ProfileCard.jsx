import { Box, Card, CardContent, Typography, Button } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

/**
 * Единая карточка профиля для всех ролей.
 * Кнопки «Сменить пароль» и «Выйти» всегда внутри карточки.
 */
export default function ProfileCard({ children, onLogout, onChangePassword }) {
  return (
    <Card sx={{ maxWidth: 480, mb: 3 }}>
      <CardContent>
        {children}
        <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" onClick={onChangePassword}>
            Сменить пароль
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            startIcon={<LogoutIcon />}
            onClick={onLogout}
          >
            Выйти
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
