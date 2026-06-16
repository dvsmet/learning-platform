import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accordion, AccordionSummary, AccordionDetails,
  Typography, Button, Card, CardContent, Box,
  CircularProgress, Alert
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import RateReviewIcon from '@mui/icons-material/RateReview';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getOrdersByUser } from '../../api/orders';
import { getLessons } from '../../api/lessons';
import { getReviews } from '../../api/reviews';
import { getQuizzes } from '../../api/quizzes';
import { useAuth } from '../../context/AuthContext';

export default function MyCoursesTab({ onOpenQuiz, onOpenReview }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courseMap, setCourseMap] = useState({});
  const [lessonsByCourse, setLessonsByCourse] = useState({});
  const [userReviewedCourses, setUserReviewedCourses] = useState(new Set());
  const [lessonsWithQuiz, setLessonsWithQuiz] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getOrdersByUser(user.id),
      getLessons(),
      getReviews(),
      getQuizzes(),
    ])
      .then(([orders, allLessons, allReviews, allQuizzes]) => {
        const approved = orders.filter((o) => o.status === 'approved');
        const map = {};
        approved.forEach((order) => {
          order.orderItems?.forEach((item) => {
            if (item.course) {
              map[item.courseId] = item.course;
            }
          });
        });
        setCourseMap(map);

        const grouped = {};
        allLessons.forEach((lesson) => {
          if (map[lesson.courseId]) {
            if (!grouped[lesson.courseId]) grouped[lesson.courseId] = [];
            grouped[lesson.courseId].push(lesson);
          }
        });
        Object.values(grouped).forEach((arr) =>
          arr.sort((a, b) => a.lessonNumber - b.lessonNumber)
        );
        setLessonsByCourse(grouped);

        const reviewed = new Set(
          allReviews
            .filter((r) => r.userId === user.id)
            .map((r) => r.courseId)
        );
        setUserReviewedCourses(reviewed);

        const quizLessons = new Set(allQuizzes.map((q) => q.lessonId));
        setLessonsWithQuiz(quizLessons);
      })
      .catch(() => setError('Не удалось загрузить данные'))
      .finally(() => setLoading(false));
  }, [user.id]);

  const getVideoEmbed = (url) => {
    if (!url || !url.trim()) return null;
    const u = url.trim();
    const yt = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
    if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` };
    const rutube = u.match(/rutube\.ru\/(?:video|play\/embed)\/([a-zA-Z0-9_-]+)/);
    if (rutube) return { type: 'rutube', src: `https://rutube.ru/play/embed/${rutube[1]}/` };
    const vk = u.match(/vk\.com\/video(-?\d+_\d+)/);
    if (vk) {
      const [oid, vid] = vk[1].split('_');
      return { type: 'vk', src: `https://vk.com/video_ext.php?oid=${oid}&id=${vid}` };
    }
    return null;
  };

  const linkifyText = (text) => {
    if (!text || !text.trim()) return text;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, i) =>
      part.match(urlRegex) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#667eea', marginRight: 4 }}>
          {part}
        </a>
      ) : (
        part
      )
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  const courseIds = Object.keys(courseMap);

  if (courseIds.length === 0) {
    return (
      <Typography color="text.secondary">
        У вас пока нет одобренных курсов. Перейдите в «Каталог», чтобы запросить доступ.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Мои курсы</Typography>

      {courseIds.map((courseId) => {
        const course = courseMap[courseId];
        const lessons = lessonsByCourse[courseId] || [];

        return (
          <Card key={courseId} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6">{course.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {course.description}
              </Typography>

              {lessons.map((lesson) => {
                const videoEmbed = getVideoEmbed(lesson.videoUrl);
                return (
                  <Accordion key={lesson.id} sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography>
                        Урок {lesson.lessonNumber}: {lesson.title}
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {lesson.content && (
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {lesson.content}
                        </Typography>
                      )}

                      {videoEmbed && (
                        <Box sx={{ position: 'relative', pb: '56.25%', mb: 2 }}>
                          <iframe
                            src={videoEmbed.src}
                            title={lesson.title}
                            style={{
                              position: 'absolute',
                              top: 0, left: 0,
                              width: '100%', height: '100%',
                              border: 0,
                            }}
                            allowFullScreen
                          />
                        </Box>
                      )}

                      {lesson.materialsNote && (
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
                            Материалы к уроку:
                          </Typography>
                          <Typography variant="body2" component="span" sx={{ whiteSpace: 'pre-wrap' }}>
                            {linkifyText(lesson.materialsNote)}
                          </Typography>
                        </Box>
                      )}

                      {lessonsWithQuiz.has(lesson.id) && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => onOpenQuiz?.(lesson.id)}
                        >
                          Пройти тест
                        </Button>
                      )}
                    </AccordionDetails>
                  </Accordion>
                );
              })}

              <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ChatIcon />}
                  onClick={() => navigate('/dashboard/chat', {
                    state: {
                      openCourseId: Number(courseId),
                      courseTitle: course.title,
                      instructorName: course.instructor?.name || 'Инструктор',
                    },
                  })}
                >
                  Чат с инструктором
                </Button>
                {!userReviewedCourses.has(Number(courseId)) && (
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<RateReviewIcon />}
                    onClick={() => onOpenReview?.(Number(courseId), course.title)}
                  >
                    Оставить отзыв
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );
}
