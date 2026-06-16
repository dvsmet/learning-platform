import { useState, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import DashboardLayout from '../../components/DashboardLayout';
import CatalogTab from './CatalogTab';
import MyCoursesTab from './MyCoursesTab';
import ProgressTab from './ProgressTab';
import ProfileTab from './ProfileTab';
import ChatTab from './ChatTab';
import QuizModal from '../../components/QuizModal';
import ReviewModal from '../../components/ReviewModal';
import { getQuizzes } from '../../api/quizzes';

const menuItems = [
  { path: '/dashboard/catalog', label: 'Каталог курсов', icon: <SchoolIcon /> },
  { path: '/dashboard/my-courses', label: 'Мои курсы', icon: <LibraryBooksIcon /> },
  { path: '/dashboard/progress', label: 'Мой прогресс', icon: <TrendingUpIcon /> },
  { path: '/dashboard/chat', label: 'Чаты', icon: <ChatIcon /> },
  { path: '/dashboard/profile', label: 'Профиль', icon: <PersonIcon /> },
];

export default function UserDashboard() {
  const [quiz, setQuiz] = useState(null);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleOpenQuiz = useCallback(async (lessonId) => {
    try {
      const quizzes = await getQuizzes();
      const found = quizzes.find((q) => q.lessonId === lessonId);
      if (!found) { alert('Тест для этого урока не найден'); return; }
      setQuiz(found);
    } catch (err) {
      alert('Ошибка загрузки теста: ' + err.message);
    }
  }, []);

  const handleQuizComplete = (result) => {
    const bw = (n) => (n % 10 === 1 && n % 100 !== 11 ? 'балл' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'балла' : 'баллов');
    alert(`Тест завершён! Результат: ${result.score} ${bw(result.score)}`);
    setQuiz(null);
    setRefreshKey((k) => k + 1);
  };

  const handleOpenReview = useCallback((courseId, courseTitle) => {
    setReviewTarget({ courseId, courseTitle });
  }, []);

  const handleReviewDone = () => {
    setReviewTarget(null);
    setRefreshKey((k) => k + 1);
  };

  return (
    <>
      <DashboardLayout menuItems={menuItems} title="Корпоративная платформа обучения">
        <Routes>
          <Route index element={<Navigate to="catalog" replace />} />
          <Route path="catalog" element={<CatalogTab />} />
          <Route path="my-courses" element={<MyCoursesTab key={refreshKey} onOpenQuiz={handleOpenQuiz} onOpenReview={handleOpenReview} />} />
          <Route path="progress" element={<ProgressTab key={refreshKey} />} />
          <Route path="chat" element={<ChatTab />} />
          <Route path="profile" element={<ProfileTab />} />
        </Routes>
      </DashboardLayout>

      <QuizModal quiz={quiz} open={!!quiz} onClose={() => setQuiz(null)} onComplete={handleQuizComplete} />
      {reviewTarget && (
        <ReviewModal
          courseId={reviewTarget.courseId}
          courseTitle={reviewTarget.courseTitle}
          open
          onClose={() => setReviewTarget(null)}
          onDone={handleReviewDone}
        />
      )}
    </>
  );
}
