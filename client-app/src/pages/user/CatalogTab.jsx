import { useState, useEffect, useMemo } from 'react';
import {
  Card, CardContent, CardActions, Button, Grid, Chip,
  Typography, Alert, CircularProgress, Box, TextField, MenuItem,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { getCourses } from '../../api/courses';
import { getCategories } from '../../api/categories';
import { getOrdersByUser, createOrder } from '../../api/orders';
import { useAuth } from '../../context/AuthContext';

export default function CatalogTab() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [userOrders, setUserOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requesting, setRequesting] = useState(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    Promise.all([getCourses(), getCategories(), getOrdersByUser(user.id)])
      .then(([c, cats, orders]) => {
        setCourses(c);
        setCategories(cats);
        setUserOrders(orders);
      })
      .catch(() => setError('Не удалось загрузить каталог курсов'))
      .finally(() => setLoading(false));
  }, [user.id]);

  const requestedCourseIds = useMemo(() => {
    const ids = new Map();
    userOrders.forEach((order) => {
      (order.orderItems || []).forEach((item) => {
        const existing = ids.get(item.courseId);
        if (!existing || order.status === 'approved') {
          ids.set(item.courseId, order.status);
        }
      });
    });
    return ids;
  }, [userOrders]);

  const filtered = useMemo(() => {
    let result = courses;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.title?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q),
      );
    }
    if (categoryFilter) {
      result = result.filter((c) => c.categoryIds?.includes(categoryFilter));
    }
    return result;
  }, [courses, search, categoryFilter]);

  const handleRequest = async (course) => {
    setRequesting(course.id);
    setError('');
    setSuccess('');
    try {
      const newOrder = await createOrder({
        userId: user.id,
        orderDate: new Date().toISOString(),
        status: 'pending',
        orderItems: [{ courseId: course.id, priceAtPurchase: 0 }],
      });
      setSuccess(`Заявка на курс «${course.title}» отправлена`);
      setUserOrders((prev) => [...prev, { ...newOrder, orderItems: [{ courseId: course.id }], status: 'pending' }]);
    } catch {
      setError('Не удалось отправить заявку');
    } finally {
      setRequesting(null);
    }
  };

  const renderButton = (course) => {
    const status = requestedCourseIds.get(course.id);
    if (status === 'approved') {
      return (
        <Chip
          icon={<CheckCircleIcon />}
          label="Доступ открыт"
          color="success"
          size="small"
          variant="outlined"
        />
      );
    }
    if (status === 'pending') {
      return (
        <Chip
          icon={<HourglassEmptyIcon />}
          label="Заявка отправлена"
          color="warning"
          size="small"
          variant="outlined"
        />
      );
    }
    return (
      <Button
        size="small"
        variant="contained"
        disabled={requesting === course.id}
        onClick={() => handleRequest(course)}
      >
        {requesting === course.id ? 'Отправка…' : 'Запросить доступ'}
      </Button>
    );
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
      <Typography variant="h5" gutterBottom>Каталог курсов</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          placeholder="Поиск по названию…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          slotProps={{ input: { startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} /> } }}
          sx={{ minWidth: 260 }}
        />
        <TextField
          size="small"
          select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          sx={{ minWidth: 200 }}
          label="Категория"
        >
          <MenuItem value="">Все категории</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>{cat.categoryName}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Grid container spacing={3}>
        {filtered.map((course) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={course.id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" gutterBottom>{course.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {course.description}
                </Typography>
                <Typography variant="body2">
                  Длительность: {course.durationHours} ч.
                </Typography>
              </CardContent>
              <CardActions>
                {renderButton(course)}
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {filtered.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 2 }}>
          {courses.length === 0 ? 'Курсы пока не добавлены.' : 'Ничего не найдено по вашему запросу.'}
        </Typography>
      )}
    </Box>
  );
}
