import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, CircularProgress, Alert, TableSortLabel, Accordion, AccordionSummary, AccordionDetails,
  Grid, LinearProgress, Chip, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DownloadIcon from '@mui/icons-material/Download';
import BarChartIcon from '@mui/icons-material/BarChart';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import ChatIcon from '@mui/icons-material/Chat';
import PersonSearchIcon from '@mui/icons-material/PersonSearch';
import { getAnalyticsDashboard, getAnalyticsLearners, getAnalyticsLearnerDetail, downloadAnalyticsCsv } from '../api/analytics';

const binLabels = ['0–9%', '10–19%', '20–29%', '30–39%', '40–49%', '50–59%', '60–69%', '70–79%', '80–89%', '90–100%'];

export default function AnalyticsTab({ subtitle, chatPath }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [learnersPayload, setLearnersPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
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

  useEffect(() => { load(); }, [load]);

  const courses = data?.courses ?? [];
  const instructors = data?.instructors;
  const learners = learnersPayload?.learners ?? [];
  const passingPct = learnersPayload?.passingScorePercent ?? 60;

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

  const mailtoHref = (email, name) => {
    const sub = encodeURIComponent(`Обучение: напоминание${name ? ` (${name})` : ''}`);
    const body = encodeURIComponent('Здравствуйте!\n\n');
    return `mailto:${email}?subject=${sub}&body=${body}`;
  };

  const openMailInNewTab = () => {
    if (!learnerDetail?.email) return;
    const url = mailtoHref(learnerDetail.email, learnerDetail.name);
    window.open(url, '_blank', 'noopener,noreferrer');
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

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadAnalyticsCsv();
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BarChartIcon color="primary" />
          <Typography variant="h5">Аналитика</Typography>
        </Box>
        <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport} disabled={exporting}>
          {exporting ? 'Выгрузка…' : 'Выгрузить в файл CSV'}
        </Button>
      </Box>
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
          <Typography variant="h6" gutterBottom sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonSearchIcon color="primary" fontSize="small" />
            Обучающиеся
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Пользователи с одобренной записью на курсы в этой выборке. Тест считается сданным, если лучшая попытка даёт не ниже{' '}
            <strong>{passingPct}%</strong> от максимального балла. Данные по тестам и датам — в детализации и в CSV.
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
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {learnerDetail.email}
                {' · '}
                зачёт по тесту при лучшем результате ≥ {learnerDetail.passingScorePercent}%
              </Typography>
              {learnerDetail.courses?.length > 1 && (
                <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                  Несколько курсов: «Написать на платформе» откроет чат в контексте первого курса в списке (по названию). Остальные потоки — в разделе «Чаты».
                </Typography>
              )}
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
                </Box>
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
          <Button
            startIcon={<MailOutlineIcon />}
            onClick={openMailInNewTab}
            disabled={!learnerDetail?.email}
          >
            Написать на почту
          </Button>
          <Button
            variant="outlined"
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
