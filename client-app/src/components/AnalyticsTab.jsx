import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, CircularProgress, Alert, TableSortLabel, Accordion, AccordionSummary, AccordionDetails,
  Grid, LinearProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem,
  TextField, FormControlLabel, Checkbox,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import { toPng } from 'html-to-image';
import PieChartOutlineIcon from '@mui/icons-material/PieChartOutline';
import ImageIcon from '@mui/icons-material/Image';
import BarChartIcon from '@mui/icons-material/BarChart';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import ChatIcon from '@mui/icons-material/Chat';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  getAnalyticsDashboard,
  getAnalyticsLearners,
  getAnalyticsLearnerDetail,
  downloadAnalyticsExcel,
  getSuccessDistribution,
} from '../api/analytics';
import { useAuth } from '../context/AuthContext';

const binLabels = ['0–9%', '10–19%', '20–29%', '30–39%', '40–49%', '50–59%', '60–69%', '70–79%', '80–89%', '90–100%'];

function formatUtcYmd(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function utcRangePresetLast30Days() {
  const now = new Date();
  const endUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const from = new Date(endUtc - 29 * 86400000);
  return { fromYmd: formatUtcYmd(from), toYmd: formatUtcYmd(new Date(endUtc)) };
}

function formatYmdRu(ymd) {
  if (!ymd || ymd.length < 10) return '';
  const [y, m, d] = ymd.split('-');
  return `${d}.${m}.${y}`;
}

/** Склонение: 1 запись, 2–4 записи, 5+ записей; 11–14 записей. */
function recordCountWordRu(n) {
  const num = Number(n);
  const n100 = Math.abs(num) % 100;
  const n10 = n100 % 10;
  if (n100 > 10 && n100 < 15) return 'записей';
  if (n10 === 1) return 'запись';
  if (n10 >= 2 && n10 <= 4) return 'записи';
  return 'записей';
}

function formatRecordCountRu(n) {
  return `${n} ${recordCountWordRu(n)}`;
}

export default function AnalyticsTab({ subtitle, chatPath }) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [data, setData] = useState(null);
  const [learnersPayload, setLearnersPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const [exportPreset, setExportPreset] = useState('all');
  const [customRangeOpen, setCustomRangeOpen] = useState(false);
  const [customFromYmd, setCustomFromYmd] = useState('');
  const [customToYmd, setCustomToYmd] = useState('');
  const [appliedCustomFromYmd, setAppliedCustomFromYmd] = useState('');
  const [appliedCustomToYmd, setAppliedCustomToYmd] = useState('');
  const [orderBy, setOrderBy] = useState('enrolledCount');
  const [order, setOrder] = useState('desc');
  const [instructorOrderBy, setInstructorOrderBy] = useState('avgProgressPercentAcrossCourses');
  const [instructorOrder, setInstructorOrder] = useState('desc');
  const [learnerOrderBy, setLearnerOrderBy] = useState('name');
  const [learnerOrder, setLearnerOrder] = useState('asc');
  const [learnerDialogOpen, setLearnerDialogOpen] = useState(false);
  const [learnerDetailLoading, setLearnerDetailLoading] = useState(false);
  const [learnerDetail, setLearnerDetail] = useState(null);
  const [learnerDetailError, setLearnerDetailError] = useState('');

  const pieInit = useMemo(() => utcRangePresetLast30Days(), []);
  const [pieFromYmd, setPieFromYmd] = useState(pieInit.fromYmd);
  const [pieToYmd, setPieToYmd] = useState(pieInit.toYmd);
  const [appliedPieFromYmd, setAppliedPieFromYmd] = useState(pieInit.fromYmd);
  const [appliedPieToYmd, setAppliedPieToYmd] = useState(pieInit.toYmd);
  const [successPieAllRecords, setSuccessPieAllRecords] = useState(false);
  const [successDist, setSuccessDist] = useState(null);
  const [successPieLoading, setSuccessPieLoading] = useState(false);
  const [successPieError, setSuccessPieError] = useState('');
  const [successPiePngExporting, setSuccessPiePngExporting] = useState(false);
  const successPieChartRef = useRef(null);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const d = await getAnalyticsDashboard();
      setData(d);
    } catch (e) {
      setError(e.message || 'Не удалось загрузить аналитику');
      setData(null);
    }
    try {
      const L = await getAnalyticsLearners();
      setLearnersPayload(L);
    } catch {
      setLearnersPayload({ learners: [], passingScorePercent: 60 });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSuccessPie = useCallback(async () => {
    if (!authUser?.isAdmin) return;
    setSuccessPieError('');
    setSuccessPieLoading(true);
    try {
      const d = successPieAllRecords
        ? await getSuccessDistribution({})
        : await getSuccessDistribution({
            fromUtc: `${appliedPieFromYmd}T00:00:00.000Z`,
            toUtc: `${appliedPieToYmd}T00:00:00.000Z`,
          });
      setSuccessDist(d);
    } catch (e) {
      setSuccessPieError(e.message || 'Не удалось загрузить сводку успеваемости');
      setSuccessDist(null);
    } finally {
      setSuccessPieLoading(false);
    }
  }, [authUser?.isAdmin, successPieAllRecords, appliedPieFromYmd, appliedPieToYmd]);

  useEffect(() => {
    if (!authUser?.isAdmin) return;
    void loadSuccessPie();
  }, [authUser?.isAdmin, loadSuccessPie]);

  const applyPiePeriod = () => {
    setSuccessPieAllRecords(false);
    setAppliedPieFromYmd(pieFromYmd);
    setAppliedPieToYmd(pieToYmd);
  };

  const handleDownloadSuccessChartPng = async () => {
    if (!successPieChartRef.current || !successDist || successDist.totalEnrollments === 0) return;
    setSuccessPieError('');
    setSuccessPiePngExporting(true);
    try {
      const dataUrl = await toPng(successPieChartRef.current, {
        cacheBust: true,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });
      const stamp = successPieAllRecords ? 'all' : `${appliedPieFromYmd}_${appliedPieToYmd}`;
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `success-pie_${stamp}.png`;
      a.click();
    } catch (e) {
      setSuccessPieError(e.message || 'Не удалось сохранить изображение');
    } finally {
      setSuccessPiePngExporting(false);
    }
  };

  useEffect(() => { load(); }, [load]);

  const courses = data?.courses ?? [];
  const instructors = data?.instructors;
  const learners = learnersPayload?.learners ?? [];
  const passingPct = learnersPayload?.passingScorePercent ?? 60;

  const successPieRows = useMemo(() => {
    if (!successDist) return [];
    const p = successDist.passingScorePercent ?? 60;
    return [
      { name: 'Не приступили', value: successDist.notStartedCount ?? 0, color: '#9e9e9e' },
      { name: `Сдали (≥${p}%)`, value: successDist.passedCount ?? 0, color: '#2e7d32' },
      { name: 'Не сдали / в процессе', value: successDist.failedOrInProgressCount ?? 0, color: '#ed6c02' },
    ];
  }, [successDist]);

  const kpis = useMemo(() => {
    if (!courses.length) return null;
    const totalEnrolled = courses.reduce((s, c) => s + c.enrolledCount, 0);
    const avgProgress = courses.reduce((s, c) => s + c.avgProgressPercent, 0) / courses.length;
    const withQuiz = courses.filter((c) => c.avgNormalizedQuizScore != null);
    const avgQuiz = withQuiz.length
      ? withQuiz.reduce((s, c) => s + c.avgNormalizedQuizScore, 0) / withQuiz.length
      : null;
    const avgCompletionRate = courses.reduce((s, c) => s + c.completionRatePercent, 0) / courses.length;
    return { totalEnrolled, avgProgress, avgQuiz, avgCompletionRate, courseCount: courses.length };
  }, [courses]);

  const sortedCourses = useMemo(() => {
    const list = [...courses];
    const mul = order === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const va = a[orderBy];
      const vb = b[orderBy];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return mul * String(va).localeCompare(String(vb), 'ru');
      return mul * (va - vb);
    });
    return list;
  }, [courses, orderBy, order]);

  const sortedInstructors = useMemo(() => {
    const list = [...(instructors ?? [])];
    const mul = instructorOrder === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const va = a[instructorOrderBy];
      const vb = b[instructorOrderBy];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      return mul * (va - vb);
    });
    return list;
  }, [instructors, instructorOrderBy, instructorOrder]);

  const sortedLearners = useMemo(() => {
    const list = [...learners];
    const mul = learnerOrder === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      const va = a[learnerOrderBy];
      const vb = b[learnerOrderBy];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'string') return mul * String(va).localeCompare(String(vb), 'ru');
      if (learnerOrderBy === 'lastQuizAttemptUtc') {
        const ta = va ? new Date(va).getTime() : 0;
        const tb = vb ? new Date(vb).getTime() : 0;
        return mul * (ta - tb);
      }
      return mul * (va - vb);
    });
    return list;
  }, [learners, learnerOrderBy, learnerOrder]);

  const mailSignatureLine = useMemo(() => {
    if (!authUser) return 'Администратор';
    if (authUser.isAdmin) return 'Администратор';
    return (authUser.name && String(authUser.name).trim()) || 'Инструктор';
  }, [authUser]);

  const handleLearnerSort = (prop) => {
    if (learnerOrderBy === prop) setLearnerOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setLearnerOrderBy(prop);
      setLearnerOrder(prop === 'name' || prop === 'email' ? 'asc' : 'desc');
    }
  };

  const openLearnerDetail = async (userId) => {
    setLearnerDetail(null);
    setLearnerDetailError('');
    setLearnerDialogOpen(true);
    setLearnerDetailLoading(true);
    try {
      const d = await getAnalyticsLearnerDetail(userId);
      setLearnerDetail(d);
    } catch (e) {
      setLearnerDetailError(e.message || 'Не удалось загрузить карточку');
    } finally {
      setLearnerDetailLoading(false);
    }
  };

  /** Черновик в Gmail (нужен вход в Google). */
  const gmailComposeUrl = (email, learnerName, signatureLine) => {
    const su = 'Обучение: напоминание';
    const whom = learnerName?.trim() || 'коллега';
    const body = `Уважаемый ${whom}!\n\n\n\nС уважением,\n${signatureLine}`;
    const u = new URL('https://mail.google.com/mail/u/0/');
    u.searchParams.set('view', 'cm');
    u.searchParams.set('fs', '1');
    u.searchParams.set('to', email);
    u.searchParams.set('su', su);
    u.searchParams.set('body', body);
    return u.toString();
  };

  const handleOpenGmailCompose = () => {
    if (!learnerDetail?.email) return;
    window.open(
      gmailComposeUrl(learnerDetail.email, learnerDetail.name, mailSignatureLine),
      '_blank',
      'noopener,noreferrer',
    );
  };

  const openPlatformChat = () => {
    if (!chatPath || !learnerDetail?.courses?.length) return;
    const course = learnerDetail.courses[0];
    setLearnerDialogOpen(false);
    navigate(chatPath, {
      state: {
        openChat: {
          userId: learnerDetail.userId,
          userName: learnerDetail.name,
          courseId: course.courseId,
          courseTitle: course.courseTitle,
        },
      },
    });
  };

  const handleSort = (prop) => {
    if (orderBy === prop) setOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setOrderBy(prop);
      setOrder('desc');
    }
  };

  const handleInstructorSort = (prop) => {
    if (instructorOrderBy === prop) setInstructorOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else {
      setInstructorOrderBy(prop);
      setInstructorOrder('desc');
    }
  };

  const openCustomRangeDialog = useCallback(() => {
    const next = appliedCustomFromYmd && appliedCustomToYmd
      ? { fromYmd: appliedCustomFromYmd, toYmd: appliedCustomToYmd }
      : utcRangePresetLast30Days();
    setCustomFromYmd(next.fromYmd);
    setCustomToYmd(next.toYmd);
    setCustomRangeOpen(true);
  }, [appliedCustomFromYmd, appliedCustomToYmd]);

  const handleApplyCustomRange = () => {
    if (!customFromYmd || !customToYmd) {
      setError('Укажите обе даты периода.');
      return;
    }
    if (customFromYmd > customToYmd) {
      setError('Дата начала не может быть позже даты окончания.');
      return;
    }
    setAppliedCustomFromYmd(customFromYmd);
    setAppliedCustomToYmd(customToYmd);
    setError('');
    setCustomRangeOpen(false);
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      if (exportPreset === 'custom') {
        if (!appliedCustomFromYmd || !appliedCustomToYmd) {
          openCustomRangeDialog();
          return;
        }
        await downloadAnalyticsExcel({
          fromUtc: `${appliedCustomFromYmd}T00:00:00.000Z`,
          toUtc: `${appliedCustomToYmd}T00:00:00.000Z`,
        });
        return;
      }
      await downloadAnalyticsExcel({
        preset: exportPreset === 'all' ? undefined : exportPreset,
      });
    } catch (e) {
      setError(e.message || 'Ошибка выгрузки');
    } finally {
      setExporting(false);
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
      {authUser?.isAdmin && (
        <Paper sx={{ p: 2, mb: 3 }} variant="outlined">
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PieChartOutlineIcon color="primary" />
              <Box>
                <Typography variant="h6">Успеваемость по записям на курсы</Typography>
                <Typography variant="body2" color="text.secondary">
                  {successDist?.periodDescription
                    ?? 'Одна запись — один сотрудник на одном курсе (дата заявки в периоде). Категория по текущему прогрессу и тестам.'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
              <FormControlLabel
                sx={{ m: 0 }}
                control={(
                  <Checkbox
                    size="small"
                    checked={successPieAllRecords}
                    onChange={(e) => setSuccessPieAllRecords(e.target.checked)}
                  />
                )}
                label="Все записи"
              />
              <TextField
                label="Дата заявки с"
                type="date"
                size="small"
                value={pieFromYmd}
                onChange={(e) => setPieFromYmd(e.target.value)}
                disabled={successPieAllRecords}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 180 }}
              />
              <TextField
                label="по (включительно)"
                type="date"
                size="small"
                value={pieToYmd}
                onChange={(e) => setPieToYmd(e.target.value)}
                disabled={successPieAllRecords}
                InputLabelProps={{ shrink: true }}
                sx={{ width: 180 }}
              />
              <Button variant="outlined" size="small" onClick={applyPiePeriod} disabled={successPieAllRecords}>
                Применить период
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ImageIcon />}
                onClick={handleDownloadSuccessChartPng}
                disabled={
                  successPiePngExporting
                  || successPieLoading
                  || !successDist
                  || successDist.totalEnrollments === 0
                }
              >
                {successPiePngExporting ? 'Сохранение…' : 'Скачать диаграмму (PNG)'}
              </Button>
            </Box>
          </Box>
          {successPieError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSuccessPieError('')}>{successPieError}</Alert>
          )}
          {successPieLoading ? (
            <Box display="flex" justifyContent="center" py={3}>
              <CircularProgress size={36} />
            </Box>
          ) : successDist && successDist.totalEnrollments === 0 ? (
            <Typography color="text.secondary">Нет записей в выбранном периоде.</Typography>
          ) : (
            <Box
              ref={successPieChartRef}
              sx={{ width: '100%', height: 320, bgcolor: 'background.paper' }}
            >
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={successPieRows}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={108}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {successPieRows.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0];
                      const name = p.name ?? p.payload?.name ?? '';
                      const value = p.value ?? 0;
                      return (
                        <Box
                          sx={{
                            bgcolor: 'background.paper',
                            border: 1,
                            borderColor: 'divider',
                            px: 1.5,
                            py: 1,
                            borderRadius: 1,
                            boxShadow: 2,
                          }}
                        >
                          {name ? (
                            <Typography variant="body2" fontWeight={600} gutterBottom>
                              {name}
                            </Typography>
                          ) : null}
                          <Typography variant="body2">{formatRecordCountRu(value)}</Typography>
                        </Box>
                      );
                    }}
                  />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          )}
        </Paper>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon color="primary" />
          <Typography variant="h5">Аналитика</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel id="analytics-export-period-label">Период выгрузки</InputLabel>
            <Select
              labelId="analytics-export-period-label"
              label="Период выгрузки"
              value={exportPreset}
              onChange={(e) => {
                const v = e.target.value;
                if (v === 'custom') {
                  setExportPreset('custom');
                  openCustomRangeDialog();
                  return;
                }
                setExportPreset(v);
              }}
              renderValue={(v) => {
                if (v === 'custom' && appliedCustomFromYmd && appliedCustomToYmd) {
                  return `Свои даты: ${formatYmdRu(appliedCustomFromYmd)} — ${formatYmdRu(appliedCustomToYmd)}`;
                }
                if (v === 'custom') return 'Свои даты…';
                if (v === 'all') return 'Всё время';
                if (v === 'week') return 'Последние 7 дней';
                if (v === 'month') return 'Последние 30 дней';
                if (v === 'year') return 'Последний год';
                return v;
              }}
            >
              <MenuItem value="all">Всё время</MenuItem>
              <MenuItem value="week">Последние 7 дней</MenuItem>
              <MenuItem value="month">Последние 30 дней</MenuItem>
              <MenuItem value="year">Последний год</MenuItem>
              <MenuItem value="custom">Свои даты…</MenuItem>
            </Select>
          </FormControl>
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} disabled={exporting}>
            {exporting ? 'Выгрузка…' : 'Выгрузить в Excel'}
          </Button>
        </Box>
      </Box>

      <Dialog open={customRangeOpen} onClose={() => setCustomRangeOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Период выгрузки</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Укажите начало и последний календарный день интервала. Отчёт строится от 00:00 начальной даты до 00:00 дня после выбранного конца.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <TextField
              label="С"
              type="date"
              value={customFromYmd}
              onChange={(e) => setCustomFromYmd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
            <TextField
              label="По включительно"
              type="date"
              value={customToYmd}
              onChange={(e) => setCustomToYmd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 180 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomRangeOpen(false)}>Отмена</Button>
          <Button variant="contained" onClick={handleApplyCustomRange}>Готово</Button>
        </DialogActions>
      </Dialog>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {subtitle}
        </Typography>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {kpis && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Курсов в выборке</Typography>
              <Typography variant="h6">{kpis.courseCount}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Сумма записей на курсы</Typography>
              <Typography variant="h6">{kpis.totalEnrolled}</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Средний прогресс по урокам</Typography>
              <Typography variant="h6">{kpis.avgProgress.toFixed(1)}%</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Средний процент завершения курса</Typography>
              <Typography variant="h6">{kpis.avgCompletionRate.toFixed(1)}%</Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="caption" color="text.secondary">Средний результат тестов в процентах</Typography>
              <Typography variant="h6">{kpis.avgQuiz != null ? `${kpis.avgQuiz.toFixed(1)}%` : '—'}</Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {learners.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
            Обучающиеся
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={learnerOrderBy === 'name' ? learnerOrder : false}>
                    <TableSortLabel active={learnerOrderBy === 'name'} direction={learnerOrderBy === 'name' ? learnerOrder : 'asc'} onClick={() => handleLearnerSort('name')}>
                      Имя
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={learnerOrderBy === 'email' ? learnerOrder : false}>
                    <TableSortLabel active={learnerOrderBy === 'email'} direction={learnerOrderBy === 'email' ? learnerOrder : 'asc'} onClick={() => handleLearnerSort('email')}>
                      Email
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={learnerOrderBy === 'enrolledCoursesCount' ? learnerOrder : false}>
                    <TableSortLabel active={learnerOrderBy === 'enrolledCoursesCount'} direction={learnerOrderBy === 'enrolledCoursesCount' ? learnerOrder : 'asc'} onClick={() => handleLearnerSort('enrolledCoursesCount')}>
                      Курсов
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={learnerOrderBy === 'avgProgressPercent' ? learnerOrder : false}>
                    <TableSortLabel active={learnerOrderBy === 'avgProgressPercent'} direction={learnerOrderBy === 'avgProgressPercent' ? learnerOrder : 'asc'} onClick={() => handleLearnerSort('avgProgressPercent')}>
                      Ср. прогресс, %
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={learnerOrderBy === 'quizzesTotal' ? learnerOrder : false}>
                    <TableSortLabel active={learnerOrderBy === 'quizzesTotal'} direction={learnerOrderBy === 'quizzesTotal' ? learnerOrder : 'asc'} onClick={() => handleLearnerSort('quizzesTotal')}>
                      Тестов всего
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={learnerOrderBy === 'quizzesAttempted' ? learnerOrder : false}>
                    <TableSortLabel active={learnerOrderBy === 'quizzesAttempted'} direction={learnerOrderBy === 'quizzesAttempted' ? learnerOrder : 'asc'} onClick={() => handleLearnerSort('quizzesAttempted')}>
                      С попытками
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={learnerOrderBy === 'quizzesPassed' ? learnerOrder : false}>
                    <TableSortLabel active={learnerOrderBy === 'quizzesPassed'} direction={learnerOrderBy === 'quizzesPassed' ? learnerOrder : 'asc'} onClick={() => handleLearnerSort('quizzesPassed')}>
                      Сдано (≥{passingPct}%)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sortDirection={learnerOrderBy === 'lastQuizAttemptUtc' ? learnerOrder : false}>
                    <TableSortLabel active={learnerOrderBy === 'lastQuizAttemptUtc'} direction={learnerOrderBy === 'lastQuizAttemptUtc' ? learnerOrder : 'asc'} onClick={() => handleLearnerSort('lastQuizAttemptUtc')}>
                      Последняя попытка
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Действия</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedLearners.map((row) => (
                  <TableRow key={row.userId} hover>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.email}</TableCell>
                    <TableCell align="right">{row.enrolledCoursesCount}</TableCell>
                    <TableCell align="right">{row.avgProgressPercent}</TableCell>
                    <TableCell align="right">{row.quizzesTotal}</TableCell>
                    <TableCell align="right">{row.quizzesAttempted}</TableCell>
                    <TableCell align="right">{row.quizzesPassed}</TableCell>
                    <TableCell>
                      {row.lastQuizAttemptUtc
                        ? new Date(row.lastQuizAttemptUtc).toLocaleString('ru-RU')
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => openLearnerDetail(row.userId)}>
                        Подробнее
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Dialog open={learnerDialogOpen} onClose={() => setLearnerDialogOpen(false)} maxWidth="md" fullWidth scroll="paper">
        <DialogTitle>
          {learnerDetail ? `${learnerDetail.name} — тесты и прогресс` : 'Карточка обучающегося'}
        </DialogTitle>
        <DialogContent dividers>
          {learnerDetailLoading && (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress size={32} />
            </Box>
          )}
          {learnerDetailError && <Alert severity="error">{learnerDetailError}</Alert>}
          {learnerDetail && !learnerDetailLoading && (
            <>
              {learnerDetail.courses?.map((c) => (
                <Box key={c.courseId} sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {c.courseTitle}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Прогресс по урокам: {c.progressPercent}% ({c.lessonsCompleted} / {c.lessonsTotal} завершено)
                    {c.allLessonsCompleted ? (
                      <Chip size="small" label="Все уроки завершены" color="success" sx={{ ml: 1 }} />
                    ) : null}
                  </Typography>
                  {(c.quizzes ?? []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Этот курс пока пустой.
                    </Typography>
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Урок</TableCell>
                          <TableCell>Тест</TableCell>
                          <TableCell align="right">Попыток</TableCell>
                          <TableCell align="right">Лучший, %</TableCell>
                          <TableCell>Статус</TableCell>
                          <TableCell>Последняя попытка</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(c.quizzes ?? []).map((q) => (
                          <TableRow key={q.quizId}>
                            <TableCell>
                              <Typography variant="body2">
                                №{q.lessonNumber} {q.lessonTitle}
                              </Typography>
                            </TableCell>
                            <TableCell>{q.quizTitle}</TableCell>
                            <TableCell align="right">{q.attemptsCount}</TableCell>
                            <TableCell align="right">{q.bestScorePercent != null ? `${q.bestScorePercent}%` : '—'}</TableCell>
                            <TableCell>
                              {q.attemptsCount === 0 && <Chip size="small" label="Не начат" />}
                              {q.attemptsCount > 0 && q.passed && <Chip size="small" label="Сдан" color="success" />}
                              {q.attemptsCount > 0 && !q.passed && <Chip size="small" label="Не сдан" color="warning" />}
                            </TableCell>
                            <TableCell>
                              {q.lastAttemptUtc ? new Date(q.lastAttemptUtc).toLocaleString('ru-RU') : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Box>
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            type="button"
            startIcon={<MailOutlineIcon />}
            onClick={handleOpenGmailCompose}
            disabled={!learnerDetail?.email}
          >
            Написать в Gmail
          </Button>
          <Button
            startIcon={<ChatIcon />}
            onClick={openPlatformChat}
            disabled={!chatPath || !learnerDetail?.courses?.length}
          >
            Написать на платформе
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button variant="contained" onClick={() => setLearnerDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>

      {courses.length === 0 && !error && (
        <Typography color="text.secondary">Нет курсов для отображения.</Typography>
      )}

      {courses.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Курсы</Typography>
          <TableContainer component={Paper} sx={{ mb: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sortDirection={orderBy === 'title' ? order : false}>
                    <TableSortLabel active={orderBy === 'title'} direction={orderBy === 'title' ? order : 'asc'} onClick={() => handleSort('title')}>
                      Курс
                    </TableSortLabel>
                  </TableCell>
                  <TableCell>Инструктор</TableCell>
                  <TableCell align="right" sortDirection={orderBy === 'enrolledCount' ? order : false}>
                    <TableSortLabel active={orderBy === 'enrolledCount'} direction={orderBy === 'enrolledCount' ? order : 'asc'} onClick={() => handleSort('enrolledCount')}>
                      Записались
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">Уроков</TableCell>
                  <TableCell align="right">Строки прогресса: начато / завершено</TableCell>
                  <TableCell align="right">
                    <TableSortLabel active={orderBy === 'avgProgressPercent'} direction={orderBy === 'avgProgressPercent' ? order : 'asc'} onClick={() => handleSort('avgProgressPercent')}>
                      Средний прогресс, проценты
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel active={orderBy === 'completionRatePercent'} direction={orderBy === 'completionRatePercent' ? order : 'asc'} onClick={() => handleSort('completionRatePercent')}>
                      Процент завершивших все уроки
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel active={orderBy === 'avgNormalizedQuizScore'} direction={orderBy === 'avgNormalizedQuizScore' ? order : 'asc'} onClick={() => handleSort('avgNormalizedQuizScore')}>
                      Средний балл тестов, проценты
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right">
                    <TableSortLabel active={orderBy === 'totalQuizAttempts'} direction={orderBy === 'totalQuizAttempts' ? order : 'asc'} onClick={() => handleSort('totalQuizAttempts')}>
                      Число попыток сдачи тестов
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedCourses.map((c) => (
                  <TableRow key={c.courseId}>
                    <TableCell>{c.title}</TableCell>
                    <TableCell>{c.instructorName ?? '—'}</TableCell>
                    <TableCell align="right">{c.enrolledCount}</TableCell>
                    <TableCell align="right">{c.lessonsTotal}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" component="span">{c.lessonProgressStartedRows} / {c.lessonProgressCompletedRows}</Typography>
                    </TableCell>
                    <TableCell align="right">{c.avgProgressPercent?.toFixed?.(1) ?? c.avgProgressPercent}</TableCell>
                    <TableCell align="right">
                      {c.completionRatePercent?.toFixed?.(1) ?? c.completionRatePercent}
                      <Typography variant="caption" display="block" color="text.secondary">
                        ({c.fullyCompletedLearnersCount} завершили все уроки)
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      {c.avgNormalizedQuizScore != null ? `${c.avgNormalizedQuizScore}%` : '—'}
                    </TableCell>
                    <TableCell align="right">{c.totalQuizAttempts}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Typography variant="h6" gutterBottom>Распределение баллов по курсам и список попыток</Typography>
          {sortedCourses.map((c) => (
            <Accordion key={`chart-${c.courseId}`} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight={600}>{c.title}</Typography>
                <Chip size="small" label={`${c.totalQuizAttempts} попыток`} sx={{ ml: 2 }} />
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="subtitle2" gutterBottom>Все попытки по курсу</Typography>
                {c.totalQuizAttempts === 0 ? (
                  <Typography variant="body2" color="text.secondary">Нет попыток</Typography>
                ) : (
                  <Box sx={{ maxWidth: 520 }}>
                    {c.scoreDistributionBins.map((cnt, i) => {
                      const max = Math.max(1, ...c.scoreDistributionBins);
                      const pct = (cnt / max) * 100;
                      return (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography variant="caption" sx={{ width: 72 }}>{binLabels[i]}</Typography>
                          <LinearProgress variant="determinate" value={pct} sx={{ flex: 1, height: 8, borderRadius: 1 }} />
                          <Typography variant="caption" sx={{ width: 28 }}>{cnt}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                <Typography variant="subtitle2" sx={{ mt: 2 }}>Тесты</Typography>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Тест</TableCell>
                      <TableCell align="right">Попыток</TableCell>
                      <TableCell align="right">Средний балл, проценты</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(c.quizSummaries ?? []).map((q) => (
                      <TableRow key={q.quizId}>
                        <TableCell>{q.quizTitle}</TableCell>
                        <TableCell align="right">{q.attemptsCount}</TableCell>
                        <TableCell align="right">{q.avgNormalizedScore != null ? `${q.avgNormalizedScore}%` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </AccordionDetails>
            </Accordion>
          ))}
        </>
      )}

      {instructors && instructors.length > 0 && (
        <>
          <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>Сводка по инструкторам</Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Инструктор</TableCell>
                  <TableCell align="right">Курсов</TableCell>
                  <TableCell align="right">Студентов</TableCell>
                  <TableCell align="right" sortDirection={instructorOrderBy === 'avgProgressPercentAcrossCourses' ? instructorOrder : false}>
                    <TableSortLabel
                      active={instructorOrderBy === 'avgProgressPercentAcrossCourses'}
                      direction={instructorOrderBy === 'avgProgressPercentAcrossCourses' ? instructorOrder : 'asc'}
                      onClick={() => handleInstructorSort('avgProgressPercentAcrossCourses')}
                    >
                      Средний прогресс по курсам
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sortDirection={instructorOrderBy === 'avgNormalizedQuizScoreAcrossCourses' ? instructorOrder : false}>
                    <TableSortLabel
                      active={instructorOrderBy === 'avgNormalizedQuizScoreAcrossCourses'}
                      direction={instructorOrderBy === 'avgNormalizedQuizScoreAcrossCourses' ? instructorOrder : 'asc'}
                      onClick={() => handleInstructorSort('avgNormalizedQuizScoreAcrossCourses')}
                    >
                      Средний балл по тестам
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedInstructors.map((i) => (
                  <TableRow key={i.instructorId}>
                    <TableCell>{i.name}</TableCell>
                    <TableCell align="right">{i.coursesCount}</TableCell>
                    <TableCell align="right">{i.distinctStudentsCount}</TableCell>
                    <TableCell align="right">{i.avgProgressPercentAcrossCourses}%</TableCell>
                    <TableCell align="right">{i.avgNormalizedQuizScoreAcrossCourses ?? '—'}{i.avgNormalizedQuizScoreAcrossCourses != null ? '%' : ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}
