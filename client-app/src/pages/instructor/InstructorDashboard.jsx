import { Routes, Route, Navigate } from 'react-router-dom';
import SchoolIcon from '@mui/icons-material/School';
import AssignmentIcon from '@mui/icons-material/Assignment';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import QuizIcon from '@mui/icons-material/Quiz';
import RateReviewIcon from '@mui/icons-material/RateReview';
import PersonIcon from '@mui/icons-material/Person';
import ChatIcon from '@mui/icons-material/Chat';
import DashboardLayout from '../../components/DashboardLayout';
import MyCoursesTab from './MyCoursesTab';
import ChatTab from './ChatTab';
import RequestsTab from './RequestsTab';
import LessonsTab from './LessonsTab';
import QuizzesTab from './QuizzesTab';
import ReviewsTab from './ReviewsTab';
import ProfileTab from './ProfileTab';

const menuItems = [
  { path: '/instructor/courses', label: 'Мои курсы', icon: <SchoolIcon /> },
  { path: '/instructor/requests', label: 'Заявки', icon: <AssignmentIcon /> },
  { path: '/instructor/lessons', label: 'Уроки', icon: <MenuBookIcon /> },
  { path: '/instructor/quizzes', label: 'Тесты', icon: <QuizIcon /> },
  { path: '/instructor/reviews', label: 'Отзывы', icon: <RateReviewIcon /> },
  { path: '/instructor/chat', label: 'Чаты', icon: <ChatIcon /> },
  { path: '/instructor/profile', label: 'Профиль', icon: <PersonIcon /> },
];

export default function InstructorDashboard() {
  return (
    <DashboardLayout menuItems={menuItems} title="Корпоративная платформа обучения">
      <Routes>
        <Route index element={<Navigate to="courses" replace />} />
        <Route path="courses" element={<MyCoursesTab />} />
        <Route path="requests" element={<RequestsTab />} />
        <Route path="lessons" element={<LessonsTab />} />
        <Route path="quizzes" element={<QuizzesTab />} />
        <Route path="reviews" element={<ReviewsTab />} />
        <Route path="chat" element={<ChatTab />} />
        <Route path="profile" element={<ProfileTab />} />
      </Routes>
    </DashboardLayout>
  );
}
