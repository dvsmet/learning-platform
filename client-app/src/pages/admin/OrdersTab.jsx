import { useState, useEffect, useCallback } from 'react';
import {
  Box, Button, Alert, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography,
} from '@mui/material';
import { getOrders, approveOrder, rejectOrder, deleteOrder } from '../../api/orders';

const statusConfig = {
  pending:  { label: 'Ожидает',   color: 'warning' },
  approved: { label: 'Одобрена',  color: 'success' },
  rejected: { label: 'Отклонена', color: 'error' },
};

export default function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getOrders();
      setOrders(data);
    } catch {
      setError('Не удалось загрузить заявки');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async () => {
    if (!confirmAction) return;
    try {
      setError('');
      const { type, id } = confirmAction;
      if (type === 'approve') await approveOrder(id);
      else if (type === 'reject') await rejectOrder(id);
      else if (type === 'delete') await deleteOrder(id);
      setConfirmAction(null);
      await load();
    } catch (e) {
      setError('Ошибка: ' + (e.message || e));
    }
  };

  const confirmLabel = () => {
    if (!confirmAction) return '';
    if (confirmAction.type === 'approve') return 'Одобрить заявку?';
    if (confirmAction.type === 'reject') return 'Отклонить заявку?';
    return 'Удалить заявку?';
  };

  const coursesList = (o) =>
    (o.orderItems || []).map((oi) => oi.course?.title || 'Курс ' + oi.courseId).join(', ') || '—';

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

  return (
    <Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Пользователь</TableCell>
              <TableCell>Дата</TableCell>
              <TableCell>Статус</TableCell>
              <TableCell>Курсы</TableCell>
              <TableCell>Действия</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((o) => {
              const cfg = statusConfig[o.status] || { label: o.status, color: 'default' };
              return (
                <TableRow key={o.id}>
                  <TableCell>{o.id}</TableCell>
                  <TableCell>{o.user?.name || '—'}</TableCell>
                  <TableCell>{new Date(o.orderDate).toLocaleDateString('ru-RU')}</TableCell>
                  <TableCell><Chip label={cfg.label} color={cfg.color} size="small" /></TableCell>
                  <TableCell>{coursesList(o)}</TableCell>
                  <TableCell>
                    {o.status === 'pending' ? (
                      <>
                        <Button size="small" color="success" onClick={() => setConfirmAction({ type: 'approve', id: o.id })}>
                          Одобрить
                        </Button>
                        <Button size="small" color="error" onClick={() => setConfirmAction({ type: 'reject', id: o.id })}>
                          Отклонить
                        </Button>
                      </>
                    ) : (
                      <Button size="small" color="error" onClick={() => setConfirmAction({ type: 'delete', id: o.id })}>
                        Удалить
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Confirm dialog */}
      <Dialog open={confirmAction !== null} onClose={() => setConfirmAction(null)}>
        <DialogTitle>Подтверждение</DialogTitle>
        <DialogContent>
          <Typography>{confirmLabel()}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)}>Отмена</Button>
          <Button
            variant="contained"
            color={confirmAction?.type === 'approve' ? 'success' : 'error'}
            onClick={handleAction}
          >
            Да
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
