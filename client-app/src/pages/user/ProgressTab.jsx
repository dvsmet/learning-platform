import { useState, useEffect } from 'react';
import {
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Typography, Paper, Chip, LinearProgress, Box, Alert
} from '@mui/material';
import { getProgress } from '../../api/progress';
import { getLessons } from '../../api/lessons';
import { getCourses } from '../../api/courses';
import { getQuizResults, getQuizzes } from '../../api/quizzes';
import { useAuth } from '../../context/AuthContext';

function ballsWord(n) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'балл';
  if ([2, 3, 4].includes(mod10) && ![12, 13, 14].includes(mod100)) return 'балла';
  return 'баллов';
}

export default function ProgressTab() {
  const { user } = useAuth();
  const [grouped, setGrouped] = useState({});
  const [courseNames, setCourseNames] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getProgress(),
      getLessons(),
      getCourses(),
      getQuizResults(),
      getQuizzes(),
    ])
      .then(([allProgress, allLessons, allCourses, allResults, allQuizzes]) => {
        const myProgress = allProgress.filter((p) => p.userId === user.id);

        const lessonMap = {};
        allLessons.forEach((l) => { lessonMap[l.id] = l; });

        const courseMap = {};
        allCourses.forEach((c) => { courseMap[c.id] = c.title; });
        setCourseNames(courseMap);

        const quizByLesson = {};
        allQuizzes.forEach((q) => { quizByLesson[q.lessonId] = q; });

        const myResults = allResults.filter((r) => r.userId === user.id);
        const resultByQuiz = {};
        myResults.forEach((r) => { resultByQuiz[r.quizId] = r; });

        const groups = {};
        myProgress.forEach((p) => {
          const lesson = lessonMap[p.lessonId];
          if (!lesson) return;
          const cId = lesson.courseId;
          if (!groups[cId]) groups[cId] = [];

          const quiz = quizByLesson[p.lessonId];
          const result = quiz ? resultByQuiz[quiz.id] : null;

          groups[cId].push({
            lessonNumber: lesson.lessonNumber,
            lessonTitle: lesson.title,
            status: p.status,
            quizScore: result ? result.score : null,
          });
        });

        Object.values(groups).forEach((arr) =>
          arr.sort((a, b) => a.lessonNumber - b.lessonNumber)
        );
        setGrouped(groups);
      })
      .catch(() => setError('Не удалось загрузить прогресс'))
      .finally(() => setLoading(false));
  }, [user.id]);

  const statusChip = (status) => {
    if (status === 'completed') {
      return <Chip label="Завершён" size="small" color="success" />;
    }
    if (status === 'started') {
      return <Chip label="В процессе" size="small" sx={{ bgcolor: '#fff176', color: '#000' }} />;
    }
    return <Chip label={status} size="small" />;
  };

  if (loading) {
    return <LinearProgress />;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const courseIds = Object.keys(grouped);

  if (courseIds.length === 0) {
    return (
      <Typography color="text.secondary">
        Данные о прогрессе пока отсутствуют.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Мой прогресс</Typography>

      {courseIds.map((courseId) => (
        <Paper key={courseId} sx={{ mb: 3 }}>
          <Box sx={{ p: 2, pb: 0 }}>
            <Typography variant="h6" gutterBottom>
              {courseNames[courseId] || `Курс #${courseId}`}
            </Typography>
          </Box>

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Урок</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 140 }}>Статус</TableCell>
                  <TableCell sx={{ fontWeight: 600, width: 120 }}>Тест</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {grouped[courseId].map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {row.lessonNumber}. {row.lessonTitle}
                    </TableCell>
                    <TableCell>{statusChip(row.status)}</TableCell>
                    <TableCell>
                      {row.quizScore !== null
                        ? `${row.quizScore} ${ballsWord(row.quizScore)}`
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ))}
    </Box>
  );
}
